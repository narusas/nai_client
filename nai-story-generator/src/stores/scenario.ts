import { defineStore } from 'pinia';
import { saveRepresentativeImage, getRepresentativeImages, deleteScenarioImages } from '../services/imageDbService';
import { saveScenarioToDb, getAllScenariosFromDb, getScenarioFromDb, deleteScenarioFromDb, saveMetaToDb, getMetaFromDb } from '../services/scenarioDbService';

interface Resolution {
  width: number;
  height: number;
  probability: number; // 0-100 사이의 확률
}

interface SubPrompt {
  prompt: string;
  negativePrompt: string;
  probability: number; // 0-100 사이의 확률
  enabled: boolean;
}

interface CharacterPrompt {
  name: string;
  subPrompts: SubPrompt[];
  position: { x: number; y: number };
  enabled: boolean;
}

interface GeneratedImage {
  url: string;
  uniqueId: string; // 000001부터 시작하는 고유번호
  prompt?: string; // 최종 생성된 전체 프롬프트
  mainPrompt?: MainPrompt;
  characterPrompts?: CharacterPrompt[];
  createdAt?: string;
  parameters?: any;
  filename?: string; // nai_{시나리오고유번호}_{컷고유번호}_{이미지고유번호}.{이미지포맷}
}

interface MainPrompt {
  subPrompts: SubPrompt[];
}

interface Cut {
  id: number;
  uniqueId: string; // 01부터 시작하는 시나리오내 고유 번호
  mainPrompt: MainPrompt;
  characterPrompts: CharacterPrompt[];
  imageCount: number;
  generatedImages: GeneratedImage[];
  representativeImage: string | null;
  nextImageId: number; // 다음 이미지 고유번호를 관리하기 위한 번호
  resolutions: Resolution[]; // 해상도 목록
}

interface Scenario {
  id: string;
  uniqueId: string; // 000001부터 시작하는 고유번호
  name: string;
  cuts: Cut[];
  createdAt: string;
}

export const useScenarioStore = defineStore('scenario', {
  state: () => ({
    scenarios: [] as Scenario[],
    currentScenarioId: null as string | null,
    selectedCutIndex: -1,
    selectedImage: null as string | null, // 이미지 URL만 저장
    selectedImageData: null as GeneratedImage | null, // 이미지 전체 데이터 저장
    lastSavedAt: null as string | null,
    isAnyImageGenerating: false // 추가: 하나라도 이미지 생성 중인지 여부
  }),
  
  actions: {
    // 다음 시나리오 고유번호 생성
    getNextScenarioUniqueId() {
      // 현재 가장 큰 고유번호 찾기
      let maxId = 0;
      this.scenarios.forEach(scenario => {
        if (scenario.uniqueId) {
          const numId = parseInt(scenario.uniqueId, 10);
          if (!isNaN(numId) && numId > maxId) {
            maxId = numId;
          }
        }
      });
      
      // 다음 번호 생성 (6자리 숫자, 앞에 0 채움)
      return String(maxId + 1).padStart(6, '0');
    },
    
    // 다음 컷 고유번호 생성
    getNextCutUniqueId(cuts: Cut[]) {
      // 현재 가장 큰 고유번호 찾기
      let maxId = 0;
      cuts.forEach(cut => {
        if (cut.uniqueId) {
          const numId = parseInt(cut.uniqueId, 10);
          if (!isNaN(numId) && numId > maxId) {
            maxId = numId;
          }
        }
      });
      
      // 다음 번호 생성 (2자리 숫자, 앞에 0 채움)
      return String(maxId + 1).padStart(2, '0');
    },
    
    // 컷에 고유번호 부여
    ensureCutsHaveUniqueIds(cuts: Cut[]) {
      cuts.forEach((cut, index) => {
        // 고유번호가 없는 경우 부여
        if (!cut.uniqueId) {
          cut.uniqueId = String(index + 1).padStart(2, '0');
        }
        
        // nextImageId가 없는 경우 초기화
        if (!cut.nextImageId) {
          cut.nextImageId = 1;
        }
        
        // 이미지에 고유번호와 파일명 부여
        if (cut.generatedImages && cut.generatedImages.length > 0) {
          cut.generatedImages.forEach((img, imgIndex) => {
            if (!img.uniqueId) {
              img.uniqueId = String(imgIndex + 1).padStart(6, '0');
            }
          });
        }
      });
      
      return cuts;
    },
    
    async saveScenario(scenario: Omit<Scenario, 'id'>) {
      try {
        const id = this.currentScenarioId || `scenario-${Date.now()}`;
        const existingIndex = this.scenarios.findIndex(s => s.id === id);
        
        // 새 시나리오인지 확인
        const isNewScenario = existingIndex < 0;
        
        // 고유번호 부여
        let uniqueId = '';
        if (existingIndex >= 0 && this.scenarios[existingIndex].uniqueId) {
          // 기존 시나리오면 고유번호 유지
          uniqueId = this.scenarios[existingIndex].uniqueId;
        } else {
          // 새 시나리오면 새 고유번호 부여
          uniqueId = this.getNextScenarioUniqueId();
          
          // 새 시나리오를 생성할 때 이미지 뷰어 초기화
          this.clearSelectedImage();
        }
        
        // 컷에 고유번호 부여
        const cutsWithUniqueIds = this.ensureCutsHaveUniqueIds(scenario.cuts);
        
        const updatedScenario = {
          ...scenario,
          id,
          uniqueId,
          cuts: cutsWithUniqueIds
        };
        
        if (existingIndex >= 0) {
          this.scenarios[existingIndex] = updatedScenario;
        } else {
          this.scenarios.push(updatedScenario);
        }
        
        this.currentScenarioId = id;
        
        // IndexedDB에 저장 (비동기 처리)
        await this.saveToLocalStorage();
        
        // 대표 이미지를 IndexedDB에 저장
        await this.saveRepresentativeImagesToDb(updatedScenario);
        
        // 저장된 시나리오 반환
        return updatedScenario;
      } catch (error) {
        console.error('시나리오 저장 중 오류:', error);
        throw error;
      }
    },
    
    // 시나리오의 모든 컷에서 대표 이미지를 IndexedDB에 저장
    async saveRepresentativeImagesToDb(scenario: Scenario) {
      try {
        // 각 컷의 대표 이미지 저장
        const savePromises = scenario.cuts.map(cut => {
          if (cut.representativeImage) {
            return saveRepresentativeImage(cut.id, cut.representativeImage, scenario.id);
          }
          return Promise.resolve();
        });
        
        await Promise.all(savePromises);
        console.log(`시나리오 ${scenario.id}의 대표 이미지 저장 완료`);
      } catch (error) {
        console.error('대표 이미지 저장 중 오류:', error);
      }
    },
    
    // IndexedDB에서 대표 이미지 불러오기
    async loadRepresentativeImagesFromDb(scenarioId: string) {
      try {
        const images = await getRepresentativeImages(scenarioId);
        
        // 현재 시나리오 찾기
        const scenario = this.scenarios.find(s => s.id === scenarioId);
        if (!scenario) return;
        
        // 각 이미지를 해당 컷에 적용
        images.forEach(img => {
          // cutId 형식: 'scenarioId-cutId'
          const cutIdStr = img.cutId.split('-').pop();
          if (!cutIdStr) return;
          
          const cutId = parseInt(cutIdStr, 10);
          const cut = scenario.cuts.find(c => c.id === cutId);
          
          if (cut) {
            // 대표 이미지 설정
            cut.representativeImage = img.imageUrl;
            console.log(`컷 ${cutId}의 대표 이미지 로드 완료`);
          }
        });
      } catch (error) {
        console.error('대표 이미지 불러오기 중 오류:', error);
      }
    },
    
    getScenarios(): Scenario[] {
      this.loadFromLocalStorage();
      return this.scenarios;
    },
    
    getCurrentScenario(): Scenario | null {
      if (!this.currentScenarioId) return null;
      return this.scenarios.find(s => s.id === this.currentScenarioId) || null;
    },
    
    getCurrentScenarioName(): string | null {
      const current = this.getCurrentScenario();
      return current ? current.name : null;
    },
    
    selectCut(index: number) {
      this.selectedCutIndex = index;
    },
    
    getSelectedCutIndex(): number {
      return this.selectedCutIndex;
    },
    
    selectImage(imageUrl: string, imageData: any = null) {
      this.selectedImage = imageUrl;
      this.selectedImageData = imageData;
    },
    
    getSelectedImage(): string | null {
      return this.selectedImage;
    },
    
    getSelectedImageData(): any {
      return this.selectedImageData;
    },
    
    clearSelectedImage() {
      this.selectedImage = null;
      this.selectedImageData = null;
    },
    
    async saveToLocalStorage() {
      try {
        // 각 시나리오를 개별적으로 IndexedDB에 저장
        for (const scenario of this.scenarios) {
          await saveScenarioToDb(scenario);
        }
        
        // 현재 시나리오 ID 저장
        if (this.currentScenarioId) {
          await saveMetaToDb('currentScenarioId', this.currentScenarioId);
        }
        
        // 마지막 저장 시간 업데이트
        this.lastSavedAt = new Date().toISOString();
        await saveMetaToDb('lastSavedAt', this.lastSavedAt);
        
        console.log('시나리오 데이터 저장 완료');
      } catch (error) {
        console.error('시나리오 데이터 저장 중 오류:', error);
      }
    },
    
    async loadFromLocalStorage() {
      try {
        // IndexedDB에서 모든 시나리오 불러오기
        const scenarios = await getAllScenariosFromDb();
        if (scenarios && scenarios.length > 0) {
          this.scenarios = scenarios;
        }
        
        // 현재 시나리오 ID 불러오기
        const currentScenarioId = await getMetaFromDb('currentScenarioId');
        if (currentScenarioId) {
          this.currentScenarioId = currentScenarioId;
          // 현재 시나리오가 있는 경우 IndexedDB에서 대표 이미지 불러오기
          await this.loadRepresentativeImagesFromDb(currentScenarioId);
        }
        
        // 마지막 저장 시간 불러오기
        const lastSavedAt = await getMetaFromDb('lastSavedAt');
        if (lastSavedAt) {
          this.lastSavedAt = lastSavedAt;
        }
        
        console.log('시나리오 데이터 로드 완료');
      } catch (error) {
        console.error('시나리오 데이터 로드 중 오류:', error);
        
        // 에러 발생 시 기존 localStorage에서 시도해보기 (마이그레이션 목적)
        this.migrateFromLocalStorage();
      }
    },
    
    // localStorage에서 IndexedDB로 마이그레이션
    async migrateFromLocalStorage() {
      console.log('localStorage에서 IndexedDB로 마이그레이션 시도');
      const savedScenarios = localStorage.getItem('nai-scenarios');
      const savedCurrentId = localStorage.getItem('nai-current-scenario-id');
      const lastSavedAt = localStorage.getItem('nai-last-saved-at');
      
      if (savedScenarios) {
        try {
          const scenarios = JSON.parse(savedScenarios);
          this.scenarios = scenarios;
          
          // 각 시나리오를 IndexedDB에 저장
          for (const scenario of scenarios) {
            await saveScenarioToDb(scenario);
          }
          
          // 현재 시나리오 ID 저장
          if (savedCurrentId) {
            this.currentScenarioId = savedCurrentId;
            await saveMetaToDb('currentScenarioId', savedCurrentId);
          }
          
          // 마지막 저장 시간 저장
          if (lastSavedAt) {
            this.lastSavedAt = lastSavedAt;
            await saveMetaToDb('lastSavedAt', lastSavedAt);
          }
          
          console.log('localStorage에서 IndexedDB로 마이그레이션 완료');
        } catch (e) {
          console.error('마이그레이션 중 오류 발생:', e);
        }
      }
    },
    
    selectScenario(scenarioId: string): boolean {
      const scenario = this.scenarios.find(s => s.id === scenarioId);
      if (scenario) {
        // 이전 시나리오와 다른 시나리오를 선택한 경우에만 초기화
        if (this.currentScenarioId !== scenarioId) {
          // 이미지 뷰어 초기화
          this.clearSelectedImage();
          // 선택된 컷 초기화
          this.selectedCutIndex = -1;
        }
        
        this.currentScenarioId = scenarioId;
        this.saveToLocalStorage();
        return true;
      }
      return false;
    },
    
    async deleteScenario(scenarioId: string): Promise<boolean> {
      const index = this.scenarios.findIndex(s => s.id === scenarioId);
      if (index >= 0) {
        // IndexedDB에서 해당 시나리오의 대표 이미지 삭제
        try {
          await deleteScenarioImages(scenarioId);
          console.log(`시나리오 ${scenarioId}의 대표 이미지 삭제 완료`);
          
          // IndexedDB에서 시나리오 데이터 삭제
          await deleteScenarioFromDb(scenarioId);
          console.log(`시나리오 ${scenarioId} 데이터 삭제 완료`);
        } catch (error) {
          console.error(`시나리오 ${scenarioId} 삭제 중 오류:`, error);
        }
        
        this.scenarios.splice(index, 1);
        
        // 현재 선택된 시나리오가 삭제된 경우 다른 시나리오 선택
        if (this.currentScenarioId === scenarioId) {
          this.currentScenarioId = this.scenarios.length > 0 ? this.scenarios[0].id : null;
          
          // 새로 선택된 시나리오가 있는 경우 해당 시나리오의 대표 이미지 불러오기
          if (this.currentScenarioId) {
            await this.loadRepresentativeImagesFromDb(this.currentScenarioId);
            // 현재 시나리오 ID 업데이트
            await saveMetaToDb('currentScenarioId', this.currentScenarioId);
          }
        }
        
        await this.saveToLocalStorage();
        return true;
      }
      return false;
    },
    
    setAnyImageGenerating(status: boolean) { // 추가: 액션
      this.isAnyImageGenerating = status;
    },
  }
});

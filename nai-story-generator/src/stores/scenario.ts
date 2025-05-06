import { defineStore } from 'pinia';
import { saveRepresentativeImage, getRepresentativeImages, deleteScenarioImages } from '../services/imageDbService';

interface CharacterPrompt {
  name: string;
  prompt: string;
  negativePrompt: string;
  position: { x: number; y: number };
  enabled: boolean;
}

interface GeneratedImage {
  url: string;
  prompt?: string;
  mainPrompt?: string;
  characterPrompts?: CharacterPrompt[];
  createdAt?: string;
  parameters?: any;
}

interface Cut {
  id: number;
  mainPrompt: string;
  negativePrompt: string;
  characterPrompts: CharacterPrompt[];
  imageCount: number;
  generatedImages: GeneratedImage[];
  representativeImage: string | null;
}

interface Scenario {
  id: string;
  name: string;
  cuts: Cut[];
  createdAt: string;
}

export const useScenarioStore = defineStore('scenario', {
  state: () => ({
    scenarios: [] as Scenario[],
    currentScenarioId: null as string | null,
    selectedCutIndex: -1,
    selectedImage: null as string | null,
    selectedImageData: null as any,
    lastSavedAt: null as string | null
  }),
  
  actions: {
    saveScenario(scenario: Omit<Scenario, 'id'>) {
      const id = this.currentScenarioId || `scenario-${Date.now()}`;
      const existingIndex = this.scenarios.findIndex(s => s.id === id);
      
      const updatedScenario = {
        ...scenario,
        id
      };
      
      if (existingIndex >= 0) {
        this.scenarios[existingIndex] = updatedScenario;
      } else {
        this.scenarios.push(updatedScenario);
      }
      
      this.currentScenarioId = id;
      this.saveToLocalStorage();
      
      // 대표 이미지를 IndexedDB에 저장
      this.saveRepresentativeImagesToDb(updatedScenario);
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
    
    saveToLocalStorage() {
      localStorage.setItem('nai-scenarios', JSON.stringify(this.scenarios));
      localStorage.setItem('nai-current-scenario-id', this.currentScenarioId || '');
      this.lastSavedAt = new Date().toISOString();
      localStorage.setItem('nai-last-saved-at', this.lastSavedAt);
    },
    
    async loadFromLocalStorage() {
      const savedScenarios = localStorage.getItem('nai-scenarios');
      const savedCurrentId = localStorage.getItem('nai-current-scenario-id');
      const lastSavedAt = localStorage.getItem('nai-last-saved-at');
      
      if (savedScenarios) {
        try {
          this.scenarios = JSON.parse(savedScenarios);
          
          // 현재 시나리오가 있는 경우 IndexedDB에서 대표 이미지 불러오기
          if (savedCurrentId) {
            await this.loadRepresentativeImagesFromDb(savedCurrentId);
          }
        } catch (e) {
          console.error('시나리오를 불러오는 중 오류 발생:', e);
        }
      }
      
      if (savedCurrentId) {
        this.currentScenarioId = savedCurrentId;
      }
      
      if (lastSavedAt) {
        this.lastSavedAt = lastSavedAt;
      }
    },
    
    selectScenario(scenarioId: string): boolean {
      const scenario = this.scenarios.find(s => s.id === scenarioId);
      if (scenario) {
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
        } catch (error) {
          console.error(`시나리오 ${scenarioId}의 이미지 삭제 중 오류:`, error);
        }
        
        this.scenarios.splice(index, 1);
        
        // 현재 선택된 시나리오가 삭제된 경우 다른 시나리오 선택
        if (this.currentScenarioId === scenarioId) {
          this.currentScenarioId = this.scenarios.length > 0 ? this.scenarios[0].id : null;
          
          // 새로 선택된 시나리오가 있는 경우 해당 시나리오의 대표 이미지 불러오기
          if (this.currentScenarioId) {
            await this.loadRepresentativeImagesFromDb(this.currentScenarioId);
          }
        }
        
        this.saveToLocalStorage();
        return true;
      }
      return false;
    }
  }
});

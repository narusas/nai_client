import { defineStore } from 'pinia';
import { saveRepresentativeImage, getRepresentativeImages, deleteScenarioImages } from '../services/imageDbService';
import { ScenarioDbService } from '../services/scenarioDbService';
import { v4 as uuidv4 } from 'uuid';

const dbService = new ScenarioDbService();

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
  updatedAt: string;
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
    getNextScenarioUniqueId() {
      let maxId = 0;
      this.scenarios.forEach(scenario => {
        if (scenario.uniqueId) {
          const numId = parseInt(scenario.uniqueId, 10);
          if (!isNaN(numId) && numId > maxId) {
            maxId = numId;
          }
        }
      });
      
      return String(maxId + 1).padStart(6, '0');
    },
    
    getNextCutUniqueId(cuts: Cut[]) {
      let maxId = 0;
      cuts.forEach(cut => {
        if (cut.uniqueId) {
          const numId = parseInt(cut.uniqueId, 10);
          if (!isNaN(numId) && numId > maxId) {
            maxId = numId;
          }
        }
      });
      
      return String(maxId + 1).padStart(2, '0');
    },
    
    ensureCutsHaveUniqueIds(cuts: Cut[]) {
      cuts.forEach((cut, index) => {
        if (!cut.uniqueId) {
          cut.uniqueId = String(index + 1).padStart(2, '0');
        }
        
        if (!cut.nextImageId) {
          cut.nextImageId = 1;
        }
        
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
    
    async saveScenario(scenario: Omit<Scenario, 'id'> & { id?: string }) {
      try {
        let scenarioToSave: Scenario;

        const existingScenarioFromStore = this.currentScenarioId 
            ? this.scenarios.find(s => s.id === this.currentScenarioId) 
            : undefined;
        
        const inputScenarioId = scenario.id;

        if (inputScenarioId && existingScenarioFromStore && existingScenarioFromStore.id === inputScenarioId) {
          scenarioToSave = {
            ...existingScenarioFromStore,
            ...scenario,
            id: inputScenarioId,
            cuts: this.ensureCutsHaveUniqueIds(scenario.cuts),
            updatedAt: new Date().toISOString(),
          };
        } else if (inputScenarioId && !existingScenarioFromStore) {
          scenarioToSave = {
            ...(scenario as Scenario),
            uniqueId: scenario.uniqueId || this.getNextScenarioUniqueId(),
            cuts: this.ensureCutsHaveUniqueIds(scenario.cuts),
            createdAt: scenario.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else {
          const newId = uuidv4();
          scenarioToSave = {
            ...(scenario as Omit<Scenario, 'id'>),
            id: newId,
            uniqueId: scenario.uniqueId || this.getNextScenarioUniqueId(),
            cuts: this.ensureCutsHaveUniqueIds(scenario.cuts),
            createdAt: scenario.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Scenario;
        }

        const scenarioIndex = this.scenarios.findIndex(s => s.id === scenarioToSave.id);
        if (scenarioIndex > -1) {
          this.scenarios[scenarioIndex] = scenarioToSave;
        } else {
          this.scenarios.push(scenarioToSave);
        }
        
        this.currentScenarioId = scenarioToSave.id;
        
        await this.saveCurrentScenarioToDb();
        
        await this.saveRepresentativeImagesToDb(scenarioToSave);
        
        console.log(`시나리오 저장 완료 (스토어 사용): ${scenarioToSave.name}`);
        return scenarioToSave;
      } catch (error) {
        console.error('시나리오 저장 중 오류 발생 (스토어):', error);
        throw error;
      }
    },

    async saveCurrentScenarioToDb() {
      if (!this.currentScenarioId) return;
      const scenario = this.scenarios.find(s => s.id === this.currentScenarioId);
      if (scenario) {
        try {
          await dbService.saveScenario(scenario);
          this.lastSavedAt = new Date().toISOString();
          await dbService.saveMeta('lastSavedAt', this.lastSavedAt);
          await dbService.saveMeta('currentScenarioId', this.currentScenarioId);
          console.log('시나리오 데이터 저장 완료');
        } catch (error) {
          console.error('DB에 시나리오 저장 실패:', error);
        }
      }
    },

    async loadScenariosFromDb() {
      try {
        const scenariosFromDb = await dbService.getAllScenarios();
        this.scenarios = scenariosFromDb.map(s => ({
          ...s,
          createdAt: s.createdAt || new Date(0).toISOString(),
          updatedAt: s.updatedAt || new Date(0).toISOString(),
          cuts: this.ensureCutsHaveUniqueIds(s.cuts || []),
        }));

        const storedCurrentScenarioId = await dbService.loadMeta('currentScenarioId') as string | null;
        if (storedCurrentScenarioId && this.scenarios.find(s => s.id === storedCurrentScenarioId)) {
          this.currentScenarioId = storedCurrentScenarioId;
        } else if (this.scenarios.length > 0) {
          const sortedScenarios = [...this.scenarios].sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          this.currentScenarioId = sortedScenarios[0].id;
        } else {
          this.currentScenarioId = null;
        }

        this.lastSavedAt = await dbService.loadMeta('lastSavedAt') as string | null;
        console.log('시나리오 데이터 로드 완료');

        if (!this.currentScenarioId && this.scenarios.length === 0) {
          const newScenario = this.createNewScenario();
          await this.saveScenario(newScenario);
        }

      } catch (error) {
        console.error('DB에서 시나리오 로드 실패:', error);
        if (this.scenarios.length === 0) {
          const newScenario = this.createNewScenario();
          this.scenarios = [newScenario];
          this.currentScenarioId = newScenario.id;
        }
      }
    },

    async deleteScenario(id: string) {
      try {
        await dbService.deleteScenario(id);
        await deleteScenarioImages(id);
        this.scenarios = this.scenarios.filter(s => s.id !== id);
        if (this.currentScenarioId === id) {
          if (this.scenarios.length > 0) {
            const sortedScenarios = [...this.scenarios].sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            this.currentScenarioId = sortedScenarios[0].id;
          } else {
            this.currentScenarioId = null;
            const newScenario = this.createNewScenario();
            await this.saveScenario(newScenario);
          }
          await dbService.saveMeta('currentScenarioId', this.currentScenarioId);
        }
        console.log(`시나리오 ${id} 삭제 완료`);
      } catch (error) {
        console.error('시나리오 삭제 중 오류 발생:', error);
      }
    },

    createNewScenario(): Scenario {
      const newId = uuidv4();
      const newUniqueId = this.getNextScenarioUniqueId();
      const now = new Date().toISOString();
      return {
        id: newId,
        uniqueId: newUniqueId,
        name: `새 시나리오 ${newUniqueId}`,
        cuts: [],
        createdAt: now,
        updatedAt: now,
      };
    },
    
    async createAndSetNewScenario() {
      const newScenario = this.createNewScenario();
      await this.saveScenario(newScenario);
      return newScenario;
    },

    async saveRepresentativeImageToDb(cutId: string, imageUrl: string) {
      if (!this.currentScenarioId) return;
      try {
        await saveRepresentativeImage(this.currentScenarioId, cutId, imageUrl);
        console.log(`컷 ${cutId}의 대표 이미지 저장 완료`);
      } catch (error) {
        console.error('대표 이미지 저장 실패:', error);
      }
    },

    async saveRepresentativeImagesToDb(scenario: Scenario) {
      if (!scenario || !scenario.cuts) return;
      for (const cut of scenario.cuts) {
        if (cut.representativeImage) {
          await this.saveRepresentativeImageToDb(String(cut.id), cut.representativeImage);
        }
      }
    },

    async loadRepresentativeImagesFromDb() {
      if (!this.currentScenarioId) return;
      try {
        const images = await getRepresentativeImages(this.currentScenarioId);
        const scenario = this.scenarios.find(s => s.id === this.currentScenarioId);
        if (scenario) {
          scenario.cuts.forEach(cut => {
            const repImage = images.find(img => img.cutId === String(cut.id));
            if (repImage) {
              cut.representativeImage = repImage.imageUrl;
            }
          });
        }
        console.log(`시나리오 ${this.currentScenarioId}의 대표 이미지 로드 완료`);
      } catch (error) {
        console.error('대표 이미지 로드 실패:', error);
      }
    },

    setCurrentScenarioId(id: string | null) {
      this.currentScenarioId = id;
      dbService.saveMeta('currentScenarioId', id);
    },
    
    getNextImageUniqueId(cutId: string): string {
      const cut = this.scenarios.find(s => s.id === this.currentScenarioId)?.cuts.find(c => c.id === parseInt(cutId, 10));
      if (cut) {
        return String(cut.nextImageId).padStart(6, '0');
      }
      return '';
    },
    
    getSelectedImage(): string | null {
      return this.selectedImage;
    },
    
    setSelectedImage(imageUrl: string | null) {
      this.selectedImage = imageUrl;
    },
    
    getSelectedImageData(): any | null {
      return this.selectedImageData;
    },
    
    setSelectedImageData(imageData: any | null) {
      this.selectedImageData = imageData;
    },
    
    clearSelectedImage() {
      this.selectedImage = null;
      this.selectedImageData = null;
    },
    
    setAnyImageGenerating(isGenerating: boolean) {
      this.isAnyImageGenerating = isGenerating;
    },
  },
  getters: {
    currentScenario(state): Scenario | undefined {
      return state.scenarios.find(s => s.id === state.currentScenarioId);
    },
  }
});

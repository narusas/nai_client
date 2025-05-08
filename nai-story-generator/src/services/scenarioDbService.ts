import { Scenario, ImageData } from '@/domain/scenario/entities'; // Scenario 타입 import
import { resizeBase64Image } from '@/utils/imageUtils'; // 이미지 리사이징 함수 import
import { useImageDbService } from './imageDbService'; // 이미지 DB 서비스 import

const SCENARIO_PREFIX = 'scenario_';
const META_PREFIX = 'meta_';
const SCENARIO_IDS_KEY = 'scenario_ids';
const THUMBNAIL_WIDTH = 70;
const THUMBNAIL_HEIGHT = 70;

export class ScenarioDbService {
  private makeSerializable(obj: any): any {
    // localStorage는 문자열만 저장하므로, 객체는 JSON 문자열로 변환
    // Date 객체 등 특정 타입은 string으로 변환될 수 있으므로 주의
    return JSON.parse(JSON.stringify(obj));
  }

  private getScenarioIds(): string[] {
    const idsJson = localStorage.getItem(SCENARIO_IDS_KEY);
    return idsJson ? JSON.parse(idsJson) : [];
  }

  private saveScenarioIds(ids: string[]): void {
    localStorage.setItem(SCENARIO_IDS_KEY, JSON.stringify(ids));
  }

  /**
   * 이미지 데이터 처리 - 썸네일 생성 및 이미지 저장
   * @param imageData 이미지 데이터 객체
   * @returns 처리된 이미지 데이터 객체 (썸네일만 포함)
   */
  private async processImageData(imageData: any): Promise<ImageData> {
    try {
      const imageDbService = useImageDbService();
      const imageId = imageData.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      let thumbnailUrl = imageData.thumbnailUrl;
      let originalImageUrl = imageData.url;
      
      // 이미지 URL이 있고 base64 형식인 경우
      if (originalImageUrl && originalImageUrl.startsWith('data:')) {
        // 썸네일이 없는 경우 생성
        if (!thumbnailUrl) {
          thumbnailUrl = await resizeBase64Image(
            originalImageUrl, 
            THUMBNAIL_WIDTH, 
            THUMBNAIL_HEIGHT
          );
        }
        
        // 원본 이미지를 IndexedDB에 저장
        await imageDbService.saveImageData(imageId, originalImageUrl);
      }
      
      // url 필드를 제외한 새 이미지 데이터 객체 생성
      const processedImageData: ImageData = {
        id: imageId,
        thumbnailUrl: thumbnailUrl || '',
        mainPrompt: imageData.mainPrompt,
        characterPrompts: imageData.characterPrompts,
        negativePrompt: imageData.negativePrompt,
        width: imageData.width || 512,
        height: imageData.height || 512,
        seed: imageData.seed,
        createdAt: imageData.createdAt instanceof Date ? imageData.createdAt : new Date()
      };
      
      return processedImageData;
    } catch (error) {
      console.error('이미지 데이터 처리 중 오류 발생:', error);
      // 오류 발생 시 기본 객체 반환
      return {
        id: imageData.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        thumbnailUrl: imageData.thumbnailUrl || '',
        width: imageData.width || 512,
        height: imageData.height || 512,
        createdAt: imageData.createdAt instanceof Date ? imageData.createdAt : new Date()
      } as ImageData;
    }
  }

  /**
   * 시나리오의 모든 이미지 처리
   * @param scenario 시나리오 객체
   * @returns 처리된 시나리오 객체
   */
  private async processScenarioImages(scenario: Scenario): Promise<Scenario> {
    try {
      const updatedScenario = { ...scenario };
      
      // 시나리오 이미지가 있는 경우 처리
      if (updatedScenario.image) {
        updatedScenario.image = await this.processImageData(updatedScenario.image);
      }
      
      // 시나리오의 컷들에 이미지가 있는 경우 처리
      if (updatedScenario.cuts && updatedScenario.cuts.length > 0) {
        for (let i = 0; i < updatedScenario.cuts.length; i++) {
          const cut = updatedScenario.cuts[i];
          if (cut.image) {
            updatedScenario.cuts[i].image = await this.processImageData(cut.image);
          }
          
          // 컷의 생성된 이미지들 처리
          if (cut.generatedImages && cut.generatedImages.length > 0) {
            const processedImages = [];
            for (const img of cut.generatedImages) {
              processedImages.push(await this.processImageData(img));
            }
            updatedScenario.cuts[i].generatedImages = processedImages;
          }
        }
      }
      
      return updatedScenario;
    } catch (error) {
      console.error('시나리오 이미지 처리 중 오류 발생:', error);
      return scenario; // 오류 발생 시 원본 시나리오 반환
    }
  }

  async saveScenario(scenario: Scenario): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // 시나리오 복사본 생성
        const scenarioCopy = JSON.parse(JSON.stringify(scenario));
        
        // 시나리오의 이미지 처리 (썸네일 생성 및 이미지 저장)
        const processedScenario = await this.processScenarioImages(scenarioCopy);
        
        // 직렬화 가능한 객체로 변환
        const serializableScenario = this.makeSerializable(processedScenario);
        
        // localStorage에 저장
        localStorage.setItem(SCENARIO_PREFIX + scenario.id, JSON.stringify(serializableScenario));
        
        // 시나리오 ID 목록 업데이트
        let ids = this.getScenarioIds();
        if (!ids.includes(scenario.id)) {
          ids.push(scenario.id);
          this.saveScenarioIds(ids);
        }
        console.log(`[DbService] 시나리오 저장 성공 (localStorage): ${scenario.id}`);
        resolve();
      } catch (error) {
        console.error('[DbService] 시나리오 저장 실패 (localStorage):', error);
        reject('시나리오를 저장하는 중 오류가 발생했습니다.');
      }
    });
  }

  async getAllScenarios(): Promise<Scenario[]> {
    return new Promise((resolve, reject) => {
      try {
        const ids = this.getScenarioIds();
        const scenarios: Scenario[] = [];
        for (const id of ids) {
          const scenarioJson = localStorage.getItem(SCENARIO_PREFIX + id);
          if (scenarioJson) {
            scenarios.push(JSON.parse(scenarioJson) as Scenario);
          }
        }
        console.log(`[DbService] ${scenarios.length}개의 시나리오 로드 완료 (localStorage)`);
        resolve(scenarios);
      } catch (error) {
        console.error('[DbService] 시나리오 불러오기 실패 (localStorage):', error);
        reject('시나리오를 불러오는 중 오류가 발생했습니다.');
      }
    });
  }

  async getScenario(id: string): Promise<Scenario | null> {
    return new Promise((resolve, reject) => {
      try {
        const scenarioJson = localStorage.getItem(SCENARIO_PREFIX + id);
        if (scenarioJson) {
          const scenario = JSON.parse(scenarioJson) as Scenario;
          console.log(`[DbService] 시나리오 ${id} 로드 완료 (localStorage)`);
          resolve(scenario);
        } else {
          console.log(`[DbService] 시나리오 ${id} 없음 (localStorage)`);
          resolve(null);
        }
      } catch (error) {
        console.error(`[DbService] 시나리오 ${id} 불러오기 실패 (localStorage):`, error);
        reject(`시나리오 ${id}를 불러오는 중 오류가 발생했습니다.`);
      }
    });
  }

  async deleteScenario(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        localStorage.removeItem(SCENARIO_PREFIX + id);
        let ids = this.getScenarioIds();
        ids = ids.filter(scenarioId => scenarioId !== id);
        this.saveScenarioIds(ids);
        console.log(`[DbService] 시나리오 ${id} 삭제 완료 (localStorage)`);
        resolve(true);
      } catch (error) {
        console.error(`[DbService] 시나리오 ${id} 삭제 실패 (localStorage):`, error);
        reject(`시나리오 ${id}를 삭제하는 중 오류가 발생했습니다.`);
      }
    });
  }

  async saveMeta(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const serializableValue = this.makeSerializable(value);
        localStorage.setItem(META_PREFIX + key, JSON.stringify(serializableValue));
        console.log(`[DbService] 메타데이터 저장 성공 (localStorage): ${key}`);
        resolve();
      } catch (error) {
        console.error('[DbService] 메타데이터 저장 실패 (localStorage):', error);
        reject('메타데이터를 저장하는 중 오류가 발생했습니다.');
      }
    });
  }

  async loadMeta(key: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
      try {
        const metaJson = localStorage.getItem(META_PREFIX + key);
        if (metaJson) {
          const value = JSON.parse(metaJson);
          console.log(`[DbService] 메타데이터 ${key} 로드 완료 (localStorage)`);
          resolve(value);
        } else {
          console.log(`[DbService] 메타데이터 ${key} 없음 (localStorage)`);
          resolve(null);
        }
      } catch (error) {
        console.error(`[DbService] 메타데이터 ${key} 불러오기 실패 (localStorage):`, error);
        reject(`메타데이터 ${key}를 불러오는 중 오류가 발생했습니다.`);
      }
    });
  }
}

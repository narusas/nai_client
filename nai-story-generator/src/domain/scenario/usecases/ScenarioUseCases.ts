import { Scenario, Cut, ImageData, CharacterPrompt, PromptItem, ResolutionSetting } from '../entities';
import { ScenarioRepository, ImageGenerationService, ImageRepository } from '../ports';
import { v4 as uuidv4 } from 'uuid';
import { ResolutionService } from '../services/ResolutionService';

/**
 * 시나리오 관련 유스케이스 클래스
 * 시나리오 관리 및 이미지 생성과 관련된 비즈니스 로직을 구현
 */
export class ScenarioUseCases {
  /**
   * 시나리오 유스케이스 생성자
   * @param scenarioRepository 시나리오 저장소 구현체
   * @param imageGenerationService 이미지 생성 서비스 구현체
   * @param imageRepository 이미지 저장소 구현체
   */
  constructor(
    private scenarioRepository: ScenarioRepository,
    private imageGenerationService: ImageGenerationService,
    private imageRepository: ImageRepository
  ) {}

  async saveScenario(scenario: Scenario): Promise<void> {
    scenario.updatedAt = new Date();
    await this.scenarioRepository.saveScenario(scenario);
  }

  async getScenarioById(id: string): Promise<Scenario | null> {
    return await this.scenarioRepository.getScenarioById(id);
  }

  async getAllScenarios(): Promise<Scenario[]> {
    return await this.scenarioRepository.getAllScenarios();
  }

  async getAllScenarioSummaries(): Promise<ScenarioSummary[]> {
    const scenarios = await this.getAllScenarios();
    return scenarios.map(scenario => ({
      id: scenario.id,
      name: scenario.name,
      updatedAt: typeof scenario.updatedAt === 'string' ? scenario.updatedAt : (scenario.updatedAt as Date)?.toISOString() || new Date().toISOString(),
      createdAt: typeof scenario.createdAt === 'string' ? scenario.createdAt : (scenario.createdAt as Date)?.toISOString() || new Date().toISOString(),
      uniqueId: scenario.uniqueId,
    }));
  }

  async deleteScenario(id: string): Promise<void> {
    await this.scenarioRepository.deleteScenario(id);
  }
  
  /**
   * 특정 컷의 대표 이미지 URL을 저장
   * @param cutId 대표 이미지를 설정할 컷 ID
   * @param imageUrl 대표 이미지 URL
   */
  async saveRepresentativeImage(cutId: string, imageUrl: string): Promise<void> {
    await this.imageRepository.saveRepresentativeImage(cutId, imageUrl);
  }

  // 새로운 메소드: 컷의 특정 해상도 확률 업데이트
  async updateCutResolutionProbability(
    scenarioId: string,
    cutId: string,
    resolutionId: string,
    newProbability: number
  ): Promise<Scenario | null> {
    console.log(`[ScenarioUseCases.updateCutResolutionProbability] Called with: scenarioId=${scenarioId}, cutId=${cutId}, resolutionId=${resolutionId}, newProbability=${newProbability}`);
    const scenario = await this.getScenarioById(scenarioId);
    if (!scenario) {
      console.warn(`[ScenarioUseCases.updateCutResolutionProbability] Scenario with id ${scenarioId} not found. Returning null.`);
      return null;
    }
    console.log('[ScenarioUseCases.updateCutResolutionProbability] Scenario loaded:', JSON.parse(JSON.stringify(scenario)));

    const cut = scenario.cuts.find(c => c.id === cutId);
    if (!cut) {
      console.warn(`[ScenarioUseCases.updateCutResolutionProbability] Cut with id ${cutId} not found in scenario ${scenarioId}. Returning null.`);
      return null;
    }
    console.log('[ScenarioUseCases.updateCutResolutionProbability] Cut found:', JSON.parse(JSON.stringify(cut)));
    console.log('[ScenarioUseCases.updateCutResolutionProbability] cut.selectedResolutions value:', JSON.parse(JSON.stringify(cut.selectedResolutions)));

    // Ensure selectedResolutions exists, or use an empty array if not
    const resolutionsToUpdate = cut.selectedResolutions || [];

    if (!resolutionsToUpdate || resolutionsToUpdate.length === 0) {
      console.warn(`[ScenarioUseCases.updateCutResolutionProbability] Cut with id ${cutId} has no selectedResolutions or selectedResolutions array is empty. Cannot update probability. Returning null.`);
      // Optionally, here you could initialize cut.selectedResolutions with DEFAULT_RESOLUTIONS if that's the desired behavior
      // For now, just returning null to prevent errors and indicate failure.
      return null;
    }

    console.log('[ScenarioUseCases.updateCutResolutionProbability] Resolutions to update (before service call):', JSON.parse(JSON.stringify(resolutionsToUpdate)));
    console.log(`[ScenarioUseCases.updateCutResolutionProbability] Calling ResolutionService.updateResolutionProbability with resolutionIdToChange=${resolutionId}, newProbability=${newProbability}`);

    const updatedResolutions = ResolutionService.updateResolutionProbability(
      resolutionsToUpdate, 
      resolutionId, 
      newProbability
    );
    console.log('[ScenarioUseCases.updateCutResolutionProbability] Resolutions updated by service:', JSON.parse(JSON.stringify(updatedResolutions)));

    cut.selectedResolutions = updatedResolutions;

    // Update the cut in the scenario
    scenario.cuts = scenario.cuts.map(c => (c.id === cutId ? cut : c));
    
    console.log('[ScenarioUseCases.updateCutResolutionProbability] Scenario before save:', JSON.parse(JSON.stringify(scenario)));
    await this.saveScenario(scenario);
    console.log('[ScenarioUseCases.updateCutResolutionProbability] Scenario saved. Returning updated scenario.');

    // Log the state of selectedResolutions for the modified cut before returning
    const finalCut = scenario.cuts.find(c => c.id === cutId);
    console.log('[ScenarioUseCases.updateCutResolutionProbability] Final selectedResolutions for cut', cutId, ':', JSON.parse(JSON.stringify(finalCut?.selectedResolutions)));

    return scenario;
  }

  // 새로운 메소드: 컷의 특정 해상도 활성화/비활성화 토글
  async toggleCutResolutionEnabled(
    scenarioId: string,
    cutId: string,
    resolutionId: string,
    isEnabled: boolean
  ): Promise<Scenario | null> {
    console.log(`[ScenarioUseCases.toggleCutResolutionEnabled] Called with: scenarioId=${scenarioId}, cutId=${cutId}, resolutionId=${resolutionId}, isEnabled=${isEnabled}`);
    const scenario = await this.getScenarioById(scenarioId);
    if (!scenario) {
      console.warn(`[ScenarioUseCases.toggleCutResolutionEnabled] Scenario with id ${scenarioId} not found. Returning null.`);
      return null;
    }

    const cut = scenario.cuts.find(c => c.id === cutId);
    if (!cut) {
      console.warn(`[ScenarioUseCases.toggleCutResolutionEnabled] Cut with id ${cutId} not found in scenario ${scenarioId}. Returning null.`);
      return null;
    }

    const resolutionsToUpdate = cut.selectedResolutions || [];
    if (resolutionsToUpdate.length === 0) {
      console.warn(`[ScenarioUseCases.toggleCutResolutionEnabled] Cut with id ${cutId} has no selectedResolutions. Cannot toggle enabled state. Returning null.`);
      return null;
    }

    const updatedResolutions = ResolutionService.toggleResolutionEnabled(
      resolutionsToUpdate,
      resolutionId,
      isEnabled
    );

    cut.selectedResolutions = updatedResolutions;
    scenario.cuts = scenario.cuts.map(c => (c.id === cutId ? cut : c));
    await this.saveScenario(scenario);

    // Log the state of selectedResolutions for the modified cut before returning
    const finalCut = scenario.cuts.find(c => c.id === cutId);
    console.log('[ScenarioUseCases.toggleCutResolutionEnabled] Final selectedResolutions for cut', cutId, ':', JSON.parse(JSON.stringify(finalCut?.selectedResolutions)));

    return scenario;
  }

  // 새로운 메소드: 컷에 새 해상도 추가
  async addResolutionToCut(
    scenarioId: string,
    cutId: string,
    newResolutionData: { width: number; height: number; probability?: number; enabled?: boolean; }
  ): Promise<Scenario | null> {
    console.log(`[ScenarioUseCases.addResolutionToCut] Called with: scenarioId=${scenarioId}, cutId=${cutId}, newResolutionData:`, newResolutionData);
    if (!newResolutionData || typeof newResolutionData.width === 'undefined' || typeof newResolutionData.height === 'undefined') {
      console.error('[ScenarioUseCases.addResolutionToCut] newResolutionData is invalid or missing width/height.', newResolutionData);
      const existingScenario = await this.scenarioRepository.getScenarioById(scenarioId);
      return existingScenario; 
    }

    let scenario = await this.scenarioRepository.getScenarioById(scenarioId);

    if (!scenario) {
      console.log(`[ScenarioUseCases.addResolutionToCut] Scenario ${scenarioId} not found. Creating a new one.`);
      scenario = {
        id: scenarioId, 
        name: 'New Scenario', 
        description: '',
        cuts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: '', 
        isTemplate: false,
        folderId: null,
        tags: [],
        userSortOrder: null,
      };
    }

    let cut = scenario.cuts.find(c => c.id === cutId);
    if (!cut) {
      console.log(`[ScenarioUseCases.addResolutionToCut] Cut ${cutId} not found in scenario ${scenarioId}. Creating a new cut.`);
      const newCutName = `Cut ${scenario.cuts.length + 1}`;
      cut = {
        id: cutId, 
        name: newCutName,
        description: '',
        prompt: '',
        negativePrompt: '',
        seed: -1,
        sampler: '', 
        steps: 20, 
        cfgScale: 7, 
        selectedResolutions: ResolutionService.DEFAULT_RESOLUTIONS.map(r => ({ 
          ...r, 
          id: uuidv4() // Assign a new unique ID for each resolution instance in this cut
        })),
        generationParams: {},
        timings: { baseCost: 0, resolutionCostFactor: 0 },
      };
      scenario.cuts.push(cut);
    }

    if (!cut.selectedResolutions || !Array.isArray(cut.selectedResolutions)) {
      console.warn('[ScenarioUseCases.addResolutionToCut] cut.selectedResolutions was not an array, initializing.');
      cut.selectedResolutions = [];
    }

    const resolutionToAdd: ResolutionSetting = {
      id: uuidv4(), 
      width: newResolutionData.width,
      height: newResolutionData.height,
      probability: newResolutionData.probability !== undefined ? newResolutionData.probability : 0, 
      enabled: newResolutionData.enabled !== undefined ? newResolutionData.enabled : true,
    };

    const updatedCut = ResolutionService.addResolution(cut, resolutionToAdd);

    scenario.cuts = scenario.cuts.map(c => (c.id === cutId ? updatedCut : c));
    scenario.updatedAt = new Date().toISOString();

    const finalCutState = scenario.cuts.find(c => c.id === cutId);
    if (finalCutState) {
      console.log('[ScenarioUseCases.addResolutionToCut] Final selectedResolutions for cut', cutId, ':', JSON.parse(JSON.stringify(finalCutState.selectedResolutions)));
    } else {
      console.error('[ScenarioUseCases.addResolutionToCut] Could not find the cut after update to log its state.');
    }
  
    await this.saveScenario(scenario);
    console.log('[ScenarioUseCases.addResolutionToCut] Scenario processed and saved. Returning scenario.');
    return scenario;
  }

  // 새로운 메소드: 컷에서 특정 해상도 제거
  async removeResolutionFromCut(
    scenarioId: string,
    cutId: string,
    resolutionId: string
  ): Promise<Scenario | null> {
    console.log(`[ScenarioUseCases.removeResolutionFromCut] Called with: scenarioId=${scenarioId}, cutId=${cutId}, resolutionId=${resolutionId}`);
    const scenario = await this.getScenarioById(scenarioId);
    if (!scenario) {
      console.warn(`[ScenarioUseCases.removeResolutionFromCut] Scenario with id ${scenarioId} not found. Returning null.`);
      return null;
    }

    const cut = scenario.cuts.find(c => c.id === cutId);
    if (!cut) {
      console.warn(`[ScenarioUseCases.removeResolutionFromCut] Cut with id ${cutId} not found in scenario ${scenarioId}. Returning null.`);
      return null;
    }

    const resolutionsToUpdate = cut.selectedResolutions || [];
    if (resolutionsToUpdate.length === 0) {
      console.warn(`[ScenarioUseCases.removeResolutionFromCut] Cut with id ${cutId} has no selectedResolutions. Cannot remove resolution. Returning null.`);
      return null;
    }

    const updatedResolutions = ResolutionService.removeResolution(
      resolutionsToUpdate,
      resolutionId
    );

    cut.selectedResolutions = updatedResolutions;
    scenario.cuts = scenario.cuts.map(c => (c.id === cutId ? cut : c));
    await this.saveScenario(scenario);

    // Log the state of selectedResolutions for the modified cut before returning
    const finalCut = scenario.cuts.find(c => c.id === cutId);
    console.log('[ScenarioUseCases.removeResolutionFromCut] Final selectedResolutions for cut', cutId, ':', JSON.parse(JSON.stringify(finalCut?.selectedResolutions)));

    return scenario;
  }

  /**
   * 컷 데이터를 기반으로 이미지 생성
   * 컷에서 프롬프트, 해상도, 시드 등의 정보를 추출하여 이미지 생성
   * @param cutId 컷 ID
   * @param prompt 주요 프롬프트
   * @param negativePrompt 네거티브 프롬프트
   * @param characterPrompts 캐릭터 프롬프트 배열
   * @param imageCount 생성할 이미지 수
   * @param width 이미지 너비
   * @param height 이미지 높이
   * @returns 생성된 이미지 데이터 목록
   */
  async generateImagesForCut(
    cutId: string,
    prompt: string,
    negativePrompt: string,
    characterPrompts: string[],
    imageCount: number = 1,
    width: number = 512,
    height: number = 512,
    seed?: number
  ): Promise<ImageData[]> {
    try {
      console.log(`[ScenarioUseCases] generateImagesForCut - cutId: ${cutId}`);
      console.log(`[ScenarioUseCases] prompt: ${prompt}`);
      console.log(`[ScenarioUseCases] negativePrompt: ${negativePrompt}`);
      console.log(`[ScenarioUseCases] characterPrompts: ${JSON.stringify(characterPrompts)}`);
      console.log(`[ScenarioUseCases] imageCount: ${imageCount}, width: ${width}, height: ${height}, seed: ${seed}`);

      if (!cutId || !prompt) {
        throw new Error('cutId 또는 prompt가 유효하지 않습니다.');
      }

      // 시나리오 ID를 찾기 위해 모든 시나리오를 검색
      const scenarios = await this.getAllScenarios();
      let scenarioId = '';
      let cutIndex = -1;

      // 모든 시나리오에서 cutId를 가진 컷 찾기
      for (const scenario of scenarios) {
        const index = scenario.cuts.findIndex(c => c.id === cutId);
        if (index !== -1) {
          scenarioId = scenario.id;
          cutIndex = index;
          break;
        }
      }

      if (!scenarioId || cutIndex === -1) {
        throw new Error(`Cut with id ${cutId} not found in any scenario`);
      }

      console.log(`[ScenarioUseCases] Found scenario: ${scenarioId}, cutIndex: ${cutIndex}`);
      
      // 이미지 생성 시도
      console.log(`[ScenarioUseCases] Attempting to generate images with parameters:`);
      console.log(`  Prompt: ${prompt.substring(0, 100)}...`);
      console.log(`  Negative Prompt: ${negativePrompt?.substring(0, 100) || 'none'}...`);
      console.log(`  Character Prompts: ${characterPrompts?.length || 0} items`);
      console.log(`  Image Count: ${imageCount}`);
      console.log(`  Dimensions: ${width}x${height}`);
      console.log(`  Seed: ${seed || 'random'}`);
      
      const generatedImages = await this.generateImages(
        prompt,
        negativePrompt,
        characterPrompts,
        imageCount,
        width,
        height,
        seed,
        {},
        scenarioId,
        cutIndex
      );
      
      console.log(`[ScenarioUseCases] Successfully generated ${generatedImages.length} images`);
      return generatedImages;
    } catch (error) {
      console.error(`[ScenarioUseCases] Error in generateImagesForCut:`, error);
      console.error(`[ScenarioUseCases] Error details:`, {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cutId,
        prompt: prompt?.substring(0, 100) + '...',
        negativePrompt: negativePrompt?.substring(0, 100) + '...',
        characterPromptsCount: characterPrompts?.length || 0,
        imageCount,
        width,
        height,
        seed
      });
      
      // 오류를 다시 던져서 상위 코드에서 처리할 수 있도록 함
      throw new Error(`이미지 생성 중 오류 발생: ${error.message}`);
    }
  }

  /**
   * 주어진 프롬프트와 파라미터로 이미지 생성
   * 외부 이미지 생성 서비스를 호출하여 이미지 데이터 생성
   * @param mainPrompt 주 프롬프트 내용
   * @param negativePrompt 네거티브 프롬프트 (선택적)
   * @param characterPrompts 캐릭터 프롬프트 문자열 목록 (선택적)
   * @param imageCount 생성할 이미지 수량 (기본값 1)
   * @param width 이미지 너비 (픽셀)
   * @param height 이미지 높이 (픽셀)
   * @param seed 이미지 생성 시드값 (선택적)
   * @param otherParams 기타 추가 파라미터 (선택적)
   * @param scenarioId 시나리오 ID (선택적, 다운로드 시 사용)
   * @param cutIndex 컷 인덱스 (선택적, 다운로드 시 사용)
   * @returns 생성된 이미지 데이터 목록
   */
  async generateImages(
    mainPrompt: string,
    negativePrompt?: string,
    characterPrompts?: string[],
    imageCount: number = 1,
    width: number,
    height: number,
    seed?: number,
    otherParams?: Record<string, any>,
    scenarioId?: string,
    cutIndex?: number
  ): Promise<ImageData[]> {
    console.log('[ScenarioUseCases] generateImages - Parameters:');
    console.log(`  Main Prompt: ${mainPrompt}`);
    console.log(`  Negative Prompt: ${negativePrompt}`);
    console.log(`  Character Prompts: ${JSON.stringify(characterPrompts)}`);
    console.log(`  Image Count: ${imageCount}`);
    console.log(`  Width: ${width}`);
    console.log(`  Height: ${height}`);
    console.log(`  Seed: ${seed}`);
    console.log(`  Other Params: ${JSON.stringify(otherParams)}`);
    console.log(`  Scenario ID: ${scenarioId}`);
    console.log(`  Cut Index: ${cutIndex}`);

    if (!this.imageGenerationService) {
      throw new Error('ImageGenerationService is not configured');
    }
    
    return await this.imageGenerationService.generateImages(
      mainPrompt,
      negativePrompt,
      characterPrompts,
      imageCount,
      width,
      height,
      seed,
      otherParams,
      scenarioId,
      cutIndex
    );
  }

  /**
   * 특정 컷의 대표 이미지 설정
   * @param cutId 대표 이미지를 설정할 컷 ID
   * @param imageUrl 대표 이미지 URL
   */
  async setRepresentativeImage(cutId: string, imageUrl: string): Promise<void> {
    await this.imageRepository.saveRepresentativeImage(cutId, imageUrl);
  }

  /**
   * 가장 최근에 열린 시나리오 조회
   * @returns 최근에 열린 시나리오 객체 또는 없을 경우 null
   */
  async getLastOpenedScenario(): Promise<Scenario | null> {
    return await this.scenarioRepository.getLastOpenedScenario();
  }

  /**
   * 새로운 시나리오 객체 생성
   * 기본 설정과 하나의 기본 컷을 포함한 시나리오 생성
   * @returns 새로운 시나리오 객체
   */
  createNewScenario(): Scenario {
    const newId = uuidv4();
    const now = new Date().toISOString();
    return {
      id: newId,
      name: '새 시나리오',
      description: '',
      cuts: [
        this.createNewCut(true) // 첫 번째 컷은 기본값으로 생성
      ],
      createdAt: now,
      updatedAt: now,
      userId: '', 
      isTemplate: false,
      folderId: null,
      tags: [],
      userSortOrder: null,
    };
  }

  /**
   * 새로운 컷 객체 생성
   * 기본 프롬프트와 해상도 설정을 포함한 컷 생성
   * @returns 새로운 컷 객체
   */
  createNewCut(): Cut {
    const defaultPromptItemId = uuidv4();
    const defaultResolutionId = uuidv4();
    return {
      id: uuidv4(),
      mainPromptItems: [
        {
          id: defaultPromptItemId,
          prompt: '1girl, artist:rella',
          negativePrompt: 'nsfw, blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page',
          probability: 100,
          enabled: true,
        }
      ],
      characterPrompts: [],
      imageCount: 1,
      generatedImages: [],
      representativeImage: null,
      selectedResolutions: [
        {
          id: defaultResolutionId,
          width: 1216,
          height: 832,
          probability: 100,
          enabled: true,
        }
      ],
      // seed, otherParams는 선택적 필드로 기본값은 설정하지 않음
    };
  }

  // 네거티브 프롬프트 히스토리 가져오기
  getNegativePromptHistory(): string[] {
    try {
      const historyJson = localStorage.getItem('negativePromptHistory');
      if (historyJson) {
        const history = JSON.parse(historyJson);
        if (Array.isArray(history) && history.every(item => typeof item === 'string')) {
          return history;
        }
      }
    } catch (error) {
      console.error('Error getting negative prompt history:', error);
    }
    return []; // 오류 발생 또는 데이터 없을 시 빈 배열 반환
  }

  // 네거티브 프롬프트 히스토리 저장하기
  saveNegativePromptHistory(history: string[]): void {
    try {
      // 최신 항목이 위로 오도록 하고, 중복 제거, 최대 갯수 제한 (예: 50개)
      const uniqueHistory = [...new Set(history)].slice(0, 50);
      localStorage.setItem('negativePromptHistory', JSON.stringify(uniqueHistory));
    } catch (error) {
      console.error('Error saving negative prompt history:', error);
    }
  }
}

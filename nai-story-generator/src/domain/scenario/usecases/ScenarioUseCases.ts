import { Scenario, Cut, ImageData, CharacterPrompt, PromptItem, ResolutionSetting } from '../entities';
import { ScenarioRepository, ImageGenerationService, ImageRepository } from '../ports';
import { v4 as uuidv4 } from 'uuid';

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

  async deleteScenario(id: string): Promise<void> {
    await this.scenarioRepository.deleteScenario(id);
  }

  /**
   * 컷 데이터를 기반으로 이미지 생성
   * 컷에서 프롬프트, 해상도, 시드 등의 정보를 추출하여 이미지 생성
   * @param cut 이미지를 생성할 컷 객체
   * @returns 생성된 이미지 데이터 목록
   */
  async generateImagesForCut(cut: Cut): Promise<ImageData[]> {
    if (!cut) throw new Error('Cut data is required to generate images.');

    console.log('[ScenarioUseCases] generateImagesForCut - Received Cut:', 
      JSON.parse(JSON.stringify(cut)));

    // 메인 프롬프트 및 네거티브 프롬프트 추출 (첫 번째 활성화된 PromptItem 사용 가정)
    const mainPromptItem = cut.mainPromptItems?.find(item => item.enabled !== false) || cut.mainPromptItems?.[0];
    const mainPrompt = mainPromptItem?.prompt || '';
    const negativePrompt = mainPromptItem?.negativePrompt || '';
    console.log(`[ScenarioUseCases] Main Prompt from Cut: ${mainPrompt}`);
    console.log(`[ScenarioUseCases] Negative Prompt from Cut: ${negativePrompt}`);

    // 캐릭터 프롬프트 추출 (각 CharacterPrompt의 첫 번째 활성화된 PromptItem 사용 가정)
    const activeCharacterPrompts = (cut.characterPrompts || [])
      .filter(cp => cp.enabled)
      .map(cp => {
        const charPromptItem = cp.promptItems?.find(item => item.enabled !== false) || cp.promptItems?.[0];
        return charPromptItem?.prompt || '';
      })
      .filter(prompt => prompt); // 빈 문자열 제거
    console.log('[ScenarioUseCases] Active Character Prompts from Cut:', activeCharacterPrompts);

    // 해상도 선택 (첫 번째 활성화된 ResolutionSetting 사용 가정)
    const resolutionSetting = cut.selectedResolutions?.find(res => res.enabled !== false) || cut.selectedResolutions?.[0];
    const width = resolutionSetting?.width || 1024; // 기본값 또는 오류 처리 필요
    const height = resolutionSetting?.height || 1024; // 기본값 또는 오류 처리 필요
    console.log(`[ScenarioUseCases] Selected Resolution: ${width}x${height}`);

    const images = await this.generateImages(
      mainPrompt,
      negativePrompt,
      activeCharacterPrompts,
      cut.imageCount,
      width,
      height,
      cut.seed,
      cut.otherParams
    );
    return images;
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
    otherParams?: Record<string, any>
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
      otherParams
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
    return {
      id: uuidv4(),
      name: '새 시나리오',
      leadingPromptItems: [], // 시나리오 전체에 적용되는 앞쪽 프롬프트 항목
      trailingPromptItems: [], // 시나리오 전체에 적용되는 뒤쪽 프롬프트 항목
      cuts: [this.createNewCut()],
      createdAt: new Date(),
      updatedAt: new Date()
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
}

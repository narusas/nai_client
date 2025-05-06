import { Scenario, Cut, ImageData, CharacterPrompt, PromptItem, ResolutionSetting } from '../entities';
import { ScenarioRepository, ImageGenerationService, ImageRepository } from '../ports';
import { v4 as uuidv4 } from 'uuid';

export class ScenarioUseCases {
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
      width, // 추가
      height, // 추가
      cut.seed,
      cut.otherParams
    );
    return images;
  }

  async generateImages(
    mainPrompt: string,
    negativePrompt?: string,
    characterPrompts?: string[],
    imageCount: number = 1,
    width: number, // 추가
    height: number, // 추가
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
    // ImageGenerationService.generateImages 시그니처도 width, height를 받도록 수정 필요
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

  async setRepresentativeImage(cutId: string, imageUrl: string): Promise<void> {
    await this.imageRepository.saveRepresentativeImage(cutId, imageUrl);
  }

  async getLastOpenedScenario(): Promise<Scenario | null> {
    return await this.scenarioRepository.getLastOpenedScenario();
  }

  createNewScenario(): Scenario {
    return {
      id: uuidv4(),
      name: '새 시나리오',
      leadingPromptItems: [], // 추가
      trailingPromptItems: [], // 추가
      cuts: [this.createNewCut()],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

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
      // seed, otherParams는 필요시 기본값 설정
    };
  }
}

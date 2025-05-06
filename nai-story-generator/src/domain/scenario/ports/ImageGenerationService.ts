import { CharacterPrompt, ImageData } from '../entities'; // CharacterPrompt는 이제 직접 사용되지 않을 수 있지만, 참조를 위해 남겨둘 수 있습니다.

export interface ImageGenerationService {
  generateImages(
    mainPrompt: string,
    negativePrompt?: string, // 옵셔널 string으로 변경
    characterPrompts?: string[], // string[] 옵셔널로 변경
    imageCount: number,
    width: number, // 추가
    height: number, // 추가
    seed?: number, // number 옵셔널로 변경
    otherParams?: Record<string, any> // Record<string, any> 또는 any로 통일
  ): Promise<ImageData[]>;
}

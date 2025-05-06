import { ImageGenerationService } from '../domain/scenario/ports/ImageGenerationService';
import { ImageData } from '../domain/scenario/entities'; 
import { useNaiApiService } from '../services/naiApiService';
import { v4 as uuidv4 } from 'uuid';

export class NaiApiAdapter implements ImageGenerationService {
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
    const { generateImages: naiGenerateImages } = useNaiApiService();

    const finalParams = {
      ...(otherParams || {}),
      width,
      height,
      seed
    };

    const imageUrls = await naiGenerateImages(
      mainPrompt,
      imageCount,
      negativePrompt,
      characterPrompts, 
      finalParams
    );

    const imageDataArray: ImageData[] = imageUrls.map(url => ({
      id: uuidv4(),
      url: url,
      createdAt: new Date(),
      mainPrompt,
      negativePrompt,
      seed,
      width,
      height,
    }));

    return imageDataArray;
  }
}

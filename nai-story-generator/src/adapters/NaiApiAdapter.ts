import { ImageGenerationService } from '../domain/scenario/ports/ImageGenerationService';
import { ImageData } from '../domain/scenario/entities'; 
import { useNaiApiService } from '../services/naiApiService';
import { saveGeneratedImage } from '../services/imageDbService';
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
    otherParams?: Record<string, any>,
    scenarioId?: string,
    cutIndex?: number,
    onImageGenerated?: (imageData: ImageData) => void
  ): Promise<ImageData[]> {
    const { generateImages: naiGenerateImages } = useNaiApiService();

    const finalParams = {
      ...(otherParams || {}),
      width,
      height,
      seed
    };

    // 이미지가 한 장씩 생성될 때마다 호출될 콜백 함수 정의
    const onSingleImageGenerated = onImageGenerated ? (imageUrl: string) => {
      // 이미지 URL에서 ImageData 객체 생성
      const imageId = uuidv4();
      const imageData: ImageData = {
        id: imageId,
        url: imageUrl,
        createdAt: new Date(),
        mainPrompt,
        negativePrompt,
        characterPrompts,
        seed,
        width,
        height,
        scenarioId,
        cutId: cutIndex?.toString()
      };
      
      // 이미지 데이터 저장
      saveGeneratedImage(imageData).catch(error => {
        console.error('이미지 저장 중 오류:', error);
      });
      
      // 콜백 함수 호출
      onImageGenerated(imageData);
    } : undefined;
    
    const imageUrls = await naiGenerateImages(
      mainPrompt,
      imageCount,
      negativePrompt,
      characterPrompts, 
      finalParams,
      scenarioId,
      cutIndex,
      onSingleImageGenerated // 이미지가 한 장씩 생성될 때마다 호출될 콜백 함수 전달
    );

    const imageDataArray: ImageData[] = imageUrls.map(url => {
      const imageId = uuidv4();
      const imageData: ImageData = {
        id: imageId,
        url: url,
        createdAt: new Date(),
        mainPrompt,
        negativePrompt,
        characterPrompts,
        seed,
        width,
        height,
        scenarioId,
        cutId: cutIndex?.toString()
      };
      
      // 이미지 데이터 저장 (콜백이 없는 경우에도 저장)
      if (!onSingleImageGenerated) {
        saveGeneratedImage(imageData).catch(error => {
          console.error('이미지 저장 중 오류:', error);
        });
      }
      
      return imageData;
    });

    return imageDataArray;
  }
}

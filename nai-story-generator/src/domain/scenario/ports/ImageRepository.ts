import { ImageData } from '../entities';

/**
 * 이미지 데이터 저장소 인터페이스
 * 이미지 데이터와 대표 이미지 정보를 저장하는 기능을 정의
 */
export interface ImageRepository {
  /**
   * 생성된 이미지 데이터를 저장
   * @param image 저장할 이미지 데이터 객체
   */
  saveImage(image: ImageData): Promise<void>;

  /**
   * 특정 컷의 대표 이미지 URL을 저장
   * @param cutId 대표 이미지를 설정할 컷 ID
   * @param imageUrl 대표 이미지 URL
   */
  saveRepresentativeImage(cutId: string, imageUrl: string): Promise<void>;

  /**
   * 생성된 이미지 저장
   * @param imageData 이미지 데이터 객체
   */
  saveGeneratedImage(imageData: ImageData): Promise<void>;

  /**
   * 시나리오의 모든 생성된 이미지 가져오기
   * @param scenarioId 시나리오 ID
   * @returns 이미지 데이터 배열
   */
  getGeneratedImagesForScenario(scenarioId: string): Promise<ImageData[]>;
}

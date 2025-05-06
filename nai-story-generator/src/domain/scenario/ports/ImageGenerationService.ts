import { ImageData } from '../entities';

/**
 * 이미지 생성 서비스 인터페이스
 * 외부 AI 이미지 생성 API를 호출하여 이미지를 생성하는 기능을 정의
 */
export interface ImageGenerationService {
  /**
   * 주어진 프롬프트와 파라미터로 이미지를 생성하는 메서드
   * @param mainPrompt 주 프롬프트 내용
   * @param negativePrompt 네거티브 프롬프트 (선택적)
   * @param characterPrompts 캐릭터 프롬프트 문자열 목록 (선택적)
   * @param imageCount 생성할 이미지 수량
   * @param width 이미지 너비 (픽셀)
   * @param height 이미지 높이 (픽셀)
   * @param seed 이미지 생성 시드값 (선택적)
   * @param otherParams 기타 추가 파라미터 (선택적)
   * @returns 생성된 이미지 데이터 목록
   */
  generateImages(
    mainPrompt: string,
    negativePrompt?: string,
    characterPrompts?: string[],
    imageCount: number,
    width: number,
    height: number,
    seed?: number,
    otherParams?: Record<string, any>
  ): Promise<ImageData[]>;
}

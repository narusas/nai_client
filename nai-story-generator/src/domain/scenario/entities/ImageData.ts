/**
 * 생성된 이미지 데이터 정보
 * 이미지 생성 결과와 생성에 사용된 설정을 포함
 * url 필드는 제거하고 IndexedDB에서 id를 기반으로 이미지를 가져오도록 변경
 */
export interface ImageData {
  id: string; // 이미지 식별자
  thumbnailUrl: string; // 70x70 크기의 썸네일 이미지 URL
  mainPrompt?: string; // 생성 시 사용된 메인 프롬프트
  characterPrompts?: string[]; // 생성 시 사용된 캐릭터 프롬프트 문자열 목록
  negativePrompt?: string; // 생성 시 사용된 네거티브 프롬프트
  width: number; // 이미지 너비 (픽셀)
  height: number; // 이미지 높이 (픽셀)
  seed?: number; // 이미지 생성에 사용된 시드값
  createdAt: Date; // 이미지 생성 일시
  // otherParams?: Record<string, any>; // 필요시 생성에 사용된 기타 파라미터 저장
}

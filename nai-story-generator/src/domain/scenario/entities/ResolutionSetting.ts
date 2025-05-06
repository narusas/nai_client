/**
 * 이미지 생성에 사용될 해상도 설정 정보
 * 하나의 컷에서 여러 해상도 설정을 선택할 수 있음
 */
export interface ResolutionSetting {
  id: string; // 해상도 설정 식별자
  width: number; // 이미지 너비 (픽셀)
  height: number; // 이미지 높이 (픽셀)
  probability: number; // 0-100 사이의 정수, 총합 100%
  enabled?: boolean; // 이 해상도 설정의 활성화 여부 (선택적)
}

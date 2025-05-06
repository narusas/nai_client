export interface ResolutionSetting {
  id: string;
  width: number;
  height: number;
  probability: number; // 0-100 사이의 정수, 총합 100%
  enabled?: boolean; // 이 해상도 설정의 활성화 여부 (옵션)
}

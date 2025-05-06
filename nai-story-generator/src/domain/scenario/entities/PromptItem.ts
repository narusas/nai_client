export interface PromptItem {
  id: string;
  prompt: string;
  negativePrompt?: string; // 네거티브 프롬프트는 선택 사항일 수 있습니다.
  probability: number; // 0-100 사이의 정수로 가정
  enabled?: boolean; // 프롬프트 아이템 자체의 활성화 여부 (옵션)
}

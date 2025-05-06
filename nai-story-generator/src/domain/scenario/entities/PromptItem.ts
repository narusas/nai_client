/**
 * 이미지 생성에 사용되는 프롬프트 항목 정보
 * 메인 프롬프트 또는 캐릭터 프롬프트에서 사용됨
 */
export interface PromptItem {
  id: string; // 프롬프트 항목 식별자
  prompt: string; // 프롬프트 내용
  negativePrompt?: string; // 네거티브 프롬프트 (선택적)
  probability: number; // 0-100 사이의 정수, 해당 프롬프트가 선택될 확률
  enabled?: boolean; // 프롬프트 항목 활성화 여부 (선택적)
}

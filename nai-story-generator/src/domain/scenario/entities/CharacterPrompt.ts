import { PromptItem } from './PromptItem';

export interface CharacterPrompt {
  id: string; // 각 캐릭터 프롬프트 그룹을 식별하기 위한 ID
  name: string;
  promptItems: PromptItem[]; // 기존 prompt, negativePrompt 대신 사용
  position?: { // 위치 정보는 선택적으로 유지
    x: number;
    y: number;
  };
  enabled: boolean; // 이 캐릭터 프롬프트 그룹 전체의 활성화 여부
}

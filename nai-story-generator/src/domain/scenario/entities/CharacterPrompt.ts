import { PromptItem } from './PromptItem';

/**
 * 이미지 생성에 사용되는 캐릭터 프롬프트 그룹 정보
 * 하나의 컷에서 여러 캐릭터 프롬프트 그룹을 사용할 수 있음
 */
export interface CharacterPrompt {
  id: string; // 캐릭터 프롬프트 그룹 식별자
  name: string; // 캐릭터 프롬프트 그룹 이름
  promptItems: PromptItem[]; // 프롬프트 항목 목록
  position?: { // 캐릭터 위치 정보 (선택적)
    x: number; // X 좌표
    y: number; // Y 좌표
  };
  enabled: boolean; // 캐릭터 프롬프트 그룹 활성화 여부
}

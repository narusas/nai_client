// import { CharacterPrompt } from './CharacterPrompt'; // CharacterPrompt 객체 대신 문자열 배열로 변경 시 불필요

export interface ImageData {
  id: string;
  url: string;
  mainPrompt?: string; // 생성 시 사용된 메인 프롬프트
  characterPrompts?: string[]; // 생성 시 사용된 캐릭터 프롬프트 문자열 목록
  negativePrompt?: string; // 생성 시 사용된 네거티브 프롬프트
  width: number; // 생성된 이미지의 너비
  height: number; // 생성된 이미지의 높이
  seed?: number; // 생성 시 사용된 시드
  createdAt: Date; // 생성 일시
  // otherParams?: Record<string, any>; // 필요시 생성에 사용된 기타 파라미터 저장
}

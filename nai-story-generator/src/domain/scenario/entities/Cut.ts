import { CharacterPrompt } from './CharacterPrompt';
import { ImageData } from './ImageData';
import { PromptItem } from './PromptItem';
import { ResolutionSetting } from './ResolutionSetting';

/**
 * 이미지 생성을 위한 컷 단위 정보를 담는 인터페이스
 * 하나의 컷은 여러 이미지를 생성할 수 있음
 */
export interface Cut {
  id: string; // 컷 식별자
  mainPromptItems: PromptItem[]; // 메인 프롬프트 항목 목록
  characterPrompts: CharacterPrompt[]; // 캐릭터 프롬프트 목록
  imageCount: number; // 생성할 이미지 수량
  generatedImages: ImageData[]; // 이 컷에서 생성된 이미지 목록
  representativeImage: string | null; // 대표 이미지 URL (없을 경우 null)
  selectedResolutions: ResolutionSetting[]; // 선택된 해상도 설정 목록
  seed?: number; // 이미지 생성에 사용될 시드값 (선택적)
  otherParams?: Record<string, any>; // 기타 추가 파라미터 (필요시)
}

import { CharacterPrompt } from './CharacterPrompt';
import { ImageData } from './ImageData';
import { PromptItem } from './PromptItem';
import { ResolutionSetting } from './ResolutionSetting';

export interface Cut {
  id: string;
  mainPromptItems: PromptItem[];
  characterPrompts: CharacterPrompt[];
  imageCount: number;
  generatedImages: ImageData[];
  representativeImage: string | null;
  selectedResolutions: ResolutionSetting[];
  seed?: number;
  otherParams?: Record<string, any>;
}

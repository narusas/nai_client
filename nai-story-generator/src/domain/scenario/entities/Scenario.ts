import { Cut } from './Cut';
import { PromptItem } from './PromptItem';

export interface Scenario {
  id: string;
  name: string;
  leadingPromptItems?: PromptItem[];
  trailingPromptItems?: PromptItem[];
  cuts: Cut[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl?: string;
}

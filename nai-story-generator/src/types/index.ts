// NAI 설정 타입
export interface NaiSettings {
  apiKey: string;
  model: string;
  resolution: string;
  steps: number;
  scale: number;
  seed: number | null;
  sampler: string;
}

// 캐릭터 프롬프트 타입
export interface CharacterPrompt {
  name: string;
  prompt: string;
}

// 컷 타입
export interface Cut {
  id: number;
  mainPrompt: string;
  characterPrompts: CharacterPrompt[];
  imageCount: number;
  generatedImages: string[];
  representativeImage: string | null;
}

// 시나리오 타입
export interface Scenario {
  id: string;
  name: string;
  cuts: Cut[];
  createdAt: string;
}

// 갤러리 이미지 타입
export interface GalleryImage {
  id: string;
  url: string;
  scenarioName: string;
  cutIndex: number;
  createdAt: string;
  filePath?: string;
}

// NAI API 응답 타입
export interface NaiApiResponse {
  images: string[];
  id: string;
}

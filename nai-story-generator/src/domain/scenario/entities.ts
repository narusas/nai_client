// 기존 entities.ts 파일 내용이 있다면 그 아래에 추가합니다.
// 파일이 없다면 새로 생성합니다.

// 기존 import 및 정의들이 여기에 있다고 가정
// export interface Scenario { ... }
// export interface Cut { ... }
// ... etc ...

export interface ScenarioSummary {
  id: string;
  name: string;
  updatedAt: string; 
  createdAt: string;
  uniqueId?: number; // 스토어의 Scenario 인터페이스와 맞춤
  // representativeImage?: string; // 필요한 경우 추가 (예: 첫번째 컷의 첫번째 이미지 URL)
}

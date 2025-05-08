<template>
  <div class="scenario-editor-container">
    <!-- 로딩 인디케이터 -->
    <div v-if="isGlobalLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>시나리오 로딩 중...</p>
    </div>

    <!-- 시나리오 관리 헤더 -->
    <div class="scenario-header">
      <div class="scenario-title-container">
        <input 
          v-model="currentScenario.name" 
          class="scenario-title-input" 
          placeholder="시나리오 제목"
          @blur="handleSaveScenario"
        />
      </div>
      
      <div class="scenario-actions">
        <button @click="showScenarioList = true" class="action-button">
          <font-awesome-icon icon="fa-solid fa-folder-open" />
        </button>
        <button @click="handleNewScenario" class="action-button">
          <font-awesome-icon icon="fa-solid fa-plus" />
        </button>
        <button @click="handleSaveScenario" class="action-button primary">
          <font-awesome-icon icon="fa-solid fa-save" />
        </button>
      </div>
    </div>

    <!-- 전역 프롬프트 패널 -->
    <div class="global-prompt-panels">
      <!-- 선행 프롬프트 패널 -->
      <div class="prompt-panel">
        <div class="panel-header" @click="toggleLeadingPromptPanel">
          <h3>선행 프롬프트</h3>
          <font-awesome-icon 
            :icon="showLeadingPromptPanel ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" 
            class="toggle-icon"
          />
        </div>
        
        <div v-if="showLeadingPromptPanel" class="panel-content">
          <PromptItemList
            v-model="currentScenario.leadingPromptItems"
            add-button-text="선행 프롬프트 추가"
            @remove-prompt-item="removeLeadingPromptItem"
            @toggle-enabled="toggleLeadingPromptItemEnabled"
            @update-probability="updateLeadingPromptItemProbability"
            @update-prompt="handleUpdateLeadingPrompt"
          />
        </div>
      </div>
      
      <!-- 후행 프롬프트 패널 -->
      <div class="prompt-panel">
        <div class="panel-header" @click="toggleTrailingPromptPanel">
          <h3>후행 프롬프트</h3>
          <font-awesome-icon 
            :icon="showTrailingPromptPanel ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" 
            class="toggle-icon"
          />
        </div>
        
        <div v-if="showTrailingPromptPanel" class="panel-content">
          <PromptItemList
            v-model="currentScenario.trailingPromptItems"
            add-button-text="후행 프롬프트 추가"
            @remove-prompt-item="removeTrailingPromptItem"
            @toggle-enabled="toggleTrailingPromptItemEnabled"
            @update-probability="updateTrailingPromptItemProbability"
            @update-prompt="handleUpdateTrailingPrompt"
          />
        </div>
      </div>
    </div>

    <!-- 컷 리스트 섹션 -->
    <div class="cuts-section">
      <div class="cuts-header">
        <div class="cuts-header-left">
          <h3>컷 목록</h3>
          <button v-if="showCutList" @click="handleAddCut" class="add-cut-button-header">
            <font-awesome-icon icon="fa-solid fa-plus" />
            <span>새 컷 추가</span>
          </button>
        </div>
        <div class="toggle-button" @click="toggleCutListVisibility">
          <font-awesome-icon 
            :icon="showCutList ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" 
            class="toggle-icon"
          />
        </div>
      </div>
      
      <div v-if="showCutList" class="cuts-container" ref="cutsContainerEl">
        <div v-if="currentScenario.cuts.length === 0" class="no-cuts-message">
          <p>컷이 없습니다. 새 컷을 추가해주세요.</p>
        </div>
        
        <div v-else class="cuts-list">
          <CutCard 
            v-for="(cut, index) in currentScenario.cuts" 
            :key="cut.uniqueId" 
            :scenarioId="currentScenario.id"
            :cutData="cut" 
            :cutIndex="index"
            :is-generating-image="isGeneratingImageForCut(cut.id)"
            :negative-prompt-history="negativePromptHistory"
            @update:cutData="handleUpdateCut(index, $event)"
            @removeCut="handleRemoveCut($event)"
            @generateImages="handleGenerateImagesForCut($event)"
            @selectRepresentativeImageInCut="handleSelectRepresentativeImage($event)"
            @request-resolution-update="handleResolutionUpdate($event)"
            @view-image="handleViewImage($event)"
          />
        </div>
      </div>
    </div>

    <!-- 시나리오 목록 모달 -->
    <div v-if="showScenarioList" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>시나리오 목록</h2>
          <button @click="showScenarioList = false" class="close-button">
            <font-awesome-icon icon="fa-solid fa-times" />
          </button>
        </div>
        
        <div class="modal-body">
          <div v-if="allScenarios.length === 0" class="no-scenarios-message">
            <p>저장된 시나리오가 없습니다.</p>
          </div>
          
          <div v-else class="scenario-list">
            <div 
              v-for="scenario in allScenarios" 
              :key="scenario.id" 
              class="scenario-item"
              :class="{ 'active': scenario.id === currentScenario.id }"
            >
              <div class="scenario-item-info" @click="handleSelectScenarioFromModal(scenario.id)">
                <h3>{{ scenario.name }}</h3>
                <p>{{ new Date(scenario.updatedAt).toLocaleString() }}</p>
              </div>
              
              <button 
                v-if="scenario.id !== currentScenario.id" 
                @click="handleDeleteScenarioFromModal(scenario.id)" 
                class="delete-button"
              >
                <font-awesome-icon icon="fa-solid fa-trash" />
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="handleNewScenarioFromModal" class="action-button primary">
            <font-awesome-icon icon="fa-solid fa-plus" />
            <span>새 시나리오 생성</span>
          </button>
          <button @click="showScenarioList = false" class="action-button">
            <span>닫기</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, provide } from 'vue';
import { useNaiSettingsStore } from '../stores/naiSettings';
import { useScenarioStore } from '../stores/scenario';
import { cancelImageGeneration } from '../services/naiApiService'; // 이미지 생성 취소 함수 추가
import { ScenarioUseCases } from '@/domain/scenario/usecases/ScenarioUseCases';
import { 
  Scenario, 
  Cut, 
  CharacterPrompt as CharacterPromptType, 
  ImageData, 
  PromptItem, 
  ResolutionSetting, 
  type ScenarioSummary 
} from '@/domain/scenario/entities';
import { NaiSettingsSummary } from '@/types';
import { ImageRepository } from '@/domain/scenario/ports/ImageRepository';
import { NaiApiAdapter } from '@/adapters/NaiApiAdapter';
import { ScenarioRepositoryImpl } from '@/adapters/repositories/ScenarioRepositoryImpl';
import CutCard from './CutCard.vue';
import PromptItemList from './PromptItemList.vue';
import { v4 as uuidv4 } from 'uuid';
import { saveGeneratedImage, getGeneratedImagesForScenario, saveRepresentativeImage } from '../services/imageDbService';

// ImageRepository 구현
const imageRepository: ImageRepository = {
  async saveImage(imageData: ImageData): Promise<void> {
    console.log('ImageRepository: saveImage called', imageData);
    // 이미지 저장 로직 구현
  },
  async saveRepresentativeImage(cutId: string, imageUrl: string): Promise<void> {
    console.log('ImageRepository: saveRepresentativeImage called', cutId);
    await saveRepresentativeImage(cutId, imageUrl, currentScenario.value?.id || '');
  },
  async saveGeneratedImage(imageId: string, imageUrl: string, scenarioId: string, cutId: string): Promise<void> {
    console.log('ImageRepository: saveGeneratedImage called', imageId, cutId);
    await saveGeneratedImage(imageId, imageUrl, scenarioId, cutId);
  },
  async getGeneratedImagesForScenario(scenarioId: string): Promise<{ imageId: string; imageUrl: string; cutId: string }[]> {
    console.log('ImageRepository: getGeneratedImagesForScenario called', scenarioId);
    return await getGeneratedImagesForScenario(scenarioId);
  }
};

// --- DI Setup ---
const scenarioRepository = new ScenarioRepositoryImpl();
const scenarioUseCases = new ScenarioUseCases(scenarioRepository, new NaiApiAdapter(), imageRepository);
const scenarioStore = useScenarioStore();

const negativePromptHistoryList = ref<string[]>([]); 

// --- Reactive State ---
const currentScenario = ref<Scenario>(scenarioUseCases.createNewScenario());
const allScenarios = ref<ScenarioSummary[]>([]);
const showScenarioList = ref(false);
const showNegativeHistory = ref(false);
const negativePromptHistory = ref<string[]>(['nsfw, blurry', 'low quality, worst quality', 'text, watermark']); 
const selectedCutForHistory = ref<Cut | null>(null);
const cutsContainerEl = ref<HTMLElement | null>(null);
const isGlobalLoading = ref(false);
const cutImageGenerationStatus = ref<Record<string, boolean>>({}); 
const showCutList = ref(true); 
const showLeadingPromptPanel = ref(true);
const showTrailingPromptPanel = ref(true);

// --- Computed Properties ---
const isGeneratingImageForCut = (cutId: string | undefined): boolean => {
  return !!cutId && !!cutImageGenerationStatus.value[cutId];
};

// cutImageGenerationStatus 감시하여 전역 이미지 생성 상태 업데이트
watch(cutImageGenerationStatus, (newStatus) => {
  const isAnyGenerating = Object.values(newStatus).some(status => status === true);
  scenarioStore.setAnyImageGenerating(isAnyGenerating);
}, { deep: true });

// ESC 키 이벤트 핸들러 - 이미지 생성 취소
const handleKeyDown = (event: KeyboardEvent) => {
  // ESC 키가 눌렸을 때
  if (event.key === 'Escape') {
    // 이미지 생성 중인지 확인
    const isGenerating = Object.values(cutImageGenerationStatus.value).some(status => status === true);
    if (isGenerating) {
      console.log('[ScenarioEditor] ESC 키 감지, 이미지 생성 취소 요청');
      // 이미지 생성 취소 함수 호출
      cancelImageGeneration();
    }
  }
};

// 컴포넌트 마운트 시 이벤트 리스너 등록
onMounted(() => {
  // ESC 키 이벤트 리스너 등록
  window.addEventListener('keydown', handleKeyDown);
  
  // 시나리오 목록 불러오기
  loadAllScenarioSummaries();
});

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  // ESC 키 이벤트 리스너 제거
  window.removeEventListener('keydown', handleKeyDown);
});

// --- Methods ---
// --- UI Toggles ---
const toggleCutListVisibility = () => {
  showCutList.value = !showCutList.value;
};

const toggleLeadingPromptPanel = () => {
  showLeadingPromptPanel.value = !showLeadingPromptPanel.value;
};

const toggleTrailingPromptPanel = () => {
  showTrailingPromptPanel.value = !showTrailingPromptPanel.value;
};

// 선행 프롬프트 관리
function removeLeadingPromptItem(index: number) {
  if (!currentScenario.value || !currentScenario.value.leadingPromptItems) return;
  
  currentScenario.value.leadingPromptItems.splice(index, 1);
}

function toggleLeadingPromptItemEnabled(index: number, enabled: boolean) {
  if (!currentScenario.value || !currentScenario.value.leadingPromptItems) return;
  
  currentScenario.value.leadingPromptItems[index].enabled = enabled;
}

function updateLeadingPromptItemProbability(index: number, probability: number) {
  if (!currentScenario.value || !currentScenario.value.leadingPromptItems) return;
  
  // 확률은 0-100 사이의 값으로 제한
  const validProbability = Math.max(0, Math.min(100, probability));
  currentScenario.value.leadingPromptItems[index].probability = validProbability;
}

function updateLeadingPromptItem(index: number, field: 'prompt' | 'negativePrompt', value: string) {
  if (!currentScenario.value || !currentScenario.value.leadingPromptItems || !currentScenario.value.leadingPromptItems[index]) return;
  currentScenario.value.leadingPromptItems[index][field] = value;
  // 변경 사항 저장 로직 (예: handleSaveScenario() 또는 디바운스된 저장)을 고려할 수 있습니다.
}

function handleUpdateLeadingPrompt(payload: { index: number, field: 'prompt' | 'negativePrompt', value: string }) {
  updateLeadingPromptItem(payload.index, payload.field, payload.value);
}

// 후행 프롬프트 관리
function removeTrailingPromptItem(index: number) {
  if (!currentScenario.value || !currentScenario.value.trailingPromptItems) return;
  
  currentScenario.value.trailingPromptItems.splice(index, 1);
}

function toggleTrailingPromptItemEnabled(index: number, enabled: boolean) {
  if (!currentScenario.value || !currentScenario.value.trailingPromptItems) return;
  
  currentScenario.value.trailingPromptItems[index].enabled = enabled;
}

function updateTrailingPromptItemProbability(index: number, probability: number) {
  if (!currentScenario.value || !currentScenario.value.trailingPromptItems) return;
  
  // 확률은 0-100 사이의 값으로 제한
  const validProbability = Math.max(0, Math.min(100, probability));
  currentScenario.value.trailingPromptItems[index].probability = validProbability;
}

function updateTrailingPromptItem(index: number, field: 'prompt' | 'negativePrompt', value: string) {
  if (!currentScenario.value || !currentScenario.value.trailingPromptItems || !currentScenario.value.trailingPromptItems[index]) return;
  currentScenario.value.trailingPromptItems[index][field] = value;
  // 변경 사항 저장 로직을 고려할 수 있습니다.
}

function handleUpdateTrailingPrompt(payload: { index: number, field: 'prompt' | 'negativePrompt', value: string }) {
  updateTrailingPromptItem(payload.index, payload.field, payload.value);
}

// Scenario Management
async function handleNewScenario() {
  currentScenario.value = scenarioUseCases.createNewScenario();
  // 기본 선행/후행 프롬프트 초기화
  if (!currentScenario.value.leadingPromptItems) {
    currentScenario.value.leadingPromptItems = [];
  }
  if (!currentScenario.value.trailingPromptItems) {
    currentScenario.value.trailingPromptItems = [];
  }
  await handleSaveScenario(); // Save immediately
}

async function handleLoadScenario(scenarioId: string) {
  currentScenario.value = await scenarioUseCases.getScenarioById(scenarioId);
  // 선행/후행 프롬프트 배열이 없으면 초기화
  if (!currentScenario.value.leadingPromptItems) {
    currentScenario.value.leadingPromptItems = [];
  }
  if (!currentScenario.value.trailingPromptItems) {
    currentScenario.value.trailingPromptItems = [];
  }
}

async function handleSaveScenario() {
  if (!currentScenario.value) return;
  // 선행/후행 프롬프트 배열이 없으면 초기화
  currentScenario.value.leadingPromptItems = currentScenario.value.leadingPromptItems || [];
  currentScenario.value.trailingPromptItems = currentScenario.value.trailingPromptItems || [];

  isGlobalLoading.value = true;
  try {
    const savedScenario = await scenarioStore.saveScenario(currentScenario.value);
    if (savedScenario) {
      currentScenario.value = savedScenario;
    }
    await loadAllScenarioSummaries(); 
    console.log('시나리오 저장 완료 (스토어 사용):', currentScenario.value?.name);
  } catch (error) {
    console.error('Error saving scenario (스토어 사용):', error);
  } finally {
    isGlobalLoading.value = false;
  }
}

async function loadAllScenarioSummaries() { 
  try {
    allScenarios.value = await scenarioUseCases.getAllScenarioSummaries();
  } catch (error) {
    console.error('Error loading scenario summaries:', error);
  }
}

// 시나리오의 모든 이미지 불러오기
async function loadAllImagesForScenario(scenarioId: string) {
  console.log(`시나리오 ${scenarioId}의 모든 이미지 불러오기 시작`);
  try {
    // 시나리오의 모든 이미지 가져오기
    const images = await scenarioUseCases.getGeneratedImagesForScenario(scenarioId);
    console.log(`시나리오 ${scenarioId}의 이미지 ${images.length}개 불러오기 완료`);
    
    // 각 컷에 해당하는 이미지 업데이트
    if (images.length > 0 && currentScenario.value) {
      // 컷별로 이미지 그룹화
      const imagesByCut = images.reduce((acc, img) => {
        if (!acc[img.cutId]) {
          acc[img.cutId] = [];
        }
        acc[img.cutId].push(img);
        return acc;
      }, {} as Record<string, { imageId: string; imageUrl: string; cutId: string }[]>);
      
      // 각 컷에 이미지 업데이트
      for (const cut of currentScenario.value.cuts) {
        const cutImages = imagesByCut[cut.id];
        if (cutImages && cutImages.length > 0) {
          // 기존 generatedImages 배열이 없으면 초기화
          if (!cut.generatedImages) {
            cut.generatedImages = [];
          }
          
          // IndexedDB에서 불러온 이미지를 컷의 generatedImages에 추가
          for (const img of cutImages) {
            // 이미 있는 이미지인지 확인
            const existingImageIndex = cut.generatedImages.findIndex(genImg => 
              genImg.id === img.imageId || genImg.url === img.imageUrl
            );
            
            if (existingImageIndex === -1) {
              // 새 이미지 객체 생성
              const newImageData: ImageData = {
                id: img.imageId,
                url: img.imageUrl,
                createdAt: new Date(),
                width: 0, // 기본값 설정 (실제 값은 이미지에서 추출 불가능)
                height: 0,
                seed: 0,
                characterPrompts: [],
              };
              
              cut.generatedImages.push(newImageData);
              console.log(`컷 ${cut.id}에 이미지 추가: ${img.imageId}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`시나리오 ${scenarioId}의 이미지 불러오기 오류:`, error);
  }
}

async function handleSelectScenarioFromModal(scenarioId: string) {
  closeScenarioListModal();
  isGlobalLoading.value = true;
  try {
    const scenario = await scenarioUseCases.getScenarioById(scenarioId);
    if (scenario) {
      currentScenario.value = scenario;
      
      // 시나리오의 모든 이미지 불러오기
      await loadAllImagesForScenario(scenarioId);
    } else {
      console.warn(`Scenario with id ${scenarioId} not found.`);
      await handleNewScenario(); // Fallback to new if selected not found
    }
    // 삭제 후 목록을 다시 로드하기 위해 loadAllScenarioSummaries 호출
    await loadAllScenarioSummaries();
  } catch (error) {
    console.error('Error selecting scenario:', error);
  } finally {
    isGlobalLoading.value = false;
  }
}

async function handleDeleteScenarioFromModal(scenarioId: string) {
  // Consider adding a confirmation dialog here
  isGlobalLoading.value = true;
  try {
    await scenarioUseCases.deleteScenario(scenarioId);
    await loadAllScenarioSummaries();
    if (currentScenario.value && currentScenario.value.id === scenarioId) {
      await handleNewScenario(); // Load new if current was deleted
    }
  } catch (error) {
    console.error('Error deleting scenario:', error);
  } finally {
    isGlobalLoading.value = false;
  }
}

async function handleNewScenarioFromModal() {
  await handleNewScenario(); // 기존 새 시나리오 생성 로직 호출
  closeScenarioListModal();  // 모달 닫기
}

// Cut Management
function handleAddCut() {
  if (!currentScenario.value) return;
  const newCut = scenarioUseCases.createNewCut();
  // 새로 추가된 컷에 기본 프롬프트 아이템 배열 초기화
  newCut.mainPromptItems = ensurePromptItems(newCut.mainPromptItems);
  currentScenario.value.cuts.push(newCut);
  nextTick(() => {
    cutsContainerEl.value?.scrollTo({ left: cutsContainerEl.value.scrollWidth, behavior: 'smooth' });
  });
  handleSaveScenario(); // 컷 추가 시에는 저장 유지 (명시적 액션으로 간주)
}

function handleRemoveCut(cutId: string) {
  if (!currentScenario.value) return;
  const index = currentScenario.value.cuts.findIndex(cut => cut.id === cutId);
  if (index !== -1) {
    currentScenario.value.cuts.splice(index, 1);
    handleSaveScenario(); // 컷 삭제 시에는 저장 유지 (명시적 액션으로 간주)
  }
}

function handleUpdateCut(index: number, updatedCut: Cut) {
  if (currentScenario.value && currentScenario.value.cuts[index]) {
    console.log(`[ScenarioEditor] handleUpdateCut called for index ${index}. Updated cut data:`, JSON.parse(JSON.stringify(updatedCut)));
    
    // 시나리오 복사
    const updatedScenario = JSON.parse(JSON.stringify(currentScenario.value));
    
    // 컷 업데이트
    updatedScenario.cuts[index] = updatedCut;
    updatedScenario.updatedAt = new Date().toISOString();
    
    // 시나리오 갱신
    currentScenario.value = updatedScenario;
    
    console.log('[ScenarioEditor] currentScenario.value.cuts after update:', JSON.parse(JSON.stringify(currentScenario.value.cuts)));
    
    // 자동 저장 제거 - 명시적 저장 버튼 또는 이미지 생성 시에만 저장
    // handleSaveScenario();
  } else {
    console.error(`[ScenarioEditor] handleUpdateCut: Cut not found at index ${index}`);
  }
}

// 대표 이미지 선택 처리
function handleSelectRepresentativeImage(payload: { cutId: string, imageUrl: string }) {
  if (!currentScenario.value) return;
  const { cutId, imageUrl } = payload;
  const cutIndex = currentScenario.value.cuts.findIndex(cut => cut.id === cutId);
  
  if (cutIndex !== -1) {
    currentScenario.value.cuts[cutIndex].representativeImage = imageUrl;
    // 이미지 저장소에도 대표 이미지 정보 저장
    scenarioUseCases.saveRepresentativeImage(cutId, imageUrl).catch(error => {
      console.error('대표 이미지 저장 실패:', error);
    });
  }
}

// 해상도 업데이트 처리
function handleResolutionUpdate(payload: any) {
  if (!currentScenario.value) return;
  const { cutId, resolutions } = payload;
  const cutIndex = currentScenario.value.cuts.findIndex(cut => cut.id === cutId);
  
  if (cutIndex !== -1) {
    currentScenario.value.cuts[cutIndex].selectedResolutions = resolutions;
    console.log(`[ScenarioEditor] Resolution updated for cut ${cutId}:`, resolutions);
  }
}

// 이미지 뷰어 열기 처리
function handleViewImage(payload: any) {
  console.log('[ScenarioEditor] View image:', payload);
  // payload 구조 확인 및 처리
  if (payload && payload.imageData) {
    // 이미지 데이터가 payload.imageData에 있는 경우 (CutCard에서 전달된 구조)
    scenarioStore.setSelectedImage(payload.imageData.url);
    scenarioStore.setSelectedImageData(payload.imageData);
  } else if (payload && payload.url) {
    // 직접 이미지 데이터가 전달된 경우
    scenarioStore.setSelectedImage(payload.url);
    scenarioStore.setSelectedImageData(payload);
  } else {
    console.error('[ScenarioEditor] Invalid image data structure:', payload);
  }
}

// Image Generation
async function handleGenerateImagesForCut(cutData: Cut) {
  if (!currentScenario.value) {
    console.error('[ScenarioEditor] handleGenerateImagesForCut: currentScenario is null');
    return;
  }
  
  const cut = findCut(cutData.id);
  if (!cut) {
    console.error(`[ScenarioEditor] handleGenerateImagesForCut: Cut with id ${cutData.id} not found`);
    return;
  }

  // 현재 시나리오에서 컷 인덱스 확인
  const cutIndex = currentScenario.value.cuts.findIndex(c => c.id === cut.id);
  if (cutIndex === -1) {
    console.error(`[ScenarioEditor] handleGenerateImagesForCut: Cut with id ${cut.id} not found in current scenario`);
    return;
  }
  
  // 메인 프롬프트 추출
  const mainPrompt = cut.mainPromptItems
    ?.filter((item: any) => item.enabled !== false)
    ?.map((item: any) => item.prompt)
    ?.join(', ') || '';
    
  // 네거티브 프롬프트 추출
  const negativePrompt = cut.negativePromptItems
    ?.filter((item: any) => item.enabled !== false)
    ?.map((item: any) => item.prompt)
    ?.join(', ') || '';

  // 선행/후행 프롬프트 추출
  const leadingPrompts = currentScenario.value.leadingPromptItems
    ?.filter(item => item.enabled !== false)
    ?.map(item => item.prompt)
    ?.join(', ') || '';
  
  const trailingPrompts = currentScenario.value.trailingPromptItems
    ?.filter(item => item.enabled !== false)
    ?.map(item => item.prompt)
    ?.join(', ') || '';

  // 선행/후행 네거티브 프롬프트 추출
  const leadingNegativePrompts = currentScenario.value.leadingPromptItems
    ?.filter(item => item.enabled !== false && item.negativePrompt)
    ?.map(item => item.negativePrompt)
    ?.join(', ') || '';
  
  const trailingNegativePrompts = currentScenario.value.trailingPromptItems
    ?.filter(item => item.enabled !== false && item.negativePrompt)
    ?.map(item => item.negativePrompt)
    ?.join(', ') || '';

  // 최종 프롬프트 구성
  const finalPrompt = [leadingPrompts, mainPrompt, trailingPrompts]
    .filter(Boolean)
    .join(', ');
  
  const finalNegativePrompt = [leadingNegativePrompts, negativePrompt, trailingNegativePrompts]
    .filter(Boolean)
    .join(', ');

  console.log(`[ScenarioEditor] Final Prompt: ${finalPrompt}`);
  console.log(`[ScenarioEditor] Final Negative Prompt: ${finalNegativePrompt}`);

  // 캐릭터 프롬프트 추출
  console.log('[ScenarioEditor] Raw cut.characterPrompts before mapping:', JSON.parse(JSON.stringify(cut.characterPrompts?.map(cp => ({ id: cp.id, name: cp.name, prompt: cp.prompt, enabled: cp.enabled, promptItemsCount: cp.promptItems?.length || 0 })) || 'Not available/Empty')));

  const characterPrompts = cut.characterPrompts
    ?.filter(cp => cp.enabled !== false)
    ?.map(cp => cp.prompt) || [];

    console.log(`[ScenarioEditor] Mapped characterPrompts (strings for API): ${JSON.stringify(characterPrompts)}`); // 기존 로그 수정하여 JSON으로 명확히


  // 이미지 생성 상태 초기화
  cutImageGenerationStatus.value = { 
    ...cutImageGenerationStatus.value, 
    [cut.id]: true 
  };

  try {
    // 이미지 생성 요청
    const imageCount = cutData.imageCount || 1;
    
    // 해상도 정보 가져오기
    const selectedResolution = cut.selectedResolutions?.[0];
    const width = selectedResolution?.width || 512;
    const height = selectedResolution?.height || 512;
    
    console.log(`[ScenarioEditor] Calling generateImagesForCut with scenarioId: ${currentScenario.value.id}, cutIndex: ${cutIndex}`);
    
    // 이미지 생성 전에 시나리오 저장 (이미지 생성은 명시적 액션이므로 저장 유지)
    // 현재 이미지 뷰어에 표시된 이미지 정보 저장
    const currentViewingImage = scenarioStore.getSelectedImage();
    
    await handleSaveScenario();
    
    // 저장 후 이미지 뷰어 상태 복원 (깨빡임 방지)
    if (currentViewingImage) {
      scenarioStore.setSelectedImage(currentViewingImage);
    }
     // **** 중요 로그 추가 ****
     console.log(`[ScenarioEditor] BEFORE calling scenarioUseCases.generateImagesForCut. Argument characterPrompts:`, JSON.parse(JSON.stringify(characterPrompts)));
    // **** 중요 로그 추가 끝 ****
    
    
    // 이미지가 한 장씩 생성될 때마다 호출될 콜백 함수 정의
    const handleSingleImageGenerated = async (imageData: ImageData) => {
      console.log(`[ScenarioEditor] 이미지 한 장 생성 완료, 뷰어 갱신:`, imageData);
      
      // 생성된 이미지를 컷에 추가
      if (!cut.generatedImages) cut.generatedImages = [];
      cut.generatedImages.push(imageData);
      
      // 대표 이미지가 없으면 첫 번째 이미지를 대표로 설정
      if (!cut.representativeImage) {
        cut.representativeImage = imageData.url;
        scenarioUseCases.saveRepresentativeImage(cut.id, imageData.url).catch(error => {
          console.error('대표 이미지 저장 실패:', error);
        });
      }
      
      // 이미지를 IndexedDB에 저장
      try {
        // 이미지 ID가 없는 경우 임의로 생성
        const imageId = imageData.id || `${cut.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await scenarioUseCases.saveGeneratedImage(imageId, imageData.url, currentScenario.value.id, cut.id);
        console.log(`이미지 저장 완료: ${imageId}`);
      } catch (error) {
        console.error('이미지 저장 중 오류:', error);
      }
      
      // 이미지 뷰어 갱신
      handleViewImage(imageData);
    };
    
    const generatedImages = await scenarioUseCases.generateImagesForCut(
      cut.id, 
      finalPrompt, 
      finalNegativePrompt,
      characterPrompts,
      cutData.imageCount || 1,
      cut.selectedResolutions?.[0].width || 512,
      cut.selectedResolutions?.[0].height || 512,
      cut.seed,
      handleSingleImageGenerated // 이미지가 한 장씩 생성될 때마다 호출되는 콜백 함수 전달
    );

    // 생성된 이미지 처리 - 이미 한 장씩 처리되었으므로 추가 처리만 수행
    if (generatedImages && generatedImages.length > 0) {
      // 네거티브 프롬프트 히스토리 추가
      if (finalNegativePrompt && !negativePromptHistory.value.includes(finalNegativePrompt)) {
        negativePromptHistory.value.push(finalNegativePrompt);
      }

      console.log(`[ScenarioEditor] 총 ${generatedImages.length}개 이미지가 생성되었습니다.`);
    } else {
      console.warn(`[ScenarioEditor] 생성된 이미지가 없습니다.`);
    }
  } catch (error) {
    console.error(`[ScenarioEditor] Error generating images for cut ${cut.id}:`, error);
    console.error(`[ScenarioEditor] Raw error object:`, JSON.stringify(error, null, 2));
    console.error(`[ScenarioEditor] Error constructor:`, error.constructor.name);
    console.error(`[ScenarioEditor] Error prototype:`, Object.getPrototypeOf(error));
    console.error(`[ScenarioEditor] Error properties:`, Object.getOwnPropertyNames(error));
    
    // 오류 상세 정보 출력
    console.error(`[ScenarioEditor] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      cutId: cut.id,
      prompt: finalPrompt,
      negativePrompt: finalNegativePrompt,
      characterPrompts: characterPrompts,
      imageCount: imageCount,
      width: width,
      height: height
    });
    
    // 생성 시도 정보 출력
    console.error(`[ScenarioEditor] Generation attempt info:`, {
      cutId: cut.id,
      scenarioId: props.scenarioId,
      cutIndex: props.cutIndex,
      prompt: finalPrompt?.substring(0, 100) + '...',
      negativePrompt: finalNegativePrompt?.substring(0, 100) + '...',
      characterPromptsCount: characterPrompts?.length || 0,
      imageCount: imageCount,
      width: width,
      height: height
    });
  } finally {
    // 이미지 생성 상태 업데이트
    cutImageGenerationStatus.value = { 
      ...cutImageGenerationStatus.value, 
      [cut.id]: false 
    };
  }
}
// Character Prompt Management (delegated from CutCard)
function findCut(cutId: string): Cut | undefined {
    return currentScenario.value.cuts.find(c => c.id === cutId);
}

function handleAddCharacterPromptToCut(targetCut: Cut) {
  const cut = findCut(targetCut.id);
  if (cut) {
    const newPrompt: CharacterPromptType = {
      id: uuidv4(),
      name: '새 캐릭터',
      prompt: '',
      negativePrompt: '',
      position: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      enabled: true,
    };
    cut.characterPrompts.push(newPrompt);
  }
}

function handleUpdateCharacterPromptInCut(targetCut: Cut, charIndex: number, updatedPrompt: Partial<CharacterPromptType>) {
  const cut = findCut(targetCut.id);
  if (cut && cut.characterPrompts[charIndex]) {
    cut.characterPrompts[charIndex] = { ...cut.characterPrompts[charIndex], ...updatedPrompt };
  }
}

function handleRemoveCharacterPromptFromCut(targetCut: Cut, charIndex: number) {
  const cut = findCut(targetCut.id);
  if (cut) {
    cut.characterPrompts.splice(charIndex, 1);
  }
}

function handleMoveCharacterPromptInCut(targetCut: Cut, charIndex: number, direction: 'up' | 'down') {
  const cut = findCut(targetCut.id);
  if (!cut || !cut.characterPrompts) return;
  const prompts = cut.characterPrompts;
  if (direction === 'up' && charIndex > 0) {
    [prompts[charIndex], prompts[charIndex - 1]] = [prompts[charIndex - 1], prompts[charIndex]];
  } else if (direction === 'down' && charIndex < prompts.length - 1) {
    [prompts[charIndex], prompts[charIndex + 1]] = [prompts[charIndex + 1], prompts[charIndex]];
  }
}

function handleToggleCharacterPromptInCut(targetCut: Cut, charIndex: number) {
  const cut = findCut(targetCut.id);
  if (cut && cut.characterPrompts[charIndex]) {
    cut.characterPrompts[charIndex].enabled = !cut.characterPrompts[charIndex].enabled;
  }
}

async function handleUpdateRepresentativeImageForCut(targetCut: Cut, imageUrl: string) {
  const cut = findCut(targetCut.id);
  if (cut) {
    cut.representativeImage = imageUrl;
    // If persistence is needed via use case:
    // await scenarioUseCases.setRepresentativeImage(cut.id, imageUrl);
  }
}

// Image Viewer Integration
const handleSelectImageForView = (imageData: ImageData) => {
  scenarioStore.selectImage(imageData.url, imageData);
};

// Modal Controls
function openScenarioListModal() {
  loadAllScenarioSummaries(); 
  showScenarioList.value = true;
}
function closeScenarioListModal() {
  showScenarioList.value = false;
}

function openNegativeHistoryModal(cut: Cut) {
  // TODO: Load relevant history if specific to cut or context
  // For now, uses a global history list
  selectedCutForHistory.value = cut;
  showNegativeHistory.value = true;
}
function closeNegativeHistoryModal() {
  showNegativeHistory.value = false;
  selectedCutForHistory.value = null;
}

function handleSelectNegativeHistory(prompt: string) {
  if (selectedCutForHistory.value) {
    const cutIndex = currentScenario.value.cuts.findIndex(c => c.id === selectedCutForHistory.value!.id);
    if (cutIndex !== -1) {
      currentScenario.value.cuts[cutIndex].negativePrompt = prompt;
    }
  }
  closeNegativeHistoryModal();
}

// Resolution Update Handler
interface ResolutionChangedPayload {
  scenarioId: string; // ResolutionPanel에서 scenarioId를 보내주는지 확인 필요, 없다면 currentScenario.id 사용
  cutId: string;
  action: 'probability-change' | 'enabled-change' | 'add' | 'remove' | 'name-change'; // name-change는 현재 미사용
  resolutionId?: string;
  resolution?: ResolutionSetting; // Panel에서는 Resolution 타입, UseCase는 ResolutionSetting 기대
  value?: number | boolean | string;
}

const handleResolutionUpdateRequest = async (payload: any) => {
  console.log('[ScenarioEditor] handleResolutionUpdateRequest called with payload:', JSON.parse(JSON.stringify(payload)));
  // Validate payload structure
  if (!payload || typeof payload.action !== 'string') {
    console.error('[ScenarioEditor] Invalid payload received in handleResolutionUpdateRequest:', payload);
    return;
  }

  const { action, scenarioId, cutId, resolutionId, probability, enabled, resolutionData } = payload;

  let actionType = '';
  let params: any = {};

  switch (action) {
    case 'probability-change':
      actionType = 'updateCutResolutionProbability';
      params = { scenarioId, cutId, resolutionId, newProbability: probability };
      break;
    case 'toggle_enabled':
      actionType = 'toggleCutResolutionEnabled';
      params = { scenarioId, cutId, resolutionId, enabled };
      break;
    case 'add':
      actionType = 'addResolutionToCut';
      params = { scenarioId, cutId, resolutionData };
      break;
    case 'remove':
      actionType = 'removeResolutionFromCut';
      params = { scenarioId, cutId, resolutionId };
      break;
    default:
      console.error(`[ScenarioEditor] Unknown action in handleResolutionUpdateRequest: ${action}`);
      return;
  }
  console.log(`[ScenarioEditor] Mapped to actionType: ${actionType}, params:`, JSON.parse(JSON.stringify(params)));
  await handleScenarioAction(actionType, params);
};

const handleScenarioAction = async (actionType: string, params: any) => {
  console.log(`[ScenarioEditor] handleScenarioAction called with actionType: ${actionType}, params:`, JSON.parse(JSON.stringify(params)));
  if (!currentScenario.value) {
    console.error('[ScenarioEditor] Current scenario is not available.');
    return;
  }

  const actionFunction = (scenarioUseCases as any)[actionType];

  if (typeof actionFunction === 'function') {
    console.log(`[ScenarioEditor] Preparing to call action function with params:`, JSON.parse(JSON.stringify(params)));
    let resultScenario: Scenario | null = null;
    if (actionType === 'addResolutionToCut') {
      const plainResolutionData = { ...params.resolutionData };
      console.log('[ScenarioEditor] Plain resolutionData for call:', JSON.parse(JSON.stringify(plainResolutionData)));
      resultScenario = await actionFunction.call(
        scenarioUseCases,
        params.scenarioId,
        params.cutId,
        plainResolutionData
      );
    } else if (actionType === 'removeResolutionFromCut') {
      resultScenario = await actionFunction.call(
        scenarioUseCases,
        params.scenarioId,
        params.cutId,
        params.resolutionId
      );
    } else if (actionType === 'updateCutResolutionProbability') {
      resultScenario = await actionFunction.call(
        scenarioUseCases,
        params.scenarioId,
        params.cutId,
        params.resolutionId,
        params.newProbability
      );
    } else if (actionType === 'toggleCutResolutionEnabled') {
      resultScenario = await actionFunction.call(
        scenarioUseCases,
        params.scenarioId,
        params.cutId,
        params.resolutionId,
        params.enabled
      );
    } else {
      console.warn(`[ScenarioEditor] Action type '${actionType}' has a generic call, ensure params match method signature. Params:`, JSON.parse(JSON.stringify(params)));
      resultScenario = await actionFunction.call(scenarioUseCases, params);
    }

    if (resultScenario) {
      console.log(`[ScenarioEditor] Action '${actionType}' executed successfully, scenario updated.`);
      const index = allScenarios.value.findIndex(s => s.id === resultScenario.id);
      if (index !== -1) {
        allScenarios.value[index] = resultScenario;
      }
      currentScenario.value = resultScenario;
    } else {
      console.warn(`[ScenarioEditor] Action '${actionType}' did not return a scenario or failed.`);
    }
  } else {
    console.error(`[ScenarioEditor] Action type '${actionType}' is not a recognized function in ScenarioUseCases.`);
  }
};

// PromptItem 배열을 확인하고 기본값을 채우는 헬퍼 함수
function ensurePromptItems(items: PromptItem[] | undefined): PromptItem[] {
  if (!items || !Array.isArray(items)) {
    return [];
  }
  return items.map(item => ({
    id: item.id || uuidv4(),
    prompt: typeof item.prompt === 'string' ? item.prompt : '',
    negativePrompt: typeof item.negativePrompt === 'string' ? item.negativePrompt : '',
    probability: typeof item.probability === 'number' ? Math.max(0, Math.min(100, item.probability)) : 100,
    enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
  }));
}

onMounted(async () => {
  isGlobalLoading.value = true;
  try {
    await scenarioStore.loadScenariosFromDb(); // loadFromLocalStorage() 대신 loadScenariosFromDb() 호출

    let scenarioToLoadId = scenarioStore.currentScenarioId;

    if (scenarioToLoadId) {
      const loadedScenario = await scenarioUseCases.getScenarioById(scenarioToLoadId);
      if (loadedScenario) {
        currentScenario.value = loadedScenario;
      } else {
        console.warn(`저장된 현재 시나리오 ID(${scenarioToLoadId})를 찾을 수 없습니다. 새 시나리오를 생성합니다.`);
        currentScenario.value = scenarioUseCases.createNewScenario();
        await handleSaveScenario();
      }
    } else {
      if (scenarioStore.scenarios && scenarioStore.scenarios.length > 0) {
        currentScenario.value = scenarioStore.scenarios[0];
        scenarioStore.setCurrentScenarioId(scenarioStore.scenarios[0].id);
      } else {
        await handleSaveScenario();
      }
    }

    await loadAllScenarioSummaries();
    negativePromptHistoryList.value = scenarioUseCases.getNegativePromptHistory();

    if (currentScenario.value) {
        currentScenario.value.leadingPromptItems = ensurePromptItems(currentScenario.value.leadingPromptItems);
        currentScenario.value.trailingPromptItems = ensurePromptItems(currentScenario.value.trailingPromptItems);
        currentScenario.value.cuts.forEach(cut => {
            cut.mainPromptItems = ensurePromptItems(cut.mainPromptItems);
        });
    }

  } catch (error) {
    console.error("ScenarioEditor 마운트 중 오류:", error);
    currentScenario.value = scenarioUseCases.createNewScenario();
    try {
      await handleSaveScenario();
    } catch (saveError) {
      console.error("폴백 시나리오 저장 중 오류:", saveError);
    }
  } finally {
    isGlobalLoading.value = false;
  }

  watch(() => currentScenario.value?.name, (newName, oldName) => {
    if (currentScenario.value && newName !== oldName && newName?.trim() !== '' && typeof oldName === 'string') {
      // 이름 변경 시 자동 저장 로직 (예: 디바운스된 handleSaveScenario 호출)
    }
  }, { deep: false });

  watch(() => currentScenario.value, (newScenario, oldScenario) => {
    if (newScenario && oldScenario && newScenario.id !== oldScenario.id) {
      console.log(`Scenario changed from ${oldScenario?.id} to ${newScenario?.id}`);
      scenarioStore.clearSelectedImage();
    }
  }, { deep: true });
});

</script>

<style scoped>
.scenario-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 1rem 0;
  background-color: #f9f9f9;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0 1rem 1rem 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.scenario-title-container {
  flex: 1;
}



.scenario-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #e0e0e0;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: #d0d0d0;
}

.action-button.primary {
  background-color: #4CAF50;
  color: white;
}

.action-button.primary:hover {
  background-color: #45a049;
}

.global-prompt-panels {
  margin: 0 0 1rem 0;
}

.prompt-panel {
  margin-bottom: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  padding: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #f0f0f0;
  cursor: pointer;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
}

.toggle-button {
  cursor: pointer;
}

.toggle-icon {
  transition: transform 0.2s;
}

.panel-content {
  padding: 1rem 0;
  background-color: #fff;
}

.prompt-item {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.prompt-item.disabled {
  opacity: 0.6;
}

.prompt-item-header {
  margin-bottom: 0.5rem;
}

.prompt-item-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.probability-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.probability-input {
  width: 60px;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.remove-button {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.prompt-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prompt-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.prompt-field label {
  font-weight: bold;
  font-size: 0.9rem;
}

.prompt-field textarea {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.add-prompt-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.add-prompt-button:hover {
  background-color: #1e88e5;
}

.cuts-section {
  margin: 0 0 1rem 0;
}

.cuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.cuts-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cuts-header h3 {
  margin: 0;
  font-size: 1rem;
}

.cuts-container {
  margin-top: 0.5rem;
  overflow-x: hidden;
}

.no-cuts-message {
  padding: 2rem;
  text-align: center;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.cuts-list {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  overflow-x: auto;
  padding: 1rem 0.5rem;
  scroll-padding: 0.5rem;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.add-cut-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.add-cut-button:hover {
  background-color: #fb8c00;
}

.add-cut-button-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.add-cut-button-header:hover {
  background-color: #fb8c00;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  max-width: 600px;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f0f0f0;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 1rem;
  max-height: 60vh;
  overflow-y: auto;
}

.no-scenarios-message {
  padding: 2rem;
  text-align: center;
}

.scenario-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scenario-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
}

.scenario-item:hover {
  background-color: #f5f5f5;
}

.scenario-item.active {
  background-color: #e3f2fd;
  border-color: #2196F3;
}

.scenario-item-info {
  flex: 1;
}

.scenario-item-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
}

.scenario-item-info p {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
}

.delete-button {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #f0f0f0;
  border-top: 1px solid #e0e0e0;
}



/* 반응형 스타일 */
@media (max-width: 768px) {
  .scenario-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .scenario-actions {
    justify-content: space-between;
  }
  
  .action-button span {
    display: none;
  }
  
  .modal-content {
    width: 95%;
  }
}
</style>

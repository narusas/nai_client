<template>
  <div class="scenario-editor">
    <div class="scenario-header">
      <div class="scenario-controls">
        <input
          type="text"
          v-model="currentScenario.name"
          placeholder="시나리오 이름"
          class="scenario-name-input"
          @blur="handleSaveScenario" 
        />
        <button @click="handleNewScenario" class="new-button">신규</button>
        <button @click="handleSaveScenario" class="save-button">저장</button>
        <button @click="openScenarioListModal" class="load-button">불러오기</button>
        <button @click="handleAddCut" class="add-button">컷&nbsp; 추가</button>
        <button @click="toggleCutListVisibility" class="toggle-cuts-button">
          {{ showCutList ? '목록 숨기기' : '목록 보이기' }}
        </button>
      </div>
    </div>

    <ScenarioListModal
      :show-modal="showScenarioList"
      :scenario-list="allScenarios"
      @close="closeScenarioListModal"
      @select-scenario="handleSelectScenarioFromModal"
      @delete-scenario="handleDeleteScenarioFromModal"
      @new-scenario="handleNewScenarioFromModal"
    />

    <template v-if="showCutList">
      <TopScrollbar :targetRef="cutsContainerEl">
        <div class="cuts-container-wrapper">
          <div class="cuts-container" ref="cutsContainerEl">
            <CutCard
              v-for="(cut, index) in currentScenario.cuts"
              :key="cut.id || index" 
              :cut-data="cut"
              :cut-index="index"
              :is-generating-image="isGeneratingImageForCut(cut.id)"
              :negative-prompt-history="negativePromptHistoryList"
              @update:cutData="(updatedCut) => handleUpdateCut(index, updatedCut)"
              @remove-cut="() => handleRemoveCut(index)"
              @generate-images="() => handleGenerateImagesForCut(cut)"
              @open-negative-history="() => openNegativeHistoryModal(cut)"
              @add-character-prompt="() => handleAddCharacterPromptToCut(cut)"
              @update-character-prompt="({ charIndex, updatedPrompt }) => handleUpdateCharacterPromptInCut(cut, charIndex, updatedPrompt)"
              @remove-character-prompt="(charIndex) => handleRemoveCharacterPromptFromCut(cut, charIndex)"
              @move-character-prompt="({ charIndex, direction }) => handleMoveCharacterPromptInCut(cut, charIndex, direction)"
              @toggle-character-prompt="(charIndex) => handleToggleCharacterPromptInCut(cut, charIndex)"
              @update-representative-image="(imageUrl) => handleUpdateRepresentativeImageForCut(cut, imageUrl)"
              @select-image-for-view="(imageData) => handleSelectImageForView(imageData)"
            />
          </div>
        </div>
      </TopScrollbar>
    </template>

    <NegativeHistoryModal
      :show-modal="showNegativeHistory"
      :negative-prompt-history="negativePromptHistoryList"
      @close="closeNegativeHistoryModal"
      @select-history="handleSelectNegativeHistory"
    />

    <div v-if="isGlobalLoading" class="global-loading-overlay">
      <div class="loading-spinner"></div>
      <p>처리 중...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import TopScrollbar from './TopScrollbar.vue';
import ScenarioListModal from './ScenarioListModal.vue';
import NegativeHistoryModal from './NegativeHistoryModal.vue';
import CutCard from './CutCard.vue';

import { Scenario, Cut, CharacterPrompt as CharacterPromptType, ImageData, ScenarioSummary } from '@/domain/scenario/entities';
import { ScenarioRepositoryImpl } from '@/adapters/repositories/ScenarioRepositoryImpl';
import { ScenarioUseCases } from '@/domain/scenario/usecases/ScenarioUseCases';
import { ImageGenerationService } from '@/domain/scenario/ports/ImageGenerationService';
import { ImageRepository } from '@/domain/scenario/ports/ImageRepository';
import { NaiApiAdapter } from '@/adapters/NaiApiAdapter';
import { useScenarioStore } from '@/stores/scenario';

const mockImageRepository: ImageRepository = {
  async saveImage(imageData: ImageData): Promise<void> {
    console.warn('Mock ImageRepository: saveImage called', imageData);
  },
  async saveRepresentativeImage(cutId: string, imageUrl: string): Promise<void> {
    console.warn('Mock ImageRepository: saveRepresentativeImage called', cutId, imageUrl);
  },
};

// --- DI Setup ---
const scenarioRepository = new ScenarioRepositoryImpl();
const scenarioUseCases = new ScenarioUseCases(scenarioRepository, new NaiApiAdapter(), mockImageRepository);
const scenarioStore = useScenarioStore();

// --- Reactive State ---
const currentScenario = ref<Scenario>(scenarioUseCases.createNewScenario());
const allScenarios = ref<ScenarioSummary[]>([]);
const showScenarioList = ref(false);
const showNegativeHistory = ref(false);
const negativePromptHistory = ref<string[]>(['nsfw, blurry', 'low quality, worst quality', 'text, watermark']); // 예시
const selectedCutForHistory = ref<Cut | null>(null);
const cutsContainerEl = ref<HTMLElement | null>(null);
const isGlobalLoading = ref(false);
const cutImageGenerationStatus = ref<Record<string, boolean>>({}); // { [cutId]: isLoading }
const negativePromptHistoryList = ref<string[]>([]); // 추가된 라인
const showCutList = ref(true); // 추가: 컷 목록 표시 상태

// --- Computed Properties ---
const isGeneratingImageForCut = (cutId: string | undefined): boolean => {
  return !!cutId && !!cutImageGenerationStatus.value[cutId];
};

// cutImageGenerationStatus 감시하여 전역 이미지 생성 상태 업데이트
watch(cutImageGenerationStatus, (newStatus) => {
  const isAnyGenerating = Object.values(newStatus).some(status => status === true);
  scenarioStore.setAnyImageGenerating(isAnyGenerating);
}, { deep: true });

// --- Methods ---

// Toggle Cut List Visibility
function toggleCutListVisibility() {
  showCutList.value = !showCutList.value;
}

// Scenario Management
async function handleNewScenario() {
  currentScenario.value = scenarioUseCases.createNewScenario();
  // Optional: save immediately or wait for user action
  // await handleSaveScenario(); 
}

async function handleSaveScenario() {
  if (!currentScenario.value) return;
  isGlobalLoading.value = true;
  try {
    await scenarioUseCases.saveScenario(currentScenario.value);
    await loadAllScenarios(); // Refresh list
  } catch (error) {
    console.error('Error saving scenario:', error);
  } finally {
    isGlobalLoading.value = false;
  }
}

async function loadAllScenarios() {
  try {
    allScenarios.value = await scenarioUseCases.getAllScenarios();
  } catch (error) {
    console.error('Error loading scenarios:', error);
  }
}

async function handleSelectScenarioFromModal(scenarioId: string) {
  closeScenarioListModal();
  isGlobalLoading.value = true;
  try {
    const scenario = await scenarioUseCases.getScenarioById(scenarioId);
    if (scenario) {
      currentScenario.value = scenario;
    } else {
      console.warn(`Scenario with id ${scenarioId} not found.`);
      await handleNewScenario(); // Fallback to new if selected not found
    }
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
    await loadAllScenarios();
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
  currentScenario.value.cuts.push(newCut);
  nextTick(() => {
    cutsContainerEl.value?.scrollTo({ left: cutsContainerEl.value.scrollWidth, behavior: 'smooth' });
  });
}

function handleRemoveCut(index: number) {
  if (!currentScenario.value) return;
  currentScenario.value.cuts.splice(index, 1);
}

function handleUpdateCut(index: number, updatedCut: Cut) {
  if (currentScenario.value && currentScenario.value.cuts[index]) {
    console.log(`[ScenarioEditor] handleUpdateCut called for index ${index}. Updated cut data:`, JSON.parse(JSON.stringify(updatedCut)));
    currentScenario.value.cuts[index] = { ...currentScenario.value.cuts[index], ...updatedCut };
    currentScenario.value.updatedAt = new Date().toISOString();
    console.log('[ScenarioEditor] currentScenario.value.cuts after update:', JSON.parse(JSON.stringify(currentScenario.value.cuts)));
  } else {
    console.error(`[ScenarioEditor] handleUpdateCut: Cut not found at index ${index}`);
  }
}

// Image Generation
async function handleGenerateImagesForCut(targetCut: Cut) {
  if (!currentScenario.value) return;
  const cut = findCut(targetCut.id);
  if (!cut) return;

  console.log('[ScenarioEditor] Generating images for cut:', 
    JSON.parse(JSON.stringify(cut))); // 반응형 프록시를 일반 객체로 변환하여 로깅
  console.log(`[ScenarioEditor] Main Prompt: ${cut.mainPrompt}`);
  console.log(`[ScenarioEditor] Negative Prompt: ${cut.negativePrompt}`);
  console.log('[ScenarioEditor] Character Prompts:', 
    JSON.parse(JSON.stringify(cut.characterPrompts?.map(cp => `${cp.prompt} (enabled: ${cp.enabled})`))));

  cutImageGenerationStatus.value[cut.id] = true;
  try {
    // ScenarioUseCases.generateImages expects structured prompts now
    const newImages = await scenarioUseCases.generateImages(
      cut.mainPrompt,
      cut.negativePrompt,
      cut.characterPrompts,
      cut.imageCount
    );

    const cutIndex = currentScenario.value.cuts.findIndex(c => c.id === cut.id);
    if (cutIndex !== -1) {
      currentScenario.value.cuts[cutIndex].generatedImages.push(...newImages);
      if (!currentScenario.value.cuts[cutIndex].representativeImage && newImages.length > 0) {
        currentScenario.value.cuts[cutIndex].representativeImage = newImages[0].url;
        // await scenarioUseCases.setRepresentativeImage(cut.id, newImages[0].url); // Persist if needed
      }
    }
  } catch (error) {
    console.error(`Error generating images for cut ${cut.id}:`, error);
  } finally {
    cutImageGenerationStatus.value[cut.id] = false;
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
  loadAllScenarios(); 
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

// Lifecycle Hooks
onMounted(async () => {
  isGlobalLoading.value = true;
  try {
    await loadAllScenarios();
    const lastOpened = await scenarioUseCases.getLastOpenedScenario(); // Assuming this is implemented
    if (lastOpened) {
      currentScenario.value = lastOpened;
    } else if (allScenarios.value.length > 0) {
      // If no 'lastOpened' specifically, but scenarios exist, load the first one as default
      // Or create new: currentScenario.value = scenarioUseCases.createNewScenario();
      const firstScenario = await scenarioUseCases.getScenarioById(allScenarios.value[0].id); // getAllScenarios returns Summaries
      if (firstScenario) currentScenario.value = firstScenario;
    }
    // else, it's already a new scenario by default initialisation

    // TODO: Load global negative prompt history if needed
  } catch (error) {
    console.error("Error onMounted:", error);
  } finally {
    isGlobalLoading.value = false;
  }
});

// Auto-save on scenario name change (example of deep watch or specific field watch)
watch(() => currentScenario.value.name, (newName, oldName) => {
  if (newName !== oldName && currentScenario.value.id) { // Only save if name actually changed for an existing scenario
    // Debounce this or make it explicit save
    // handleSaveScenario();
  }
});

</script>

<style scoped>
.scenario-editor {
  display: flex;
  flex-direction: column;
  height: 100%; /* 부모로부터 높이를 받아오거나, 뷰포트 높이만큼 설정 */
  overflow: hidden; /* 내부 스크롤은 각 영역에서 처리 */
}

.scenario-header {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.scenario-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.scenario-name-input {
  flex-grow: 1; /* 원래대로 복원 */
  max-width: 200px; /* 수정: 최대 너비 200px로 변경 */
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.cuts-container-wrapper, /* TopScrollbar가 생성하는 래퍼 클래스 (가정) */
.cuts-container {
  flex-grow: 1; /* 사용 가능한 세로 공간을 모두 차지 */
  /* overflow-y: hidden; 이미 .cuts-container에 적용되어 있음 */
  /* min-height: 0; /* flex 아이템이 콘텐츠보다 작아질 수 있도록 */
}

.cuts-container {
  display: flex;
  flex-direction: row; /* 가로 방향 명시 */
  flex-wrap: nowrap; /* 줄바꿈 방지 */
  gap: 1rem;
  padding: 1rem; /* 스크롤바 공간 및 여백 확보 */
  overflow-x: auto; /* 가로 스크롤 활성화 (기능은 유지, 바는 숨김) */
  overflow-y: hidden; /* 세로 스크롤 비활성화 */
  align-items: stretch; /* 변경: 컷 카드들이 전체 높이를 차지하도록 */
  -webkit-overflow-scrolling: touch; /* iOS 부드러운 스크롤 */
  touch-action: pan-x; /* 추가: 가로 방향 터치 스크롤 명시 */
  
  /* 네이티브 가로 스크롤바 숨기기 */
  scrollbar-width: none; /* Firefox */
}

/* Webkit 계열 브라우저 네이티브 가로 스크롤바 숨기기 */
.cuts-container::-webkit-scrollbar {
  display: none;
}

/* Basic button styling */
button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.new-button { background-color: #e0e0e0; color: #333; }
.new-button:hover { background-color: #d0d0d0; }

.save-button { background-color: #4CAF50; color: white; }
.save-button:hover { background-color: #45a049; }

.load-button { background-color: #2196F3; color: white; }
.load-button:hover { background-color: #1e88e5; }

.add-button { background-color: #FF9800; color: white; }
.add-button:hover { background-color: #fb8c00; }

.toggle-cuts-button { background-color: #607D8B; color: white; } /* Blue Grey */
.toggle-cuts-button:hover { background-color: #546E7A; }

.global-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loading-spinner {
  border: 4px solid #f3f3f3; /* Light grey */
  border-top: 4px solid #3498db; /* Blue */
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
</style>

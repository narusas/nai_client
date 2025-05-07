<template>
  <!-- ... -->
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, provide } from 'vue';
import { useNaiSettingsStore } from '@/stores/naiSettings';
import { useScenarioStore } from '@/stores/scenario';
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

// --- Methods ---

// Toggle Cut List Visibility
function toggleCutListVisibility() {
  showCutList.value = !showCutList.value;
}

function toggleLeadingPromptPanel() {
  showLeadingPromptPanel.value = !showLeadingPromptPanel.value;
}

function toggleTrailingPromptPanel() {
  showTrailingPromptPanel.value = !showTrailingPromptPanel.value;
}

// 선행 프롬프트 관리
function addLeadingPromptItem() {
  if (!currentScenario.value) return;
  if (!currentScenario.value.leadingPromptItems) {
    currentScenario.value.leadingPromptItems = [];
  }
  
  const newPromptItem: PromptItem = {
    id: uuidv4(),
    prompt: '',
    negativePrompt: '',
    probability: 100,
    enabled: true
  };
  
  currentScenario.value.leadingPromptItems.push(newPromptItem);
  handleSaveScenario();
}

function removeLeadingPromptItem(index: number) {
  if (!currentScenario.value || !currentScenario.value.leadingPromptItems) return;
  
  currentScenario.value.leadingPromptItems.splice(index, 1);
  handleSaveScenario();
}

function toggleLeadingPromptItemEnabled(index: number, enabled: boolean) {
  if (!currentScenario.value || !currentScenario.value.leadingPromptItems) return;
  
  currentScenario.value.leadingPromptItems[index].enabled = enabled;
  handleSaveScenario();
}

function updateLeadingPromptItemProbability(index: number, probability: number) {
  if (!currentScenario.value || !currentScenario.value.leadingPromptItems) return;
  
  // 확률은 0-100 사이의 값으로 제한
  const validProbability = Math.max(0, Math.min(100, probability));
  currentScenario.value.leadingPromptItems[index].probability = validProbability;
  handleSaveScenario();
}

function updateLeadingPromptItem(index: number, field: 'prompt' | 'negativePrompt', value: string) {
  if (!currentScenario.value || !currentScenario.value.leadingPromptItems) return;
  
  currentScenario.value.leadingPromptItems[index][field] = value;
  handleSaveScenario();
}

// 후행 프롬프트 관리
function addTrailingPromptItem() {
  if (!currentScenario.value) return;
  if (!currentScenario.value.trailingPromptItems) {
    currentScenario.value.trailingPromptItems = [];
  }
  
  const newPromptItem: PromptItem = {
    id: uuidv4(),
    prompt: '',
    negativePrompt: '',
    probability: 100,
    enabled: true
  };
  
  currentScenario.value.trailingPromptItems.push(newPromptItem);
  handleSaveScenario();
}

function removeTrailingPromptItem(index: number) {
  if (!currentScenario.value || !currentScenario.value.trailingPromptItems) return;
  
  currentScenario.value.trailingPromptItems.splice(index, 1);
  handleSaveScenario();
}

function toggleTrailingPromptItemEnabled(index: number, enabled: boolean) {
  if (!currentScenario.value || !currentScenario.value.trailingPromptItems) return;
  
  currentScenario.value.trailingPromptItems[index].enabled = enabled;
  handleSaveScenario();
}

function updateTrailingPromptItemProbability(index: number, probability: number) {
  if (!currentScenario.value || !currentScenario.value.trailingPromptItems) return;
  
  // 확률은 0-100 사이의 값으로 제한
  const validProbability = Math.max(0, Math.min(100, probability));
  currentScenario.value.trailingPromptItems[index].probability = validProbability;
  handleSaveScenario();
}

function updateTrailingPromptItem(index: number, field: 'prompt' | 'negativePrompt', value: string) {
  if (!currentScenario.value || !currentScenario.value.trailingPromptItems) return;
  
  currentScenario.value.trailingPromptItems[index][field] = value;
  handleSaveScenario();
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
  
  // 메인 프롬프트 및 네거티브 프롬프트 추출 (첫 번째 활성화된 PromptItem 사용)
  const mainPromptItem = cut.mainPromptItems?.find(item => item.enabled !== false) || cut.mainPromptItems?.[0];
  const mainPrompt = mainPromptItem?.prompt || '';
  const negativePrompt = mainPromptItem?.negativePrompt || '';
  
  console.log(`[ScenarioEditor] Main Prompt from PromptItems: ${mainPrompt}`);
  console.log(`[ScenarioEditor] Negative Prompt from PromptItems: ${negativePrompt}`);
  
  // 캡릭터 프롬프트 추출 (활성화된 캡릭터만 사용)
  const activeCharacterPrompts = (cut.characterPrompts || [])
    .filter(cp => cp.enabled !== false)
    .map(cp => cp.prompt || '')
    .filter(prompt => prompt); // 빈 문자열 제거
  
  console.log('[ScenarioEditor] Active Character Prompts:', activeCharacterPrompts);

  cutImageGenerationStatus.value[cut.id] = true;
  try {
    // 선택된 해상도 가져오기 (첫 번째 활성화된 ResolutionSetting 사용)
    const resolutionSetting = cut.selectedResolutions?.find(res => res.enabled !== false) || cut.selectedResolutions?.[0];
    const width = resolutionSetting?.width || 1216; // 기본값 사용
    const height = resolutionSetting?.height || 832; // 기본값 사용
    console.log(`[이미지 생성] 선택된 해상도: ${width}x${height}`);
    
    // ScenarioUseCases.generateImagesForCut 호출
    const newImages = await scenarioUseCases.generateImagesForCut(cut, currentScenario.value.id);

    const cutIndex = currentScenario.value.cuts.findIndex(c => c.id === cut.id);
    if (cutIndex !== -1) {
      currentScenario.value.cuts[cutIndex].generatedImages.push(...newImages);
      
      // 새로 생성된 이미지가 있으면
      if (newImages.length > 0) {
        // 대표 이미지가 없으면 첫 번째 이미지를 대표 이미지로 설정
        if (!currentScenario.value.cuts[cutIndex].representativeImage) {
          currentScenario.value.cuts[cutIndex].representativeImage = newImages[0].url;
          // await scenarioUseCases.setRepresentativeImage(cut.id, newImages[0].url); // Persist if needed
        }
        
        // 생성된 첫 번째 이미지를 이미지 뷰어에 표시
        handleSelectImageForView(newImages[0]);
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
/* ... */
</style>

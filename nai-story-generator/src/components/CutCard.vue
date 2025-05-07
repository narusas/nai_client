<template>
  <div v-if="props.cutData" class="cut-card">
    <div class="cut-header">
      <h3>#{{ props.cutIndex + 1 }}</h3>
      <div class="cut-controls">
        <input 
          type="number" 
          v-model.number="imageCountWritable" 
          min="1" 
          max="10" 
          class="image-count-input"
          title="생성할 이미지 수"
          @change="updateCutData" 
        />
        <button 
          @click="emitGenerateImages" 
          class="generate-button icon-button"
          :disabled="props.isGeneratingImage"
          :class="{ 'disabled': props.isGeneratingImage }"
          title="이미지 생성"
        >
          <font-awesome-icon :icon="props.isGeneratingImage ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-wand-magic-sparkles'" />
        </button>
        <button @click="emitRemoveCut" class="remove-button icon-button" title="삭제">
          <font-awesome-icon icon="fa-solid fa-trash" />
        </button>
        <button @click="togglePromptsVisibility" class="toggle-prompts-button icon-button" title="프롬프트/해상도 보이기/숨기기">
          <font-awesome-icon :icon="showPrompts ? 'fa-solid fa-gear' : 'fa-solid fa-gear'" />
        </button>
      </div>
    </div>
    
    <!-- 대표 이미지 패널 (최상단으로 이동) -->
    <div class="image-panel">
      <!-- 대표 이미지 -->
      <div class="cut-image-preview" @click="handleRepresentativeImagePreviewClick">
        <img 
          v-if="props.cutData.representativeImage" 
          :src="props.cutData.representativeImage" 
          alt="대표 이미지"
          class="representative-image"
        />
        <div v-else class="no-image">
          이미지 없음
        </div>
      </div>
      
      <!-- 과거 생성 이미지 목록 썸네일 -->
      <div class="cut-thumbnails">
        <h4>생성된 이미지</h4>
        <div class="thumbnails-container">
          <div 
            v-for="(imageData, imgIdx) in props.cutData.generatedImages" 
            :key="imageData.id || imgIdx" 
            class="thumbnail"
            :class="{ 'selected': props.cutData.representativeImage === imageData.url }"
            @click="handleThumbnailClick(imageData)"
            @dblclick="handleThumbnailDoubleClick(imageData)"
            :title="`이미지 ${imgIdx + 1}${imageData.seed ? ' (Seed: ' + imageData.seed + ')' : ''} (더블클릭: 대표 이미지로 설정)`"
          >
            <img :src="imageData.url" :alt="`생성된 이미지 ${imgIdx + 1}`" />
            <span class="thumbnail-number">{{ imgIdx + 1 }}</span>
            <span v-if="props.cutData.representativeImage === imageData.url" class="thumbnail-badge">대표</span>
          </div>
          <div v-if="!props.cutData.generatedImages || props.cutData.generatedImages.length === 0" class="empty-state-small">
            생성된 이미지가 없습니다.
          </div>
        </div>
      </div>
    </div>
    
    <div class="cut-content">
      <div class="cut-details-editor" v-if="showPrompts">
        <!-- Resolution Settings Editor - Replaced with ResolutionPanel -->
        <div class="resolution-settings-section section-block">
           <div class="section-header">
            <h4>해상도 설정</h4>
            <button @click="toggleResolutionPanel" class="toggle-section-button icon-button" :title="showResolutionPanel ? '해상도 설정 숨기기' : '해상도 설정 보기'">
              <font-awesome-icon :icon="showResolutionPanel ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" />
            </button>
          </div>
          <ResolutionPanel
            v-if="showResolutionPanel"
            :modelValue="props.cutData.selectedResolutions"
            :scenarioId="props.scenarioId" 
            :cutId="props.cutData.id"
            @resolution-changed="handleResolutionPanelChange"
          />
        </div>

        <!-- Main Prompt Items Editor -->
        <div class="prompt-items-section section-block">
          <div class="section-header">
            <h4>메인 프롬프트 아이템</h4>
          </div>
          <PromptItemList
            :modelValue="mainPromptItemsRef"
            @update:modelValue="handleMainPromptItemsUpdate"
            add-button-text="메인 프롬프트 아이템 추가"
            @remove-prompt-item="removeMainPromptItem"
            @toggle-enabled="(payload) => toggleMainPromptItemEnabled(payload.index, payload.enabled)"
            @update-probability="(payload) => updateMainPromptItemProbability(payload.index, payload.probability)"
            @update-prompt="(payload) => updateMainPromptItem(payload.index, payload.field, payload.value)"
          />
        </div>


        
        <!-- Character Prompts Section -->
        <div class="character-prompts-section section-block">
            <div class="section-header">
                <h4>캐릭터 프롬프트</h4>
                <button @click="addCharacterPrompt" class="add-item-button">캐릭터 추가</button>
            </div>
            <CharacterPromptComponent 
                v-for="(charPrompt, index) in props.cutData.characterPrompts" 
                :key="charPrompt.id" 
                :charPrompt="charPrompt" 
                :charIndex="index"
                :totalCharacters="props.cutData.characterPrompts ? props.cutData.characterPrompts.length : 0"
                @update:characterPrompt="updatedCharPrompt => updateCharacterPrompt(index, updatedCharPrompt)"
                @remove="() => removeCharacterPrompt(index)"
                @move-up="() => moveCharacterPromptUp(index)"
                @move-down="() => moveCharacterPromptDown(index)"
            />
             <div v-if="!props.cutData.characterPrompts || props.cutData.characterPrompts.length === 0" class="empty-state">
                캐릭터 프롬프트가 없습니다.
            </div>
        </div>
      </div> <!-- End .cut-details-editor -->
    </div> <!-- End .cut-content -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRef } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import CharacterPromptComponent from './CharacterPrompt.vue'; 
import ResolutionPanel from './ResolutionPanel.vue'; // ResolutionPanel import
import PromptItemList from './PromptItemList.vue'; // PromptItemList import
import type { Cut, CharacterPrompt as CharacterPromptType, ImageData, PromptItem, ResolutionSetting } from '@/domain/scenario/entities';

// Props definition
interface Props {
  scenarioId: string; // SCENARIO ID 추가
  cutData: Cut;
  cutIndex: number;
  isGeneratingImage?: boolean;
  negativePromptHistory?: string[];
}
const props = defineProps<Props>();

// Emits definition
const emit = defineEmits([
  'update:cutData', 
  'removeCut', 
  'generateImages', 
  'selectRepresentativeImageInCut', 
  'request-resolution-update', // 해상도 변경 요청 이벤트 추가
  'view-image' // 이미지 뷰어 열기 이벤트 추가
]);

// Local reactive state
const showPrompts = ref(true); // 기본값을 true로 변경
const showResolutionPanel = ref(false); // 해상도 설정 패널 표시 상태
const imageCountWritable = ref(props.cutData?.imageCount || 1); // props.cutData가 없을 경우 기본값 1 사용

// 메인 프롬프트 아이템 참조 생성
const mainPromptItemsRef = computed(() => {
  return Array.isArray(props.cutData.mainPromptItems) ? props.cutData.mainPromptItems : [];
});

// 메인 프롬프트 아이템 업데이트 함수
function handleMainPromptItemsUpdate(newItems: any[]) {
  console.log('[CutCard] handleMainPromptItemsUpdate 호출됨');
  console.log('[CutCard] 이전 프롬프트 아이템 배열:', props.cutData.mainPromptItems);
  console.log('[CutCard] 새 프롬프트 아이템 배열:', newItems);
  
  // 데이터 복사하여 작업 (JSON.stringify/parse를 통한 깊은 복사)
  const updatedCutData = JSON.parse(JSON.stringify(props.cutData));
  
  // 새 프롬프트 아이템 업데이트
  updatedCutData.mainPromptItems = [...newItems];
  
  console.log('[CutCard] 업데이트된 컷 데이터:', updatedCutData);
  console.log('[CutCard] 업데이트된 mainPromptItems 길이:', updatedCutData.mainPromptItems.length);
  
  // 업데이트 이벤트 발생
  emit('update:cutData', updatedCutData);
}

watch(() => props.cutData?.imageCount, (newVal) => {
  if (newVal !== undefined) {
    imageCountWritable.value = newVal;
  }
});

// --- General Cut Data Update (excluding resolution changes handled by specific event) ---
const updateCutData = () => {
  console.log('[CutCard] updateCutData 호출됨');
  
  // 항상 데이터를 복사하여 새 객체로 업데이트
  const updatedCutData = JSON.parse(JSON.stringify(props.cutData));
  
  // 이미지 수 업데이트
  if (updatedCutData.imageCount !== imageCountWritable.value) {
    updatedCutData.imageCount = imageCountWritable.value;
  }
  
  console.log('[CutCard] 업데이트된 데이터:', updatedCutData);
  
  // 업데이트된 데이터 이벤트 발생
  emit('update:cutData', updatedCutData);
};

// --- Resolution Panel Event Handler ---
const handleResolutionPanelChange = (eventPayload: any) => {
  console.log('CutCard received resolution-changed:', JSON.stringify(eventPayload));
  emit('request-resolution-update', eventPayload);
};

// --- UI Toggles ---
const togglePromptsVisibility = () => {
  showPrompts.value = !showPrompts.value;
};

// 해상도 설정 패널 토글 함수
const toggleResolutionPanel = () => {
  showResolutionPanel.value = !showResolutionPanel.value;
};

// --- Main Prompt Item Management ---
function addMainPromptItem() {
  console.log('[CutCard] addMainPromptItem called');
  
  // 데이터 복사하여 작업
  const updatedCutData = { ...props.cutData };
  
  if (!updatedCutData.mainPromptItems) {
    updatedCutData.mainPromptItems = [];
  }
  
  // 새 프롬프트 아이템 생성
  const newPromptItem = {
    id: uuidv4(),
    prompt: '',
    negativePrompt: '',
    probability: 100,
    enabled: true
  };
  
  console.log('[CutCard] Adding new prompt item:', newPromptItem);
  
  // 새 배열을 생성하여 추가
  updatedCutData.mainPromptItems = [...updatedCutData.mainPromptItems, newPromptItem];
  
  console.log('[CutCard] Updated mainPromptItems:', updatedCutData.mainPromptItems);
  
  // 업데이트 이벤트 발생
  emit('update:cutData', updatedCutData);
}

function toggleMainPromptItemEnabled(index: number, enabled: boolean) {
  console.log(`[CutCard] toggleMainPromptItemEnabled 호출됨 - index: ${index}, enabled: ${enabled}`);
  
  if (props.cutData.mainPromptItems && props.cutData.mainPromptItems[index]) {
    // 데이터 복사하여 작업 (JSON.stringify/parse를 통한 깊은 복사)
    const updatedCutData = JSON.parse(JSON.stringify(props.cutData));
    
    // 활성화 상태 업데이트
    updatedCutData.mainPromptItems[index].enabled = enabled;
    
    console.log('[CutCard] 업데이트된 프롬프트 아이템:', updatedCutData.mainPromptItems[index]);
    
    // 업데이트 이벤트 발생
    emit('update:cutData', updatedCutData);
  }
}

function updateMainPromptItemProbability(index: number, probability: number) {
  console.log(`[CutCard] updateMainPromptItemProbability 호출됨 - index: ${index}, probability: ${probability}`);
  
  if (props.cutData.mainPromptItems && props.cutData.mainPromptItems[index]) {
    // 데이터 복사하여 작업 (JSON.stringify/parse를 통한 깊은 복사)
    const updatedCutData = JSON.parse(JSON.stringify(props.cutData));
    
    // 확률 값 업데이트
    updatedCutData.mainPromptItems[index].probability = probability;
    
    console.log('[CutCard] 업데이트된 프롬프트 아이템:', updatedCutData.mainPromptItems[index]);
    
    // 업데이트 이벤트 발생
    emit('update:cutData', updatedCutData);
  }
}

function updateMainPromptItem(index: number, field: 'prompt' | 'negativePrompt', value: string) {
  console.log(`[CutCard] updateMainPromptItem 호출됨 - index: ${index}, field: ${field}, value: ${value}`);
  
  if (props.cutData.mainPromptItems && props.cutData.mainPromptItems[index]) {
    // 데이터 복사하여 작업 (JSON.stringify/parse를 통한 깊은 복사)
    const updatedCutData = JSON.parse(JSON.stringify(props.cutData));
    
    // 해당 필드 업데이트
    updatedCutData.mainPromptItems[index][field] = value;
    
    console.log('[CutCard] 업데이트된 프롬프트 아이템:', updatedCutData.mainPromptItems[index]);
    
    // 업데이트 이벤트 발생
    emit('update:cutData', updatedCutData);
  }
}

function removeMainPromptItem(index: number) {
  console.log(`[CutCard] removeMainPromptItem 호출됨 - index: ${index}`);
  
  // 데이터 복사하여 작업 (JSON.stringify/parse를 통한 깊은 복사)
  const updatedCutData = JSON.parse(JSON.stringify(props.cutData));
  
  // 해당 아이템 삭제
  updatedCutData.mainPromptItems.splice(index, 1);
  
  console.log('[CutCard] 삭제 후 프롬프트 아이템 배열:', updatedCutData.mainPromptItems);
  
  // 업데이트 이벤트 발생
  emit('update:cutData', updatedCutData);
}

// --- Character Prompt Management ---
const addCharacterPrompt = () => {
    if (!props.cutData.characterPrompts) {
        props.cutData.characterPrompts = [];
    }
    props.cutData.characterPrompts.push({
        id: uuidv4(),
        name: '',
        prompt: '',
        negativePrompt: '',
        probability: 100,
        enabled: true,
        position: { x: 0.5, y: 0.5 }
    });
    updateCutData();
};

const removeCharacterPrompt = (index: number) => {
    props.cutData.characterPrompts.splice(index, 1);
    updateCutData();
};

const updateCharacterPrompt = (index: number, updatedCharPrompt: CharacterPromptType) => {
    if (props.cutData.characterPrompts && props.cutData.characterPrompts[index]) {
        props.cutData.characterPrompts[index] = updatedCharPrompt;
        updateCutData();
    }
};

const moveCharacterPromptUp = (index: number) => {
    if (index > 0) {
        const temp = props.cutData.characterPrompts[index];
        props.cutData.characterPrompts[index] = props.cutData.characterPrompts[index - 1];
        props.cutData.characterPrompts[index - 1] = temp;
        updateCutData();
    }
};

const moveCharacterPromptDown = (index: number) => {
    if (index < props.cutData.characterPrompts.length - 1) {
        const temp = props.cutData.characterPrompts[index];
        props.cutData.characterPrompts[index] = props.cutData.characterPrompts[index + 1];
        props.cutData.characterPrompts[index + 1] = temp;
        updateCutData();
    }
};


// --- Image Generation and Selection ---
const emitGenerateImages = () => {
  // Ensure latest imageCount is part of the emitted cutData
  const currentCutData = { ...props.cutData, imageCount: imageCountWritable.value };
  emit('generateImages', currentCutData);
};

const selectRepresentativeImage = (imageUrl: string) => {
  emit('selectRepresentativeImageInCut', { cutId: props.cutData.id, imageUrl });
};

// 썸네일 이미지 클릭 처리
const handleThumbnailClick = (imageData: any) => {
  // 클릭 시에는 이미지 뷰어만 열기
  emit('view-image', imageData);
};

// 썸네일 이미지 더블클릭 처리
const handleThumbnailDoubleClick = (imageData: any) => {
  // 더블클릭 시에는 대표 이미지로 선택
  selectRepresentativeImage(imageData.url);
};

const handleRepresentativeImagePreviewClick = () => {
  // 대표 이미지 클릭 시 이미지 뷰어 열기
  if (props.cutData.representativeImage) {
    // 이미지 데이터 찾기
    const imageData = props.cutData.generatedImages.find(img => img.url === props.cutData.representativeImage) || {
      url: props.cutData.representativeImage,
      id: 'representative-' + props.cutData.id,
      seed: null
    };
    
    // 시나리오 스토어에 이미지 선택 정보 전달
    emit('view-image', imageData);
  }
};

// --- Cut Removal ---
const emitRemoveCut = () => {
  emit('removeCut', props.cutData.id);
};

// Deprecated/unused resolution setting methods (functionality moved to ResolutionPanel and parent)
// const addResolutionSetting = () => { ... };
// const removeResolutionSetting = (index: number) => { ... };

</script>

<style scoped>
/* Styles remain largely the same, with minor adjustments if needed for ResolutionPanel integration */
/* ... existing styles ... */

.cut-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background-color: #f9f9f9;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  overflow: hidden; /* Ensures child elements don't break rounded corners */
  width: 500px; /* 너비 축소 */
  flex-shrink: 0; /* 부모 컨테이너가 작아질 때 압축되지 않도록 설정 */
}

.cut-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.5rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.cut-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  white-space: nowrap;
}

.cut-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.cut-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.cut-image-preview {
  height: 340px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  background-color: #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.representative-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  display: block;
  margin: 0 auto; /* Center the image */
}

.no-image {
  color: #777;
  font-style: italic;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.9rem;
}

.cut-details-editor {
  flex: 1;
  padding: 0.3rem 0;
  overflow-y: visible;
  max-height: none;
}

.section-block {
  margin-bottom: 0.5rem;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}

.image-panel {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background-color: #fff;
}

.item-editor {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: #fff;
}

.item-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.item-editor label {
  display: block;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
  font-weight: 500;
}

.item-editor textarea,
.item-editor input[type="number"] {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.item-fields-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.5rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* Allow textareas/inputs to take space */
}

.field-group.checkbox-group {
  flex-direction: row;
  align-items: center;
  gap: 0.3rem;
  flex-grow: 0; /* Prevent checkbox group from growing too much */
  margin-top: 1.2rem; /* Align with input fields */
}

.field-group.checkbox-group input[type="checkbox"] {
  width: auto;
}
.field-group.checkbox-group label {
 margin-top: 0; /* Reset margin for checkbox label */
 font-weight: normal;
}

.empty-state, .empty-state-small {
  color: #777;
  font-style: italic;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.9rem;
}

.empty-state-small {
  padding: 0.25rem;
  font-size: 0.8rem;
}

.cut-thumbnails {
  padding: 0.3rem 0.5rem;
  border-top: 1px solid #eee;
  max-height: 150px; 
  overflow-y: auto;
}
.thumbnails-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.thumbnail {
  width: 72px; /* Smaller thumbnails */
  height: 72px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumbnail.selected {
  border-color: #007bff;
  box-shadow: 0 0 0 2px #007bff40;
}

.thumbnail-number {
  position: absolute;
  top: 2px;
  left: 2px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 0.65rem;
  font-weight: bold;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.thumbnail-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: #4caf50;
  color: white;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  font-size: 0.65rem;
}

/* Buttons */
button {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease-in-out;
  font-size: 0.85rem;
}

.cut-header .icon-button {
  width: 28px;
  height: 28px;
  min-width: 28px;
  padding: 0;
}

.add-item-button {
  background-color: #28a745; /* Green */
  color: white;
}
.add-item-button:hover {
  background-color: #218838;
}

.remove-item-button {
  background-color: #dc3545; /* Red */
  color: white;
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
}
.remove-item-button:hover {
  background-color: #c82333;
}

.generate-button {
  background-color: #007bff; /* Blue */
  color: white;
}
.generate-button:hover {
  background-color: #0069d9;
}
.generate-button.disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.remove-button {
  background-color: #dc3545; /* 빨간색으로 변경 */
  color: white;
}
.remove-button:hover {
  background-color: #c82333; /* 더 진한 빨간색 */
}

.toggle-prompts-button {
  background-color: #17a2b8; /* Teal */
  color: white;
  min-width: auto;
  padding: 0.4rem 0.6rem;
}
.toggle-prompts-button:hover {
  background-color: #138496;
}

.icon-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}

.image-count-input {
  width: 40px;
  padding: 0.2rem 0.3rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  text-align: center;
  font-size: 0.8rem;
}

/* Scrollbar for details editor */
.cut-details-editor::-webkit-scrollbar {
  width: 6px;
}
.cut-details-editor::-webkit-scrollbar-track {
  background: #f1f1f1; 
  border-radius: 3px;
}
.cut-details-editor::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
.cut-details-editor::-webkit-scrollbar-thumb:hover {
  background: #aaa; 
}

</style>

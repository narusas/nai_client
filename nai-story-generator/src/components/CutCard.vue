<template>
  <div v-if="props.cutData" class="cut-card">
    <div class="cut-header">
      <h3>컷 {{ props.cutIndex + 1 }}</h3>
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
          class="generate-button"
          :disabled="props.isGeneratingImage"
          :class="{ 'disabled': props.isGeneratingImage }"
        >
          {{ props.isGeneratingImage ? '생성 중...' : '이미지 생성' }}
        </button>
        <button @click="emitRemoveCut" class="remove-button">삭제</button>
        <button @click="togglePromptsVisibility" class="toggle-prompts-button" title="프롬프트/해상도 보이기/숨기기">
          {{ showPrompts ? '세부 설정 감추기' : '세부 설정 보이기' }}
        </button>
      </div>
    </div>
    
    <div class="cut-content">
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
      
      <div class="cut-details-editor" v-if="showPrompts">
        <!-- Main Prompt Items Editor -->
        <div class="prompt-items-section section-block">
          <div class="section-header">
            <h4>메인 프롬프트 아이템</h4>
            <button @click="addMainPromptItem" class="add-item-button">아이템 추가</button>
          </div>
          <div v-if="!props.cutData.mainPromptItems || props.cutData.mainPromptItems.length === 0" class="empty-state">
            메인 프롬프트 아이템이 없습니다.
          </div>
          <div v-for="(item, index) in props.cutData.mainPromptItems" :key="item.id" class="prompt-item-editor item-editor">
            <div class="item-editor-header">
              <span>아이템 {{ index + 1 }}</span>
              <button @click="removeMainPromptItem(index)" class="remove-item-button">삭제</button>
            </div>
            <label :for="`prompt-${item.id}`">프롬프트:</label>
            <textarea :id="`prompt-${item.id}`" v-model="item.prompt" @input="updateCutData" placeholder="프롬프트를 입력하세요" rows="3"></textarea>
            <label :for="`neg-prompt-${item.id}`">네거티브 프롬프트:</label>
            <textarea :id="`neg-prompt-${item.id}`" v-model="item.negativePrompt" @input="updateCutData" placeholder="네거티브 프롬프트를 입력하세요" rows="2"></textarea>
            <div class="item-fields-row">
              <div class="field-group">
                <label :for="`prob-${item.id}`">확률:</label>
                <input :id="`prob-${item.id}`" type="number" v-model.number="item.probability" @input="updateCutData" min="0" max="100" step="1" />
              </div>
              <div class="field-group checkbox-group">
                <input :id="`enabled-${item.id}`" type="checkbox" v-model="item.enabled" @change="updateCutData" />
                <label :for="`enabled-${item.id}`">활성화</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Resolution Settings Editor -->
        <div class="resolution-settings-section section-block">
          <div class="section-header">
            <h4>해상도 설정</h4>
            <button @click="addResolutionSetting" class="add-item-button">해상도 추가</button>
          </div>
          <div v-if="!props.cutData.selectedResolutions || props.cutData.selectedResolutions.length === 0" class="empty-state">
            해상도 설정이 없습니다.
          </div>
          <div v-for="(res, index) in props.cutData.selectedResolutions" :key="res.id" class="resolution-item-editor item-editor">
            <div class="item-editor-header">
              <span>해상도 {{ index + 1 }}</span>
              <button @click="removeResolutionSetting(index)" class="remove-item-button">삭제</button>
            </div>
            <div class="item-fields-row">
              <div class="field-group">
                <label :for="`width-${res.id}`">너비:</label>
                <input :id="`width-${res.id}`" type="number" v-model.number="res.width" @input="updateCutData" min="64" step="64" />
              </div>
              <div class="field-group">
                <label :for="`height-${res.id}`">높이:</label>
                <input :id="`height-${res.id}`" type="number" v-model.number="res.height" @input="updateCutData" min="64" step="64" />
              </div>
            </div>
            <div class="item-fields-row">
              <div class="field-group">
                <label :for="`res-prob-${res.id}`">확률:</label>
                <input :id="`res-prob-${res.id}`" type="number" v-model.number="res.probability" @input="updateCutData" min="0" max="100" step="1" />
              </div>
              <div class="field-group checkbox-group">
                <input :id="`res-enabled-${res.id}`" type="checkbox" v-model="res.enabled" @change="updateCutData" />
                <label :for="`res-enabled-${res.id}`">활성화</label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Character Prompts Section (Structure preserved, CharacterPromptComponent will need internal updates later) -->
        <div class="character-prompts-section section-block">
            <div class="section-header">
                <h4>캐릭터 프롬프트</h4>
                <button @click="emitAddCharacterPrompt" class="add-item-button">캐릭터 추가</button>
            </div>
            <CharacterPromptComponent
                v-for="(charPrompt, charIdx) in props.cutData.characterPrompts"
                :key="charPrompt.id || charIdx" 
                :charPrompt="charPrompt"
                :charIndex="charIdx"
                :totalCharacters="props.cutData.characterPrompts?.length || 0"
                @update:charPrompt="(updatedCharPrompt) => handleUpdateCharacterPrompt(charIdx, updatedCharPrompt)"
                @remove="() => handleRemoveCharacterPrompt(charIdx)"
                @move-up="() => handleMoveCharacterPrompt(charIdx, 'up')"
                @move-down="() => handleMoveCharacterPrompt(charIdx, 'down')"
                @toggle-active="(isActive) => handleToggleCharacterPromptActive(charIdx, isActive)" 
            />
             <div v-if="!props.cutData.characterPrompts || props.cutData.characterPrompts.length === 0" class="empty-state">
                캐릭터 프롬프트가 없습니다.
            </div>
        </div>

      </div> <!-- End .cut-details-editor -->
    </div> <!-- End .cut-content -->
    
    <div class="cut-thumbnails">
      <h4>생성된 이미지</h4>
      <div class="thumbnails-container">
        <div 
          v-for="(imageData, imgIdx) in props.cutData.generatedImages" 
          :key="imageData.id || imgIdx" 
          class="thumbnail"
          :class="{ selected: imageData.url === props.cutData.representativeImage }"
          @click="() => handleGeneratedImageClick(imageData)"
          @dblclick="() => loadPromptFromGeneratedImage(imageData)"
        >
          <img :src="imageData.url" :alt="`이미지 ${imgIdx + 1}`" />
          <div v-if="imageData.url === props.cutData.representativeImage" class="thumbnail-badge">
            대표
          </div>
          <div class="thumbnail-number">{{ imgIdx + 1 }}</div>
        </div>
         <div v-if="!props.cutData.generatedImages || props.cutData.generatedImages.length === 0" class="empty-state-small">
            생성된 이미지가 없습니다.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, computed, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
// import NegativeHistoryModal from './NegativeHistoryModal.vue'; // Temporarily commented out
import CharacterPromptComponent from './CharacterPrompt.vue'; 
import type { Cut, CharacterPrompt as CharacterPromptType, ImageData, PromptItem, ResolutionSetting } from '@/domain/scenario/entities';

// Props definition
interface Props {
  cutData: Cut;
  cutIndex: number;
  isGeneratingImage?: boolean;
  negativePromptHistory?: string[]; // This might be deprecated or adapted later
}
const props = defineProps<Props>();

// Emits definition
const emit = defineEmits([
  'update:cutData',
  'removeCut',
  'generateImages',
  'addCharacterPrompt', // To parent (ScenarioEditor)
  // 'updateCharacterPrompt', // Handled internally now via localCutData then emitted as 'update:cutData'
  // 'removeCharacterPrompt', // Handled internally
  // 'moveCharacterPrompt',   // Handled internally
  // 'toggleCharacterPrompt', // Handled internally
  'updateRepresentativeImage', // To parent, if needed, or can be handled locally if it only updates localCutData
  'selectImageForView' // To parent (ScenarioEditor)
]);

const localCutData = ref<Cut | null>(null);

watch(() => props.cutData, (newCutData) => {
  if (newCutData) {
    // Ensure all potentially undefined arrays are initialized before stringifying
    const dataToCopy: Cut = {
      ...newCutData,
      mainPromptItems: newCutData.mainPromptItems || [],
      selectedResolutions: newCutData.selectedResolutions || [],
      characterPrompts: newCutData.characterPrompts || [],
      generatedImages: newCutData.generatedImages || [],
    };
    localCutData.value = JSON.parse(JSON.stringify(dataToCopy));
  } else {
    localCutData.value = null;
  }
}, { immediate: true, deep: true });

const updateCutData = () => {
  if (localCutData.value) {
    // Ensure arrays are initialized if they became undefined somehow during operations
    if (!localCutData.value.mainPromptItems) localCutData.value.mainPromptItems = [];
    if (!localCutData.value.selectedResolutions) localCutData.value.selectedResolutions = [];
    if (!localCutData.value.characterPrompts) localCutData.value.characterPrompts = [];
    if (!localCutData.value.generatedImages) localCutData.value.generatedImages = [];
    emit('update:cutData', JSON.parse(JSON.stringify(localCutData.value)));
  }
};

// Toggle visibility for prompts/resolutions section
const showPrompts = ref(true);
const togglePromptsVisibility = () => {
  showPrompts.value = !showPrompts.value;
};

// Computed property for imageCount, linked to localCutData
const imageCountWritable = computed({
  get: () => localCutData.value?.imageCount || 1,
  set: (value) => {
    if (localCutData.value) {
      const newCount = Math.max(1, Math.min(10, Number(value) || 1));
      if (localCutData.value.imageCount !== newCount) {
        localCutData.value.imageCount = newCount;
        updateCutData(); // Propagate change
      }
    }
  },
});

// --- MainPromptItem Functions ---
const addMainPromptItem = () => {
  if (localCutData.value) {
    // Ensure the array exists
    if (!localCutData.value.mainPromptItems) {
      localCutData.value.mainPromptItems = [];
    }
    localCutData.value.mainPromptItems.push({
      id: uuidv4(),
      prompt: '',
      negativePrompt: '',
      probability: 100,
      enabled: true,
    });
    updateCutData();
  }
};

const removeMainPromptItem = (index: number) => {
  if (localCutData.value && localCutData.value.mainPromptItems) {
    localCutData.value.mainPromptItems.splice(index, 1);
    updateCutData();
  }
};

// --- ResolutionSetting Functions ---
const addResolutionSetting = () => {
  if (localCutData.value) {
    if (!localCutData.value.selectedResolutions) {
      localCutData.value.selectedResolutions = [];
    }
    localCutData.value.selectedResolutions.push({
      id: uuidv4(),
      width: 1216, 
      height: 832, 
      probability: 100,
      enabled: true,
    });
    updateCutData();
  }
};

const removeResolutionSetting = (index: number) => {
  if (localCutData.value && localCutData.value.selectedResolutions) {
    localCutData.value.selectedResolutions.splice(index, 1);
    updateCutData();
  }
};

// Placeholder for Character Prompt handlers that now update localCutData
const handleUpdateCharacterPrompt = (charIndex: number, updatedCharPrompt: CharacterPromptType) => {
  if (localCutData.value && localCutData.value.characterPrompts) {
    localCutData.value.characterPrompts[charIndex] = updatedCharPrompt;
    updateCutData();
  }
};
const handleRemoveCharacterPrompt = (charIndex: number) => {
  if (localCutData.value && localCutData.value.characterPrompts) {
    localCutData.value.characterPrompts.splice(charIndex, 1);
    updateCutData();
  }
};
const handleMoveCharacterPrompt = (charIndex: number, direction: 'up' | 'down') => {
  if (localCutData.value && localCutData.value.characterPrompts) {
    const list = localCutData.value.characterPrompts;
    const item = list[charIndex];
    list.splice(charIndex, 1);
    if (direction === 'up') {
      list.splice(Math.max(0, charIndex - 1), 0, item);
    } else {
      list.splice(Math.min(list.length, charIndex + (direction === 'down' ? 1 : 0)), 0, item); 
    }
    updateCutData();
  }
};
const handleToggleCharacterPromptActive = (charIndex: number, isActive: boolean) => {
 if (localCutData.value && localCutData.value.characterPrompts && localCutData.value.characterPrompts[charIndex]) {
    localCutData.value.characterPrompts[charIndex].enabled = isActive;
    updateCutData();
  }
};


// --- Event Handlers for Emits ---
const emitRemoveCut = () => emit('removeCut');
const emitGenerateImages = () => {
  if (localCutData.value) {
    // Pass the current state of localCutData for generation
    // ScenarioUseCases will pick the enabled/first items
    emit('generateImages', localCutData.value.id);
  }
};
// This emit is for ScenarioEditor to initiate adding a new character prompt to its list
const emitAddCharacterPrompt = () => emit('addCharacterPrompt'); 


// --- Representative Image & Image Click Handling ---
const handleRepresentativeImagePreviewClick = () => {
  if (localCutData.value?.representativeImage) {
    const imgData = localCutData.value.generatedImages?.find(img => img.url === localCutData.value?.representativeImage);
    if (imgData) {
      emit('selectImageForView', imgData);
    }
  }
};

const handleGeneratedImageClick = (imageData: ImageData) => {
  if (localCutData.value) {
    localCutData.value.representativeImage = imageData.url;
    // updateCutData(); // This will emit the whole cutData, which is fine.
    // Alternatively, if only representativeImage needs to be updated in parent:
    // emit('updateRepresentativeImage', imageData.url);
    // For now, relying on updateCutData for simplicity if this component manages its state primarily.
    updateCutData();
  }
};

// --- Load Prompt from Generated Image ---
// This needs to be adapted for mainPromptItems array
const loadPromptFromGeneratedImage = (imageData: ImageData) => {
  if (localCutData.value) {
    if (!localCutData.value.mainPromptItems) {
      localCutData.value.mainPromptItems = [];
    }
    // Option 1: Replace the first item's prompts (if exists)
    // Option 2: Add a new item with these prompts
    // Option 3: Let user decide or have a setting (more complex)
    
    // For now, let's try to update the first item if it exists, or add a new one.
    const targetItem: PromptItem = {
      id: uuidv4(),
      prompt: imageData.mainPrompt || '',
      negativePrompt: imageData.negativePrompt || '',
      probability: 100,
      enabled: true
    };

    if (localCutData.value.mainPromptItems.length > 0) {
      // Update first item, but preserve its ID and other properties if needed.
      // Here, we simply replace it for simplicity, or update specific fields:
      localCutData.value.mainPromptItems[0].prompt = targetItem.prompt;
      localCutData.value.mainPromptItems[0].negativePrompt = targetItem.negativePrompt;
      // Optionally, update probability and enabled status or keep them as they are.
      // localCutData.value.mainPromptItems[0].enabled = true;
    } else {
      localCutData.value.mainPromptItems.push(targetItem);
    }

    // Update resolution based on the image, if desired
    if (imageData.width && imageData.height) {
      if (!localCutData.value.selectedResolutions) {
        localCutData.value.selectedResolutions = [];
      }
      const resTarget: ResolutionSetting = {
        id: uuidv4(),
        width: imageData.width,
        height: imageData.height,
        probability: 100,
        enabled: true,
      };
      if (localCutData.value.selectedResolutions.length > 0) {
        localCutData.value.selectedResolutions[0] = { ...localCutData.value.selectedResolutions[0], ...resTarget, id: localCutData.value.selectedResolutions[0].id };
      } else {
        localCutData.value.selectedResolutions.push(resTarget);
      }
    }
    
    updateCutData();
    // Potentially emit an event to notify parent about prompt loading if needed.
  }
};

// TODO: NegativeHistoryModal logic needs to be re-evaluated for multiple PromptItems.
// It was previously tied to a single negativePromptWritable.

</script>

<style scoped>
.cut-card {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.cut-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.cut-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.cut-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.image-count-input {
  width: 50px;
  text-align: center;
}

.cut-content {
  display: flex;
  padding: 1rem;
  gap: 1rem;
}

.cut-image-preview {
  width: 128px; /* Fixed width for preview */
  height: 128px; /* Fixed height for preview */
  border: 1px solid #ccc;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.representative-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  color: #888;
  font-size: 0.9rem;
}

.cut-details-editor {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0; /* Prevent overflow issues with flex children */
  max-height: 400px; /* Or a suitable max height */
  overflow-y: auto; /* Scroll for content overflow */
  padding-right: 10px; /* Space for scrollbar */
}

.section-block {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 0.75rem;
  background-color: #f9f9f9;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.section-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.item-editor {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
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
  padding: 0.5rem 1rem;
  border-top: 1px solid #eee;
  max-height: 160px; 
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
  background-color: #6c757d; /* Gray */
  color: white;
}
.remove-button:hover {
  background-color: #5a6268;
}

.toggle-prompts-button {
  background-color: #17a2b8; /* Teal */
  color: white;
  min-width: auto; /* Adjust as needed */
  padding: 0.4rem 0.6rem; /* Adjust padding */
}
.toggle-prompts-button:hover {
  background-color: #138496;
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

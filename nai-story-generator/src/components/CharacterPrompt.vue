<template>
  <div class="character-prompt">
    <div class="char-prompt-header">
      <div class="name-and-position">
        <input 
          type="text" 
          v-model="charPrompt.name" 
          placeholder="캐릭터 이름"
          class="character-name-input"
          @input="updateName"
        />
        
        <!-- 위치 입력 필드를 이름 옵에 배치 -->
        <div class="position-section">
          <label>위치 (x, y)</label>
          <div v-if="charPrompt && charPrompt.position" class="position-inputs">
            <input 
              type="number" 
              v-model.number="charPrompt.position.x" 
              min="0" 
              max="1" 
              step="0.1"
              placeholder="X (0-1)"
              @change="updatePosition('x', $event.target.value)"
            />
            <input 
              type="number" 
              v-model.number="charPrompt.position.y" 
              min="0" 
              max="1" 
              step="0.1"
              placeholder="Y (0-1)"
              @change="updatePosition('y', $event.target.value)"
            />
          </div>
          <div v-else class="position-inputs-loading">
            <!-- 위치 정보 로딩 중 또는 기본값 설정 필요 메시지 (옵션) -->
            <small>위치 정보 없음</small>
          </div>
        </div>
      </div>
      
      <div class="character-controls">
        <div class="order-controls">
          <button 
            @click="moveUp" 
            class="order-button" 
            :disabled="charIndex === 0"
            :class="{ 'disabled': charIndex === 0 }"
          >
            ↑
          </button>
          <button 
            @click="moveDown" 
            class="order-button" 
            :disabled="charIndex === totalCharacters - 1"
            :class="{ 'disabled': charIndex === totalCharacters - 1 }"
          >
            ↓
          </button>
        </div>
        <button @click="remove" class="remove-char-button">삭제</button>
      </div>
    </div>
    
    <!-- PromptItemList 컴포넌트 사용 -->
    <PromptItemList
      :modelValue="charPrompt.promptItems" 
      @update:modelValue="updateCharPromptItems"
      add-button-text="프롬프트 아이템 추가"
      @remove-prompt-item="removeCharPromptItemFromList" 
      @toggle-enabled="togglePromptItemEnabled" 
      @update-probability="updatePromptItemProbability"
      @update-prompt="updatePromptItemField" 
    />
  </div>
</template>

<script setup lang="ts">
import PromptItemList from './PromptItemList.vue';
import type { CharacterPrompt, PromptItem } from '@/domain/scenario/entities';

interface Props {
  charPrompt: CharacterPrompt;
  charIndex: number;
  totalCharacters: number;
}

const props = defineProps<Props>();

const emit = defineEmits(['update:characterPrompt', 'remove', 'move-up', 'move-down']);

// Helper function to generate combined prompt string from promptItems
function generateCombinedPrompt(items: PromptItem[] | undefined): string {
  if (!items) {
    return '';
  }
  return items
    .filter(item => item.enabled !== false) // Filter only enabled items
    .map(item => item.prompt)              // Get the prompt text of each item
    .join(', ');                           // Join with comma and space
}

// --- Character Prompt Data Update --- 
function updateName(event: Event) {
  const newName = (event.target as HTMLInputElement).value;
  emit('update:characterPrompt', { ...props.charPrompt, name: newName });
}

// --- PromptItemList Event Handlers ---
// PromptItemList에서 전체 promptItems 배열을 받아서 업데이트
function updateCharPromptItems(newPromptItems: PromptItem[]) {
  console.log('[CharacterPrompt] updateCharPromptItems:', newPromptItems);
  const newCombinedPrompt = generateCombinedPrompt(newPromptItems);
  emit('update:characterPrompt', { 
    ...props.charPrompt, 
    promptItems: newPromptItems,
    prompt: newCombinedPrompt
  });
}

// removeCharPromptItem 함수는 PromptItemList에서 index를 받음
// 또는 PromptItemList에서 id를 받아서 처리할 수도 있음. 우선 index 기반으로 가정.
function removeCharPromptItemFromList(index: number) { // 함수 이름 변경
  const updatedPromptItems = [...props.charPrompt.promptItems];
  updatedPromptItems.splice(index, 1);
  const newCombinedPrompt = generateCombinedPrompt(updatedPromptItems);
  emit('update:characterPrompt', { 
    ...props.charPrompt, 
    promptItems: updatedPromptItems,
    prompt: newCombinedPrompt
  });
}

// toggleEnabled 함수는 PromptItemList에서 index와 enabled 상태를 받음
function togglePromptItemEnabled({ index, enabled }: { index: number; enabled: boolean }) { // 함수 이름 변경 및 파라미터 수정
  const updatedPromptItems = props.charPrompt.promptItems.map((item, i) => {
    if (i === index) {
      return { ...item, enabled: enabled };
    }
    return item;
  });
  const newCombinedPrompt = generateCombinedPrompt(updatedPromptItems);
  emit('update:characterPrompt', { 
    ...props.charPrompt, 
    promptItems: updatedPromptItems,
    prompt: newCombinedPrompt
  });
}

// updateProbability 함수는 PromptItemList에서 index와 probability 값을 받음
function updatePromptItemProbability({ index, probability }: { index: number; probability: number }) { // 함수 이름 변경 및 파라미터 수정
  const updatedPromptItems = props.charPrompt.promptItems.map((item, i) => {
    if (i === index) {
      return { ...item, probability: probability };
    }
    return item;
  });
  const newCombinedPrompt = generateCombinedPrompt(updatedPromptItems);
  emit('update:characterPrompt', { 
    ...props.charPrompt, 
    promptItems: updatedPromptItems,
    prompt: newCombinedPrompt
  });
}

// updatePrompt 함수는 PromptItemList에서 index, field, value를 받음
function updatePromptItemField({ index, field, value }: { index: number; field: 'prompt' | 'negativePrompt'; value: string }) { // 함수 이름 변경 및 파라미터 수정
  const updatedPromptItems = props.charPrompt.promptItems.map((item, i) => {
    if (i === index) {
      return { ...item, [field]: value };
    }
    return item;
  });
  const newCombinedPrompt = generateCombinedPrompt(updatedPromptItems);
  emit('update:characterPrompt', { 
    ...props.charPrompt, 
    promptItems: updatedPromptItems,
    prompt: newCombinedPrompt
  });
}

// 캐릭터 자체를 삭제 (CutCard에서 호출됨)
function remove() {
  emit('remove');
}

// 캐릭터 순서 변경 (CutCard에서 호출됨)
function moveUp() {
  emit('move-up');
}

function moveDown() {
  emit('move-down');
}

function updatePosition(axis: 'x' | 'y', value: string) {
  const currentPosition = props.charPrompt.position ? { ...props.charPrompt.position } : { x: 0.5, y: 0.5 };
  currentPosition[axis] = parseFloat(value);
  emit('update:characterPrompt', { ...props.charPrompt, position: currentPosition });
}
</script>

<style scoped>
.character-prompt {
  margin-bottom: 0.8rem;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 0.8rem 0;
  background-color: #f9f9f9;
}

.char-prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  padding: 0 0.8rem;
}

.name-and-position {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

@media (min-width: 768px) {
  .name-and-position {
    flex-direction: row;
    align-items: center;
  }
}

.character-name-input {
  padding: 0.3rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 150px;
}

.character-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.order-controls {
  display: flex;
  gap: 0.25rem;
}

.order-button {
  padding: 0.25rem 0.5rem;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
}

.order-button:hover {
  background-color: #5a6268;
}

.order-button.disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.enable-checkbox {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  user-select: none;
}

.character-prompt-content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.prompt-section,
.negative-prompt-section,
.position-section {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.position-inputs {
  display: flex;
  gap: 0.5rem;
}

.position-inputs input {
  width: 70px;
  padding: 0.3rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.remove-char-button {
  background-color: #f44336;
  color: white;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
}
</style>

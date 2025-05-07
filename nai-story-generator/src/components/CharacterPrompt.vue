<template>
  <div class="character-prompt">
    <div class="char-prompt-header">
      <input 
        type="text" 
        v-model="charPrompt.name" 
        placeholder="캐릭터 이름"
        class="character-name-input"
      />
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
      :model-value="[charPrompt]"
      @update:model-value="updateCharPromptItems"
      @add-prompt-item="addCharPromptItem"
      @remove-prompt-item="removeCharPromptItem"
      @toggle-enabled="toggleEnabled"
      @update-probability="updateProbability"
      @update-prompt="updatePrompt"
      add-button-text=""
    >
      <template #additional-fields="{ item, index }">
        <div class="position-section">
          <label>위치 (x, y)</label>
          <div class="position-inputs">
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
        </div>
      </template>
    </PromptItemList>
  </div>
</template>

<script setup lang="ts">
import PromptItemList from './PromptItemList.vue';

const props = defineProps({
  charPrompt: {
    type: Object,
    required: true
  },
  charIndex: {
    type: Number,
    required: true
  },
  totalCharacters: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:characterPrompt', 'remove', 'move-up', 'move-down']);

function remove() {
  emit('remove');
}

function moveUp() {
  if (props.charIndex > 0) {
    emit('move-up');
  }
}

function moveDown() {
  if (props.charIndex < props.totalCharacters - 1) {
    emit('move-down');
  }
}

// PromptItemList 컴포넌트와 연동하기 위한 메서드들
function updateCharPromptItems(items: any[]) {
  if (items && items.length > 0) {
    emit('update:characterPrompt', items[0]);
  }
}

function addCharPromptItem() {
  // 캐릭터 프롬프트에서는 추가 버튼을 숨겼으므로 실제로 호출되지 않음
}

function removeCharPromptItem() {
  // 캐릭터 프롬프트에서는 PromptItemList의 삭제 대신 상단의 삭제 버튼 사용
  remove();
}

function toggleEnabled(payload: { index: number, enabled: boolean }) {
  const updatedCharPrompt = { ...props.charPrompt, enabled: payload.enabled };
  emit('update:characterPrompt', updatedCharPrompt);
}

function updateProbability(payload: { index: number, probability: number }) {
  const updatedCharPrompt = { ...props.charPrompt, probability: payload.probability };
  emit('update:characterPrompt', updatedCharPrompt);
}

function updatePrompt(payload: { index: number, field: 'prompt' | 'negativePrompt', value: string }) {
  const updatedCharPrompt = { ...props.charPrompt, [payload.field]: payload.value };
  emit('update:characterPrompt', updatedCharPrompt);
}

function updatePosition(axis: 'x' | 'y', value: string) {
  const position = { ...props.charPrompt.position };
  position[axis] = parseFloat(value);
  const updatedCharPrompt = { ...props.charPrompt, position };
  emit('update:characterPrompt', updatedCharPrompt);
}
</script>

<style scoped>
.character-prompt {
  margin-bottom: 0.8rem;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 0.8rem;
  background-color: #f9f9f9;
}

.char-prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
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

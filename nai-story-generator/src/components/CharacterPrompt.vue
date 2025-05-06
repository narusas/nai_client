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
        <label class="enable-checkbox">
          <input type="checkbox" v-model="charPrompt.enabled" />
          <span>활성화</span>
        </label>
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
    
    <div class="character-prompt-content">
      <div class="prompt-section">
        <label>프롬프트</label>
        <textarea 
          v-model="charPrompt.prompt" 
          placeholder="캐릭터 프롬프트를 입력하세요"
          rows="2"
        ></textarea>
      </div>
      
      <div class="negative-prompt-section">
        <label>네거티브 프롬프트</label>
        <textarea 
          v-model="charPrompt.negativePrompt" 
          placeholder="캐릭터 네거티브 프롬프트를 입력하세요"
          rows="2"
        ></textarea>
      </div>
      
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
          />
          <input 
            type="number" 
            v-model.number="charPrompt.position.y" 
            min="0" 
            max="1" 
            step="0.1"
            placeholder="Y (0-1)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

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

const emit = defineEmits(['remove', 'move-up', 'move-down']);

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

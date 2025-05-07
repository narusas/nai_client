<template>
  <div class="prompt-items-list">
    <div v-for="(promptItem, index) in modelValue" :key="promptItem.id || index" class="prompt-item">
      <div class="prompt-item-header">
        <div class="prompt-item-controls">
          <v-switch
            :model-value="promptItem.enabled !== false"
            @update:model-value="togglePromptItemEnabled(index, $event)"
            density="compact"
            hide-details
            color="primary"
            class="enabled-switch"
          ></v-switch>
          <input 
            type="number" 
            :value="promptItem.probability" 
            min="0" 
            max="100" 
            @change="updatePromptItemProbability(index, Number(($event.target as HTMLInputElement).value))"
            class="probability-input"
            :disabled="promptItem.enabled === false"
          />
          <span class="probability-label">%</span>
        </div>
        <button class="remove-btn-round" @click="removePromptItem(index)">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>
      <div class="prompt-item-content">
        <div class="prompt-tabs">
          <div class="tab-buttons">
            <button 
              class="tab-button" 
              :class="{ 'active': activeTab[promptItem.id || index] === 'prompt' || !activeTab[promptItem.id || index] }"
              @click="setActiveTab(promptItem.id || index, 'prompt')"
            >
              프롬프트
            </button>
            <button 
              class="tab-button" 
              :class="{ 'active': activeTab[promptItem.id || index] === 'negative' }"
              @click="setActiveTab(promptItem.id || index, 'negative')"
            >
              네거티브 프롬프트
            </button>
          </div>
          
          <div class="tab-content">
            <div v-if="activeTab[promptItem.id || index] !== 'negative'" class="prompt-textarea-container">
              <textarea 
                v-model="promptItem.prompt" 
                class="prompt-textarea"
                @change="updatePromptItem(index, 'prompt', $event.target.value)"
                placeholder="프롬프트를 입력하세요"
              ></textarea>
            </div>
            <div v-if="activeTab[promptItem.id || index] === 'negative'" class="prompt-textarea-container">
              <textarea 
                v-model="promptItem.negativePrompt" 
                class="prompt-textarea"
                @change="updatePromptItem(index, 'negativePrompt', $event.target.value)"
                placeholder="네거티브 프롬프트를 입력하세요"
              ></textarea>
            </div>
          </div>
        </div>
        
        <!-- 추가 필드를 위한 슬롯 -->
        <slot name="additional-fields" :item="promptItem" :index="index"></slot>
      </div>
    </div>
    <button @click="addPromptItem" class="add-prompt-btn">
      <font-awesome-icon :icon="['fas', 'plus']" /> {{ addButtonText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { VSwitch } from 'vuetify/components';
import { PromptItem } from '@/domain/scenario/entities/PromptItem';

const props = defineProps<{
  modelValue: PromptItem[];
  addButtonText: string;
}>();

const emit = defineEmits([
  'update:modelValue',
  'add-prompt-item',
  'remove-prompt-item',
  'toggle-enabled',
  'update-probability',
  'update-prompt'
]);

// 탭 상태 관리
const activeTab = ref<Record<string | number, 'prompt' | 'negative'>>({});

function setActiveTab(itemId: string | number, tab: 'prompt' | 'negative') {
  activeTab.value[itemId] = tab;
}

// 프롬프트 아이템 추가
function addPromptItem() {
  emit('add-prompt-item');
}

// 프롬프트 아이템 삭제
function removePromptItem(index: number) {
  emit('remove-prompt-item', index);
}

// 프롬프트 아이템 활성화/비활성화 토글
function togglePromptItemEnabled(index: number, enabled: boolean) {
  emit('toggle-enabled', { index, enabled });
}

// 프롬프트 아이템 확률 변경
function updatePromptItemProbability(index: number, probability: number) {
  emit('update-probability', { index, probability });
}

// 프롬프트 아이템 내용 업데이트
function updatePromptItem(index: number, field: 'prompt' | 'negativePrompt', value: string) {
  emit('update-prompt', { index, field, value });
}
</script>

<style scoped>
.prompt-items-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.prompt-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.prompt-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f5f5;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
}

.prompt-item-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prompt-item-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 탭 스타일 */
.prompt-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.tab-buttons {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 10px;
}

.tab-button {
  padding: 8px 16px;
  background-color: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: #f5f5f5;
  color: #333;
}

.tab-button.active {
  border-bottom: 2px solid #1976d2;
  color: #1976d2;
}

.tab-content {
  flex-grow: 1;
}

.prompt-textarea-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.prompt-textarea-container label {
  font-weight: 500;
  color: #555;
  font-size: 0.9rem;
}

.prompt-textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
}

.probability-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.probability-label {
  color: #666;
}

.add-prompt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.add-prompt-btn:hover {
  background-color: #45a049;
}

.remove-btn-round {
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: 0;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  color: #333;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.1s;
}

.remove-btn-round:hover {
  background-color: #e53935;
  color: #fff;
  border-color: #c62828;
  transform: scale(1.05);
}

.remove-btn-round:active {
  background-color: #c62828;
  color: #fff;
  transform: scale(0.98);
}

.enabled-switch {
  margin-right: 10px;
  display: flex;
  align-items: center;
  height: 100%;
}
</style>

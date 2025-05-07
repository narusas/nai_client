<template>
  <div class="prompt-items-list">
    <div v-for="(promptItem, index) in modelValue" :key="promptItem.id || index" class="prompt-item">
      <!-- 삭제 버튼을 탭 헤더로 이동했으므로 헤더 자체는 삭제 -->
      <!-- <div class="prompt-item-header"></div> -->
      <div class="prompt-item-content">
        <div class="prompt-tabs">
          <div class="tab-header">
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
                네거티브
              </button>
            </div>
            
            <div class="tab-controls">
              <!-- 활성화와 확률 컨트롤 -->
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
              
              <!-- 삭제 버튼 -->
              <button class="remove-btn-round" @click="removePromptItem(index)">
                <font-awesome-icon :icon="['fas', 'times']" />
              </button>
            </div>
          </div>
          
          <div class="tab-content">
            <div v-if="activeTab[promptItem.id || index] !== 'negative'" class="prompt-textarea-container">
              <textarea 
                :value="promptItem.prompt" 
                class="prompt-textarea"
                @input="updatePromptItem(index, 'prompt', $event.target.value)"
                placeholder="프롬프트를 입력하세요"
              ></textarea>
            </div>
            <div v-if="activeTab[promptItem.id || index] === 'negative'" class="prompt-textarea-container">
              <textarea 
                :value="promptItem.negativePrompt" 
                class="prompt-textarea"
                @input="updatePromptItem(index, 'negativePrompt', $event.target.value)"
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
import { ref, PropType } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { VSwitch } from 'vuetify/components';
import { PromptItem } from '@/domain/scenario/entities/PromptItem';

const props = defineProps({
  modelValue: {
    type: Array as PropType<PromptItem[]>,
    required: true,
    default: () => []
  },
  addButtonText: {
    type: String,
    default: '추가'
  }
});

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
  console.log('[PromptItemList] addPromptItem 호출됨');
  console.log('[PromptItemList] 현재 modelValue:', props.modelValue);
  
  try {
    // 새 프롬프트 아이템 생성
    const newPromptItem: PromptItem = {
      id: crypto.randomUUID(),
      prompt: '',
      negativePrompt: '',
      probability: 100,
      enabled: true
    };
    
    // 기존 배열을 확인하고 복사
    const currentItems: PromptItem[] = [];
    
    // 기존 배열이 있으면 각 요소를 깊은 복사
    if (props.modelValue && Array.isArray(props.modelValue)) {
      props.modelValue.forEach(item => {
        if (item) {
          currentItems.push({
            id: item.id || crypto.randomUUID(),
            prompt: item.prompt || '',
            negativePrompt: item.negativePrompt || '',
            probability: typeof item.probability === 'number' ? item.probability : 100,
            enabled: item.enabled !== false
          });
        }
      });
    }
    
    // 새 아이템 추가
    currentItems.push(newPromptItem);
    
    console.log('[PromptItemList] 새 프롬프트 아이템 추가:', newPromptItem);
    console.log('[PromptItemList] 업데이트된 배열 (길이: ' + currentItems.length + '):', currentItems);
    
    // v-model 업데이트
    emit('update:modelValue', currentItems);
    
    // 기존 이벤트도 발생
    emit('add-prompt-item');
    console.log('[PromptItemList] add-prompt-item 이벤트 발생됨');
  } catch (error) {
    console.error('[PromptItemList] addPromptItem 오류 발생:', error);
  }
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
  console.log(`[PromptItemList] updatePromptItem 호출됨 - index: ${index}, field: ${field}, value: ${value}`);
  
  try {
    // 기존 배열을 확인하고 깊은 복사 수행
    const currentItems: PromptItem[] = [];
    
    // 기존 배열이 있으면 각 요소를 깊은 복사
    if (props.modelValue && Array.isArray(props.modelValue)) {
      props.modelValue.forEach(item => {
        if (item) {
          currentItems.push({
            id: item.id || crypto.randomUUID(),
            prompt: item.prompt || '',
            negativePrompt: item.negativePrompt || '',
            probability: typeof item.probability === 'number' ? item.probability : 100,
            enabled: item.enabled !== false
          });
        }
      });
    }
    
    // 해당 아이템이 있는지 확인
    if (index >= 0 && index < currentItems.length) {
      // 필드 업데이트
      currentItems[index][field] = value;
      
      console.log(`[PromptItemList] 업데이트된 아이템:`, currentItems[index]);
      console.log(`[PromptItemList] 업데이트된 배열 (길이: ${currentItems.length}):`, currentItems);
      
      // v-model 업데이트
      emit('update:modelValue', currentItems);
    } else {
      console.warn(`[PromptItemList] 유효하지 않은 인덱스: ${index}, 배열 길이: ${currentItems.length}`);
    }
    
    // 기존 이벤트도 발생
    emit('update-prompt', { index, field, value });
  } catch (error) {
    console.error('[PromptItemList] updatePromptItem 오류 발생:', error);
  }
}
</script>

<style scoped>
.prompt-items-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 0;
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
  padding: 12px 0;
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

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
  margin-bottom: 10px;
}

.tab-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tab-buttons {
  display: flex;
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

<template>
  <div v-if="showModal" class="negative-history-modal">
    <div class="negative-history-content">
      <h3>네거티브 프롬프트 이력</h3>
      <div v-if="negativePromptHistory.length === 0" class="no-history">
        저장된 네거티브 프롬프트 이력이 없습니다.
      </div>
      <div v-else class="history-items">
        <div v-for="(history, index) in negativePromptHistory" :key="index" class="history-item">
          <div class="history-text">{{ history }}</div>
          <div class="history-actions">
            <button @click="selectHistory(history)" class="select-history-btn">선택</button>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button @click="closeModal">닫기</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  showModal: {
    type: Boolean,
    required: true
  },
  negativePromptHistory: {
    type: Array as () => string[],
    required: true
  }
});

const emit = defineEmits(['close', 'select-history']);

function closeModal() {
  emit('close');
}

function selectHistory(history: string) {
  emit('select-history', history);
}
</script>

<style scoped>
.negative-history-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.negative-history-content {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.history-items {
  margin: 1rem 0;
  max-height: 50vh;
  overflow-y: auto;
}

.history-item {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-text {
  flex: 1;
  font-size: 0.9rem;
  word-break: break-word;
}

.history-actions {
  margin-left: 1rem;
}

.select-history-btn {
  padding: 0.25rem 0.5rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.select-history-btn:hover {
  background-color: #218838;
}

.no-history {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
}

.modal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

button {
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
</style>

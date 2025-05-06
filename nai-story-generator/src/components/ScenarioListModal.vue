<template>
  <div v-if="showModal" class="scenario-list-modal">
    <div class="scenario-list-content">
      <h3>시나리오 목록</h3>
      <div v-if="scenarioList.length === 0" class="no-scenarios">
        저장된 시나리오가 없습니다.
      </div>
      <div v-else class="scenario-items">
        <div v-for="scenario in scenarioList" :key="scenario.id" class="scenario-item">
          <div class="scenario-info">
            <div class="scenario-item-name">{{ scenario.name }}</div>
            <div class="scenario-item-date">{{ formatDate(scenario.createdAt) }}</div>
          </div>
          <div class="scenario-actions">
            <button @click="handleSelectScenario(scenario.id)" class="select-btn">선택</button>
            <button @click="handleDeleteScenario(scenario.id)" class="delete-btn">삭제</button>
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
  scenarioList: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['close', 'select-scenario', 'delete-scenario']);

function closeModal() {
  emit('close');
}

function handleSelectScenario(id: string) {
  emit('select-scenario', id);
}

function handleDeleteScenario(id: string) {
  emit('delete-scenario', id);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style scoped>
.scenario-list-modal {
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

.scenario-list-content {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.no-scenarios {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
}

.scenario-items {
  margin: 1rem 0;
  max-height: 50vh;
  overflow-y: auto;
}

.scenario-item {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scenario-info {
  flex: 1;
}

.scenario-item-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.scenario-item-date {
  font-size: 0.8rem;
  color: #6c757d;
}

.scenario-actions {
  display: flex;
  gap: 0.5rem;
}

.select-btn {
  padding: 0.25rem 0.5rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn {
  padding: 0.25rem 0.5rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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

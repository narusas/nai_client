<template>
  <div class="loading-bar-container" v-if="isLoading">
    <div class="loading-bar">
      <div class="loading-progress" :style="{ width: `${progress}%` }"></div>
    </div>
    <div class="loading-content">
      <div class="loading-text" v-if="loadingText">{{ loadingText }}</div>
      <button v-if="showCancelButton" @click="onCancelClick" class="cancel-button">
        취소
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWindowSize } from '@vueuse/core';

const isLoading = ref(false);
const progress = ref(0);
const loadingText = ref('');
const showCancelButton = ref(false);

// 모바일 환경 감지
const { width } = useWindowSize();
const isMobile = computed(() => width.value <= 768);

// 로딩 시작
function startLoading(text: string = '이미지 생성 중...', cancelable = false) {
  isLoading.value = true;
  progress.value = 0;
  loadingText.value = text;
  
  // 모바일인 경우에만 취소 버튼 표시
  showCancelButton.value = cancelable && isMobile.value;
  
  // 진행 상태 시뮬레이션
  simulateProgress();
}

// 로딩 완료
function completeLoading() {
  progress.value = 100;
  
  setTimeout(() => {
    isLoading.value = false;
    progress.value = 0;
    loadingText.value = '';
  }, 500);
}

// 로딩 취소
function cancelLoading() {
  isLoading.value = false;
  progress.value = 0;
  loadingText.value = '';
}

// 진행 상태 시뮬레이션
function simulateProgress() {
  const interval = setInterval(() => {
    if (!isLoading.value) {
      clearInterval(interval);
      return;
    }
    
    if (progress.value < 90) {
      // 랜덤하게 진행 상태 증가 (최대 90%까지)
      const increment = Math.random() * 3;
      progress.value = Math.min(90, progress.value + increment);
    }
  }, 200);
}

// 이벤트 버스를 통해 전역에서 로딩 상태 제어 가능하도록 설정
onMounted(() => {
  window.addEventListener('loading-start', ((event: CustomEvent) => {
    const { text } = event.detail || {};
    startLoading(text);
  }) as EventListener);
  
  window.addEventListener('loading-complete', (() => {
    completeLoading();
  }) as EventListener);
  
  window.addEventListener('loading-cancel', (() => {
    cancelLoading();
  }) as EventListener);
});

// 취소 버튼 클릭 이벤트 처리
function onCancelClick() {
  // 취소 이벤트 발생
  window.dispatchEvent(new CustomEvent('loading-user-cancel'));
  cancelLoading();
}

// 컴포넌트 API 노출
defineExpose({
  startLoading,
  completeLoading,
  cancelLoading
});
</script>

<style scoped>
.loading-bar-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-bar {
  width: 100%;
  height: 4px;
  background-color: #f0f0f0;
  overflow: hidden;
}

.loading-progress {
  height: 100%;
  background-color: #2196f3;
  transition: width 0.3s ease;
}

.loading-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 16px;
  background-color: rgba(33, 150, 243, 0.1);
}

.loading-text {
  color: #2196f3;
  font-size: 0.9rem;
  text-align: center;
  flex: 1;
}

.cancel-button {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background-color: #d32f2f;
  transform: translateY(-1px);
}
</style>

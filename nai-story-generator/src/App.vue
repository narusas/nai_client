<template>
  <div class="app-container">
    <!-- 로딩 바 -->
    <LoadingBar ref="loadingBar" />
    
    <!-- 알림 컴포넌트 -->
    <NotificationBar ref="notificationBar" />
    
    <!-- 헤더 제거 -->
    
    <main class="main-container">
      <div class="left-panel" :class="{ 'hidden': showFullscreenViewer }">
        <!-- NAI 설정 패널 -->
        <section class="settings-panel">
          <div v-if="!showSettings" class="settings-toggle">
            <button @click="toggleSettings" class="toggle-button">
              <span class="button-icon">⚙️</span> NAI 설정
            </button>
          </div>
          <NaiSettingsPanel v-else @close="toggleSettings" @save="handleSettingsSave" />
        </section>
        
        <!-- 시나리오 편집 섹션 -->
        <section class="scenario-editor">
          <ScenarioEditor @image-click="handleMobileImageClick" />
        </section>
      </div>
      
      <!-- 이미지 보기 섹션 (모바일에서는 기본적으로 보이지 않음) -->
      <div v-if="showImageViewer || showFullscreenViewer" 
           class="right-panel"
           :class="{ 'fullscreen': showFullscreenViewer }">
        <section class="image-viewer">
          <ImageViewer 
            :is-app-fullscreen="showFullscreenViewer" 
            @exit-fullscreen="handleFullscreenViewerClick" 
            :key="imageViewerKey"
          />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import NaiSettingsPanel from './components/NaiSettingsPanel.vue';
import ScenarioEditor from './components/ScenarioEditor.vue';
import ImageViewer from './components/ImageViewer.vue';
import NotificationBar from './components/NotificationBar.vue';
import LoadingBar from './components/LoadingBar.vue';

// 컴포넌트 참조
const notificationBar = ref<InstanceType<typeof NotificationBar> | null>(null);
const loadingBar = ref<InstanceType<typeof LoadingBar> | null>(null);

// 설정 패널 토글 상태
const showSettings = ref(false);

// 모바일 환경 감지
const isMobile = ref(false);
const showImageViewer = computed(() => !isMobile.value);

// 모바일 전체화면 상태
const showFullscreenViewer = ref(false);

// 이미지 뷰어 컴포넌트 강제 리렌더링을 위한 키
const imageViewerKey = ref(0);

// 전체화면 모드 변경 감시
watch(showFullscreenViewer, (newValue) => {
  console.log('전체화면 모드 변경:', newValue);
  // 전체화면 모드가 변경될 때마다 이미지 뷰어 컴포넌트 강제 리렌더링
  imageViewerKey.value++;
});

// 모바일 환경 감지 함수
function checkIfMobile() {
  isMobile.value = window.innerWidth <= 768;
}

// 설정 패널 토글 함수
function toggleSettings() {
  showSettings.value = !showSettings.value;
}

// 설정 저장 함수
function handleSettingsSave() {
  showSettings.value = false;
  showNotification('설정이 저장되었습니다.', 'success');
}

// 모바일에서 이미지 클릭 시 전체화면 표시
function handleMobileImageClick() {
  if (isMobile.value) {
    console.log('모바일 이미지 클릭 - 전체화면 표시');
    
    // 이미지 뷰어 컴포넌트 강제 리렌더링
    imageViewerKey.value++;
    
    // Vue의 반응형 API를 사용하여 이미지 로드 후 전체화면 표시
    nextTick(() => {
      showFullscreenViewer.value = true;
    });
  }
}

// 전체화면 이미지 뷰어 클릭 시 닫기 - 즉시 처리
function handleFullscreenViewerClick() {
  console.log('전체화면 이미지 뷰어 닫기 호출');
  if (showFullscreenViewer.value) {
    // DOM 업데이트 전에 스타일 변경을 적용하여 애니메이션 방지
    const leftPanel = document.querySelector('.left-panel');
    if (leftPanel) {
      leftPanel.style.transition = 'none';
      leftPanel.style.animation = 'none';
    }
    
    // 즉시 처리를 위해 동기적으로 처리
    showFullscreenViewer.value = false;
    document.body.style.overflow = ''; // 스크롤 복원
    
    // 다음 트릭에서 애니메이션 속성 제거
    nextTick(() => {
      // 애니메이션 속성을 제거한 후 일반 속성으로 복원
      if (leftPanel) {
        leftPanel.style.removeProperty('transition');
        leftPanel.style.removeProperty('animation');
      }
    });
  }
}

// 전역 유틸리티 함수
const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', timeout: number = 5000) => {
  if (notificationBar.value) {
    notificationBar.value.addNotification(message, type, timeout);
  }
};

const startLoading = (text: string = '이미지 생성 중...') => {
  if (loadingBar.value) {
    loadingBar.value.startLoading(text);
  }
};

const completeLoading = () => {
  if (loadingBar.value) {
    loadingBar.value.completeLoading();
  }
};

const cancelLoading = () => {
  if (loadingBar.value) {
    loadingBar.value.cancelLoading();
  }
};

// 유틸리티 함수를 provide로 제공
provide('showNotification', showNotification);
provide('startLoading', startLoading);
provide('completeLoading', completeLoading);
provide('cancelLoading', cancelLoading);

// 전역 이벤트 핸들러 등록
onMounted(() => {
  // 초기 모바일 환경 감지
  checkIfMobile();
  
  // 화면 크기 변경 시 모바일 환경 감지
  window.addEventListener('resize', checkIfMobile);
  
  // 앱 초기화 시 필요한 작업 수행
  window.showNotification = showNotification;
  window.startLoading = startLoading;
  window.completeLoading = completeLoading;
  window.cancelLoading = cancelLoading;
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIfMobile);
});
</script>

<style scoped>

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  /* 애니메이션 제거 */
}

.left-panel {
  width: 30%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
}

.right-panel {
  width: 70%;
  overflow: hidden;
}

.settings-panel, .scenario-editor, .image-viewer {
  padding: 1rem;
}

.settings-toggle {
  padding: 1rem;
  text-align: center;
}

.toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.toggle-button:hover {
  background-color: #1976d2;
  transform: translateY(-2px);
}

.toggle-button:active {
  transform: translateY(0);
}

.button-icon {
  font-size: 1.2rem;
}

/* 모바일 환경 스타일 */
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }
  
  .left-panel {
    width: 100% !important; /* !important를 추가하여 다른 스타일 오버라이드 */
    height: 100%;
    border-right: none;
    overflow-y: auto;
    flex: 1;
    max-width: 100%; /* 최대 너비 제한 제거 */
    padding-right: 0; /* 오른쪽 패딩 제거 */
    /* 애니메이션 제거 */
  }
  
  .left-panel.hidden {
    display: none; /* transform 대신 display: none 사용하여 즉시 숨김 */
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    z-index: -1;
  }
  
  .settings-panel, .scenario-editor {
    padding: 0.8rem;
    width: 100%; /* 전체 너비 사용 */
  }
  
  .right-panel {
    display: none; /* 모바일에서는 기본적으로 숨김 */
  }
  
  .right-panel.fullscreen {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.9);
    /* 애니메이션 제거 */
    will-change: auto; /* 하드웨어 가속화 제거 */
  }
  
  .fullscreen .image-viewer {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .fullscreen-image {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .toggle-button {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
  
  .scenario-editor {
    margin-bottom: 2rem; /* 하단 여백 추가 */
  }
  
  .app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .main-container {
    flex: 1;
    height: 100%;
  }
}

.left-panel {
  width: 30%;
  padding-right: 1rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.right-panel {
  width: 70%;
  overflow: hidden;
}

.scenario-editor {
  flex: 1;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.image-viewer {
  height: 100%;
  overflow: auto;
}
</style>

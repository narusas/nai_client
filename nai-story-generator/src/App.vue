<template>
  <v-app>
    <!-- 알림 컴포넌트 -->
    <NotificationBar ref="notificationBar" />
    
    <!-- 이미지 생성 중 프로그레스 바 -->
    <v-app-bar app flat height="4" style="background-color: transparent; pointer-events: none;">
      <v-progress-linear 
        v-if="isAnyImageGenerating" 
        indeterminate 
        color="yellow-darken-2" 
        style="width: 100%; pointer-events: auto;"
      ></v-progress-linear>
    </v-app-bar>
    
    <v-main style="padding: 0;">
      <main class="main-container">
        <div class="left-panel" :class="{ 'hidden': showFullscreenViewer, 'fullscreen-editor': isFullscreenEditor }">
          <!-- 시나리오 에디터 상단 영역 -->
          <div class="editor-header">
            <!-- 앱 상단 영역 컨텐츠 -->
            <div class="app-header-content">
              <!-- 시나리오 편집 전체 화면 토글 버튼 -->
              <button @click="toggleFullscreenEditor" class="header-button" :title="isFullscreenEditor ? '전체 화면 종료' : '전체 화면 편집'">
                <font-awesome-icon :icon="isFullscreenEditor ? 'fa-solid fa-compress' : 'fa-solid fa-expand'" />
              </button>
              
              <!-- NAI 설정 요약 정보 패널 -->
              <div class="settings-summary" v-if="!showSettings">

                <div class="summary-item" v-if="settingsSummary.modelName">
                  <span class="summary-value">{{ formattedModelName }}</span>
                </div>
                <div class="summary-item" v-if="settingsSummary.sampler">
                  <span class="summary-value">{{ formattedSampler }}</span>
                </div>
                <div class="summary-item" v-if="settingsSummary.steps">
                  <span class="summary-label">S:</span>
                  <span class="summary-value">{{ settingsSummary.steps }}</span>
                </div>
                <div class="summary-item" v-if="settingsSummary.cfg">
                  <span class="summary-label">C:</span>
                  <span class="summary-value">{{ settingsSummary.cfg }}</span>
                </div>
                <div class="summary-item" v-if="settingsSummary.guidance">
                  <span class="summary-label">G:</span>
                  <span class="summary-value">{{ settingsSummary.guidance }}</span>
                </div>
              </div>
              
              <!-- NAI 설정 토글 버튼 -->
              <button @click="toggleSettings" class="header-button settings-toggle-button">
                <font-awesome-icon :icon="showSettings ? 'fa-solid fa-times' : 'fa-solid fa-gear'" />
                <span>{{ showSettings ? '설정 닫기' : 'NAI 설정' }}</span>
              </button>
            </div>
          </div>
          
          <!-- NAI 설정 패널 -->
          <section class="settings-panel">
          <NaiSettingsPanel v-if="showSettings" @close="toggleSettings" @save="handleSettingsSave" @settings-summary="updateSettingsSummary" />
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
  </v-main>
</v-app>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import NaiSettingsPanel from './components/NaiSettingsPanel.vue';
import ScenarioEditor from './components/ScenarioEditor.vue';
import ImageViewer from './components/ImageViewer.vue';
import NotificationBar from './components/NotificationBar.vue';
import LoadingBar from './components/LoadingBar.vue';
import { useScenarioStore } from './stores/scenario';
import { useNaiSettingsStore } from './stores/naiSettings';

// 컴포넌트 참조
const notificationBar = ref<InstanceType<typeof NotificationBar> | null>(null);
const loadingBar = ref<InstanceType<typeof LoadingBar> | null>(null);

// 시나리오 스토어 초기화
const scenarioStore = useScenarioStore();

// 설정 패널 토글 상태
const showSettings = ref(false);

// 모바일 환경 감지
const isMobile = ref(false);
const showImageViewer = computed(() => !isMobile.value);

// 이미지 뷰어 이전 상태 저장을 위한 변수
let previousImageViewerState = true;

// 모바일 전체화면 상태
const showFullscreenViewer = ref(false);

// 시나리오 편집 전체화면 상태
const isFullscreenEditor = ref(false);

// 이미지 뷰어 컴포넌트 강제 리렌더링을 위한 키
const imageViewerKey = ref(0);

// NAI 설정 요약 정보
const settingsSummary = ref({
  model: '',
  modelName: '',
  sampler: '',
  steps: '',
  cfg: '',
  guidance: ''
});

const formattedSampler = computed(() => {
  const sampler = settingsSummary.value.sampler;
  if (!sampler) {
    return '';
  }

  let cleanedSampler = sampler;
  if (cleanedSampler.startsWith('k_')) {
    cleanedSampler = cleanedSampler.substring(2);
  }

  const tokens = cleanedSampler.split('_');
  const initials = tokens.map(token => {
    if (token.length > 0) {
      return token.charAt(0).toUpperCase();
    }
    return '';
  }).join('');

  return initials;
});

const formattedModelName = computed(() => {
  const modelName = settingsSummary.value.modelName;
  if (!modelName) {
    return '';
  }

  let cleanedModelName = modelName;
  const prefix = "NAI Diffusion ";
  if (cleanedModelName.startsWith(prefix)) {
    cleanedModelName = cleanedModelName.substring(prefix.length).trim();
  }
  
  // 중간 카테고리 (Anime, Furry 등) 제거 로직 (필요시 활성화)
  // cleanedModelName = cleanedModelName.replace(/Anime\s|Furry\s/g, '').trim();

  const parts = cleanedModelName.split(' ').filter(p => p.length > 0);

  if (parts.length === 0) {
    return '';
  }

  let mainPart = parts[0];
  let typeInitial = '';

  const isVersionNumber = /^(V?\d+(\.\d+)?)$/.test(mainPart);

  if (isVersionNumber) {
    if (parts.length > 1) {
      typeInitial = parts[1].charAt(0).toUpperCase(); 
    }
  } else {
    mainPart = mainPart.charAt(0).toUpperCase(); 
    if (parts.length > 1) {
      typeInitial = parts[1].charAt(0).toUpperCase();
    }
  }
  
  let result = mainPart;
  if (typeInitial) {
    result += ` ${typeInitial}`;
  }

  return result;
});

// 전체화면 모드 변경 감시
watch(showFullscreenViewer, (newValue) => {
  console.log('전체화면 모드 변경:', newValue);
  // 전체화면 모드가 변경될 때마다 이미지 뷰어 컴포넌트 강제 리렌더링
  imageViewerKey.value++;
});

// 이미지 생성 중인지 여부를 저장하는 변수
const isGeneratingImages = ref(false);

// 이미지 생성 상태 설정 함수 (provide로 제공)
const setGeneratingImages = (generating: boolean) => {
  isGeneratingImages.value = generating;
};

// 시나리오 상태 변경 감시
watch(
  () => {
    // 현재 시나리오 ID 가져오기
    const currentScenarioId = scenarioStore.currentScenarioId;
    
    // 현재 시나리오의 컷 개수 가져오기 (안전하게 접근)
    let cutsLength = 0;
    const currentScenario = scenarioStore.scenarios.find(s => s.id === currentScenarioId);
    if (currentScenario && currentScenario.cuts) {
      cutsLength = currentScenario.cuts.length;
    }
    
    return [currentScenarioId, cutsLength];
  },
  () => {
    // 이미지 생성 중에는 이미지 뷰어를 초기화하지 않음
    if (isGeneratingImages.value) {
      console.log('이미지 생성 중: 이미지 뷰어 초기화 건너뜀');
      return;
    }
    
    console.log('시나리오 상태 변경 감지: 이미지 뷰어 초기화');
    // 시나리오가 변경되거나 컷이 삭제되면 이미지 뷰어 초기화
    nextTick(() => {
      // 이미지 뷰어 컴포넌트 강제 리렌더링
      imageViewerKey.value++;
      // 선택된 이미지 초기화
      scenarioStore.clearSelectedImage();
    });
  }
);

// 모바일 환경 감지 함수
function checkIfMobile() {
  isMobile.value = window.innerWidth <= 768;
}

// 설정 패널 토글 함수
const toggleSettings = () => {
  showSettings.value = !showSettings.value;
};

// 시나리오 편집 전체화면 토글 함수
const toggleFullscreenEditor = () => {
  isFullscreenEditor.value = !isFullscreenEditor.value;
  
  // 전체화면 모드일 때 이미지 뷰어 감추기
  if (isFullscreenEditor.value) {
    // 이미지 뷰어 상태를 임시 저장 (isMobile 값으로 제어)
    previousImageViewerState = !isMobile.value;
    // 이미지 뷰어 감추기 (isMobile을 true로 설정하여 showImageViewer가 false가 되도록 함)
    isMobile.value = true;
  } else {
    // 전체화면 모드가 아닐 때 이미지 뷰어 상태 복원
    isMobile.value = !previousImageViewerState;
  }
};

// NAI 설정 요약 정보 업데이트 함수
const updateSettingsSummary = (summary: any) => {
  settingsSummary.value = summary;
};

// NAI 설정 요약 정보 초기화 함수
const initializeSettingsSummary = () => {
  const naiSettingsStore = useNaiSettingsStore();
  const settings = naiSettingsStore.getSettings();
  
  if (settings) {
    // 모델 이름 표시용 함수
    const getModelDisplayName = (modelId: string) => {
      const modelMap: Record<string, string> = {
        'nai-diffusion-4-full': 'NAI Diffusion 4 Full',
        'nai-diffusion-4-curated-preview': 'NAI Diffusion 4 Curated',
        'nai-diffusion-3': 'NAI Diffusion 3'
      };
      return modelMap[modelId] || modelId;
    };
    
    settingsSummary.value = {
      model: settings.model,
      modelName: getModelDisplayName(settings.model),
      sampler: settings.sampler,
      steps: settings.steps,
      cfg: settings.cfg_rescale,
      guidance: settings.scale
    };
  }
};

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
provide('setGeneratingImages', setGeneratingImages);

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
  
  // NAI 설정 요약 정보 초기화
  initializeSettingsSummary();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIfMobile);
});

const isAnyImageGenerating = computed(() => scenarioStore.isAnyImageGenerating);
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
  flex-direction: row;
  width: 100%; /* 부모(v-main) 너비 채우기 */
  height: 100%; /* 부모(v-main) 높이 채우기 */
  overflow: hidden;
}

.left-panel {
  flex: 0 0 430px; /* 고정 너비 750px, 늘어나거나 줄어들지 않음 */
  width: 430px; /* 명시적 너비 설정 (flex-basis와 함께 사용 시 주의, 여기서는 보조 역할) */
  min-width: 430px; /* 최소 너비 강제 */
  max-width: 430px; /* 최대 너비 강제 */
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden; /* 내부 콘텐츠로 인한 가로 확장 방지 */
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  max-height: 100vh; /* 화면 높이 제한 */
  padding-right: 0.5rem;
}

.left-panel.fullscreen-editor {
  flex: 1 1 100%; /* 전체 화면 모드일 때 화면 전체 너비 차지 */
  width: 100%; /* 명시적 너비 설정 */
  min-width: 0; /* 최소 너비 제한 해제 */
  max-width: none; /* 최대 너비 제한 해제 */
  padding-left: 0;
  padding-right: 0;
}

.right-panel {
  flex: 1 1 auto; /* 남은 공간을 모두 차지하며, 필요시 축소 가능 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 시나리오 에디터 상단 영역 스타일 */
.editor-header {
  background-color: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 0.3rem 0;
  margin-bottom: 0.3rem;
  border-radius: 4px;
}

.app-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 0.25rem;
}

.header-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: transparent;
  color: #333;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.settings-toggle-button {
  background-color: #2196f3;
  color: white;
}

.settings-toggle-button:hover {
  background-color: #1976d2;
}

.settings-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem; /* 아이템 간 간격 매우 좁게 조정 */
  flex: 1;
  justify-content: center;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f0f0f0;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.summary-label {
  font-weight: bold;
  color: #555;
}

.summary-value {
  color: #333;
}

/* 모바일 환경 스타일 */
@media (max-width: 768px) {
  .app-header-content {
    padding: 0 0.3rem;
  }
  
  .header-button {
    padding: 0.4rem 0.6rem;
    font-size: 0.9rem;
  }
  
  .settings-summary {
    gap: 0.1rem; /* 모바일에서 아이템 간 간격 매우 좁게 조정 */
    justify-content: flex-start;
    overflow-x: auto;
    padding: 0.2rem 0;
  }
  
  .summary-item {
    padding: 0.2rem 0.4rem;
    font-size: 0.7rem;
    white-space: nowrap;
  }
  
  .settings-toggle-button span {
    display: none;
  }

  .main-container {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
}
  
  .left-panel {
    width: 100% !important;
    height: 100%;
    border-right: none;
    overflow-y: auto;
    flex: 1;
    max-width: 100%;
    padding-right: 0;
  }
  
  .left-panel.hidden {
    display: none;
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    z-index: -1;
  }
  
  .settings-panel, .scenario-editor {
    padding: 0.8rem 0; /* 상하 0.8rem, 좌우 0 */
    width: 100%;
  }
  
  .right-panel {
    display: none;
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
    margin-bottom: 2rem;
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


.left-panel.fullscreen-editor {
  width: 100%;
}

.right-panel {
  width: 70%;
  overflow: hidden;
}

.scenario-editor {
  flex: 1;
  margin-bottom: 0.5rem;
  padding: 0;
}

.image-viewer {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>

<template>
  <div class="image-viewer" :class="{ 'fullscreen': isFullscreen || isAppFullscreen, 'landscape': isLandscape }">
    <div v-if="currentImageId" class="image-display">
      <div 
        class="image-container" 
        @dblclick="toggleDownloadButton" 
        @click="handleClick"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <LazyImage 
          :imageId="currentImageId" 
          alt="이미지" 
          class="main-image" 
          @loaded="handleImageLoaded"
          @error="handleImageError"
        />
        <button v-if="showDownloadButton" @click.stop="downloadImage" class="download-button">
          다운로드
        </button>
        <button v-if="isFullscreen || isAppFullscreen" @click.stop="exitFullscreen" class="close-fullscreen-button">
          닫기
        </button>
        
        <!-- 이미지 네비게이션 버튼 -->
        <div v-if="(isFullscreen || isAppFullscreen) && hasMultipleImages" class="image-navigation">
          <button 
            v-if="hasPreviousImage" 
            @click.stop="navigateToPreviousImage" 
            class="nav-button prev-button"
          >
            &lt;
          </button>
          <button 
            v-if="hasNextImage" 
            @click.stop="navigateToNextImage" 
            class="nav-button next-button"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
    
    <div v-else class="no-image-selected">
      <p>시나리오 편집기에서 이미지를 선택하세요</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, defineProps, defineEmits, nextTick, computed } from 'vue';
import { useScenarioStore } from '../stores/scenario';
import { useNaiSettingsStore } from '../stores/naiSettings';
import { useWindowSize } from '@vueuse/core';
import { useImageDbService } from '../services/imageDbService';
import LazyImage from './LazyImage.vue';

// props 정의
const props = defineProps({
  isAppFullscreen: {
    type: Boolean,
    default: false
  }
});

// emit 정의
const emit = defineEmits(['exit-fullscreen']);

const scenarioStore = useScenarioStore();
const naiSettingsStore = useNaiSettingsStore();
const imageDbService = useImageDbService();
const currentImageId = ref<string | null>(null);
const currentImageUrl = ref<string | null>(null);
const showDownloadButton = ref(false);
const isFullscreen = ref(false);
const isMobile = ref(false);

// 터치 제스처 관련 변수
const touchStartX = ref(0);
const touchEndX = ref(0);
const minSwipeDistance = 50; // 최소 스와이프 거리
const isSwipingHorizontally = ref(false);
const currentImageIndex = ref(-1);
const currentCutImages = ref<any[]>([]);

// 현재 컷의 이미지 정보 계산
const hasMultipleImages = computed(() => currentCutImages.value.length > 1);
const hasPreviousImage = computed(() => currentImageIndex.value > 0);
const hasNextImage = computed(() => currentImageIndex.value < currentCutImages.value.length - 1);

// 화면 크기 감지
const { width, height } = useWindowSize();
const isLandscape = ref(width.value > height.value);

// 모바일 기기 감지
onMounted(() => {
  checkIfMobile();
  window.addEventListener('resize', checkIfMobile);
  window.addEventListener('orientationchange', handleOrientationChange);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIfMobile);
  window.removeEventListener('orientationchange', handleOrientationChange);
});

// 화면 방향 변경 감지
watch([width, height], ([newWidth, newHeight]) => {
  isLandscape.value = newWidth > newHeight;
});

// 모바일 기기 체크
function checkIfMobile() {
  isMobile.value = window.innerWidth <= 768;
}

// 화면 방향 변경 처리
function handleOrientationChange() {
  // Vue의 반응형 API를 사용하여 DOM 업데이트 후 화면 방향 감지
  nextTick(() => {
    isLandscape.value = window.innerWidth > window.innerHeight;
  });
}

// 컴포넌트 마운트 시 현재 이미지 가져오기
onMounted(() => {
  // 시나리오 스토어에서 현재 이미지 가져오기
  const selectedImageId = scenarioStore.getSelectedImageId();
  const selectedImageData = scenarioStore.getSelectedImageData();
  
  if (selectedImageId) {
    console.log('마운트 시 이미지 ID 설정 (스토어):', selectedImageId);
    currentImageId.value = selectedImageId;
    loadCurrentCutImages(selectedImageData);
  }
  
  // localStorage에서 임시 이미지 제거 (이전 세션의 이미지가 남아있을 수 있음)
  localStorage.removeItem('nai-temp-image');
});

// 현재 컷의 이미지들 가져오기
function loadCurrentCutImages(selectedImageData: any) {
  const currentScenario = scenarioStore.currentScenario;
  if (!currentScenario || !currentScenario.cuts || !selectedImageData || !selectedImageData.url) {
    currentCutImages.value = [];
    currentImageIndex.value = -1;
    return;
  }

  // 선택된 이미지가 있는 컷 찾기
  for (let i = 0; i < currentScenario.cuts.length; i++) {
    const cut = currentScenario.cuts[i];
    const imageIndex = cut.generatedImages.findIndex((img: any) => img.url === selectedImageData.url);
    
    if (imageIndex !== -1) {
      // 현재 컷의 이미지들 저장
      currentCutImages.value = cut.generatedImages;
      currentImageIndex.value = imageIndex;
      break;
    }
  }
}

// 시나리오 스토어에서 선택된 이미지 ID 감시 (깨빡임 방지를 위한 최적화)
let previousImageId = null;

watch(() => scenarioStore.getSelectedImageId(), (newImageId) => {
  console.log('이미지 ID 선택 변경 감지:', newImageId);
  
  // 동일한 이미지로 재설정되는 경우 무시 (깨빡임 방지)
  if (newImageId === previousImageId && newImageId === currentImageId.value) {
    console.log('동일한 이미지 ID 재설정, 무시');
    return;
  }
  
  previousImageId = newImageId;
  
  if (newImageId) {
    console.log('새 이미지 ID 선택됨:', newImageId);
    currentImageId.value = newImageId;
    showDownloadButton.value = false; // 새 이미지 선택 시 일단 다운로드 버튼 숨김
    
    // 선택된 이미지 데이터 가져오기
    const selectedImageData = scenarioStore.getSelectedImageData();
    if (selectedImageData) {
      console.log('선택된 이미지 데이터:', selectedImageData);
      loadCurrentCutImages(selectedImageData);
    } else {
      console.log('선택된 이미지 데이터 없음');
      // 현재 이미지가 유효하면 유지 (깨빡임 방지)
      if (!currentCutImages.value.length) {
        currentCutImages.value = [];
        currentImageIndex.value = -1;
      }
    }
  } else if (!newImageId && currentImageId.value) {
    // 선택된 이미지가 없으면 초기화
    console.log('이미지 초기화');
    currentImageId.value = null;
    currentImageUrl.value = null;
    currentCutImages.value = [];
    currentImageIndex.value = -1;
  }
}, { immediate: true }); 

// 클릭 이벤트 처리
function handleClick(event: MouseEvent) {
  // 스와이프 중이면 클릭 이벤트 무시
  if (isSwipingHorizontally.value) {
    isSwipingHorizontally.value = false;
    return;
  }
  
  console.log('이미지 뷰어 클릭 - 전체화면 토글');
  if (props.isAppFullscreen) {
    // App 컴포넌트에서 관리하는 전체화면 상태일 때
    exitFullscreen(event);
  } else if (isFullscreen.value) {
    // 내부적으로 관리하는 전체화면 상태일 때
    toggleFullscreen();
  } else {
    toggleFullscreen();
  }
}

// 터치 시작 이벤트 처리
function handleTouchStart(event: TouchEvent) {
  if (!hasMultipleImages.value) return;
  if (!(isFullscreen.value || props.isAppFullscreen)) return;
  
  touchStartX.value = event.touches[0].clientX;
  isSwipingHorizontally.value = false;
}

// 터치 이동 이벤트 처리
function handleTouchMove(event: TouchEvent) {
  if (!hasMultipleImages.value) return;
  if (!(isFullscreen.value || props.isAppFullscreen)) return;
  
  // 수평 스와이프 감지
  const currentX = event.touches[0].clientX;
  const diffX = Math.abs(currentX - touchStartX.value);
  
  // 수평 스와이프로 간주하기 위한 최소 거리 확인
  if (diffX > 10) {
    isSwipingHorizontally.value = true;
  }
}

// 터치 종료 이벤트 처리
function handleTouchEnd(event: TouchEvent) {
  if (!hasMultipleImages.value) return;
  if (!(isFullscreen.value || props.isAppFullscreen)) return;
  
  touchEndX.value = event.changedTouches[0].clientX;
  
  // 스와이프 거리 계산
  const swipeDistance = touchEndX.value - touchStartX.value;
  
  // 스와이프 방향 확인 및 처리
  if (isSwipingHorizontally.value && Math.abs(swipeDistance) > minSwipeDistance) {
    if (swipeDistance > 0 && hasPreviousImage.value) {
      // 오른쪽으로 스와이프 -> 이전 이미지
      navigateToPreviousImage();
    } else if (swipeDistance < 0 && hasNextImage.value) {
      // 왼쪽으로 스와이프 -> 다음 이미지
      navigateToNextImage();
    }
  }
  
  // 스와이프 상태 초기화
  setTimeout(() => {
    isSwipingHorizontally.value = false;
  }, 100);
}

// 이전 이미지로 이동
function navigateToPreviousImage() {
  if (hasPreviousImage.value && currentCutImages.value.length > 0) {
    currentImageIndex.value--;
    const prevImage = currentCutImages.value[currentImageIndex.value];
    if (prevImage) {
      currentImageId.value = prevImage.id;
      showDownloadButton.value = false; // 이미지 변경 시 다운로드 버튼 숨김
    }
  }
}

// 다음 이미지로 이동
function navigateToNextImage() {
  if (hasNextImage.value && currentCutImages.value.length > 0) {
    currentImageIndex.value++;
    const nextImage = currentCutImages.value[currentImageIndex.value];
    if (nextImage) {
      currentImageId.value = nextImage.id;
      showDownloadButton.value = false; // 이미지 변경 시 다운로드 버튼 숨김
    }
  }
}

// 다운로드 버튼 토글 (더블 클릭 이벤트에 연결)
function toggleDownloadButton() {
  showDownloadButton.value = !showDownloadButton.value;
}

// 전체화면 토글
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  
  if (isFullscreen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

// 전체화면 종료
function exitFullscreen(event: Event) {
  event.stopPropagation();
  console.log('전체화면 종료 함수 호출, isAppFullscreen:', props.isAppFullscreen);
  
  // 내부 전체화면 상태 초기화
  isFullscreen.value = false;
  document.body.style.overflow = '';
  
  // App 컴포넌트의 전체화면 상태가 true인 경우 이벤트 발생
  if (props.isAppFullscreen) {
    console.log('전체화면 종료 이벤트 발생');
    emit('exit-fullscreen');
  }
}

// 이미지 다운로드
function downloadImage(event: Event) {
  event.stopPropagation();
  
  if (!currentImageUrl.value) return;
  
  try {
    // 이미지 URL에서 파일명 추출 또는 기본 파일명 사용
    const filename = 'nai-generated-image.png';
    
    // 다운로드 링크 생성
    const link = document.createElement('a');
    link.href = currentImageUrl.value;
    link.download = filename;
    document.body.appendChild(link);
    
    // 다운로드 클릭 시뮬레이션
    link.click();
    
    // 링크 제거
    document.body.removeChild(link);
    
    // 다운로드 버튼 숨김
    showDownloadButton.value = false;
  } catch (error) {
    console.error('이미지 다운로드 중 오류 발생:', error);
    alert('이미지 다운로드 중 오류가 발생했습니다.');
  }
}

// 이미지 로드 완료 핸들러
function handleImageLoaded(payload) {
  console.log('이미지 로드 완료:', payload);
  currentImageUrl.value = payload.url;
}

// 이미지 로드 오류 핸들러
function handleImageError(payload) {
  console.error('이미지 로드 오류:', payload);
}
</script>

<style scoped>
.image-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  /* 애니메이션 제거 */
}

/* 전체화면 모드 */
.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  /* 애니메이션 제거 */
  will-change: auto; /* 하드웨어 가속화 제거 */
}

.image-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.fullscreen .image-display {
  background-color: transparent;
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  height: 100%;
  width: 100%;
  cursor: pointer;
}

.fullscreen .image-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
}

.main-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.fullscreen .image-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.fullscreen .main-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  margin: auto;
}

/* 가로 모드 스타일 */
.landscape.fullscreen .image-container {
  width: 100vw;
  height: 100vh;
}

.landscape.fullscreen .main-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 세로 모드 스타일 */
.fullscreen:not(.landscape) .image-container {
  width: 100vw;
  height: 100vh;
}

.fullscreen:not(.landscape) .main-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 가로 모드 이미지 컨테이너 */
.landscape.fullscreen .image-container {
  width: 100vw;
  height: 100vh;
  padding: 10px;
}

/* 세로 모드 이미지 컨테이너 */
.fullscreen:not(.landscape) .image-container {
  width: 100vw;
  height: 100vh;
  padding: 10px;
}

.no-image-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  text-align: center;
  color: #666;
  width: 100%;
  height: 100%;
}

.download-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  background-color: rgba(33, 150, 243, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
  z-index: 10;
}

.close-fullscreen-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  z-index: 10;
}

.image-navigation {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 5;
}

.nav-button {
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  margin: 0 20px;
  transition: background-color 0.2s;
}

.nav-button:hover {
  background-color: rgba(0, 0, 0, 0.6);
}

.prev-button {
  margin-right: auto;
}

.next-button {
  margin-left: auto;
}

.download-button:hover,
.close-fullscreen-button:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.download-button:active,
.close-fullscreen-button:active {
  transform: translateY(0);
}

/* 모바일 환경 스타일 */
@media (max-width: 768px) {
  .image-viewer {
    border-radius: 0;
  }
  
  .download-button,
  .close-fullscreen-button {
    padding: 10px 20px;
    font-size: 16px;
  }
}
</style>

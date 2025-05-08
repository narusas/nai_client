<template>
  <div class="lazy-image-container" :class="{ 'loading': isLoading, 'error': hasError }">
    <img 
      v-if="imageUrl && !hasError" 
      :src="imageUrl" 
      :alt="alt" 
      class="lazy-image"
      @load="handleImageLoaded"
      @error="handleImageError"
    />
    <div v-else-if="isLoading" class="loading-placeholder">
      <div class="spinner"></div>
      <span>이미지 로딩 중...</span>
    </div>
    <div v-else-if="hasError" class="error-placeholder">
      <span>이미지를 불러올 수 없습니다</span>
    </div>
    <div v-else class="empty-placeholder">
      <span>이미지 없음</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useImageDbService } from '@/services/imageDbService';

const props = defineProps({
  imageId: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: '이미지'
  }
});

const emit = defineEmits(['loaded', 'error']);

const imageUrl = ref<string | null>(null);
const isLoading = ref(false);
const hasError = ref(false);
const imageDbService = useImageDbService();

// 이미지 ID가 변경될 때마다 이미지 로드
watch(() => props.imageId, (newImageId) => {
  if (newImageId) {
    loadImage(newImageId);
  } else {
    resetState();
  }
}, { immediate: true });

// 컴포넌트 마운트 시 이미지 로드
onMounted(() => {
  if (props.imageId) {
    loadImage(props.imageId);
  }
});

// 이미지 로드 함수
async function loadImage(imageId: string) {
  if (!imageId) {
    resetState();
    return;
  }

  try {
    isLoading.value = true;
    hasError.value = false;
    imageUrl.value = null;
    
    // imageDbService를 통해 이미지 로드
    const loadedImage = await imageDbService.getImageById(imageId);
    if (loadedImage) {
      imageUrl.value = loadedImage;
    } else {
      hasError.value = true;
    }
  } catch (error) {
    console.error('이미지 로드 중 오류 발생:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
}

// 이미지 로드 완료 핸들러
function handleImageLoaded() {
  emit('loaded', { imageId: props.imageId, url: imageUrl.value });
}

// 이미지 로드 오류 핸들러
function handleImageError() {
  hasError.value = true;
  emit('error', { imageId: props.imageId });
}

// 상태 초기화
function resetState() {
  imageUrl.value = null;
  isLoading.value = false;
  hasError.value = false;
}
</script>

<style scoped>
.lazy-image-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
  overflow: hidden;
}

.lazy-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.loading-placeholder,
.error-placeholder,
.empty-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}

.loading-placeholder {
  background-color: #f9f9f9;
}

.error-placeholder {
  background-color: #fff0f0;
  color: #d32f2f;
}

.empty-placeholder {
  background-color: #f5f5f5;
  color: #999;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

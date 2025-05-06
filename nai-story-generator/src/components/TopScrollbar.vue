<template>
  <div class="top-scrollbar-wrapper">
    <div class="top-scrollbar-container" ref="scrollbarContainer">
      <div class="top-scrollbar-content" :style="{ width: contentWidth + 'px' }"></div>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

const props = defineProps<{
  targetRef: HTMLElement | null; // 타입 명확화
}>();

const scrollbarContainer = ref<HTMLElement | null>(null);
const contentWidth = ref(0);
let mutationObserverInstance: MutationObserver | null = null;

// Event Handlers
const handleTargetScroll = () => {
  if (scrollbarContainer.value && props.targetRef) {
    scrollbarContainer.value.scrollLeft = props.targetRef.scrollLeft;
  }
};

const handleScrollbarScroll = () => {
  if (props.targetRef && scrollbarContainer.value) {
    props.targetRef.scrollLeft = scrollbarContainer.value.scrollLeft;
  }
};

const updateContentWidth = () => {
  if (!props.targetRef) {
    contentWidth.value = 0;
    return;
  }
  contentWidth.value = props.targetRef.scrollWidth;
  // console.log('Updated contentWidth:', contentWidth.value, 'Target scrollWidth:', props.targetRef.scrollWidth, 'Target clientWidth:', props.targetRef.clientWidth);
};

watch(() => props.targetRef, (newTarget, oldTarget) => {
  // Cleanup listeners and observer from the old target
  if (oldTarget) {
    oldTarget.removeEventListener('scroll', handleTargetScroll);
    if (mutationObserverInstance) {
      mutationObserverInstance.disconnect();
      mutationObserverInstance = null;
    }
  }

  nextTick(() => {
    if (newTarget) {
      updateContentWidth();
      newTarget.addEventListener('scroll', handleTargetScroll);
      
      // Setup MutationObserver for the new target
      if (typeof MutationObserver !== 'undefined') {
        mutationObserverInstance = new MutationObserver(() => {
          nextTick(updateContentWidth); // DOM 변경 후 scrollWidth 업데이트
        });
        mutationObserverInstance.observe(newTarget, { 
          childList: true, 
          subtree: true, 
          attributes: true, 
          characterData: true // 텍스트 내용 변경도 감지
        });
      }
    } else {
      updateContentWidth(); // targetRef가 null이면 contentWidth도 0으로 설정
    }
  });
}, { immediate: true });

onMounted(() => {
  if (scrollbarContainer.value) {
    scrollbarContainer.value.addEventListener('scroll', handleScrollbarScroll);
  }
  window.addEventListener('resize', updateContentWidth);
  // 초기 로드 시, targetRef의 컨텐츠가 완전히 그려진 후 너비를 다시 한번 업데이트 시도
  nextTick(() => {
    updateContentWidth();
    // DOM 요소가 실제로 그려졌는지 확인하기 위한 추가 nextTick
    nextTick(updateContentWidth);
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContentWidth);
  if (props.targetRef) {
    props.targetRef.removeEventListener('scroll', handleTargetScroll);
  }
  if (scrollbarContainer.value) {
    scrollbarContainer.value.removeEventListener('scroll', handleScrollbarScroll);
  }
  if (mutationObserverInstance) {
    mutationObserverInstance.disconnect();
    mutationObserverInstance = null;
  }
});

</script>

<style scoped>
.top-scrollbar-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex-grow: 1;
  min-height: 0;
}

.top-scrollbar-container {
  width: 100%;
  height: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.top-scrollbar-content {
  height: 1px; /* 스크롤 가능한 영역을 만들기 위한 최소 높이 */
  /* 너비는 :style 바인딩으로 동적 설정 */
}

/* Firefox에서 스크롤바 스타일 지정 */
.top-scrollbar-container {
  scrollbar-width: thin;
  scrollbar-color: #bbb #f5f5f5; /* 스크롤바 색상, 트랙 색상 */
}

/* Webkit 브라우저(Chrome, Safari 등)에서 스크롤바 스타일 지정 */
.top-scrollbar-container::-webkit-scrollbar {
  height: 8px; /* 스크롤바의 높이 */
}

.top-scrollbar-container::-webkit-scrollbar-thumb {
  background-color: #bbb; /* 스크롤바의 색상 */
  border-radius: 4px;
}

.top-scrollbar-container::-webkit-scrollbar-thumb:hover {
  background-color: #999;
}
</style>

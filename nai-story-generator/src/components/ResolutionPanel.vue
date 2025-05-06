<template>
  <div class="resolution-panel">
    <h3 class="panel-title">해상도 선택</h3>
    
    <div class="resolution-list">
      <div v-for="(resolution, index) in resolutions" :key="index" class="resolution-item">
        <div class="resolution-info">
          <span>{{ resolution.width }} x {{ resolution.height }}</span>
          <input 
            type="number" 
            v-model="resolution.probability" 
            min="0" 
            max="100" 
            @input="validateProbabilities"
            class="probability-input"
          />
          <span class="probability-label">%</span>
        </div>
        <button class="remove-btn" @click="removeResolution(index)">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <div class="add-resolution">
      <div class="preset-resolutions">
        <button 
          v-for="preset in presetResolutions" 
          :key="`${preset.width}x${preset.height}`"
          @click="addPresetResolution(preset.width, preset.height)"
          class="preset-btn"
        >
          {{ preset.width }} x {{ preset.height }}
        </button>
      </div>
      
      <div class="custom-resolution">
        <div class="input-group">
          <input 
            type="number" 
            v-model="customWidth" 
            min="1" 
            max="1216" 
            placeholder="너비"
            class="resolution-input"
          />
          <span>x</span>
          <input 
            type="number" 
            v-model="customHeight" 
            min="1" 
            max="1216" 
            placeholder="높이"
            class="resolution-input"
          />
        </div>
        <button 
          @click="addCustomResolution" 
          :disabled="!isValidCustomResolution"
          class="add-btn"
        >
          추가
        </button>
      </div>
    </div>
    
    <div class="total-probability" :class="{ 'error': !isProbabilityValid }">
      총 확률: {{ totalProbability }}% {{ isProbabilityValid ? '' : '(100%가 되어야 합니다)' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineProps, defineEmits } from 'vue';

interface Resolution {
  width: number;
  height: number;
  probability: number;
}

const props = defineProps<{
  modelValue: Resolution[];
}>();

const emit = defineEmits(['update:modelValue']);

// 로컬 상태 관리
const resolutions = ref<Resolution[]>(Array.isArray(props.modelValue) ? [...props.modelValue] : [
  { width: 1216, height: 832, probability: 100 } // 기본 해상도
]);

// 프리셋 해상도 목록
const presetResolutions = [
  { width: 1216, height: 832 },
  { width: 832, height: 1216 },
  { width: 1024, height: 1024 }
];

// 커스텀 해상도 입력값
const customWidth = ref<number | null>(null);
const customHeight = ref<number | null>(null);

// 커스텀 해상도 유효성 검사
const isValidCustomResolution = computed(() => {
  if (!customWidth.value || !customHeight.value) return false;
  
  // 최대 픽셀 수 제한 (1216 x 832 이내)
  const maxPixels = 1216 * 832;
  const currentPixels = customWidth.value * customHeight.value;
  
  return (
    customWidth.value > 0 && 
    customHeight.value > 0 && 
    customWidth.value <= 1216 && 
    customHeight.value <= 1216 &&
    currentPixels <= maxPixels
  );
});

// 총 확률 계산
const totalProbability = computed(() => {
  return resolutions.value.reduce((sum, res) => sum + res.probability, 0);
});

// 확률 유효성 검사
const isProbabilityValid = computed(() => {
  return Math.abs(totalProbability.value - 100) < 0.01 || resolutions.value.length === 0;
});

// 프리셋 해상도 추가
function addPresetResolution(width: number, height: number) {
  const exists = resolutions.value.some(
    res => res.width === width && res.height === height
  );
  
  if (!exists) {
    const newProbability = calculateDefaultProbability();
    resolutions.value.push({
      width,
      height,
      probability: newProbability
    });
    validateProbabilities();
    updateModelValue();
  }
}

// 커스텀 해상도 추가
function addCustomResolution() {
  if (!isValidCustomResolution.value) return;
  
  const width = customWidth.value as number;
  const height = customHeight.value as number;
  
  const exists = resolutions.value.some(
    res => res.width === width && res.height === height
  );
  
  if (!exists) {
    const newProbability = calculateDefaultProbability();
    resolutions.value.push({
      width,
      height,
      probability: newProbability
    });
    
    // 입력 필드 초기화
    customWidth.value = null;
    customHeight.value = null;
    
    validateProbabilities();
    updateModelValue();
  }
}

// 해상도 제거
function removeResolution(index: number) {
  resolutions.value.splice(index, 1);
  validateProbabilities();
  updateModelValue();
}

// 새 항목 추가 시 기본 확률 계산
function calculateDefaultProbability(): number {
  if (resolutions.value.length === 0) return 100;
  
  // 기존 항목들의 확률을 균등하게 조정
  const newCount = resolutions.value.length + 1;
  const equalProbability = Math.floor(100 / newCount);
  
  // 기존 항목들의 확률 조정
  resolutions.value.forEach(res => {
    res.probability = equalProbability;
  });
  
  // 마지막 항목이 나머지 확률을 가짐
  return 100 - (equalProbability * resolutions.value.length);
}

// 확률 검증 및 조정
function validateProbabilities() {
  if (resolutions.value.length === 0) return;
  
  // 음수 확률 방지
  resolutions.value.forEach(res => {
    if (res.probability < 0) res.probability = 0;
    if (res.probability > 100) res.probability = 100;
  });
  
  // 총합이 100%가 되도록 마지막 항목 조정
  if (resolutions.value.length > 0) {
    const lastIndex = resolutions.value.length - 1;
    const sumExceptLast = resolutions.value
      .slice(0, lastIndex)
      .reduce((sum, res) => sum + res.probability, 0);
    
    // 마지막 항목이 나머지를 가짐 (최소 0%)
    resolutions.value[lastIndex].probability = Math.max(0, 100 - sumExceptLast);
  }
  
  updateModelValue();
}

// 부모 컴포넌트에 변경사항 전달
function updateModelValue() {
  emit('update:modelValue', [...resolutions.value]);
}

// props 변경 시 로컬 상태 업데이트
watch(() => props.modelValue, (newValue) => {
  if (Array.isArray(newValue) && newValue.length > 0) {
    resolutions.value = [...newValue];
  } else {
    // modelValue가 유효하지 않은 경우 기본값 설정
    resolutions.value = [{ width: 1216, height: 832, probability: 100 }];
    // 부모 컷포넌트에 기본값 전달
    updateModelValue();
  }
}, { deep: true });
</script>

<style scoped>
.resolution-panel {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 1.1rem;
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.resolution-list {
  margin-bottom: 15px;
  max-height: 200px;
  overflow-y: auto;
}

.resolution-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.resolution-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.probability-input {
  width: 60px;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.probability-label {
  color: #666;
}

.remove-btn {
  background: none;
  border: none;
  color: #ff4d4f;
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 8px;
}

.add-resolution {
  margin-bottom: 15px;
}

.preset-resolutions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.preset-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.9rem;
}

.preset-btn:hover {
  background-color: #40a9ff;
}

.custom-resolution {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resolution-input {
  width: 70px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-btn {
  background-color: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}

.add-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.total-probability {
  font-weight: bold;
  color: #52c41a;
}

.total-probability.error {
  color: #ff4d4f;
}

@media (max-width: 768px) {
  .custom-resolution {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .preset-resolutions {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .preset-btn {
    width: 100%;
  }
  
  .add-btn {
    width: 100%;
  }
}
</style>

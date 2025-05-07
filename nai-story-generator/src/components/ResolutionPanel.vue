<template>
  <div class="resolution-panel">
    
    
    <div class="resolution-list">
      <div v-for="resolution in resolutions" :key="resolution.id" class="resolution-item">
        <div class="resolution-info">
          <v-switch
            :model-value="resolution.enabled !== false"
            @update:model-value="handleToggleEnabled(resolution.id, $event)"
            density="compact"
            hide-details
            color="primary"
            class="enabled-switch" 
          ></v-switch>
          <span class="resolution-dimensions">{{ resolution.width }} x {{ resolution.height }}</span>
          <input 
            type="number" 
            :value="resolution.probability" 
            min="0" 
            max="100" 
            @change="handleProbabilityChange(resolution.id, Number(($event.target as HTMLInputElement).value))"
            class="probability-input"
            :disabled="resolution.enabled === false"
          />
          <span class="probability-label">%</span>
        </div>
        <button v-if="resolutions.length > 1" class="remove-btn-round" @click="removeResolution(resolution.id)">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>
    </div>
    
    <div class="add-resolution">
      <div class="preset-resolutions">
        <button 
          v-for="preset in presetResolutions" 
          :key="`${preset.width}x${preset.height}`"
          @click="fillCustomResolution(preset.width, preset.height)"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid'; 
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { VSwitch } from 'vuetify/components';

interface Resolution {
  id: string; 
  width: number;
  height: number;
  probability: number;
  enabled?: boolean; 
}

const props = defineProps<{
  modelValue: Resolution[];
  scenarioId: string; 
  cutId: string;      
}>();

const emit = defineEmits(['update:modelValue', 'resolution-changed']); 

const resolutions = ref<Resolution[]>([]);

watch(() => props.modelValue, (newValue) => {
  resolutions.value = JSON.parse(JSON.stringify(newValue || []));
}, { deep: true, immediate: true }); 


const presetResolutions = [
  { width: 1216, height: 832 },
  { width: 832, height: 1216 },
  { width: 1024, height: 1024 }
];

const customWidth = ref<number | null>(null);
const customHeight = ref<number | null>(null);

const isValidCustomResolution = computed(() => {
  if (!customWidth.value || !customHeight.value) return false;
  // 1024x1024도 유효하도록 maxPixels 값 조정
  const maxPixels = 1024 * 1024 + 1; // 1,048,576 + 1
  const currentPixels = customWidth.value * customHeight.value;
  return (
    customWidth.value > 0 && 
    customHeight.value > 0 && 
    customWidth.value <= 1216 && 
    customHeight.value <= 1216 &&
    currentPixels <= maxPixels
  );
});

const totalProbability = computed(() => {
  return resolutions.value.filter(r => r.enabled !== false).reduce((sum, res) => sum + (res.probability || 0), 0);
});

const isProbabilityValid = computed(() => {
  const activeResolutions = resolutions.value.filter(r => r.enabled !== false);
  if (activeResolutions.length === 0) return true;
  const currentTotal = activeResolutions.reduce((sum, res) => sum + (res.probability || 0), 0);
  return Math.abs(currentTotal - 100) < 0.01;
});

function handleProbabilityChange(resolutionId: string, newProbability: number) {
  const updatedProbability = Math.max(0, Math.min(100, Math.round(newProbability || 0)));
  emit('resolution-changed', {
    action: 'probability-change',
    scenarioId: props.scenarioId,
    cutId: props.cutId,
    resolutionId,
    probability: updatedProbability,
  });
}

function handleToggleEnabled(resolutionId: string, isEnabled: boolean) {
  // 해상도가 하나만 남았을 때는 비활성화 상태가 되지 않도록 처리
  if (resolutions.value.length === 1) {
    // 하나만 남은 경우 반드시 활성화 상태로 유지
    isEnabled = true;
  } else if (resolutions.value.length > 1 && !isEnabled) {
    // 여러 해상도가 있을 때 현재 활성화된 해상도가 하나만 있는지 확인
    const activeResolutions = resolutions.value.filter(r => r.enabled !== false && r.id !== resolutionId);
    if (activeResolutions.length === 0) {
      // 마지막 활성화 해상도를 비활성화하려는 경우, 비활성화 방지
      isEnabled = true;
    }
  }
  
  emit('resolution-changed', {
    action: 'toggle_enabled',
    scenarioId: props.scenarioId,
    cutId: props.cutId,
    resolutionId,
    enabled: isEnabled,
  });
}


// 프리셋 버튼을 클릭하면 커스텀 너비와 높이 필드에 값을 채우는 함수
function fillCustomResolution(width: number, height: number) {
  customWidth.value = width;
  customHeight.value = height;
}

// 기존 프리셋 추가 함수 - 직접 호출하지 않고 커스텀 필드에 값을 채운 후 추가 버튼을 클릭하도록 변경
function addPresetResolution(width: number, height: number) {
  const exists = resolutions.value.some(
    res => res.width === width && res.height === height
  );
  
  if (!exists) {
    const newResolutionPayload = {
      width,
      height,
    };
    console.log('[ResolutionPanel] addPresetResolution - newResolutionPayload:', JSON.parse(JSON.stringify(newResolutionPayload)));

    const payload = {
      action: 'add',
      scenarioId: props.scenarioId,
      cutId: props.cutId,
      resolutionData: newResolutionPayload, 
    };
    console.log('[ResolutionPanel] addPresetResolution - Emitting final payload:', JSON.parse(JSON.stringify(payload)));
    emit('resolution-changed', payload);
  }
}

function addCustomResolution() {
  if (!isValidCustomResolution.value || !customWidth.value || !customHeight.value) {
    console.warn('[ResolutionPanel] addCustomResolution - Invalid custom resolution or width/height is null/undefined. Width:', customWidth.value, 'Height:', customHeight.value);
    return;
  }

  const exists = resolutions.value.some(
    res => res.width === customWidth.value && res.height === customHeight.value
  );

  if (!exists) {
    const newResolutionPayload = {
      width: customWidth.value,
      height: customHeight.value,
    };
    console.log('[ResolutionPanel] addCustomResolution - newResolutionPayload:', JSON.parse(JSON.stringify(newResolutionPayload)));

    const payload = {
      action: 'add',
      scenarioId: props.scenarioId,
      cutId: props.cutId,
      resolutionData: newResolutionPayload,
    };
    console.log('[ResolutionPanel] addCustomResolution - Emitting final payload:', JSON.parse(JSON.stringify(payload)));
    emit('resolution-changed', payload);
    customWidth.value = null;
    customHeight.value = null;
  }
}

function removeResolution(resolutionId: string) {
  emit('resolution-changed', {
    action: 'remove',
    scenarioId: props.scenarioId,
    cutId: props.cutId,
    resolutionId,
  });
}

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
  position: relative; /* 자식 요소의 absolute positioning을 위해 필요 */
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
  height: 36px; /* 고정 높이 설정하여 수직 정렬 개선 */
}

.resolution-info > * {
  margin-right: 15px; /* 각 요소마다 오른쪽 여백 적용 */
}

.resolution-info > *:last-child {
  margin-right: 0; /* 마지막 요소는 여백 제거 */
}

.resolution-dimensions {
  font-size: 1.1rem;
  font-weight: 500;
  min-width: 120px;
  display: flex;
  align-items: center;
  height: 100%;
}

.enabled-switch {
  margin-right: 10px;
  display: flex;
  align-items: center;
  height: 100%;
}

.enabled-switch .v-switch__track {
  height: 10px !important;   /* 트랙 높이 (기본 compact 약 12px) */
  width: 22px !important;    /* 트랙 너비 (기본 compact 약 28px) */
  border-radius: 5px !important; /* 트랙 모서리 둥글게 */
}

.enabled-switch .v-switch__thumb {
  height: 14px !important; /* 섬 높이 (트랙보다 약간 크게, 기본 compact 약 16px) */
  width: 14px !important;  /* 섬 너비 */
}

.enabled-switch.v-input {
  min-height: auto !important; /* Vuetify의 기본 min-height를 무시하고 줄어들 수 있도록 함 */
  height: 24px !important;    /* 스위치 전체의 최종 높이를 작게 설정 (예: 24px) */
}

.enabled-switch .v-selection-control {
  height: 100% !important; /* 부모(.enabled-switch.v-input)의 높이에 맞춤 */
  width: auto !important;  /* 너비는 내용에 따라 자동 조절되도록 하거나 고정값 설정 가능 */
}

.probability-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  height: 32px; /* 고정 높이 설정 */
}

.probability-label {
  color: #666;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  height: 100%;
}

.remove-btn-round {
  position: absolute;
  top: 0px;
  right: 0px;
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
  padding: 8px 14px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 500;
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

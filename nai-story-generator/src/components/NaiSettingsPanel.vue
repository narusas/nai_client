<template>
  <div class="nai-settings-panel">
    <div class="panel-header">
      <h2>NAI 설정</h2>
      <button @click="$emit('close')" class="close-button">닫기</button>
    </div>
    
    <div class="settings-form">
      <div class="form-group">
        <label for="api-key">API 키</label>
        <input 
          type="password" 
          id="api-key" 
          v-model="settings.apiKey" 
          placeholder="NAI API 키를 입력하세요"
        />
      </div>
      
      <div class="form-group">
        <label for="access-token">Access Token</label>
        <input 
          type="password" 
          id="access-token" 
          v-model="settings.accessToken" 
          placeholder="NAI Access Token을 입력하세요"
        />
      </div>
      
      <div class="form-group">
        <label for="model">Model</label>
        <select id="model" v-model="settings.model">
          <option value="nai-diffusion-4-full">NAI Diffusion 4 Full</option>
          <option value="nai-diffusion-4-curated-preview">NAI Diffusion 4 Curated</option>
          <option value="nai-diffusion-3">NAI Diffusion 3</option>
        </select>
      </div>
      
      <!-- 해상도 설정은 시나리오/컷 단위로 관리하므로 제거됨 -->
      
      <div class="form-group">
        <label for="steps">스텝 수</label>
        <input 
          type="number" 
          id="steps" 
          v-model.number="settings.steps" 
          min="1" 
          max="50"
        />
      </div>
      
      <div class="form-group">
        <label for="scale">Guidance</label>
        <input 
          type="number" 
          id="scale" 
          v-model.number="settings.scale" 
          min="1" 
          max="20" 
          step="0.1"
        />
        <div class="input-description">
          값 범위: 1.0 ~ 20.0 (0.1 단위로 조정)
        </div>
      </div>
      
      <div class="form-group">
        <label for="seed">시드 (비워두면 랜덤)</label>
        <input 
          type="number" 
          id="seed" 
          v-model.number="settings.seed" 
          placeholder="랜덤"
        />
      </div>
      
      <div class="form-group">
        <label for="cfg">CFG</label>
        <input 
          type="number" 
          id="cfg" 
          v-model.number="settings.cfg_rescale" 
          min="0" 
          max="1" 
          step="0.1"
        />
        <div class="input-description">
          값 범위: 0.0 ~ 1.0 (0.1 단위로 조정)
        </div>
      </div>
      
      <div class="form-group">
        <label for="sampler">샘플러</label>
        <select id="sampler" v-model="settings.sampler">
          <option value="k_euler_ancestral">k_euler_ancestral</option>
          <option value="k_euler">k_euler</option>
          <option value="k_dpmpp_2s_ancestral">k_dpmpp_2s_ancestral</option>
          <option value="k_dpmpp_2m">k_dpmpp_2m</option>
          <option value="ddim">ddim</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="noise">Noise</label>
        <select id="noise" v-model="settings.noise_schedule">
          <option value="karras">karras</option>
          <option value="exponential">exponential</option>
          <option value="polyexponential">polyexponential</option>
        </select>
      </div>
      
      <div class="form-group toggle-group">
        <label for="auto-download">자동 다운로드</label>
        <div class="toggle-switch">
          <input type="checkbox" id="auto-download" v-model="settings.autoDownload" />
          <label for="auto-download" class="toggle-label"></label>
        </div>
        <div class="toggle-description">
          이미지 생성 후 자동으로 다운로드합니다
        </div>
      </div>
      
      <div class="form-group">
        <label for="image-format">이미지 포맷</label>
        <select id="image-format" v-model="settings.imageFormat">
          <option value="jpg">JPG</option>
          <option value="png">PNG</option>
        </select>
        <div class="setting-description">
          다운로드할 이미지 파일 형식을 선택합니다
        </div>
      </div>
      
      <div class="button-group">
        <button @click="saveSettings" class="save-button">설정 저장</button>
        <button @click="$emit('close')" class="cancel-button">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineEmits, watch } from 'vue';
import { useNaiSettingsStore } from '../stores/naiSettings';

const emit = defineEmits(['close', 'save', 'settings-summary']);

const settingsStore = useNaiSettingsStore();
const settings = ref(settingsStore.getSettings());

// 모델 ID를 사용자 친화적인 이름으로 변환하는 함수
function getModelDisplayName(modelId: string): string {
  const modelNames: Record<string, string> = {
    'nai-diffusion-4-full': 'NAI Diff 4',
    'nai-diffusion-4-curated-preview': 'NAI Diff 4 Curated',
    'nai-diffusion-3': 'NAI Diff 3'
  };
  
  return modelNames[modelId] || modelId;
}

// 설정 요약 정보를 생성하는 함수
function getSettingsSummary() {
  return {
    model: settings.value.model,
    modelName: getModelDisplayName(settings.value.model),
    sampler: settings.value.sampler,
    steps: settings.value.steps,
    cfg: settings.value.cfg_rescale,
    guidance: settings.value.scale
  };
}

// 설정이 변경될 때마다 요약 정보 업데이트
watch([() => settings.value.model, () => settings.value.steps, () => settings.value.cfg_rescale, () => settings.value.scale], 
  () => {
    emit('settings-summary', getSettingsSummary());
  }, 
  { immediate: true }
);

function saveSettings() {
  settingsStore.updateSettings(settings.value);
  emit('save');
  
  // 설정 요약 정보 업데이트
  emit('settings-summary', getSettingsSummary());
  
  // 알림 표시 (전역 알림 함수가 있는 경우 사용)
  if (window.showNotification) {
    window.showNotification('설정이 저장되었습니다.', 'success');
  } else {
    alert('설정이 저장되었습니다.');
  }
}

onMounted(() => {
  // 저장된 설정이 있으면 불러오기
  const savedSettings = settingsStore.getSettings();
  if (savedSettings) {
    settings.value = savedSettings;
  }
});
</script>

<style scoped>
.nai-settings-panel {
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .nai-settings-panel {
    padding: 0.8rem;
  }
  
  .panel-header {
    margin-bottom: 1rem;
    padding-bottom: 0.8rem;
  }
  
  h2 {
    font-size: 1.3rem;
  }
  
  .settings-group {
    margin-bottom: 1.2rem;
  }
  
  .settings-title {
    font-size: 1rem;
    margin-bottom: 0.8rem;
  }
  
  .setting-item {
    margin-bottom: 0.8rem;
  }
  
  .setting-label {
    font-size: 0.9rem;
  }
  
  .setting-control {
    margin-top: 0.3rem;
  }
  
  .button-group {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .button-group button {
    flex: 1 0 calc(50% - 0.5rem);
    margin-top: 0.5rem;
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #ddd;
  padding-bottom: 1rem;
}

.header-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

h2 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.close-button, .toggle-button {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.close-button:hover, .toggle-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 축소된 뷰 스타일 */
.nai-settings-panel.collapsed {
  min-height: auto;
}

.collapsed-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem 0;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f0f0f0;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.summary-label {
  font-weight: bold;
  color: #555;
}

.summary-value {
  color: #333;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.toggle-label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-label {
  background-color: #2196F3;
}

input:checked + .toggle-label:before {
  transform: translateX(26px);
}

.toggle-description {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.25rem;
}

label {
  font-weight: bold;
  color: #555;
  font-size: 0.9rem;
}

input, select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: #fff;
}

input:focus, select:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-button {
  background-color: #4caf50;
  color: white;
}

.cancel-button {
  background-color: #f44336;
  color: white;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

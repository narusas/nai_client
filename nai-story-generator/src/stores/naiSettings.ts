import { defineStore } from 'pinia';

interface CharacterPrompt {
  prompt: string;
  uc: string; // 네거티브 프롬프트
  center: { x: number; y: number };
  enabled: boolean;
}

interface NaiSettings {
  apiKey: string;
  accessToken: string;
  model: string;
  resolution: string;
  steps: number;
  scale: number;
  seed: number | null;
  sampler: string;
  negativePrompt: string;
  useCoords: boolean;
  useOrder: boolean;
  cfg_rescale: number;
  noise_schedule: string;
  autoDownload: boolean;
  imageFormat: 'jpg' | 'png';
  characterPrompts: CharacterPrompt[];
}

export const useNaiSettingsStore = defineStore('naiSettings', {
  state: () => ({
    settings: {
      apiKey: '',
      accessToken: '',
      model: 'nai-diffusion-4-full',
      resolution: '512x768',
      steps: 28,
      scale: 6,
      seed: null,
      sampler: 'k_euler_ancestral',
      negativePrompt: '',
      useCoords: true,
      useOrder: true,
      cfg_rescale: 0.8,
      noise_schedule: 'karras',
      autoDownload: false,
      imageFormat: 'jpg',
      characterPrompts: []
    } as NaiSettings
  }),
  
  actions: {
    updateSettings(newSettings: NaiSettings) {
      this.settings = { ...newSettings };
      this.saveToLocalStorage();
    },
    
    getSettings(): NaiSettings {
      this.loadFromLocalStorage();
      return this.settings;
    },
    
    saveToLocalStorage() {
      const settingsToSave = { ...this.settings };
      localStorage.setItem('nai-settings', JSON.stringify(settingsToSave));
    },
    
    loadFromLocalStorage() {
      const savedSettings = localStorage.getItem('nai-settings');
      if (savedSettings) {
        try {
          this.settings = JSON.parse(savedSettings);
        } catch (e) {
          console.error('설정을 불러오는 중 오류 발생:', e);
        }
      }
    }
  }
});

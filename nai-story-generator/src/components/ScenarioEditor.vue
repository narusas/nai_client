<template>
  <div class="scenario-editor">
    <div class="scenario-header">
      <div class="scenario-controls">
        <input 
          type="text" 
          v-model="scenarioName" 
          placeholder="시나리오 이름"
          class="scenario-name-input"
        />
        <button @click="newScenario" class="new-button">새 시나리오</button>
        <button @click="saveScenario" class="save-button">저장</button>
        <button @click="openScenarioList" class="load-button">불러오기</button>
        <button @click="addCut" class="add-button">새 컷 추가</button>
      </div>
    </div>
    
    <!-- 시나리오 목록 모달 -->
    <div v-if="showScenarioList" class="scenario-list-modal">
      <div class="scenario-list-content">
        <h3>시나리오 목록</h3>
        <div v-if="scenarioList.length === 0" class="no-scenarios">
          저장된 시나리오가 없습니다.
        </div>
        <div v-else class="scenario-items">
          <div v-for="scenario in scenarioList" :key="scenario.id" class="scenario-item">
            <div class="scenario-info">
              <div class="scenario-item-name">{{ scenario.name }}</div>
              <div class="scenario-item-date">{{ formatDate(scenario.createdAt) }}</div>
            </div>
            <div class="scenario-actions">
              <button @click="handleSelectScenario(scenario.id)" class="select-btn">선택</button>
              <button @click="deleteScenario(scenario.id)" class="delete-btn">삭제</button>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="showScenarioList = false">닫기</button>
        </div>
      </div>
    </div>
    
    <div class="cuts-container" ref="cutsContainer">
      <div 
        v-for="(cut, index) in cuts" 
        :key="index" 
        class="cut-card"
      >
        <div class="cut-header">
          <h3>컷 {{ index + 1 }}</h3>
          <div class="cut-controls">
            <input 
              type="number" 
              v-model.number="cut.imageCount" 
              min="1" 
              max="10" 
              class="image-count-input"
              title="생성할 이미지 수"
            />
            <button 
              @click="generateImages(cut)" 
              class="generate-button"
              :disabled="isGenerating"
              :class="{ 'disabled': isGenerating }"
            >
              {{ isGenerating ? '생성 중...' : '이미지 생성' }}
            </button>
            <button @click="removeCut(index)" class="remove-button">삭제</button>
          </div>
        </div>
        
        <div class="cut-content">
          <div class="cut-image-preview" @click="handleRepresentativeImageClick(cut)">
            <img 
              v-if="cut.representativeImage" 
              :src="cut.representativeImage" 
              alt="대표 이미지"
              class="representative-image"
            />
            <div v-else class="no-image">
              이미지 없음
            </div>
          </div>
          
          <div class="cut-prompts">
            <div class="main-prompt">
              <label>메인 프롬프트</label>
              <textarea 
                v-model="cut.mainPrompt" 
                placeholder="메인 프롬프트를 입력하세요"
                rows="4"
              ></textarea>
            </div>
            
            <div class="negative-prompt">
              <div class="negative-prompt-header">
                <label>네거티브 프롬프트</label>
                <button @click="showNegativeHistory(cut)" class="history-button" title="네거티브 프롬프트 이력">
                  <span>이력 보기</span>
                </button>
              </div>
              <textarea 
                v-model="cut.negativePrompt" 
                placeholder="네거티브 프롬프트를 입력하세요"
                rows="2"
              ></textarea>
            </div>
            
            <!-- 네거티브 프롬프트 이력 모달 -->
            <div v-if="showNegativeHistoryModal && selectedCut === cut" class="negative-history-modal">
              <div class="negative-history-content">
                <h3>네거티브 프롬프트 이력</h3>
                <div v-if="negativePromptHistory.length === 0" class="no-history">
                  이력이 없습니다.
                </div>
                <div v-else class="history-items">
                  <div v-for="(history, historyIndex) in negativePromptHistory" :key="historyIndex" class="history-item">
                    <div class="history-text">{{ history }}</div>
                    <div class="history-actions">
                      <button @click="selectNegativePrompt(cut, history)" class="select-history-btn">선택</button>
                    </div>
                  </div>
                </div>
                <div class="modal-actions">
                  <button @click="closeNegativeHistory()">닫기</button>
                </div>
              </div>
            </div>
            
            <div class="character-prompts">
              <div class="character-prompts-header">
                <label>캐릭터 프롬프트</label>
                <button @click="addCharacterPrompt(cut)" class="add-character-button">캐릭터 추가</button>
              </div>
              
              <div 
                v-for="(charPrompt, charIndex) in cut.characterPrompts" 
                :key="charIndex" 
                class="character-prompt"
              >
                <div class="char-prompt-header">
                  <input 
                    type="text" 
                    v-model="charPrompt.name" 
                    placeholder="캐릭터 이름"
                    class="character-name-input"
                  />
                  <div class="character-controls">
                    <label class="enable-checkbox">
                      <input type="checkbox" v-model="charPrompt.enabled">
                      <span>활성화</span>
                    </label>
                    <div class="order-controls">
                      <button 
                        v-if="charIndex > 0" 
                        @click="moveCharacterUp(cut, charIndex)" 
                        class="order-button up-button"
                        title="위로 이동"
                      >
                        ↑
                      </button>
                      <button 
                        v-if="charIndex < cut.characterPrompts.length - 1" 
                        @click="moveCharacterDown(cut, charIndex)" 
                        class="order-button down-button"
                        title="아래로 이동"
                      >
                        ↓
                      </button>
                    </div>
                    <button @click="removeCharacterPrompt(cut, charIndex)" class="remove-char-button">삭제</button>
                  </div>
                </div>
                
                <div class="character-prompt-content">
                  <div class="prompt-section">
                    <label>프롬프트</label>
                    <textarea 
                      v-model="charPrompt.prompt" 
                      placeholder="캐릭터 프롬프트를 입력하세요"
                      rows="3"
                    ></textarea>
                  </div>
                  
                  <div class="negative-prompt-section">
                    <label>네거티브 프롬프트</label>
                    <textarea 
                      v-model="charPrompt.negativePrompt" 
                      placeholder="캐릭터 네거티브 프롬프트를 입력하세요"
                      rows="2"
                    ></textarea>
                  </div>
                  
                  <div class="position-section">
                    <label>위치 (x, y)</label>
                    <div class="position-inputs">
                      <input 
                        type="number" 
                        v-model.number="charPrompt.position.x" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        placeholder="X (0-1)"
                      />
                      <input 
                        type="number" 
                        v-model.number="charPrompt.position.y" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        placeholder="Y (0-1)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="cut-thumbnails">
          <h4>생성된 이미지</h4>
          <div class="thumbnails-container">
            <div 
              v-for="(imageData, imgIndex) in cut.generatedImages" 
              :key="imgIndex" 
              class="thumbnail"
              @click="handleImageClick(cut, imageData)"
              @dblclick="loadPromptFromImage(cut, imageData)"
              :class="{ 'selected': imageData.url === cut.representativeImage }"
            >
              <img :src="imageData.url" :alt="`이미지 ${imgIndex + 1}`" />
              <!-- 선택된 이미지에만 대표 표시 -->
              <div v-if="imageData.url === cut.representativeImage" class="thumbnail-badge">
                대표
              </div>
              <!-- 이미지 번호는 투명한 오버레이로 이미지 왼쪽 상단에 표시 -->
              <div class="thumbnail-number">{{ imgIndex + 1 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import { ref, reactive, onMounted, inject, computed, defineEmits, nextTick } from 'vue';
import { useScenarioStore } from '../stores/scenario';
import { useNaiApiService } from '../services/naiApiService';
import { useNaiSettingsStore } from '../stores/naiSettings';
import { saveRepresentativeImage } from '../services/imageDbService';

const scenarioStore = useScenarioStore();
const naiApiService = useNaiApiService();
const naiSettingsStore = useNaiSettingsStore();

// App.vue에서 제공하는 유틸리티 함수
const showNotification = inject('showNotification') as (message: string, type: 'success' | 'error' | 'info' | 'warning', timeout?: number) => void;
const startLoading = inject('startLoading') as (text?: string) => void;
const completeLoading = inject('completeLoading') as () => void;
const cancelLoading = inject('cancelLoading') as () => void;

// 이벤트 정의
const emit = defineEmits(['image-click']);

const scenarioName = ref('새 시나리오');
const cuts = ref<any[]>([]);
const cutsContainer = ref<HTMLElement | null>(null);
const isGenerating = ref(false); // 이미지 생성 중 상태
const showScenarioList = ref(false); // 시나리오 목록 모달 표시 여부

// 네거티브 프롬프트 이력 관리
const negativePromptHistory = ref<string[]>([]);
const showNegativeHistoryModal = ref(false);
const selectedCut = ref<any>(null);

// 시나리오 목록 가져오기
const scenarioList = computed(() => {
  return scenarioStore.getScenarios();
});

// 새 컷 추가
function addCut() {
  const newCut = {
    id: Date.now(),
    mainPrompt: '',
    negativePrompt: 'nsfw, blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page',
    characterPrompts: [],
    imageCount: 1,
    generatedImages: [],
    representativeImage: null
  };
  
  cuts.value.push(newCut);
  
  // 컷이 추가된 후 스크롤 위치 조정
  setTimeout(() => {
    if (cutsContainer.value) {
      cutsContainer.value.scrollLeft = cutsContainer.value.scrollWidth;
    }
  }, 100);
}

// 캐릭터 프롬프트 추가
function addCharacterPrompt(cut: any) {
  cut.characterPrompts.push({
    name: `캐릭터 ${cut.characterPrompts.length + 1}`,
    prompt: '',
    negativePrompt: 'lowres, aliasing',
    position: { x: 0.5, y: 0.5 },
    enabled: true
  });
}

// 캐릭터 프롬프트 삭제
function removeCharacterPrompt(cut: any, index: number) {
  cut.characterPrompts.splice(index, 1);
}

// 컷 삭제
function removeCut(index: number) {
  if (confirm('이 컷을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    // 컷 삭제 전 정보 저장
    const cutName = `컷 ${index + 1}`;
    const hasImages = cuts.value[index].generatedImages.length > 0;
    
    // 컷 삭제
    cuts.value.splice(index, 1);
    
    // 알림 표시
    if (showNotification) {
      showNotification(`${cutName}가 삭제되었습니다.${hasImages ? ' 생성된 이미지도 함께 삭제되었습니다.' : ''}`, 'info');
    }
    
    // 컷이 모두 삭제된 경우 새 컷 추가
    if (cuts.value.length === 0) {
      addCut();
      
      if (showNotification) {
        showNotification('새 컷이 추가되었습니다.', 'info');
      }
    }
  }
}

// 캐릭터 순서 위로 이동
function moveCharacterUp(cut: any, index: number) {
  if (index > 0) {
    const temp = cut.characterPrompts[index];
    cut.characterPrompts[index] = cut.characterPrompts[index - 1];
    cut.characterPrompts[index - 1] = temp;
  }
}

// 캐릭터 순서 아래로 이동
function moveCharacterDown(cut: any, index: number) {
  if (index < cut.characterPrompts.length - 1) {
    const temp = cut.characterPrompts[index];
    cut.characterPrompts[index] = cut.characterPrompts[index + 1];
    cut.characterPrompts[index + 1] = temp;
  }
}

// 네거티브 프롬프트 이력 모달 표시
function showNegativeHistory(cut: any) {
  selectedCut.value = cut;
  showNegativeHistoryModal.value = true;
}

// 네거티브 프롬프트 이력 모달 닫기
function closeNegativeHistory() {
  showNegativeHistoryModal.value = false;
}

// 네거티브 프롬프트 선택
function selectNegativePrompt(cut: any, history: string) {
  cut.negativePrompt = history;
  
  // 이력 업데이트 - 선택한 이력을 가장 최근 이력으로 이동
  const index = negativePromptHistory.value.indexOf(history);
  if (index !== -1) {
    negativePromptHistory.value.splice(index, 1);
  }
  negativePromptHistory.value.unshift(history);
  
  // 최대 20개만 유지
  if (negativePromptHistory.value.length > 20) {
    negativePromptHistory.value = negativePromptHistory.value.slice(0, 20);
  }
  
  // 로컬 스토리지에 저장
  localStorage.setItem('negativePromptHistory', JSON.stringify(negativePromptHistory.value));
  
  // 모달 닫기
  closeNegativeHistory();
  
  showNotification('네거티브 프롬프트가 적용되었습니다.', 'success');
}

// 이미지 생성
async function generateImages(cut: any) {
  if (!cut.mainPrompt.trim()) {
    showNotification('메인 프롬프트를 입력해주세요.', 'warning');
    return;
  }
  
  // 네거티브 프롬프트 이력에 추가
  if (cut.negativePrompt && !negativePromptHistory.value.includes(cut.negativePrompt)) {
    negativePromptHistory.value.unshift(cut.negativePrompt);
    
    // 최대 20개만 유지
    if (negativePromptHistory.value.length > 20) {
      negativePromptHistory.value = negativePromptHistory.value.slice(0, 20);
    }
    
    // 로컬 스토리지에 저장
    localStorage.setItem('negativePromptHistory', JSON.stringify(negativePromptHistory.value));
  }
  
  // 이미 이미지 생성 중이면 무시
  if (isGenerating.value) {
    return;
  }
  
  // 이미지 생성 전 시나리오 자동 저장
  saveScenario(false);
  
  // 생성 상태 설정
  isGenerating.value = true;
  startLoading('이미지 생성 중...');
  
  try {
    // 프롬프트 구성
    let fullPrompt = cut.mainPrompt;
    
    // 캐릭터 프롬프트 추가
    if (cut.characterPrompts.length > 0) {
      const characterPrompts = cut.characterPrompts
        .filter((cp: any) => cp.prompt.trim() && cp.enabled)
        .map((cp: any) => `${cp.name}: ${cp.prompt}`)
        .join('\n');
      
      if (characterPrompts) {
        fullPrompt += '\n\n' + characterPrompts;
      }
    }
    
    console.log('최종 프롬프트:', fullPrompt);
    
    // NAI 설정에 캐릭터 프롬프트 정보 전달
    const naiSettingsStore = useNaiSettingsStore();
    const settings = naiSettingsStore.getSettings();
    
    // 캐릭터 프롬프트 설정
    settings.characterPrompts = cut.characterPrompts
      .filter((cp: any) => cp.enabled)
      .map((cp: any) => ({
        prompt: cp.prompt,
        uc: cp.negativePrompt || 'lowres, aliasing',
        center: { x: cp.position.x, y: cp.position.y },
        enabled: true
      }));
    
    // 네거티브 프롬프트 설정
    settings.negativePrompt = cut.negativePrompt;
    
    // 설정 업데이트
    naiSettingsStore.updateSettings(settings);
    
    // 이미지 생성 API 호출
    const images = await naiApiService.generateImages(fullPrompt, cut.imageCount);
    
    // 생성된 이미지 저장
    const imageDataArray = images.map(url => ({
      url,
      prompt: fullPrompt,
      mainPrompt: cut.mainPrompt,
      characterPrompts: JSON.parse(JSON.stringify(cut.characterPrompts)),
      negativePrompt: cut.negativePrompt,
      createdAt: new Date().toISOString()
    }));
    
    cut.generatedImages = [...cut.generatedImages, ...imageDataArray];
    
    // 대표 이미지가 없는 경우 첫 번째 이미지를 대표 이미지로 설정
    if (!cut.representativeImage && imageDataArray.length > 0) {
      // 대표 이미지 설정
      await setRepresentativeImage(cut, imageDataArray[0].url);
      
      // 시나리오 자동 저장 (대표 이미지 변경 적용)
      saveScenario(false);
    }
    
    // 생성 완료 알림
    completeLoading();
    showNotification(`${imageDataArray.length}개의 이미지가 생성되었습니다.`, 'success');
    
    // 자동 다운로드 설정이 켜져 있으면 이미지 자동 다운로드
    if (settings.autoDownload && imageDataArray.length > 0) {
      downloadGeneratedImages(imageDataArray);
    }
  } catch (error: any) {
    // 오류 처리
    cancelLoading();
    showNotification(`이미지 생성 중 오류 발생: ${error.message}`, 'error');
  } finally {
    // 생성 상태 초기화
    isGenerating.value = false;
  }
}

// 이미지 다운로드 함수
function downloadGeneratedImages(imageDataArray: any[]) {
  // 설정된 이미지 포맷 가져오기
  const imageFormat = naiSettingsStore.settings.imageFormat;
  const fileExtension = imageFormat === 'jpg' ? 'jpg' : 'png';
  
  // iOS 장치 감지 (아이폰, 아이패드)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  imageDataArray.forEach((imageData, index) => {
    // 현재 날짜와 시간을 포맷팅하여 파일명 생성
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const fileName = `nai_${year}${month}${day}_${hours}${minutes}${seconds}_${index}.${fileExtension}`;
    
    if (isIOS) {
      // iOS에서는 새 창에서 이미지를 열고 사용자에게 저장 지시
      showNotification('이미지가 새 창에서 열립니다. 길게 눌러서 저장하세요.', 'info');
      
      // 새 창에서 이미지 열기
      window.open(imageData.url, '_blank');
    } else {
      // 데스크톱 브라우저에서는 일반적인 다운로드 방식 사용
      const link = document.createElement('a');
      link.href = imageData.url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // 연속 다운로드 시 지연 시간 추가
    setTimeout(() => {}, 100);
  });
}

// 대표 이미지 설정
async function setRepresentativeImage(cut: any, imageUrl: string) {
  cut.representativeImage = imageUrl;
  
  // 현재 시나리오 ID 가져오기
  const currentScenarioId = scenarioStore.getCurrentScenario()?.id;
  if (currentScenarioId) {
    try {
      // IndexedDB에 대표 이미지 저장
      await saveRepresentativeImage(cut.id, imageUrl, currentScenarioId);
      console.log(`컷 ${cut.id}의 대표 이미지가 IndexedDB에 저장되었습니다.`);
    } catch (error) {
      console.error('대표 이미지 저장 중 오류:', error);
    }
  }
}

// 이미지 클릭 처리
function handleImageClick(cut: any, imageData: any) {
  console.log('이미지 클릭 처리 - 이미지 URL:', imageData.url);
  
  // 대표 이미지로 설정
  setRepresentativeImage(cut, imageData.url);
  
  // 이미지 뷰어에 표시할 이미지 선택
  scenarioStore.selectImage(imageData.url, imageData);
  
  // localStorage에 임시로 이미지 URL 저장 (이미지 전달 보증을 위해)
  localStorage.setItem('temp_selected_image', imageData.url);
  
  // 모바일 환경에서 이미지 클릭 이벤트 발생
  const { width } = useWindowSize();
  if (width.value <= 768) {
    // Vue의 반응형 API를 사용하여 이미지 클릭 이벤트 발생
    // nextTick을 사용하여 DOM 업데이트 후 이벤트 발생
    nextTick(() => {
      emit('image-click');
    });
  }
}

// 대표 이미지 클릭 처리
function handleRepresentativeImageClick(cut: any) {
  if (cut.representativeImage) {
    // 대표 이미지에 해당하는 이미지 데이터 찾기
    const imageData = cut.generatedImages.find((img: any) => img.url === cut.representativeImage);
    
    // 이미지 뷰어에 표시할 이미지 선택
    if (imageData) {
      scenarioStore.selectImage(cut.representativeImage, imageData);
    } else {
      // 이미지 데이터가 없는 경우 URL만 전달
      scenarioStore.selectImage(cut.representativeImage);
    }
    
    // 모바일 환경에서 이미지 클릭 이벤트 발생
    const { width } = useWindowSize();
    if (width.value <= 768) {
      // localStorage에 임시로 이미지 URL 저장 (이미지 전달 보증을 위해)
      localStorage.setItem('temp_selected_image', cut.representativeImage);
      
      // Vue의 반응형 API를 사용하여 이미지 클릭 이벤트 발생
      nextTick(() => {
        emit('image-click');
      });
    }
  }
}

// 이미지의 프롬프트 불러오기
function loadPromptFromImage(cut: any, imageData: any) {
  if (imageData && imageData.prompt) {
    // 메인 프롬프트 불러오기
    cut.mainPrompt = imageData.prompt.mainPrompt;
    
    // 캐릭터 프롬프트 불러오기
    if (imageData.prompt.characterPrompts && Array.isArray(imageData.prompt.characterPrompts)) {
      cut.characterPrompts = JSON.parse(JSON.stringify(imageData.prompt.characterPrompts));
    }
    
    showNotification('이미지의 프롬프트를 불러왔습니다.', 'success');
  } else {
    showNotification('이 이미지에 저장된 프롬프트 정보가 없습니다.', 'warning');
  }
}

// 시나리오 저장
function saveScenario(showAlert = true) {
  scenarioStore.saveScenario({
    name: scenarioName.value,
    cuts: cuts.value,
    createdAt: new Date().toISOString()
  });
  
  if (showAlert) {
    showNotification('시나리오가 저장되었습니다.', 'success');
  }
}

// 시나리오 목록 모달 열기
function openScenarioList() {
  showScenarioList.value = true;
}

// 새 시나리오 시작
function newScenario() {
  if (cuts.value.length > 0 && cuts.value.some(cut => cut.generatedImages.length > 0)) {
    // 이미지가 있는 경우 확인 메시지 표시
    if (!confirm('현재 시나리오의 모든 내용이 삭제되고 새 시나리오가 시작됩니다. 계속하시겠습니까?')) {
      return;
    }
  }
  
  // 시나리오 초기화
  scenarioName.value = '새 시나리오';
  cuts.value = [];
  
  // 초기 컷 추가
  addCut();
  
  // 현재 시나리오 ID 초기화
  scenarioStore.$state.currentScenarioId = null;
  
  showNotification('새 시나리오가 시작되었습니다.', 'info');
}

// 날짜 포맷 함수
function formatDate(dateString: string) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 시나리오 선택 처리
async function handleSelectScenario(scenarioId: string) {
  try {
    const success = await scenarioStore.selectScenario(scenarioId);
    if (success) {
      // 현재 시나리오 불러오기
      const currentScenario = scenarioStore.getCurrentScenario();
      if (currentScenario) {
        scenarioName.value = currentScenario.name;
        cuts.value = JSON.parse(JSON.stringify(currentScenario.cuts)); // 깊은 복사로 참조 문제 방지
        showNotification('시나리오가 로드되었습니다.', 'success');
        
        // 모달 닫기
        showScenarioList.value = false;
      }
    } else {
      showNotification('시나리오 로드에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('시나리오 로드 중 오류:', error);
    showNotification('시나리오 로드 중 오류가 발생했습니다.', 'error');
  }
}

// 시나리오 삭제
async function deleteScenario(scenarioId: string) {
  if (confirm('이 시나리오를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    try {
      const success = await scenarioStore.deleteScenario(scenarioId);
      if (success) {
        showNotification('시나리오가 삭제되었습니다.', 'info');
        // 시나리오 목록 업데이트
        scenarioList.value = scenarioStore.getScenarios();
      } else {
        showNotification('시나리오 삭제에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('시나리오 삭제 중 오류:', error);
      showNotification('시나리오 삭제 중 오류가 발생했습니다.', 'error');
    }
  }
}

onMounted(async () => {
  try {
    // 로컬 스토리지에서 데이터 로드 (비동기 함수로 변경되었으므로 await 추가)
    await scenarioStore.loadFromLocalStorage();
    
    // 마지막 저장된 시나리오 불러오기
    const currentScenario = scenarioStore.getCurrentScenario();
    if (currentScenario) {
      // 현재 시나리오 ID를 확인하고 IndexedDB에서 대표 이미지 불러오기
      await scenarioStore.loadRepresentativeImagesFromDb(currentScenario.id);
      
      // 시나리오 데이터 설정 (대표 이미지가 불러와진 후 시나리오 데이터 업데이트)
      const updatedScenario = scenarioStore.getCurrentScenario();
      scenarioName.value = updatedScenario.name;
      cuts.value = JSON.parse(JSON.stringify(updatedScenario.cuts)); // 깊은 복사로 참조 문제 방지
      
      // 앱 재기동 시 기존 이미지들은 모두 제거하고 대표 이미지만 유지
      cuts.value.forEach(cut => {
        // 기존 generatedImages 배열 초기화
        cut.generatedImages = [];
        
        if (cut.representativeImage) {
          // 대표 이미지가 있는 경우 generatedImages에 추가
          cut.generatedImages.push({
            url: cut.representativeImage,
            createdAt: new Date().toISOString(),
            prompt: {
              mainPrompt: cut.mainPrompt,
              characterPrompts: cut.characterPrompts
            }
          });
        }
      });
      
      showNotification('마지막 저장된 시나리오를 불러왔습니다.', 'info');
    } else {
      // 저장된 시나리오가 없는 경우 초기 컷 추가
      if (cuts.value.length === 0) {
        addCut();
      }
    }
    
    // 네거티브 프롬프트 이력 불러오기
    const savedNegativeHistory = localStorage.getItem('negativePromptHistory');
    if (savedNegativeHistory) {
      try {
        const parsedHistory = JSON.parse(savedNegativeHistory);
        if (Array.isArray(parsedHistory)) {
          negativePromptHistory.value = parsedHistory;
        }
      } catch (error) {
        console.error('네거티브 프롬프트 이력을 불러오는 중 오류 발생:', error);
      }
    }
  } catch (error) {
    console.error('시나리오 초기화 중 오류:', error);
    showNotification('시나리오 초기화 중 오류가 발생했습니다.', 'error');
    
    // 오류 발생 시 초기 컷 추가
    if (cuts.value.length === 0) {
      addCut();
    }
  }
});
</script>

<style scoped>
.scenario-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

@media (max-width: 768px) {
  .scenario-editor {
    padding: 0.8rem;
  }
  
  .scenario-controls {
    flex-wrap: wrap;
    justify-content: space-between;
  }
  
  .scenario-controls button {
    margin-top: 0.5rem;
    flex: 1 0 calc(50% - 0.5rem);
    min-width: calc(50% - 0.5rem);
  }
  
  .scenario-name-input {
    width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .cut-container {
    margin-bottom: 1.5rem;
  }
  
  .cut-header {
    padding: 0.6rem;
  }
  
  .cut-title {
    font-size: 1rem;
  }
  
  .cut-actions button {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
  
  textarea {
    min-height: 80px;
  }
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.scenario-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
}

.scenario-name-input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  flex: 1;
  min-width: 150px;
}

/* 시나리오 목록 모달 스타일 */
.scenario-list-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 0.2rem;
  font-size: 0.8rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thumbnail-index {
  font-weight: bold;
}

.thumbnail-badge {
  background-color: #4caf50;
  color: white;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  font-size: 0.7rem;
  font-weight: bold;
}

.scenario-list-content {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.scenario-items {
  margin: 1rem 0;
  max-height: 50vh;
  overflow-y: auto;
}

.scenario-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.scenario-item:hover {
  background-color: #f5f5f5;
}

.scenario-info {
  flex: 1;
}

.scenario-item-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.scenario-item-date {
  font-size: 0.8rem;
  color: #666;
}

.scenario-actions {
  display: flex;
  gap: 0.5rem;
}

.select-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions {
  margin-top: 1rem;
  text-align: right;
}

.no-scenarios {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.cuts-container {
  display: flex;
  overflow-x: auto;
  gap: 1rem;
  padding-bottom: 1rem;
}

.cut-card {
  flex: 0 0 350px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  max-height: 600px;
  overflow-y: auto;
}

.cut-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.cut-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.image-count-input {
  width: 50px;
  padding: 0.3rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.cut-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.cut-image-preview {
  height: 150px;
  border: 1px dashed #ccc;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: #f9f9f9;
}

.representative-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-image {
  color: #999;
  font-style: italic;
}

.cut-prompts {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
}

.character-prompts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.character-prompt {
  margin-bottom: 0.8rem;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 0.8rem;
  background-color: #f9f9f9;
}

.char-prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.character-name-input {
  padding: 0.3rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 150px;
}

.character-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.order-controls {
  display: flex;
  gap: 0.25rem;
}

.order-button {
  padding: 0.25rem 0.5rem;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
}

.order-button:hover {
  background-color: #5a6268;
}

.negative-prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.history-button {
  padding: 0.25rem 0.5rem;
  background-color: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.history-button:hover {
  background-color: #138496;
}

.negative-history-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.negative-history-content {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.history-items {
  margin: 1rem 0;
  max-height: 50vh;
  overflow-y: auto;
}

.history-item {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-text {
  flex: 1;
  font-size: 0.9rem;
  word-break: break-word;
}

.history-actions {
  margin-left: 1rem;
}

.select-history-btn {
  padding: 0.25rem 0.5rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.select-history-btn:hover {
  background-color: #218838;
}

.no-history {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
}

.enable-checkbox {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  user-select: none;
}

.character-prompt-content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.prompt-section,
.negative-prompt-section,
.position-section {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.position-inputs {
  display: flex;
  gap: 0.5rem;
}

.position-inputs input {
  width: 70px;
  padding: 0.3rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.negative-prompt {
  margin-bottom: 1rem;
}

.negative-prompt label,
.prompt-section label,
.negative-prompt-section label,
.position-section label {
  font-size: 0.9rem;
  font-weight: bold;
  color: #555;
  margin-bottom: 0.2rem;
}

.cut-thumbnails {
  margin-top: 1rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.thumbnails-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  max-height: 120px;
  overflow-y: hidden;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
}

.thumbnails-container::-webkit-scrollbar {
  height: 6px;
}

.thumbnails-container::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

.thumbnails-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.thumbnail {
  flex: 0 0 auto;
  width: 152px;
  height: 104px;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 0;
}

.thumbnail:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.thumbnail:hover img {
  transform: scale(1.05);
}

.thumbnail-number {
  position: absolute;
  top: 5px;
  left: 5px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
}

.thumbnail-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: #4caf50;
  color: white;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  font-size: 0.7rem;
  font-weight: bold;
  z-index: 2;
}

/* 버튼 스타일 */
button {
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.save-button, .load-button {
  background-color: #2196f3;
  color: white;
}

.add-button, .add-character-button {
  background-color: #4caf50;
  color: white;
}

.remove-button, .remove-char-button {
  background-color: #f44336;
  color: white;
}

.generate-button {
  background-color: #ff9800;
  color: white;
}

.generate-button.disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

button:hover {
  opacity: 0.9;
}
</style>

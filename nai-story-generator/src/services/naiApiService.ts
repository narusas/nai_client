import axios from 'axios';
import { useNaiSettingsStore } from '../stores/naiSettings';
import JSZip from 'jszip';
import { saveImageToDb, getAllImagesFromDb, migrateImagesFromLocalStorage } from './imageStorageService';
import type { CharacterPrompt as DomainCharacterPrompt } from '../domain/scenario/entities';
import { v4 as uuidv4 } from 'uuid';

// Novel AI API 응답 타입
interface NaiApiResponse {
  // 이미지 데이터 URL 형식으로 반환될 수 있음
  image?: string;
  // 여러 이미지인 경우
  images?: string[];
  // 응답 ID
  id?: string;
  // 오류 메시지
  error?: string;
  // 오류 상세 정보
  message?: string;
  // 바이너리 데이터일 수도 있음
  [key: string]: any;
}

// 이미지 생성 취소 상태를 관리할 변수
// 실제 취소 상태를 저장하는 변수
// 이 변수는 여러 호출에서 공유되어야 하므로 모듈 레벨에서 선언
// 이미지 생성이 완료되면 false로 리셋
// 이미지 생성이 시작되면 false로 설정
// ESC 키를 누르면 true로 설정
let isGenerationCancelled = false;

// 이미지 생성 취소 함수
// 외부에서 호출할 수 있도록 내보낼 함수
export function cancelImageGeneration() {
  console.log('[naiApiService] 이미지 생성 취소 요청');
  isGenerationCancelled = true;
}

export function useNaiApiService() {
  const settingsStore = useNaiSettingsStore();

  // 내부 헬퍼 함수: Base64 이미지를 Blob으로 변환
  function base64ToBlob(base64: string, contentType: string = ''): Blob {
    const base64Data = base64.split(',')[1];
    // atob는 ASCII가 아닌 문자를 디코딩할 때 문제가 발생할 수 있으므로, 
    // TextDecoder를 사용하여 UTF-8로 디코딩 후 다시 바이너리 문자열로 변환합니다.
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: contentType });
  }

  // 내부 헬퍼 함수: 이미지 브라우저 다운로드
  async function downloadImageViaBrowser(base64Image: string, filename: string) {
    try {
      const match = base64Image.match(/^data:(image\/([^;]+));base64,/);
      let contentType = 'application/octet-stream';
      let imageFormat = 'png'; // 기본 포맷

      if (match && match[1] && match[2]) {
        contentType = match[1];
        imageFormat = match[2].split('+')[0]; // 'png', 'jpeg', 'webp' 등
      }
      
      const blob = base64ToBlob(base64Image, contentType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 파일 확장자를 올바르게 설정
      const finalFilename = `${filename.substring(0, filename.lastIndexOf('.'))}.${imageFormat}`;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Image download initiated: ${finalFilename}`);
    } catch (error) {
      console.error(`Error initiating download for ${filename}:`, error);
    }
  }

  // 내부 헬퍼 함수: 이미지 생성 파라미터 준비
  function _prepareImageGenerationParameters(
    prompt: string,
    negativePromptInput?: string,
    characterPromptStrings?: string[],
    params?: { width?: number; height?: number; seed?: number | string; [key: string]: any }
  ) {
    const baseSettings = settingsStore.getSettings();

    const token = baseSettings.accessToken || baseSettings.apiKey;
    if (!token) {
      throw new Error('API 키 또는 Access Token이 설정되지 않았습니다.');
    }

    // 기본 해상도 설정
    let width: number = 1216; // 기본 가로 해상도
    let height: number = 832; // 기본 세로 해상도
    let orientation: 'landscape' | 'portrait' = 'landscape';
    
    // 사용자 설정에서 해상도 가져오기 시도
    try {
      if (baseSettings.resolution) {
        const [resWidth, resHeight] = baseSettings.resolution.split('x').map(Number);
        if (!isNaN(resWidth) && !isNaN(resHeight) && resWidth > 0 && resHeight > 0) {
          width = resWidth;
          height = resHeight;
        }
      }
    } catch (error) {
      console.warn('설정에서 해상도를 가져오는 중 오류 발생:', error);
      // 기본값 사용
    }
    
    // 파라미터로 전달된 해상도가 있으면 사용
    if (params?.width !== undefined && params?.height !== undefined) {
      width = params.width;
      height = params.height;
    }
    
    // 가로/세로 모드 확인
    orientation = width > height ? 'landscape' : 'portrait';
    
    console.log(`해상도 정보 설정: ${width} x ${height}, 방향: ${orientation}`);
    
    // NovelAI API가 가로/세로 반대로 처리하는 문제가 있는지 확인
    console.log(`이미지 요청 해상도: ${width} x ${height}, 방향: ${orientation}`);
    
    // 요청한 해상도와 방향 기록

    let seedAsNumber: number;
    const seedFromParams = params?.seed;

    if (seedFromParams !== undefined) {
      const parsedSeed = typeof seedFromParams === 'string' ? parseInt(seedFromParams, 10) : seedFromParams;
      if (!isNaN(parsedSeed)) {
        seedAsNumber = parsedSeed;
      } else {
        console.warn(`Invalid seed from params: "${seedFromParams}". Using random seed.`);
        seedAsNumber = Math.floor(Math.random() * 4294967295);
      }
    } else if (baseSettings.seed && String(baseSettings.seed).trim() !== "") {
      const parsedBaseSeed = parseInt(String(baseSettings.seed), 10);
      if (!isNaN(parsedBaseSeed)) {
        seedAsNumber = parsedBaseSeed;
      } else {
        console.warn(`Invalid seed value in settings: "${baseSettings.seed}". Using random seed.`);
        seedAsNumber = Math.floor(Math.random() * 4294967295);
      }
    } else {
      seedAsNumber = Math.floor(Math.random() * 4294967295);
    }

    const currentNegativePrompt = negativePromptInput !== undefined ? negativePromptInput : baseSettings.negativePrompt;

    const domainCharacterPrompts: DomainCharacterPrompt[] = (characterPromptStrings || []).map(pStr => ({
      prompt: pStr,
      center: { x: 0.5, y: 0.5 },
      enabled: true,
      uc: ''
    }));

    return {
      token,
      width,
      height,
      seedAsNumber,
      currentNegativePrompt,
      domainCharacterPrompts,
      baseSettings
    };
  }

  // 내부 헬퍼 함수: API 요청 데이터 빌드
  function _buildApiRequestData(
    prompt: string,
    count: number,
    { token, width, height, seedAsNumber, currentNegativePrompt, domainCharacterPrompts, baseSettings }: ReturnType<typeof _prepareImageGenerationParameters>
  ) {
    // NovelAI API가 가로/세로 반대로 처리하는 문제가 있는지 확인
    // 1216 x 832 요청했는데 832 x 1216 응답이 온 경우를 처리
    // 원래 요청한 방향을 유지하기 위해 필요한 경우 width와 height를 바꾸기
    const isLandscape = width > height;
    let adjustedWidth = width;
    let adjustedHeight = height;
    
    // 원래 요청한 방향 기록
    console.log(`원본 이미지 요청 해상도: ${width} x ${height}, 방향: ${isLandscape ? '가로' : '세로'}`);
    
    // nai-diffusion-4 모델은 방향이 반대로 처리되는 경향이 있음
    // 원하는 방향을 유지하기 위해 width와 height를 바꾸기
    if (baseSettings.model === 'nai-diffusion-4' || baseSettings.model === 'nai-diffusion-4-full') {
      // 원하는 방향을 유지하기 위해 width와 height를 바꾸기
      // 가로모드로 요청했는데 세로모드로 응답이 온 경우를 처리
      if (isLandscape) {
        // 가로모드로 요청했으나 세로모드로 응답이 오는 문제 해결
        // width와 height를 바꾸어서 원하는 방향을 유지
        [adjustedWidth, adjustedHeight] = [height, width];
        console.log(`가로모드 요청 - 해상도 조정: ${adjustedWidth} x ${adjustedHeight} (방향 변경)`);
      } else {
        // 세로모드로 요청했으나 가로모드로 응답이 오는 문제 해결
        // width와 height를 바꾸어서 원하는 방향을 유지
        [adjustedWidth, adjustedHeight] = [height, width];
        console.log(`세로모드 요청 - 해상도 조정: ${adjustedWidth} x ${adjustedHeight} (방향 변경)`);
      }
    }
    let requestData: any = {};

    if (baseSettings.model === 'nai-diffusion-4' || baseSettings.model === 'nai-diffusion-4-full') {
      // V4 모델용 캐릭터 프롬프트 변환
      const characterPrompts = domainCharacterPrompts.map(cp => ({
        prompt: cp.prompt,
        uc: cp.uc || "",
        center: { x: cp.center.x, y: cp.center.y },
        enabled: true
      }));
      
      // V4 프롬프트 구조 생성
      const v4_prompt = {
        caption: {
          base_caption: prompt,
          char_captions: domainCharacterPrompts.map(cp => ({
            char_caption: cp.prompt,
            centers: [{ x: cp.center.x, y: cp.center.y }]
          }))
        },
        use_coords: true,
        use_order: true
      };
      
      // V4 부정 프롬프트 구조 생성
      const v4_negative_prompt = {
        caption: {
          base_caption: currentNegativePrompt,
          char_captions: domainCharacterPrompts.map(cp => ({
            char_caption: cp.uc || "lowres, aliasing, ",
            centers: [{ x: cp.center.x, y: cp.center.y }]
          }))
        },
        legacy_uc: false
      };
      
      requestData = {
        input: prompt,
        model: baseSettings.model,
        action: "generate",
        parameters: {
          params_version: 3,
          width: adjustedWidth,
          height: adjustedHeight,
          scale: baseSettings.scale,
          sampler: baseSettings.sampler,
          steps: baseSettings.steps,
          n_samples: count,
          ucPreset: 0, // 0: Heavy, 1: Light, 2: Human, None
          qualityToggle: baseSettings.qualityToggle,
          autoSmea: baseSettings.smea,
          dynamic_thresholding: baseSettings.dynamicThresholding,
          controlnet_strength: 1,
          legacy: false,
          add_original_image: true,
          cfg_rescale: baseSettings.cfgRescale, // 0.0 - 1.0
          noise_schedule: baseSettings.noiseSchedule, // native, karras, exponential, polyexponential
          legacy_v3_extend: false,
          skip_cfg_above_sigma: null,
          use_coords: true,
          legacy_uc: false,
          normalize_reference_strength_multiple: true,
          seed: seedAsNumber,
          characterPrompts: characterPrompts,
          v4_prompt: v4_prompt,
          v4_negative_prompt: v4_negative_prompt,
          negative_prompt: currentNegativePrompt,
          deliberate_euler_ancestral_bug: false,
          prefer_brownian: true
        }
      };
    } else { // 기본 모델 (예: nai-diffusion-3, nai-diffusion, anime-v3 등)
      requestData = {
        input: prompt,
        model: baseSettings.model,
        action: "generate",
        parameters: {
          width: width,
          height: height,
          scale: baseSettings.scale,
          sampler: baseSettings.sampler,
          steps: baseSettings.steps,
          seed: seedAsNumber,
          n_samples: count,
          ucPreset: 0, // 0: Heavy, 1: Light, 2: Human, None
          qualityToggle: baseSettings.qualityToggle,
          sm: baseSettings.smea, // sm: true, sm_dyn: false - SMEA / sm: false, sm_dyn: true - SMEA DYN
          sm_dyn: baseSettings.smeaDYN,
          dynamic_thresholding: baseSettings.dynamicThresholding,
          controlnet_strength: 1,
          legacy: false,
          add_original_image: false,
          negative_prompt: currentNegativePrompt
        }
      };
      // Opus 모델의 특정 파라미터 (필요시 추가)
      if (baseSettings.model.includes('opus')) {
        requestData.parameters.image_count = count; // Opus는 n_samples 대신 image_count를 사용할 수 있음
        delete requestData.parameters.n_samples; // 중복 파라미터 제거
      }
    }
    return requestData;
  }

  // 내부 헬퍼 함수: API 호출 및 응답 파싱
  async function _callNaiApiAndParseResponse(
    apiUrl: string,
    requestData: any,
    token: string
  ): Promise<string[]> {
    let images: string[] = [];
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, image/png, application/zip'
    };

    console.log('API 호출 URL:', apiUrl);
    console.log('API 요청 헤더:', headers);
    console.log('API 요청 데이터:', JSON.stringify(requestData, null, 2));

    const response = await axios({
      method: 'post',
      url: apiUrl,
      data: requestData,
      headers: headers,
      responseType: 'arraybuffer', // 모든 응답을 arraybuffer로 받아 유연하게 처리
    });

    console.log('API 응답 상태 코드:', response.status);
    // console.log('API 응답 헤더:', response.headers);
    // console.log('API 응답 데이터 (raw):', response.data);

    const contentType = response.headers['content-type'];
    console.log('응답 Content-Type:', contentType);

    if (contentType && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
      try {
        const responseText = new TextDecoder().decode(response.data);
        const jsonData = JSON.parse(responseText) as NaiApiResponse;
        console.log('JSON 응답 파싱 성공:', jsonData);
        
        if (jsonData.images && Array.isArray(jsonData.images)) {
          images = jsonData.images;
        } else if (jsonData.image && typeof jsonData.image === 'string') {
          images = [jsonData.image];
        } else if (jsonData.error) {
          throw new Error(`API 오류: ${jsonData.error} - ${jsonData.message || ''}`);
        }
      } catch (parseError) {
        console.error('JSON 응답 파싱 오류:', parseError, '응답 텍스트:', new TextDecoder().decode(response.data));
        // JSON 파싱 실패 시 ZIP 처리 또는 바이너리 데이터로 간주하는 로직으로 넘어갈 수 있도록 오류를 다시 던지지 않음
        // 단, 이 경우는 API 명세와 다른 예외적인 상황일 가능성이 높으므로, ZIP 처리를 시도합니다.
        console.log('JSON 파싱 실패, ZIP 파일 추출 시도...');
        try {
          const zip = new JSZip();
          const loadedZip = await zip.loadAsync(response.data); // response.data는 ArrayBuffer여야 함
          const imageFiles = Object.keys(loadedZip.files).filter(filename => 
            !loadedZip.files[filename].dir && 
            (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
          );

          if (imageFiles.length > 0) {
            console.log('발견된 이미지 파일 (JSON 파싱 실패 후):', imageFiles);
            for (const imageFile of imageFiles) {
              const imageData = await loadedZip.file(imageFile)?.async('base64');
              if (imageData) {
                const imageType = imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
                images.push(`data:${imageType};base64,${imageData}`);
              }
            }
            console.log('JSON 파싱 실패 후 ZIP에서 이미지 추출 성공.');
          } else {
            console.log('ZIP에서 이미지 파일을 찾을 수 없음 (JSON 파싱 실패 후). 바이너리 데이터로 처리 시도.');
            // 이 경우, 단일 이미지 바이너리일 가능성을 염두에 둡니다.
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/png' });
            const imageUrl = URL.createObjectURL(blob);
            images = [imageUrl]; 
            console.log('JSON 파싱 및 ZIP 처리 실패 후 바이너리 데이터를 이미지로 처리:', imageUrl);
          }
        } catch (zipError) {
          console.error('JSON 파싱 실패 후 ZIP 처리 중 오류:', zipError);
          // 최종적으로 바이너리 데이터를 이미지로 간주
          const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/png' });
          const imageUrl = URL.createObjectURL(blob);
          images = [imageUrl];
          console.log('JSON 파싱 및 ZIP 처리 모두 실패, 바이너리 데이터를 이미지로 처리:', imageUrl);
        }
      }
    } else if (contentType && contentType.includes('application/zip')) {
      console.log('ZIP 응답 수신, 파일 추출 시도...');
      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(response.data); // response.data는 ArrayBuffer여야 함
        const imageFiles = Object.keys(loadedZip.files).filter(filename => 
          !loadedZip.files[filename].dir && 
          (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
        );
        
        if (imageFiles.length > 0) {
          console.log('발견된 이미지 파일:', imageFiles);
          for (const imageFile of imageFiles) {
            const imageData = await loadedZip.file(imageFile)?.async('base64');
            if (imageData) {
              const imageType = imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
              images.push(`data:${imageType};base64,${imageData}`);
            }
          }
          console.log('ZIP에서 이미지 추출 성공.');
        } else {
          console.log('ZIP에서 이미지 파일을 찾을 수 없음, 모든 파일 처리 시도');
          const firstFileName = Object.keys(loadedZip.files).find(name => !loadedZip.files[name].dir);
          if (firstFileName) {
            const fileData = await loadedZip.file(firstFileName)?.async('base64');
            if (fileData) {
              // 파일 확장자로 MIME 타입 추론, 기본은 png
              let imageType = 'image/png';
              if (firstFileName.endsWith('.jpg') || firstFileName.endsWith('.jpeg')) imageType = 'image/jpeg';
              images.push(`data:${imageType};base64,${fileData}`);
              console.log('ZIP에서 첫 번째 파일 추출 성공 (이미지로 간주):', images[0].substring(0,50) + '...');
            }
          }
        }
      } catch (zipError) {
        console.error('ZIP 처리 시도 중 오류:', zipError);
        // ZIP 처리 실패 시, 바이너리 데이터를 단일 이미지로 간주
        const blob = new Blob([response.data], { type: contentType || 'image/png' });
        const imageUrl = URL.createObjectURL(blob);
        images = [imageUrl];
        console.log('ZIP 처리 실패, 바이너리 데이터를 이미지로 처리:', imageUrl);
      }
    } else if (contentType && contentType.startsWith('image/')) { // 직접 이미지 응답 (e.g., image/png)
        console.log('단일 이미지 응답 수신:', contentType);
        const blob = new Blob([response.data], { type: contentType });
        const base64ImageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        images = [base64ImageData as string];
        console.log('단일 이미지 바이너리 데이터를 Base64로 변환 성공.');
    } else if (contentType && contentType === 'binary/octet-stream') { // NovelAI에서 자주 사용하는 binary/octet-stream 형식 처리
        console.log('binary/octet-stream 응답 수신, ZIP 파일 처리 시도...');
        // 먼저 ZIP 파일로 처리 시도
        try {
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(response.data);
            const imageFiles = Object.keys(loadedZip.files).filter(filename => 
                !loadedZip.files[filename].dir && 
                (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
            );
            
            if (imageFiles.length > 0) {
                console.log('ZIP 파일에서 발견된 이미지 파일:', imageFiles);
                for (const imageFile of imageFiles) {
                    const imageData = await loadedZip.file(imageFile)?.async('base64');
                    if (imageData) {
                        const imageType = imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
                        images.push(`data:${imageType};base64,${imageData}`);
                    }
                }
                console.log(`binary/octet-stream에서 ZIP 파일 추출 성공: ${images.length}개 이미지 추출`);
            } else {
                // ZIP에서 이미지를 찾지 못한 경우, 단일 이미지로 처리 시도
                console.log('ZIP 파일에서 이미지를 찾지 못함, 단일 이미지로 처리 시도');
                const blob = new Blob([response.data], { type: 'image/png' });
                const imageUrl = URL.createObjectURL(blob);
                images = [imageUrl];
                console.log('binary/octet-stream 데이터를 단일 이미지로 처리:', imageUrl);
            }
        } catch (zipError) {
            // ZIP 처리 실패 시 단일 이미지로 처리 시도
            console.log('ZIP 처리 실패, 단일 이미지로 처리 시도:', zipError);
            try {
                const blob = new Blob([response.data], { type: 'image/png' });
                const imageUrl = URL.createObjectURL(blob);
                images = [imageUrl];
                console.log('binary/octet-stream 데이터를 단일 이미지로 성공적으로 처리:', imageUrl);
            } catch (e) {
                console.error('binary/octet-stream 처리 실패:', e);
                throw new Error('binary/octet-stream 응답을 이미지로 처리할 수 없습니다.');
            }
        }
    } else {
      // 알 수 없는 content-type 또는 content-type 없는 경우, 일단 바이너리 이미지로 시도
      console.warn(`알 수 없는 Content-Type: ${contentType}. 바이너리 이미지로 처리 시도.`);
      try {
        const blob = new Blob([response.data], { type: 'image/png' }); // 기본 PNG로 가정
        const imageUrl = URL.createObjectURL(blob);
        images = [imageUrl];
        console.log('알 수 없는 Content-Type, 바이너리 데이터를 이미지로 처리 시도 성공:', imageUrl);
      } catch (e) {
        console.error('최종 이미지 처리 시도 실패:', e);
        throw new Error('API 응답을 이미지로 처리할 수 없습니다.');
      }
    }
    return images;
  }

  // 이미지 생성 함수
  async function generateImages(
    prompt: string, 
    count: number = 1,
    negativePromptInput?: string, 
    characterPromptStrings?: string[], 
    params?: { width?: number; height?: number; seed?: number | string; [key: string]: any },
    scenarioId?: string,
    cutIndex?: number,
    onImageGenerated?: (imageUrl: string) => void // 이미지가 한 장씩 생성될 때마다 호출되는 콜백 함수
  ): Promise<string[]> {
    // 이미지 생성 시작 시 취소 상태 초기화
    isGenerationCancelled = false;
    console.log('[naiApiService.generateImages] CALLED. Received scenarioId:', scenarioId, 'Received cutIndex:', cutIndex);

    // 프롬프트가 undefined일 때 기본값 제공
    if (prompt === undefined || prompt === null) {
      console.warn('프롬프트가 undefined로 전달되었습니다. 기본값을 사용합니다.');
      prompt = 'best quality, very aesthetic';
    }
    
    // 부정 프롬프트가 undefined일 때 기본값 제공
    if (negativePromptInput === undefined) {
      console.warn('부정 프롬프트가 undefined로 전달되었습니다. 기본값을 사용합니다.');
      negativePromptInput = 'nsfw, blurry, lowres, error, worst quality, bad quality';
    }
    
    // 모든 생성된 이미지를 저장할 배열
    const allGeneratedImages: string[] = [];
    
    try {
      // 비용 청구 최소화를 위해 n_samples를 항상 1로 설정하고 여러 번 호출
      console.log(`[naiApiService.generateImages] 요청된 이미지 수: ${count}`);
      console.log(`[naiApiService.generateImages] n_samples=1로 ${count}번 API 호출 방식으로 변경`);
      
      const preparedParams = _prepareImageGenerationParameters(prompt, negativePromptInput, characterPromptStrings, params);
      const { token, width, height, seedAsNumber, currentNegativePrompt, domainCharacterPrompts, baseSettings } = preparedParams;
      const apiUrl = baseSettings.apiUrl || 'https://image.novelai.net/ai/generate-image';
      
      // 각 이미지 생성을 위한 반복문
      for (let i = 0; i < count; i++) {
        // 취소 상태 확인
        if (isGenerationCancelled) {
          console.log(`[naiApiService.generateImages] 이미지 생성 취소 요청으로 이미지 ${i+1}/${count} 부터 생성 중단`);
          break; // 반복문 종료
        }
        // 시드 처리 - 특별히 지정되지 않았다면 빈 값으로 처리
        let currentSeed = undefined;
        if (seedAsNumber !== undefined && seedAsNumber !== null) {
          // 시드가 지정된 경우에만 시드에 i를 더함
          currentSeed = seedAsNumber + i;
          console.log(`[naiApiService.generateImages] 이미지 ${i+1}/${count} 생성 중, 시드: ${currentSeed}`);
        } else {
          console.log(`[naiApiService.generateImages] 이미지 ${i+1}/${count} 생성 중, 시드: 임의 생성`);
        }
        
        // 요청 데이터 생성 - 항상 n_samples=1로 설정
        let requestData = _buildApiRequestData(prompt, 1, {
          ...preparedParams,
          seedAsNumber: currentSeed
        });
        
        // 요청 데이터 문제 해결
        if (baseSettings.model === 'nai-diffusion-4-full' || baseSettings.model === 'nai-diffusion-4') {
          // 전체 요청 객체 재구성
          requestData = {
            input: prompt,
            model: baseSettings.model,
            action: "generate",
            parameters: {
              params_version: 3,
              width: width,
              height: height,
              scale: baseSettings.scale,
              sampler: baseSettings.sampler,
              steps: baseSettings.steps,
              n_samples: 1, // 항상 1로 설정
              ucPreset: 0,
              qualityToggle: baseSettings.qualityToggle,
              autoSmea: baseSettings.smea,
              dynamic_thresholding: baseSettings.dynamicThresholding,
              controlnet_strength: 1,
              legacy: false,
              add_original_image: true,
              cfg_rescale: baseSettings.cfgRescale,
              noise_schedule: baseSettings.noiseSchedule,
              legacy_v3_extend: false,
              skip_cfg_above_sigma: null,
              use_coords: true,
              legacy_uc: false,
              normalize_reference_strength_multiple: true,
              seed: currentSeed, // 현재 반복에 맞는 시드 사용 (지정되지 않았다면 undefined로 임의 생성)
              characterPrompts: domainCharacterPrompts.map(cp => ({
                prompt: cp.prompt,
                uc: cp.uc || "",
                center: { x: cp.center.x, y: cp.center.y },
                enabled: true
              })),
              v4_prompt: {
                caption: {
                  base_caption: prompt,
                  char_captions: domainCharacterPrompts.map(cp => ({
                    char_caption: cp.prompt,
                    centers: [{ x: cp.center.x, y: cp.center.y }]
                  }))
                },
                use_coords: true,
                use_order: true
              },
              v4_negative_prompt: {
                caption: {
                  base_caption: currentNegativePrompt,
                  char_captions: domainCharacterPrompts.map(cp => ({
                    char_caption: cp.uc || "lowres, aliasing, ",
                    centers: [{ x: cp.center.x, y: cp.center.y }]
                  }))
                },
                legacy_uc: false
              },
              negative_prompt: currentNegativePrompt,
              deliberate_euler_ancestral_bug: false,
              prefer_brownian: true
            }
          };
        }
        
        // API 호출 및 응답 파싱
        console.log(`[naiApiService.generateImages] 이미지 ${i+1}/${count} API 호출 시작`);
        const images = await _callNaiApiAndParseResponse(apiUrl, requestData, token);
        
        if (images.length > 0) {
          // 생성된 이미지를 전체 배열에 추가
          allGeneratedImages.push(...images);
          console.log(`[naiApiService.generateImages] 이미지 ${i+1}/${count} 생성 완료`);
          
          // 이미지가 생성될 때마다 콜백 함수 호출
          if (onImageGenerated && images[0]) {
            console.log(`[naiApiService.generateImages] 이미지 ${i+1}/${count} 뷰어 갱신`);
            onImageGenerated(images[0]);
          }
        } else {
          console.warn(`[naiApiService.generateImages] 이미지 ${i+1}/${count} 생성 실패`);
        }
      }
      
      // 모든 이미지 생성 완료 후 처리
      if (allGeneratedImages.length > 0) {
        console.log(`[naiApiService.generateImages] 총 ${allGeneratedImages.length}개 이미지 생성 완료`);
        await saveImagesToServer(allGeneratedImages, prompt);

        // 이미지 다운로드 로직
        if (scenarioId && cutIndex !== undefined) {
          const shortScenarioId = scenarioId.substring(0, 10);
          const formattedCutIndex = cutIndex.toString().padStart(2, '0');
          const timestamp = getCurrentTimestamp();
          
          for (let i = 0; i < allGeneratedImages.length; i++) {
            const filename = `nai_${shortScenarioId}_${formattedCutIndex}_${timestamp}_${i + 1}.png`;
            console.log(`[naiApiService.generateImages] Preparing to download image as: ${filename}`);
            await downloadImageViaBrowser(allGeneratedImages[i], filename);
          }
        } else {
          console.warn('[naiApiService.generateImages] scenarioId 또는 cutIndex가 제공되지 않아 이미지 다운로드를 건너뜁니다.');
        }
      } else {
        console.warn('생성된 이미지가 없습니다.');
      }
      
      return allGeneratedImages;
    } catch (error: any) {
      console.error('NAI API 호출 중 오류 발생:', error);
      console.error('오류 상세 정보:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        request: error.request ? {
          method: error.request.method,
          url: error.request.url,
          headers: error.request.headers,
        } : 'No request data',
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
        } : 'No response data',
        config: error.config ? {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers,
          data: error.config.data,
        } : 'No config data'
      });
      
      if (error.response) {
        throw new Error(`API 오류: ${error.response.status} - ${error.response.data?.message || JSON.stringify(error.response.data) || '알 수 없는 오류'}`);
      } else if (error.request) {
        throw new Error('서버 응답이 없습니다. 네트워크 연결을 확인하세요.');
      } else {
        throw new Error(`오류 발생: ${error.message}`);
      }
    }
  }
  
  async function saveImagesToServer(images: string[], prompt: string): Promise<void> {
    try {
      const hasLocalStorageData = localStorage.getItem('nai-saved-images') !== null;
      if (hasLocalStorageData) {
        await migrateImagesFromLocalStorage();
      }
      
      for (const image of images) {
        await saveImageToDb({
          url: image,
          prompt,
          createdAt: new Date().toISOString()
        });
      }
      
      console.log('이미지가 IndexedDB에 저장되었습니다.');
    } catch (error) {
      console.error('이미지 저장 중 오류 발생:', error);
    }
  }
  
  // 타임스탬프 생성 헬퍼 함수 (yyyyMMdd_HHmmss)
  function getCurrentTimestamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  // 이미지 다운로드 함수 (Base64 버전은 사용하지 않으므로 Blob URL을 직접 사용)
  async function downloadImageViaBrowser(imageUrl: string, filename: string) {
    console.log(`[naiApiService.downloadImageViaBrowser] Downloading ${filename}`);
    try {
      const a = document.createElement('a');
      a.href = imageUrl; 
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 생성된 Blob URL은 이미지 표시 후 적절한 시점에 해제하는 것이 좋으나,
      // 여기서는 다운로드 후 바로 해제하지 않고 반환된 URL을 Vue 컴포넌트에서 사용.
      // URL.revokeObjectURL(imageUrl); // 만약 다운로드 후 즉시 필요 없다면 해제
      console.log(`[naiApiService.downloadImageViaBrowser] Successfully initiated download for ${filename}`);
    } catch (error) {
      console.error(`[naiApiService.downloadImageViaBrowser] Error downloading image ${filename}:`, error);
    }
  }

  return {
    generateImages
  };
}

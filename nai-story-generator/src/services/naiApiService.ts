import axios from 'axios';
import { useNaiSettingsStore } from '../stores/naiSettings';
import JSZip from 'jszip';
import { saveImageToDb, getAllImagesFromDb, migrateImagesFromLocalStorage } from './imageStorageService';
import type { CharacterPrompt as DomainCharacterPrompt } from '../domain/scenario/entities';

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

export function useNaiApiService() {
  const settingsStore = useNaiSettingsStore();
  
  // 이미지 생성 함수
  async function generateImages(
    prompt: string, 
    count: number = 1,
    negativePromptInput?: string, 
    characterPromptStrings?: string[], 
    params?: { width?: number; height?: number; seed?: number | string; [key: string]: any }
  ): Promise<string[]> {
    const baseSettings = settingsStore.getSettings(); 
    
    const token = baseSettings.accessToken || baseSettings.apiKey;
    if (!token) {
      throw new Error('API 키 또는 Access Token이 설정되지 않았습니다.');
    }
    
    let width: number;
    let height: number;
    if (params?.width !== undefined && params?.height !== undefined) {
      width = params.width;
      height = params.height;
    } else {
      const [resWidth, resHeight] = baseSettings.resolution.split('x').map(Number);
      width = resWidth;
      height = resHeight;
    }
    
    // Seed 값을 숫자로 처리하도록 수정
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
      seedAsNumber = Math.floor(Math.random() * 4294967295); // NAI는 0부터 (2^32 - 1) 사이의 시드를 사용
    }
    const currentSeedString = String(seedAsNumber); // 로그용 또는 문자열 필요시 사용

    const currentNegativePrompt = negativePromptInput !== undefined ? negativePromptInput : baseSettings.negativePrompt;

    const domainCharacterPrompts: DomainCharacterPrompt[] = (characterPromptStrings || []).map(pStr => ({
      prompt: pStr,
      center: { x: 0.5, y: 0.5 }, 
      enabled: true, 
      uc: '' 
    }));

    try {
      console.log('이미지 생성 요청 매개변수:', {
        prompt,
        model: baseSettings.model,
        width,
        height,
        scale: baseSettings.scale,
        steps: baseSettings.steps,
        sampler: baseSettings.sampler,
        seed: seedAsNumber,
        negativePrompt: currentNegativePrompt,
        characterPrompts: domainCharacterPrompts, 
        count
      });
      
      let requestData: any = {};
      
      if (baseSettings.model === 'nai-diffusion-4' || baseSettings.model === 'nai-diffusion-4-full') {
        const charCaptions = domainCharacterPrompts.map(cp => ({
          char_caption: cp.prompt,
          centers: [{ x: cp.center.x, y: cp.center.y }]
        }));
        
        const charNegativeCaptions = domainCharacterPrompts.map(cp => ({
          char_caption: cp.uc, 
          centers: [{ x: cp.center.x, y: cp.center.y }]
        }));
        
        requestData = {
          input: prompt,
          model: baseSettings.model,
          action: 'generate',
          parameters: {
            params_version: 3,
            width,
            height,
            scale: baseSettings.scale,
            sampler: baseSettings.sampler,
            steps: baseSettings.steps,
            n_samples: count,
            ucPreset: 0,
            qualityToggle: true,
            autoSmea: true,
            controlnet_strength: 1,
            legacy: false,
            add_original_image: true,
            cfg_rescale: 0.8,
            noise_schedule: 'karras',
            legacy_v3_extend: false,
            use_coords: baseSettings.useCoords, 
            legacy_uc: false,
            seed: seedAsNumber,
            v4_prompt: {
              caption: {
                base_caption: prompt,
                char_captions: charCaptions
              },
              use_coords: baseSettings.useCoords, 
              use_order: baseSettings.useOrder    
            },
            v4_negative_prompt: {
              caption: {
                base_caption: currentNegativePrompt, 
                char_captions: charNegativeCaptions
              },
              legacy_uc: false
            },
            negative_prompt: currentNegativePrompt 
          }
        };
      } else {
        requestData = {
          input: prompt,
          model: baseSettings.model,
          parameters: {
            width,
            height,
            scale: baseSettings.scale,
            steps: baseSettings.steps,
            sampler: baseSettings.sampler,
            seed: seedAsNumber,
            n_samples: count,
            negative_prompt: currentNegativePrompt 
          }
        };
      }
      
      console.log('요청 데이터:', JSON.stringify(requestData));
      
      const response = await axios({
        method: 'POST',
        url: 'https://image.novelai.net/ai/generate-image',
        data: requestData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'image/png'
        },
        responseType: 'arraybuffer'
      });
      
      console.log('응답 헤더:', response.headers);
      console.log('응답 타입:', response.headers['content-type']);
      
      let images: string[] = [];
      
      const contentType = response.headers['content-type'];
      
      console.log('응답 데이터 처음 문자:', new Uint8Array(response.data).slice(0, 10));
      
      if (contentType && contentType.includes('image/')) {
        const blob = new Blob([response.data], { type: contentType });
        const imageUrl = URL.createObjectURL(blob);
        images = [imageUrl];
        
        console.log('이미지 URL 생성 성공:', imageUrl);
      } 
      else if (contentType && (contentType.includes('octet-stream') || contentType.includes('application/zip'))) {
        try {
          const zip = new JSZip();
          const loadedZip = await zip.loadAsync(response.data);
          console.log('ZIP 파일 내용:', Object.keys(loadedZip.files));
          
          const imageFiles = Object.keys(loadedZip.files).filter(filename => 
            !loadedZip.files[filename].dir && 
            (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
          );
          
          if (imageFiles.length > 0) {
            console.log('발견된 이미지 파일:', imageFiles);
            
            const imageFile = imageFiles[0];
            const imageData = await loadedZip.file(imageFile)?.async('blob');
            
            if (imageData) {
              const imageType = imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
              const imageUrl = URL.createObjectURL(new Blob([imageData], { type: imageType }));
              images = [imageUrl];
              console.log('ZIP에서 이미지 추출 성공:', imageUrl);
            }
          } else {
            console.log('이미지 파일을 찾을 수 없음, 모든 파일 처리 시도');
            
            const firstFileName = Object.keys(loadedZip.files).find(name => !loadedZip.files[name].dir);
            
            if (firstFileName) {
              const fileData = await loadedZip.file(firstFileName)?.async('blob');
              
              if (fileData) {
                const imageUrl = URL.createObjectURL(new Blob([fileData], { type: 'image/png' }));
                images = [imageUrl];
                console.log('ZIP에서 파일 추출 성공 (이미지로 간주):', imageUrl);
              }
            }
          }
        } catch (zipError) {
          console.error('ZIP 파일 처리 오류:', zipError);
          
          const blob = new Blob([response.data], { type: 'image/png' });
          const imageUrl = URL.createObjectURL(blob);
          images = [imageUrl];
          
          console.log('ZIP 처리 실패, 바이너리 데이터를 이미지로 처리:', imageUrl);
        }
      } 
      else if (contentType && contentType.includes('text/html')) {
        const placeholderImage = `https://via.placeholder.com/${width}x${height}?text=NAI+Image`;
        images = [placeholderImage];
        
        console.log('테스트용 이미지 사용:', placeholderImage);
      }
      else {
        try {
          const text = new TextDecoder().decode(response.data);
          console.log('응답 텍스트 데이터:', text.substring(0, 100));
          
          const jsonData = JSON.parse(text);
          console.log('JSON 응답:', jsonData);
          
          if (jsonData.images && Array.isArray(jsonData.images)) {
            images = jsonData.images;
          } else if (jsonData.image && typeof jsonData.image === 'string') {
            images = [jsonData.image];
          } else if (jsonData.error) {
            throw new Error(`API 오류: ${jsonData.error} - ${jsonData.message || ''}`);
          }
        } catch (parseError) {
          console.error('응답 파싱 오류:', parseError);
          
          console.log('파싱 오류 발생, ZIP 파일 추출 시도...');
          
          try {
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(response.data);
            
            const imageFiles = Object.keys(loadedZip.files).filter(filename => 
              !loadedZip.files[filename].dir && 
              (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
            );
            
            if (imageFiles.length > 0) {
              console.log('발견된 이미지 파일:', imageFiles);
              
              const imageFile = imageFiles[0];
              const imageData = await loadedZip.file(imageFile)?.async('blob');
              
              if (imageData) {
                const imageType = imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
                const imageUrl = URL.createObjectURL(new Blob([imageData], { type: imageType }));
                images = [imageUrl];
                console.log('JSON 파싱 오류 후 ZIP에서 이미지 추출 성공:', imageUrl);
              }
            } else {
              console.log('이미지 파일을 찾을 수 없음, 모든 파일 처리 시도');
              
              const firstFileName = Object.keys(loadedZip.files).find(name => !loadedZip.files[name].dir);
              
              if (firstFileName) {
                const fileData = await loadedZip.file(firstFileName)?.async('blob');
                
                if (fileData) {
                  const imageUrl = URL.createObjectURL(new Blob([fileData], { type: 'image/png' }));
                  images = [imageUrl];
                  console.log('ZIP에서 파일 추출 성공 (이미지로 간주):', imageUrl);
                }
              }
            }
          } catch (zipError) {
            console.error('ZIP 처리 시도 중 오류:', zipError);
            
            const blob = new Blob([response.data], { type: 'image/png' });
            const imageUrl = URL.createObjectURL(blob);
            images = [imageUrl];
            console.log('모든 처리 실패, 바이너리 데이터를 이미지로 처리:', imageUrl);
          }
        }
      }
      
      if (images.length > 0) {
        await saveImagesToServer(images, prompt);
      } else {
        console.warn('생성된 이미지가 없습니다.');
      }
      
      return images;
    } catch (error: any) {
      console.error('NAI API 호출 중 오류 발생:', error);
      
      if (error.response) {
        throw new Error(`API 오류: ${error.response.status} - ${error.response.data.message || '알 수 없는 오류'}`);
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
  
  return {
    generateImages
  };
}

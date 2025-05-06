import axios from 'axios';
import { useNaiSettingsStore } from '../stores/naiSettings';
import JSZip from 'jszip';

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
  async function generateImages(prompt: string, count: number = 1): Promise<string[]> {
    const settings = settingsStore.getSettings();
    
    // 인증 토큰 확인
    const token = settings.accessToken || settings.apiKey;
    if (!token) {
      throw new Error('API 키 또는 Access Token이 설정되지 않았습니다.');
    }
    
    // 해상도 파싱
    const [width, height] = settings.resolution.split('x').map(Number);
    
    try {
      console.log('이미지 생성 요청 매개변수:', {
        prompt,
        model: settings.model,
        width,
        height,
        scale: settings.scale,
        steps: settings.steps,
        sampler: settings.sampler,
        seed: settings.seed || 'random',
        count
      });
      
      // 이미지 생성 요청 - responseType을 'arraybuffer'로 설정하여 바이너리 데이터 처리
      let requestData: any = {};
      const seed = settings.seed || Math.floor(Math.random() * 2147483647);
      
      // 모델 4인 경우 캐릭터 프롬프트 구조 사용
      if (settings.model === 'nai-diffusion-4' || settings.model === 'nai-diffusion-4-full') {
        // 캐릭터 캡션 구성
        const charCaptions = settings.characterPrompts.map(cp => ({
          char_caption: cp.prompt,
          centers: [{ x: cp.center.x, y: cp.center.y }]
        }));
        
        // 캐릭터 네거티브 캡션 구성
        const charNegativeCaptions = settings.characterPrompts.map(cp => ({
          char_caption: cp.uc,
          centers: [{ x: cp.center.x, y: cp.center.y }]
        }));
        
        requestData = {
          input: prompt,
          model: settings.model,
          action: 'generate',
          parameters: {
            params_version: 3,
            width,
            height,
            scale: settings.scale,
            sampler: settings.sampler,
            steps: settings.steps,
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
            use_coords: settings.useCoords,
            legacy_uc: false,
            seed: seed,
            characterPrompts: settings.characterPrompts,
            v4_prompt: {
              caption: {
                base_caption: prompt,
                char_captions: charCaptions
              },
              use_coords: settings.useCoords,
              use_order: settings.useOrder
            },
            v4_negative_prompt: {
              caption: {
                base_caption: settings.negativePrompt,
                char_captions: charNegativeCaptions
              },
              legacy_uc: false
            },
            negative_prompt: settings.negativePrompt
          }
        };
      } else {
        // 기존 모델 요청 구조
        requestData = {
          input: prompt,
          model: settings.model,
          parameters: {
            width,
            height,
            scale: settings.scale,
            steps: settings.steps,
            sampler: settings.sampler,
            seed: seed,
            n_samples: count
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
      
      // 이미지 데이터 처리
      let images: string[] = [];
      
      // 응답 헤더에서 콘텐츠 타입 확인
      const contentType = response.headers['content-type'];
      
      console.log('응답 데이터 처음 문자:', new Uint8Array(response.data).slice(0, 10));
      
      // 이미지 처리
      if (contentType && contentType.includes('image/')) {
        // 이미지 데이터를 Blob으로 변환
        const blob = new Blob([response.data], { type: contentType });
        const imageUrl = URL.createObjectURL(blob);
        images = [imageUrl];
        
        console.log('이미지 URL 생성 성공:', imageUrl);
      } 
      // ZIP 파일 응답 처리 (binary/octet-stream 또는 application/zip)
      else if (contentType && (contentType.includes('octet-stream') || contentType.includes('application/zip'))) {
        try {
          // JSZip을 사용하여 ZIP 파일 처리
          console.log('ZIP 파일 추출 시도...');
          const zip = new JSZip();
          
          // ZIP 파일 로드
          const loadedZip = await zip.loadAsync(response.data);
          console.log('ZIP 파일 내용:', Object.keys(loadedZip.files));
          
          // ZIP 파일에서 첫 번째 이미지 추출
          const imageFiles = Object.keys(loadedZip.files).filter(filename => 
            !loadedZip.files[filename].dir && 
            (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
          );
          
          if (imageFiles.length > 0) {
            console.log('발견된 이미지 파일:', imageFiles);
            
            // 첫 번째 이미지 파일 추출
            const imageFile = imageFiles[0];
            const imageData = await loadedZip.file(imageFile)?.async('blob');
            
            if (imageData) {
              const imageType = imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
              const imageUrl = URL.createObjectURL(new Blob([imageData], { type: imageType }));
              images = [imageUrl];
              console.log('ZIP에서 이미지 추출 성공:', imageUrl);
            }
          } else {
            // 이미지 파일이 없는 경우 모든 파일 처리 시도
            console.log('이미지 파일을 찾을 수 없음, 모든 파일 처리 시도');
            
            // 첫 번째 파일 추출
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
          
          // ZIP 처리 오류 시 그냥 바이너리 데이터를 이미지로 처리
          const blob = new Blob([response.data], { type: 'image/png' });
          const imageUrl = URL.createObjectURL(blob);
          images = [imageUrl];
          
          console.log('ZIP 처리 실패, 바이너리 데이터를 이미지로 처리:', imageUrl);
        }
      } 
      // 테스트용 플레이스홀더 이미지 사용
      else if (contentType && contentType.includes('text/html')) {
        // 테스트용 이미지 URL
        const placeholderImage = `https://via.placeholder.com/${width}x${height}?text=NAI+Image`;
        images = [placeholderImage];
        
        console.log('테스트용 이미지 사용:', placeholderImage);
      }
      // JSON 응답 처리
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
          
          // 파싱 오류인 경우 ZIP 파일일 수 있으므로 추출 시도
          console.log('파싱 오류 발생, ZIP 파일 추출 시도...');
          
          try {
            // JSZip을 사용하여 ZIP 파일 처리 시도
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(response.data);
            
            // ZIP 파일에서 첫 번째 이미지 추출
            const imageFiles = Object.keys(loadedZip.files).filter(filename => 
              !loadedZip.files[filename].dir && 
              (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
            );
            
            if (imageFiles.length > 0) {
              const imageFile = imageFiles[0];
              const imageData = await loadedZip.file(imageFile)?.async('blob');
              
              if (imageData) {
                const imageType = imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
                const imageUrl = URL.createObjectURL(new Blob([imageData], { type: imageType }));
                images = [imageUrl];
                console.log('JSON 파싱 오류 후 ZIP에서 이미지 추출 성공:', imageUrl);
              }
            } else {
              // 이미지 파일이 없는 경우 그냥 바이너리 데이터를 이미지로 처리
              throw new Error('이미지 파일을 찾을 수 없음');
            }
          } catch (zipError) {
            console.error('ZIP 처리 시도 중 오류:', zipError);
            
            // 마지막 수단으로 바이너리 데이터를 이미지로 처리
            const blob = new Blob([response.data], { type: 'image/png' });
            const imageUrl = URL.createObjectURL(blob);
            images = [imageUrl];
            console.log('모든 처리 실패, 바이너리 데이터를 이미지로 처리:', imageUrl);
          }
        }
      }
      
      // 이미지 저장
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
  
  // 서버에 이미지 저장 (실제 구현에서는 서버 API 호출 필요)
  async function saveImagesToServer(images: string[], prompt: string): Promise<void> {
    try {
      // 실제 구현에서는 서버 API를 호출하여 이미지를 저장
      // 현재는 로컬 스토리지에 저장하는 것으로 대체
      const savedImages = JSON.parse(localStorage.getItem('nai-saved-images') || '[]');
      
      for (const image of images) {
        savedImages.push({
          url: image,
          prompt,
          createdAt: new Date().toISOString()
        });
      }
      
      localStorage.setItem('nai-saved-images', JSON.stringify(savedImages));
    } catch (error) {
      console.error('이미지 저장 중 오류 발생:', error);
    }
  }
  
  return {
    generateImages
  };
}

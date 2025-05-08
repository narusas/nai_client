/**
 * IndexedDB를 사용하여 이미지를 저장하고 관리하는 서비스
 */
import { blobUrlToBase64 } from '../utils/imageUtils';

const DB_NAME = 'nai-image-db';
const DB_VERSION = 4; // 버전 증가
const REPRESENTATIVE_STORE = 'representative-images';
const GENERATED_IMAGES_STORE = 'generated-images';
const IMAGE_STORE = 'images'; // 이미지 저장소

// 이미지 서비스 인스턴스 제공 함수
export function useImageDbService() {
  return {
    saveRepresentativeImage,
    getRepresentativeImage,
    getRepresentativeImages,
    saveGeneratedImage,
    getGeneratedImage,
    getGeneratedImagesForCut,
    getGeneratedImagesForScenario,
    deleteScenarioImages,
    getImageById,
    saveImageData
  };
}

// IndexedDB 초기화 및 연결
async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB 열기 실패:', event);
      reject('IndexedDB를 열 수 없습니다.');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      // 대표 이미지 스토어 생성
      if (!db.objectStoreNames.contains(REPRESENTATIVE_STORE)) {
        // cutId를 키로 사용
        db.createObjectStore(REPRESENTATIVE_STORE, { keyPath: 'cutId' });
        console.log('대표 이미지 스토어 생성 완료');
      }
      
      // 생성된 이미지 스토어 생성 (DB_VERSION 2부터)
      if (oldVersion < 2 && !db.objectStoreNames.contains(GENERATED_IMAGES_STORE)) {
        // imageId를 키로 사용
        db.createObjectStore(GENERATED_IMAGES_STORE, { keyPath: 'imageId' });
        console.log('생성된 이미지 스토어 생성 완료');
      }
      
      // DB_VERSION 3부터 - 생성된 이미지 스토어에 인덱스 추가
      if (oldVersion < 3 && db.objectStoreNames.contains(GENERATED_IMAGES_STORE)) {
        const store = event.target.transaction.objectStore(GENERATED_IMAGES_STORE);
        
        // 시나리오 ID와 컷 ID로 인덱스 생성
        if (!store.indexNames.contains('scenarioId')) {
          store.createIndex('scenarioId', 'scenarioId', { unique: false });
        }
        
        if (!store.indexNames.contains('cutId')) {
          store.createIndex('cutId', 'cutId', { unique: false });
        }
        
        console.log('생성된 이미지 스토어 인덱스 생성 완료');
      }
      
      // DB_VERSION 4부터 - 이미지 스토어 생성
      if (oldVersion < 4 && !db.objectStoreNames.contains(IMAGE_STORE)) {
        // id를 키로 사용
        db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
        console.log('이미지 스토어 생성 완료');
      }
    };
  });
}

// 대표 이미지 저장
export async function saveRepresentativeImage(cutId: number, imageUrl: string, scenarioId: string): Promise<void> {
  try {
    // Blob URL을 Base64로 변환
    const base64Image = await blobUrlToBase64(imageUrl);
    
    const db = await openDb();
    const transaction = db.transaction([REPRESENTATIVE_STORE], 'readwrite');
    const store = transaction.objectStore(REPRESENTATIVE_STORE);
    
    // 이미지 데이터 생성
    const imageData = {
      cutId: `${scenarioId}-${cutId}`, // 시나리오ID와 컷ID를 조합하여 고유키 생성
      imageUrl: base64Image, // Base64로 변환된 이미지 저장
      savedAt: new Date().toISOString()
    };
    
    // 저장
    const request = store.put(imageData);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`대표 이미지 저장 성공: ${scenarioId}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('대표 이미지 저장 실패:', event);
        reject('이미지를 저장하는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('대표 이미지 저장 중 오류:', error);
    throw error;
  }
}

// 이미지 데이터 저장 (id를 키로 사용)
export async function saveImageData(id: string, imageUrl: string): Promise<void> {
  try {
    // Blob URL을 Base64로 변환
    const base64Image = await blobUrlToBase64(imageUrl);
    
    const db = await openDb();
    const transaction = db.transaction([IMAGE_STORE], 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE);
    
    // 이미지 데이터 생성
    const data = {
      id,
      imageUrl: base64Image,
      savedAt: new Date().toISOString()
    };
    
    // 저장
    const request = store.put(data);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`이미지 저장 성공: ${id}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('이미지 저장 실패:', event);
        reject('이미지를 저장하는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('이미지 저장 중 오류:', error);
    throw error;
  }
}

// ID로 이미지 가져오기
export async function getImageById(id: string): Promise<string | null> {
  try {
    const db = await openDb();
    const transaction = db.transaction([IMAGE_STORE], 'readonly');
    const store = transaction.objectStore(IMAGE_STORE);
    
    // 이미지 가져오기
    const request = store.get(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          console.log(`이미지 로드 완료: ${id}`);
          resolve(data.imageUrl);
        } else {
          console.log(`이미지 없음: ${id}`);
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('이미지 불러오기 실패:', event);
        reject('이미지를 불러오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('이미지 불러오기 중 오류:', error);
    return null;
  }
}

// 생성된 이미지 저장
export async function saveGeneratedImage(imageData: any): Promise<void> {
  try {
    // 이미지 URL이 있는 경우 Base64로 변환
    let base64Image = null;
    if (imageData.url && typeof imageData.url === 'string') {
      base64Image = await blobUrlToBase64(imageData.url);
    }
    
    const db = await openDb();
    const transaction = db.transaction([GENERATED_IMAGES_STORE], 'readwrite');
    const store = transaction.objectStore(GENERATED_IMAGES_STORE);
    
    // 이미지 데이터 생성
    const dbImageData = {
      imageId: imageData.id, // 이미지 ID
      scenarioId: imageData.scenarioId || '', // 시나리오 ID
      cutId: imageData.cutId || '', // 컷 ID
      imageUrl: base64Image, // Base64로 변환된 이미지 저장
      width: imageData.width || 0,
      height: imageData.height || 0,
      seed: imageData.seed,
      mainPrompt: imageData.mainPrompt,
      negativePrompt: imageData.negativePrompt,
      characterPrompts: imageData.characterPrompts,
      createdAt: imageData.createdAt ? new Date(imageData.createdAt).toISOString() : new Date().toISOString(),
      savedAt: new Date().toISOString()
    };
    
    // 저장
    const request = store.put(dbImageData);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`생성된 이미지 저장 성공: ${dbImageData.imageId}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('생성된 이미지 저장 실패:', event);
        reject('이미지를 저장하는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('생성된 이미지 저장 중 오류:', error);
    throw error;
  }
}

// 시나리오의 모든 생성된 이미지 가져오기
export async function getGeneratedImagesForScenario(scenarioId: string): Promise<{ imageId: string; imageUrl: string; cutId: string }[]> {
  try {
    const db = await openDb();
    const transaction = db.transaction([GENERATED_IMAGES_STORE], 'readonly');
    const store = transaction.objectStore(GENERATED_IMAGES_STORE);
    
    let request;
    try {
      // scenarioId 인덱스를 사용하여 해당 시나리오의 이미지만 가져오기
      const index = store.index('scenarioId');
      request = index.getAll(scenarioId);
    } catch (indexError) {
      console.warn('인덱스 사용 실패, 모든 이미지를 가져와서 필터링합니다:', indexError);
      // 인덱스가 없는 경우 모든 이미지를 가져와서 필터링
      request = store.getAll();
    }
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        let images = request.result;
        
        // 인덱스를 사용하지 않은 경우 시나리오 ID로 필터링
        if (!store.indexNames.contains('scenarioId')) {
          images = images.filter(img => img.scenarioId === scenarioId);
        }
        
        console.log(`시나리오 ${scenarioId}의 이미지 ${images.length}개 로드 완료`);
        resolve(images.map(img => ({
          imageId: img.imageId,
          imageUrl: img.imageUrl,
          cutId: img.cutId
        })));
      };
      
      request.onerror = (event) => {
        console.error('이미지 가져오기 실패:', event);
        reject('이미지를 가져오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('생성된 이미지 불러오기 중 오류:', error);
    return [];
  }
}

// 특정 컷의 모든 생성된 이미지 가져오기
export async function getGeneratedImagesForCut(cutId: string): Promise<any[]> {
  try {
    const db = await openDb();
    const transaction = db.transaction([GENERATED_IMAGES_STORE], 'readonly');
    const store = transaction.objectStore(GENERATED_IMAGES_STORE);
    
    // cutId 인덱스를 사용하여 해당 컷의 이미지만 가져오기
    const index = store.index('cutId');
    const request = index.getAll(cutId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const images = request.result;
        
        // 결과 매핑 - ImageData 형식으로 변환
        const mappedImages = images.map(img => ({
          id: img.imageId,
          url: img.imageUrl,
          width: img.width || 0,
          height: img.height || 0,
          seed: img.seed,
          mainPrompt: img.mainPrompt,
          negativePrompt: img.negativePrompt,
          characterPrompts: img.characterPrompts,
          createdAt: img.createdAt ? new Date(img.createdAt) : new Date(),
          cutId: img.cutId,
          scenarioId: img.scenarioId
        }));
        
        console.log(`컷 ${cutId}의 이미지 ${mappedImages.length}개 로드 완료`);
        resolve(mappedImages);
      };
      
      request.onerror = (event) => {
        console.error('이미지 가져오기 실패:', event);
        reject('이미지를 가져오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('이미지 가져오기 중 오류:', error);
    return [];
  }
}

// 생성된 이미지 가져오기
export async function getGeneratedImage(imageId: string): Promise<any | null> {
  try {
    const db = await openDb();
    const transaction = db.transaction([GENERATED_IMAGES_STORE], 'readonly');
    const store = transaction.objectStore(GENERATED_IMAGES_STORE);
    
    // 특정 이미지 가져오기
    const request = store.get(imageId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const imageData = request.result;
        if (imageData) {
          console.log(`이미지 ${imageId} 로드 완료`);
          resolve(imageData.imageUrl);
        } else {
          console.log(`이미지 ${imageId} 없음`);
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('이미지 불러오기 실패:', event);
        reject('이미지를 불러오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('이미지 불러오기 중 오류:', error);
    return null;
  }
}



// 특정 시나리오의 모든 대표 이미지 불러오기
export async function getRepresentativeImages(scenarioId: string): Promise<{ cutId: string; imageUrl: string }[]> {
  try {
    const db = await openDb();
    const transaction = db.transaction([REPRESENTATIVE_STORE], 'readonly');
    const store = transaction.objectStore(REPRESENTATIVE_STORE);
    
    // 모든 이미지 가져오기
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const allImages = request.result;
        // 현재 시나리오에 해당하는 이미지만 필터링
        const scenarioImages = allImages.filter(img => img.cutId.startsWith(`${scenarioId}-`));
        console.log(`시나리오 ${scenarioId}의 대표 이미지 ${scenarioImages.length}개 로드 완료`);
        resolve(scenarioImages);
      };
      
      request.onerror = (event) => {
        console.error('대표 이미지 불러오기 실패:', event);
        reject('이미지를 불러오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('대표 이미지 불러오기 중 오류:', error);
    return [];
  }
}

// 특정 시나리오의 모든 대표 이미지 삭제 (시나리오 삭제 시 사용)
export async function deleteScenarioImages(scenarioId: string): Promise<void> {
  try {
    const db = await openDb();
    const transaction = db.transaction([REPRESENTATIVE_STORE], 'readwrite');
    const store = transaction.objectStore(REPRESENTATIVE_STORE);
    
    // 모든 이미지 가져오기
    const getAllRequest = store.getAll();
    
    return new Promise((resolve, reject) => {
      getAllRequest.onsuccess = () => {
        const allImages = getAllRequest.result;
        // 현재 시나리오에 해당하는 이미지만 필터링
        const scenarioImages = allImages.filter(img => img.cutId.startsWith(`${scenarioId}-`));
        
        // 각 이미지 삭제
        let deleteCount = 0;
        scenarioImages.forEach(img => {
          const deleteRequest = store.delete(img.cutId);
          deleteRequest.onsuccess = () => {
            deleteCount++;
            if (deleteCount === scenarioImages.length) {
              console.log(`시나리오 ${scenarioId}의 대표 이미지 ${deleteCount}개 삭제 완료`);
              resolve();
            }
          };
          
          deleteRequest.onerror = (event) => {
            console.error('대표 이미지 삭제 실패:', event);
            reject('이미지를 삭제하는 중 오류가 발생했습니다.');
          };
        });
        
        // 삭제할 이미지가 없는 경우
        if (scenarioImages.length === 0) {
          resolve();
        }
      };
      
      getAllRequest.onerror = (event) => {
        console.error('대표 이미지 목록 가져오기 실패:', event);
        reject('이미지 목록을 가져오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('대표 이미지 삭제 중 오류:', error);
    throw error;
  }
}

// 특정 컷의 대표 이미지 불러오기
export async function getRepresentativeImage(cutId: number, scenarioId: string): Promise<string | null> {
  try {
    const db = await openDb();
    const transaction = db.transaction([REPRESENTATIVE_STORE], 'readonly');
    const store = transaction.objectStore(REPRESENTATIVE_STORE);
    
    // 특정 컷의 이미지 가져오기
    const request = store.get(`${scenarioId}-${cutId}`);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const imageData = request.result;
        if (imageData) {
          console.log(`컷 ${cutId}의 대표 이미지 로드 완료`);
          resolve(imageData.imageUrl);
        } else {
          console.log(`컷 ${cutId}의 대표 이미지 없음`);
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('대표 이미지 불러오기 실패:', event);
        reject('이미지를 불러오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('대표 이미지 불러오기 중 오류:', error);
    return null;
  }
}

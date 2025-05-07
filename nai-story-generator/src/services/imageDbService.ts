/**
 * IndexedDB를 사용하여 대표 이미지를 저장하고 관리하는 서비스
 */
import { blobUrlToBase64 } from '../utils/imageUtils';

const DB_NAME = 'nai-image-db';
const DB_VERSION = 3; // 버전 증가
const REPRESENTATIVE_STORE = 'representative-images';
const GENERATED_IMAGES_STORE = 'generated-images';

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

// 생성된 이미지 저장
export async function saveGeneratedImage(imageId: string, imageUrl: string, scenarioId: string, cutId: string): Promise<void> {
  try {
    // Blob URL을 Base64로 변환
    const base64Image = await blobUrlToBase64(imageUrl);
    
    const db = await openDb();
    const transaction = db.transaction([GENERATED_IMAGES_STORE], 'readwrite');
    const store = transaction.objectStore(GENERATED_IMAGES_STORE);
    
    // 이미지 데이터 생성
    const imageData = {
      imageId, // 이미지 ID
      scenarioId, // 시나리오 ID
      cutId, // 컷 ID
      imageUrl: base64Image, // Base64로 변환된 이미지 저장
      savedAt: new Date().toISOString()
    };
    
    // 저장
    const request = store.put(imageData);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`생성된 이미지 저장 성공: ${imageId}`);
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
    console.error('이미지 가져오기 중 오류:', error);
    return [];
  }
}

// 특정 컷의 모든 생성된 이미지 가져오기
export async function getGeneratedImagesForCut(cutId: string): Promise<{ imageId: string; imageUrl: string; cutId: string }[]> {
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
        console.log(`컷 ${cutId}의 이미지 ${images.length}개 로드 완료`);
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
    console.error('이미지 가져오기 중 오류:', error);
    return [];
  }
}

// 생성된 이미지 가져오기
export async function getGeneratedImage(imageId: string): Promise<string | null> {
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

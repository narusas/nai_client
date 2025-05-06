/**
 * IndexedDB를 사용하여 생성된 이미지 정보를 저장하고 관리하는 서비스
 */

const DB_NAME = 'nai-images-db';
const DB_VERSION = 1;
const STORE_NAME = 'saved-images';

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
      
      // 오브젝트 스토어가 없는 경우 생성
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // 자동 증가하는 키를 사용
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        
        // 인덱스 생성
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * 순환 참조나 저장할 수 없는 객체를 제거하여 저장 가능한 형태로 변환
 * @param obj 변환할 객체
 * @returns 저장 가능한 형태로 변환된 객체
 */
function makeSerializable(obj: any): any {
  // JSON을 통해 순환 참조나 함수 등을 제거
  return JSON.parse(JSON.stringify(obj));
}

// 이미지 저장
export async function saveImageToDb(imageData: any): Promise<void> {
  try {
    const db = await openDb();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // 이미지 데이터를 저장 가능한 형태로 변환
    const serializableImageData = makeSerializable(imageData);
    
    // 이미지 데이터 저장
    const request = store.add(serializableImageData);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('이미지 데이터 저장 성공');
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('이미지 데이터 저장 실패:', event);
        reject('이미지 데이터를 저장하는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('이미지 데이터 저장 중 오류:', error);
    throw error;
  }
}

// 모든 이미지 불러오기
export async function getAllImagesFromDb(): Promise<any[]> {
  try {
    const db = await openDb();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // 모든 이미지 가져오기
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const images = request.result;
        console.log(`${images.length}개의 이미지 데이터 로드 완료`);
        resolve(images);
      };
      
      request.onerror = (event) => {
        console.error('이미지 데이터 불러오기 실패:', event);
        reject('이미지 데이터를 불러오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('이미지 데이터 불러오기 중 오류:', error);
    return [];
  }
}

// 특정 이미지 삭제
export async function deleteImageFromDb(id: number): Promise<boolean> {
  try {
    const db = await openDb();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // 이미지 삭제
    const request = store.delete(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`이미지 데이터 ${id} 삭제 완료`);
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('이미지 데이터 삭제 실패:', event);
        reject('이미지 데이터를 삭제하는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('이미지 데이터 삭제 중 오류:', error);
    return false;
  }
}

// localStorage에서 IndexedDB로 이미지 데이터 마이그레이션
export async function migrateImagesFromLocalStorage(): Promise<boolean> {
  try {
    const savedImages = localStorage.getItem('nai-saved-images');
    if (!savedImages) {
      console.log('마이그레이션할 이미지 데이터가 없습니다.');
      return false;
    }
    
    const images = JSON.parse(savedImages);
    if (!Array.isArray(images) || images.length === 0) {
      console.log('마이그레이션할 이미지 데이터가 없습니다.');
      return false;
    }
    
    console.log(`${images.length}개의 이미지 데이터를 마이그레이션합니다.`);
    
    // 각 이미지를 IndexedDB에 저장
    for (const image of images) {
      await saveImageToDb(image);
    }
    
    // 마이그레이션 완료 후 localStorage 데이터 삭제
    localStorage.removeItem('nai-saved-images');
    
    console.log('이미지 데이터 마이그레이션 완료');
    return true;
  } catch (error) {
    console.error('이미지 데이터 마이그레이션 중 오류:', error);
    return false;
  }
}

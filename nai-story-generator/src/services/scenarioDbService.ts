/**
 * IndexedDB를 사용하여 시나리오 데이터를 저장하고 관리하는 서비스
 */

const DB_NAME = 'nai-scenario-db';
const DB_VERSION = 1;
const STORE_NAME = 'scenarios';
const META_STORE_NAME = 'scenario-meta';

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
      
      // 시나리오 스토어 생성
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      
      // 메타데이터 스토어 생성 (현재 시나리오 ID 등)
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
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

// 시나리오 저장
export async function saveScenarioToDb(scenario: any): Promise<void> {
  try {
    const db = await openDb();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // 시나리오를 저장 가능한 형태로 변환
    const serializableScenario = makeSerializable(scenario);
    
    // 시나리오 저장
    const request = store.put(serializableScenario);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`시나리오 저장 성공: ${scenario.id}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('시나리오 저장 실패:', event);
        reject('시나리오를 저장하는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('시나리오 저장 중 오류:', error);
    throw error;
  }
}

// 모든 시나리오 불러오기
export async function getAllScenariosFromDb(): Promise<any[]> {
  try {
    const db = await openDb();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // 모든 시나리오 가져오기
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const scenarios = request.result;
        console.log(`${scenarios.length}개의 시나리오 로드 완료`);
        resolve(scenarios);
      };
      
      request.onerror = (event) => {
        console.error('시나리오 불러오기 실패:', event);
        reject('시나리오를 불러오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('시나리오 불러오기 중 오류:', error);
    return [];
  }
}

// 특정 시나리오 불러오기
export async function getScenarioFromDb(id: string): Promise<any | null> {
  try {
    const db = await openDb();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // 특정 시나리오 가져오기
    const request = store.get(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const scenario = request.result;
        if (scenario) {
          console.log(`시나리오 ${id} 로드 완료`);
          resolve(scenario);
        } else {
          console.log(`시나리오 ${id} 없음`);
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('시나리오 불러오기 실패:', event);
        reject('시나리오를 불러오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('시나리오 불러오기 중 오류:', error);
    return null;
  }
}

// 시나리오 삭제
export async function deleteScenarioFromDb(id: string): Promise<boolean> {
  try {
    const db = await openDb();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // 시나리오 삭제
    const request = store.delete(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`시나리오 ${id} 삭제 완료`);
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('시나리오 삭제 실패:', event);
        reject('시나리오를 삭제하는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('시나리오 삭제 중 오류:', error);
    return false;
  }
}

// 메타데이터 저장 (현재 시나리오 ID 등)
export async function saveMetaToDb(key: string, value: any): Promise<void> {
  try {
    const db = await openDb();
    const transaction = db.transaction([META_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(META_STORE_NAME);
    
    // 값을 저장 가능한 형태로 변환
    const serializableValue = makeSerializable(value);
    
    // 메타데이터 저장
    const request = store.put({ key, value: serializableValue });
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`메타데이터 저장 성공: ${key}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('메타데이터 저장 실패:', event);
        reject('메타데이터를 저장하는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('메타데이터 저장 중 오류:', error);
    throw error;
  }
}

// 메타데이터 불러오기
export async function getMetaFromDb(key: string): Promise<any> {
  try {
    const db = await openDb();
    const transaction = db.transaction([META_STORE_NAME], 'readonly');
    const store = transaction.objectStore(META_STORE_NAME);
    
    // 메타데이터 가져오기
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const meta = request.result;
        if (meta) {
          console.log(`메타데이터 ${key} 로드 완료`);
          resolve(meta.value);
        } else {
          console.log(`메타데이터 ${key} 없음`);
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('메타데이터 불러오기 실패:', event);
        reject('메타데이터를 불러오는 중 오류가 발생했습니다.');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('메타데이터 불러오기 중 오류:', error);
    return null;
  }
}

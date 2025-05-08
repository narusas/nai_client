/**
 * 이미지 관련 유틸리티 함수
 */

/**
 * Blob URL을 Base64 문자열로 변환
 * @param blobUrl Blob URL 문자열
 * @returns Promise<string> Base64 인코딩된 문자열
 */
export async function blobUrlToBase64(blobUrl: string): Promise<string> {
  try {
    // URL이 이미 Base64 형식인 경우 그대로 반환
    if (blobUrl.startsWith('data:')) {
      return blobUrl;
    }
    
    // Blob URL에서 Blob 객체 가져오기
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    // Blob을 Base64로 변환
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Blob URL을 Base64로 변환하는 중 오류 발생:', error);
    throw error;
  }
}

/**
 * Base64 이미지를 지정된 크기로 리사이징
 * @param base64Image Base64 인코딩된 이미지 문자열
 * @param width 리사이징할 너비
 * @param height 리사이징할 높이
 * @returns Promise<string> 리사이징된 Base64 이미지 문자열
 */
export async function resizeBase64Image(base64Image: string, width: number = 70, height: number = 70): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 이미지 객체 생성
      const img = new Image();
      img.onload = () => {
        // Canvas 생성 및 크기 설정
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D 컨텍스트를 가져올 수 없습니다.'));
          return;
        }
        
        // 이미지 리사이징하여 그리기
        ctx.drawImage(img, 0, 0, width, height);
        
        // Canvas에서 Base64 문자열 추출
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 품질 0.7로 JPEG 형식 사용
        resolve(resizedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('이미지 로드 중 오류가 발생했습니다.'));
      };
      
      // Base64 이미지 로드
      img.src = base64Image;
    } catch (error) {
      console.error('이미지 리사이징 중 오류 발생:', error);
      reject(error);
    }
  });
}

/**
 * Base64 문자열의 크기 확인 (MB 단위)
 * @param base64String Base64 문자열
 * @returns 크기 (MB)
 */
export function getBase64Size(base64String: string): number {
  // Base64 문자열에서 헤더 제거 (data:image/png;base64, 등)
  const base64WithoutHeader = base64String.substring(base64String.indexOf(',') + 1);
  
  // Base64 디코딩 시 실제 크기는 약 3/4
  const sizeInBytes = (base64WithoutHeader.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  return sizeInMB;
}

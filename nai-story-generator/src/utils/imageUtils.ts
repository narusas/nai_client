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

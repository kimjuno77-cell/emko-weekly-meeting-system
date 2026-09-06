// 설명: 이미지 파일 및 클립보드 캡처 이미지를 압축하고 최적화하는 유틸리티 모듈

// 설명: 이미지 압축 옵션 인터페이스 정의
export interface ImageCompressOptions {
  maxWidth?: number; // 최대 허용 가로 너비 (기본값: 1200px)
  maxHeight?: number; // 최대 허용 세로 너비 (기본값: 1200px)
  quality?: number; // 압축 품질 (0.1 ~ 1.0, 기본값: 0.85)
  format?: 'image/jpeg' | 'image/webp' | 'image/png'; // 출력 포맷
}

/**
 * 설명: File 또는 Blob 이미지를 브라우저 Canvas를 통해 압축하고 Base64 Data URL로 변환합니다.
 * 이를 통해 캡처화면이나 고화질 사진을 첨부해도 DB 용량 부담을 대폭 줄일 수 있습니다.
 */
export const compressImage = (
  file: File | Blob,
  options: ImageCompressOptions = {}
): Promise<string> => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // 설명: FileReader를 통해 원본 파일의 Data URL을 읽어옵니다.
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 설명: 원본 이미지의 가로/세로 비율을 유지하면서 최대 크기에 맞게 축소 비율을 계산합니다.
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const ratio = Math.min(widthRatio, heightRatio);

          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // 설명: 계산된 크기로 HTML Canvas를 생성하여 이미지를 다시 그립니다.
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // 설명: Canvas 컨텍스트를 가져오지 못한 경우 원본 Data URL을 그대로 반환합니다.
          resolve(event.target?.result as string);
          return;
        }

        // 설명: 배경을 흰색으로 채워 투명 PNG 변환 시 검은 배경이 생기는 현상을 방지합니다.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // 설명: 부드러운 이미지 축소를 위한 이미지 스무딩 활성화
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 설명: 캔버스에 리사이징된 이미지를 그립니다.
        ctx.drawImage(img, 0, 0, width, height);

        // 설명: 캔버스를 지정된 포맷과 화질로 Base64 문자열로 내보냅니다.
        const compressedBase64 = canvas.toDataURL(format, quality);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('이미지를 불러오는데 실패했습니다.'));
      };

      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error('이미지 파일 데이터를 읽을 수 없습니다.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일 읽기 오류가 발생했습니다.'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 설명: 클립보드 붙여넣기(Paste) 이벤트에서 이미지 파일 목록을 추출합니다.
 */
export const extractImagesFromClipboard = (event: ClipboardEvent): File[] => {
  const images: File[] = [];
  // 설명: 클립보드 데이터의 아이템 항목들을 순회합니다.
  const items = event.clipboardData?.items;

  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // 설명: 아이템이 이미지 타입인 경우 File 객체로 변환하여 배열에 추가합니다.
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          images.push(file);
        }
      }
    }
  }

  return images;
};

/**
 * 설명: 드래그 앤 드롭 이벤트에서 이미지 파일 목록을 추출합니다.
 */
export const extractImagesFromDrop = (event: DragEvent): File[] => {
  const images: File[] = [];
  // 설명: 드롭된 파일 목록을 순회합니다.
  const files = event.dataTransfer?.files;

  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // 설명: 이미지 파일만 필터링합니다.
      if (file.type.startsWith('image/')) {
        images.push(file);
      }
    }
  }

  return images;
};

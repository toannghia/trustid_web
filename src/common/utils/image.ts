/**
 * Utility to add watermark to an image
 * includes GPS, Timestamp, Performer and Logo
 */
export async function addWatermark(
  file: File | string,
  data: {
    lat?: number;
    lng?: number;
    performerName?: string;
    logoUrl?: string;
  }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = typeof file === 'string' ? file : URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');

      // Tối ưu kích thước ảnh (Max 1600px để tránh tràn bộ nhớ di động)
      const MAX_WIDTH = 1600;
      const MAX_HEIGHT = 1600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw original image resized
      ctx.drawImage(img, 0, 0, width, height);

      // Setup styles for watermark
      const fontSize = Math.floor(canvas.width / 40);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'left';

      const padding = 20;
      let currentY = canvas.height - padding;

      // Draw Timestamp
      const now = new Date().toLocaleString('vi-VN');
      ctx.fillText(`⏰ ${now}`, padding, currentY);
      currentY -= fontSize + 10;

      // Draw GPS
      if (data.lat && data.lng) {
        ctx.fillText(`📍 Tọa độ: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`, padding, currentY);
        currentY -= fontSize + 10;
      }

      // Draw Performer
      if (data.performerName) {
        ctx.fillText(`👤 Người chụp: ${data.performerName}`, padding, currentY);
        currentY -= fontSize + 10;
      }

      // Finalize function to return Blob
      const finalize = () => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Could not create blob');
        }, 'image/jpeg', 0.8);
      };

      // Draw Logo (if provided)
      if (data.logoUrl) {
        const logo = new Image();
        logo.src = data.logoUrl;
        logo.onload = () => {
          const logoWidth = canvas.width / 8;
          const logoHeight = (logo.height / logo.width) * logoWidth;
          ctx.drawImage(logo, canvas.width - logoWidth - padding, canvas.height - logoHeight - padding, logoWidth, logoHeight);
          finalize();
        };
        logo.onerror = () => finalize();
      } else {
        finalize();
      }
      
      // Clean up object URL if it was created
      if (typeof file !== 'string') {
        URL.revokeObjectURL(img.src);
      }
    };

    img.onerror = (err) => reject(err);
  });
}

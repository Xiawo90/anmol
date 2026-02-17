/**
 * Compress an image file to a target size (in KB) using canvas.
 * Preserves quality as much as possible by binary-searching for optimal quality.
 */
export async function compressImage(file: File, maxSizeKB: number = 100): Promise<File> {
  // Only compress images
  if (!file.type.startsWith('image/')) return file;

  // If already under limit, return as-is
  if (file.size <= maxSizeKB * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = async () => {
      // Calculate dimensions - scale down if very large
      let { width, height } = img;
      const maxDim = 1920;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Binary search for optimal quality
      let lo = 0.1;
      let hi = 0.92;
      let bestBlob: Blob | null = null;

      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), 'image/jpeg', mid)
        );

        if (!blob) break;

        if (blob.size <= maxSizeKB * 1024) {
          bestBlob = blob;
          lo = mid; // try higher quality
        } else {
          hi = mid; // need lower quality
        }
      }

      // If binary search didn't find a result, use lowest quality
      if (!bestBlob) {
        bestBlob = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), 'image/jpeg', 0.1)
        );
      }

      if (bestBlob) {
        const compressedName = file.name.replace(/\.[^.]+$/, '.jpg');
        resolve(new File([bestBlob], compressedName, { type: 'image/jpeg' }));
      } else {
        resolve(file); // fallback to original
      }
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress multiple files, only compressing images over the size limit.
 */
export async function compressFiles(files: File[], maxSizeKB: number = 100): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, maxSizeKB)));
}

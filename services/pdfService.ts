import { PDFDocument, PDFPage, PDFEmbeddedPage, PDFImage } from 'pdf-lib';
import { UploadedFile, CompressionLevel } from '../types';

const TARGET_WIDTH = 595.28; // 标准 A4 宽度 (points)

/**
 * Helper: Detect if a byte array is PNG or JPEG based on magic numbers.
 */
const detectImageType = (bytes: Uint8Array): 'png' | 'jpg' | 'unknown' => {
  if (bytes.length < 4) return 'unknown';
  
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'png';
  }
  
  // JPEG: FF D8
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    return 'jpg';
  }
  
  return 'unknown';
};

/**
 * 处理图片：根据压缩等级调整尺寸和质量
 */
const processImage = async (file: File | Uint8Array, level: CompressionLevel): Promise<{ data: Uint8Array, isPng: boolean }> => {
  // 如果是 'none' 且是 File 对象（非转换后的 Blob），直接尝试读取原始数据
  if (level === 'none' && file instanceof File) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const type = detectImageType(bytes);
    if (type !== 'unknown') {
      return { data: bytes, isPng: type === 'png' };
    }
    // 如果无法识别（如 webp/bmp），则继续下方 canvas 转换
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    let url = '';
    
    if (file instanceof File) {
      url = URL.createObjectURL(file);
    } else {
      const blob = new Blob([file]);
      url = URL.createObjectURL(blob);
    }
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // 1. 尺寸调整策略
      let maxDimension = 0;
      if (level === 'high') maxDimension = 1500; // 约等于 150dpi A4
      else if (level === 'normal') maxDimension = 2500; // 约等于 200-250dpi

      if (maxDimension > 0 && (width > maxDimension || height > maxDimension)) {
        const ratio = width / height;
        if (width > height) {
          width = maxDimension;
          height = maxDimension / ratio;
        } else {
          height = maxDimension;
          width = maxDimension * ratio;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Browser canvas context not available'));
        return;
      }

      // 填充白色背景（防止透明 PNG 转 JPG 变黑）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // 2. 质量/格式策略
      // 如果压缩，统一转为 JPEG 以减小体积
      let mimeType = 'image/png';
      let quality = 1.0;

      if (level === 'high') {
        mimeType = 'image/jpeg';
        quality = 0.5;
      } else if (level === 'normal') {
        mimeType = 'image/jpeg';
        quality = 0.75;
      } else {
        // None: 保持 PNG 以保留最大细节，或者原始就是 JPG 的话上面已经返回了
        // 这里主要处理 webp/bmp 转 png
        mimeType = 'image/png';
      }

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          blob.arrayBuffer().then(buffer => {
            resolve({ 
              data: new Uint8Array(buffer), 
              isPng: mimeType === 'image/png' 
            });
          });
        } else {
          reject(new Error(`Failed to process image`));
        }
      }, mimeType, quality);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image for processing.`));
    };
    
    img.src = url;
  });
};

export const mergeFiles = async (
  files: UploadedFile[], 
  compressionLevel: CompressionLevel,
  onProgress: (msg: string, progress: number) => void
): Promise<Uint8Array> => {
  
  const mergedPdf = await PDFDocument.create();
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const fileData = files[i];
    const file = fileData.file;
    const progress = Math.round(((i + 1) / totalFiles) * 100);
    
    onProgress(`正在处理第 ${i + 1} 个文件: ${file.name}...`, progress);

    try {
      // 1. 处理 PDF (注意：pdf-lib 无法直接压缩现有 PDF 页面内容)
      if (fileData.type === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(arrayBuffer);
        const embeddedPages = await mergedPdf.embedPages(sourcePdf.getPages());
        
        embeddedPages.forEach((embeddedPage) => {
          const { width, height } = embeddedPage;
          const scaleFactor = TARGET_WIDTH / width;
          const scaledHeight = height * scaleFactor;

          const page = mergedPdf.addPage([TARGET_WIDTH, scaledHeight]);
          page.drawPage(embeddedPage, {
            x: 0,
            y: 0,
            width: TARGET_WIDTH,
            height: scaledHeight,
          });
        });
      } 
      // 2. 处理 Image (包括 Office 转换后的)
      else {
        let inputData: File | Uint8Array;
        
        if (fileData.convertedBlob) {
            inputData = fileData.convertedBlob;
        } else {
            inputData = file;
        }

        // 应用压缩处理 (Canvas 重绘 & 格式转换)
        const { data: imageBytes, isPng } = await processImage(inputData, compressionLevel);

        let image: PDFImage;
        try {
            if (isPng) {
                image = await mergedPdf.embedPng(imageBytes);
            } else {
                image = await mergedPdf.embedJpg(imageBytes);
            }
        } catch (e) {
             console.error(`Error embedding image ${file.name}:`, e);
             // 如果格式识别错误，尝试另一种
             try {
                image = await mergedPdf.embedJpg(imageBytes);
             } catch {
                image = await mergedPdf.embedPng(imageBytes);
             }
        }

        if (image) {
          const { width, height } = image.scale(1);
          const scaleFactor = TARGET_WIDTH / width;
          const scaledHeight = height * scaleFactor;

          const page = mergedPdf.addPage([TARGET_WIDTH, scaledHeight]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: TARGET_WIDTH,
            height: scaledHeight
          });
        }
      }
    } catch (error) {
      console.error(error);
      throw new Error(`合并文件 ${file.name} 时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  onProgress('正在打包生成最终文件...', 100);
  const pdfBytes = await mergedPdf.save();
  return pdfBytes;
};

export const createBlobUrl = (data: Uint8Array): string => {
  const blob = new Blob([data], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
};
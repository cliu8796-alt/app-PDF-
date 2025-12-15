
export type FileType = 'pdf' | 'image' | 'docx' | 'xlsx';
export type CompressionLevel = 'none' | 'normal' | 'high';

export interface UploadedFile {
  id: string;
  file: File;
  type: FileType;
  previewUrl?: string; // 用于缩略图和预览的 URL (PDF除外)
  convertedBlob?: Uint8Array; // Word/Excel 转换后的高清图片数据
  isConverting?: boolean; // 是否正在进行格式转换
}

export interface MergeStatus {
  isProcessing: boolean;
  message: string;
  progress: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  outputFilename: string;
  fileCount: number;
  fileNames: string[]; // 仅存储文件名列表
  totalSize: string;
}

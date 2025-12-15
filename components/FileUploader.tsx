import React, { useRef, useState } from 'react';
import { UploadCloud, FilePlus, FileType } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFiles = (files: File[]) => {
    // 简单的客户端过滤，详细处理在 App.tsx
    onFilesSelected(files);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer transition-all duration-300 ease-out
        border-2 border-dashed rounded-2xl p-10
        flex flex-col items-center justify-center
        ${isDragOver 
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
          : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 bg-white'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        // 添加 .heic, .heif, .webp, .bmp, .tiff 等格式支持
        accept=".pdf,image/*,.docx,.doc,.xlsx,.xls,.heic,.heif,.webp,.bmp"
        className="hidden"
        onChange={handleFileInput}
      />
      
      <div className={`
        p-5 rounded-2xl mb-4 transition-transform duration-300 shadow-sm
        ${isDragOver ? 'bg-indigo-100 text-indigo-600 scale-110' : 'bg-slate-100 text-slate-500 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-500'}
      `}>
        {isDragOver ? <FilePlus size={48} strokeWidth={1.5} /> : <UploadCloud size={48} strokeWidth={1.5} />}
      </div>
      
      <h3 className="text-xl font-bold text-slate-700 mb-2 group-hover:text-indigo-600 transition-colors">
        {isDragOver ? '释放以添加文件' : '点击或拖拽文件'}
      </h3>
      
      <p className="text-sm text-slate-500 max-w-xs text-center leading-relaxed">
        支持自动排版 & 高清转换
        <br/>
        <span className="text-xs text-slate-400 mt-1 block">PDF, Office, JPG, PNG, WEBP, HEIC</span>
      </p>
    </div>
  );
};
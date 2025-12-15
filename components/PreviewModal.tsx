import React from 'react';
import { X, Download } from 'lucide-react';
import { UploadedFile } from '../types';

interface PreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-800 text-lg truncate max-w-md">{file.file.name}</h3>
            <span className="text-xs text-slate-500 uppercase">{file.type} • {(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center">
            {file.type === 'pdf' ? (
                <iframe 
                    src={URL.createObjectURL(file.file)} 
                    className="w-full h-full rounded-lg border shadow-sm bg-white"
                    title="PDF Preview"
                />
            ) : (file.previewUrl) ? (
                <img 
                    src={file.previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain shadow-lg rounded bg-white"
                />
            ) : (
                <div className="text-slate-400">无法预览此文件</div>
            )}
        </div>
        
        {/* Footer info */}
        <div className="p-3 bg-white border-t border-slate-100 text-center text-xs text-slate-400">
             {file.type === 'docx' || file.type === 'xlsx' ? '已转换为高清图片用于预览及合并' : '原始文件预览'}
        </div>
      </div>
    </div>
  );
};
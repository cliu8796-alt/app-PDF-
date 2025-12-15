import React, { useState } from 'react';
import { UploadedFile } from '../types';
import { FileText, X, GripVertical, ArrowUp, ArrowDown, Eye, FileSpreadsheet, FileType } from 'lucide-react';

interface FileListProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onPreview: (file: UploadedFile) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, onRemove, onReorder, onPreview }) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;
    if (draggedItemIndex !== index) {
      onReorder(draggedItemIndex, index);
      setDraggedItemIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: UploadedFile) => {
    if (file.type === 'docx') return <FileText className="text-blue-500" size={24} />;
    if (file.type === 'xlsx') return <FileSpreadsheet className="text-green-500" size={24} />;
    if (file.type === 'pdf') return <FileType className="text-red-500" size={24} />;
    return <FileText className="text-slate-400" size={24} />;
  };

  if (files.length === 0) return null;

  return (
    <div className="space-y-4 mt-8">
      <div className="flex justify-between items-end px-2">
        <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {files.length}
            </span>
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">
            待合并文件 (可拖拽调整顺序)
            </h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">点击缩略图可预览</span>
      </div>

      <ul className="space-y-2.5">
        {files.map((fileData, index) => (
          <li
            key={fileData.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              relative flex items-center p-2.5 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group
              ${draggedItemIndex === index 
                ? 'opacity-40 border-indigo-400 border-dashed scale-[0.98]' 
                : 'border-slate-200 hover:border-indigo-300'
              }
            `}
          >
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 px-2 py-4 -ml-1">
              <GripVertical size={18} />
            </div>

            {/* Thumbnail / Icon (Clickable) */}
            <div 
                onClick={() => onPreview(fileData)}
                className="cursor-pointer flex-shrink-0 h-14 w-14 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mr-4 relative hover:opacity-90 hover:ring-2 hover:ring-indigo-200 transition-all"
            >
              {fileData.isConverting ? (
                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
              ) : (fileData.previewUrl && fileData.type !== 'pdf') ? (
                 <img 
                    src={fileData.previewUrl} 
                    alt="preview" 
                    className="w-full h-full object-cover" 
                 />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    {getFileIcon(fileData)}
                </div>
              )}
              
              {/* Hover overlay icon */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                 <Eye size={16} className="text-white drop-shadow-md" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 mr-4 cursor-pointer" onClick={() => onPreview(fileData)}>
              <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-slate-700 truncate">
                    {fileData.file.name}
                  </p>
                  {fileData.isConverting && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded">转换中...</span>
                  )}
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                {formatSize(fileData.file.size)}
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="uppercase">{fileData.type}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <div className="hidden sm:flex flex-col gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => index > 0 && onReorder(index, index - 1)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 disabled:opacity-0 transition-all"
                    >
                        <ArrowUp size={14} />
                    </button>
                    <button 
                        onClick={() => index < files.length - 1 && onReorder(index, index + 1)}
                        disabled={index === files.length - 1}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 disabled:opacity-0 transition-all"
                    >
                        <ArrowDown size={14} />
                    </button>
                </div>
                
                <button
                    onClick={() => onRemove(fileData.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
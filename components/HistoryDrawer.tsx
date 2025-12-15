
import React from 'react';
import { X, Clock, FileStack, Trash2, Calendar, FileOutput } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onClearHistory,
  onDeleteItem 
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-lg">本地历史记录</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Clock size={48} strokeWidth={1} className="text-slate-200" />
                <p>暂无合并记录</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group relative">
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-sm break-all line-clamp-1" title={item.outputFilename}>
                           {item.outputFilename}.pdf
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <Calendar size={10} />
                            {formatDate(item.timestamp)}
                        </div>
                     </div>
                     <button 
                        onClick={() => onDeleteItem(item.id)}
                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除此记录"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2 border-b border-slate-200 pb-2">
                        <span className="flex items-center gap-1">
                            <FileStack size={12} />
                            {item.fileCount} 个文件
                        </span>
                        <span className="flex items-center gap-1">
                             <FileOutput size={12} />
                             {item.totalSize}
                        </span>
                    </div>
                    <ul className="space-y-1">
                        {item.fileNames.slice(0, 3).map((name, idx) => (
                            <li key={idx} className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-indigo-300 flex-shrink-0"></span>
                                {name}
                            </li>
                        ))}
                        {item.fileNames.length > 3 && (
                            <li className="text-xs text-slate-400 pl-2.5">
                                + 还有 {item.fileNames.length - 3} 个文件...
                            </li>
                        )}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {history.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={onClearHistory}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                <Trash2 size={16} />
                清空所有记录
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

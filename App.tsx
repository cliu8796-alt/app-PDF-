import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { FileList } from './components/FileList';
import { Button } from './components/Button';
import { PreviewModal } from './components/PreviewModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { UploadedFile, MergeStatus, FileType, HistoryItem, CompressionLevel } from './types';
import { mergeFiles } from './services/pdfService';
import { convertDocxToImage, convertXlsxToImage } from './services/officeConverter';
import { getHistory, addHistoryItem, clearHistory, deleteHistoryItem } from './services/historyService';
import { Download, Trash2, CheckCircle2, Sparkles, FileStack, PenLine, Loader2, Eye, History, Settings2 } from 'lucide-react';
import heic2any from 'heic2any';

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [status, setStatus] = useState<MergeStatus>({ isProcessing: false, message: '', progress: 0 });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('merged-document');
  const [convertingCount, setConvertingCount] = useState<number>(0);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('normal');
  
  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processFile = async (file: File): Promise<UploadedFile> => {
    const id = Math.random().toString(36).substring(7) + Date.now();
    const typeStr = file.name.split('.').pop()?.toLowerCase();
    
    let type: FileType = 'image';
    let isConverting = false;

    if (file.type === 'application/pdf' || typeStr === 'pdf') {
        type = 'pdf';
    } else if (typeStr === 'docx' || typeStr === 'doc') {
        type = 'docx';
        isConverting = true;
    } else if (typeStr === 'xlsx' || typeStr === 'xls') {
        type = 'xlsx';
        isConverting = true;
    } else if (typeStr === 'heic' || typeStr === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
        type = 'image'; // 归类为 image，但需要转换
        isConverting = true; // 标记为需要转换 (HEIC -> JPG/PNG)
    } else {
        type = 'image';
    }

    // 针对需要转换的文件，先不生成 previewUrl
    let previewUrl: string | undefined = undefined;
    
    // 对于原生支持的图片 (jpg, png, webp, bmp)，直接生成预览
    if (type === 'image' && !isConverting) {
        previewUrl = URL.createObjectURL(file);
    }

    const uploadedFile: UploadedFile = {
        id,
        file,
        type,
        isConverting,
        previewUrl
    };

    return uploadedFile;
  };

  // 监听转换状态
  useEffect(() => {
    const count = files.filter(f => f.isConverting).length;
    setConvertingCount(count);
  }, [files]);

  // 后台处理转换队列 (Office & HEIC)
  const processConversions = async (fileList: UploadedFile[]) => {
    const newFiles = [...fileList];
    
    for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i];
        
        // 只处理正在转换且还没有结果的文件
        if (f.isConverting && !f.convertedBlob) {
            try {
                let blob: Uint8Array | null = null;
                const typeStr = f.file.name.split('.').pop()?.toLowerCase();

                if (f.type === 'docx') {
                    blob = await convertDocxToImage(f.file);
                } else if (f.type === 'xlsx') {
                    blob = await convertXlsxToImage(f.file);
                } else if (typeStr === 'heic' || typeStr === 'heif') {
                    // HEIC 转换逻辑
                    try {
                        const result = await heic2any({ 
                            blob: f.file, 
                            toType: 'image/jpeg', 
                            quality: 0.8 
                        });
                        const resultBlob = Array.isArray(result) ? result[0] : result;
                        blob = new Uint8Array(await resultBlob.arrayBuffer());
                    } catch (e) {
                        console.error('HEIC conversion error', e);
                        // 这里可以标记转换失败，暂略
                    }
                }

                if (blob) {
                    f.convertedBlob = blob;
                    const mimeType = (typeStr === 'heic' || typeStr === 'heif') ? 'image/jpeg' : 'image/png';
                    const previewBlob = new Blob([blob], { type: mimeType });
                    f.previewUrl = URL.createObjectURL(previewBlob);
                    f.isConverting = false;
                    
                    // 更新状态触发重绘
                    setFiles(prev => prev.map(item => item.id === f.id ? f : item));
                }
            } catch (err) {
                console.error("Conversion failed for file " + f.file.name, err);
                f.isConverting = false; 
            }
        }
    }
  };

  const handleFilesSelected = async (newFiles: File[]) => {
    // 智能排序
    const sortedNewFiles = [...newFiles].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const processedFilesPromises = sortedNewFiles.map(processFile);
    const processedFiles = await Promise.all(processedFilesPromises);
    
    setFiles((prev) => {
        const updated = [...prev, ...processedFiles];
        setTimeout(() => processConversions(updated), 100);
        return updated;
    });
    // Reset output
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null); 
    setMergedBlob(null);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
        const fileToRemove = prev.find(f => f.id === id);
        if (fileToRemove?.previewUrl) {
            URL.revokeObjectURL(fileToRemove.previewUrl);
        }
        return prev.filter((f) => f.id !== id);
    });
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setMergedBlob(null);
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清空所有文件吗？')) {
        files.forEach(f => {
            if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        });
        setFiles([]);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
        setMergedBlob(null);
        setStatus({ isProcessing: false, message: '', progress: 0 });
    }
  };

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prevFiles) => {
      const result = Array.from(prevFiles);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
    // Order changed, reset merge result
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setMergedBlob(null);
  }, [downloadUrl]);

  const handleMerge = async () => {
    if (files.length === 0) return;
    
    // 检查是否有仍在转换的文件
    if (files.some(f => f.isConverting)) {
        alert("部分文件 (Word/Excel/HEIC) 正在进行格式转换，请稍候...");
        return;
    }

    setStatus({ isProcessing: true, message: '正在初始化...', progress: 0 });
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setMergedBlob(null);

    try {
      const pdfBytes = await mergeFiles(files, compressionLevel, (msg, progress) => {
        setStatus({ isProcessing: true, message: msg, progress });
      });

      // Create Blob and URL
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setMergedBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // 设置默认文件名
      const firstFileName = files[0].file.name;
      const baseName = firstFileName.substring(0, firstFileName.lastIndexOf('.')) || firstFileName;
      const finalName = outputFilename === 'merged-document' ? `${baseName}_merged` : outputFilename;
      setOutputFilename(finalName);

      // --- 保存到历史记录 ---
      const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          outputFilename: finalName,
          fileCount: files.length,
          fileNames: files.map(f => f.file.name),
          totalSize: formatSize(totalSize)
      };
      const updatedHistory = addHistoryItem(newItem);
      setHistory(updatedHistory);
      // --------------------

      setStatus({ isProcessing: false, message: '合并成功！', progress: 100 });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : '合并过程中发生未知错误';
      setStatus({ isProcessing: false, message: `失败: ${errorMessage}`, progress: 0 });
      alert(`合并失败: ${errorMessage}`);
    }
  };

  const handlePreviewMerged = () => {
      if (!mergedBlob) return;
      
      const fileName = outputFilename.trim() ? 
          (outputFilename.endsWith('.pdf') ? outputFilename : `${outputFilename}.pdf`) 
          : 'merged-document.pdf';

      const file = new File([mergedBlob], fileName, { type: 'application/pdf' });
      
      setPreviewFile({
          id: 'merged-result',
          file: file,
          type: 'pdf'
      });
  };

  const handleClearHistory = () => {
      if(window.confirm('确定要清空所有历史记录吗？')) {
          clearHistory();
          setHistory([]);
      }
  };
  
  const handleDeleteHistoryItem = (id: string) => {
      const updated = deleteHistoryItem(id);
      setHistory(updated);
  };

  // Cleanup
  useEffect(() => {
    return () => {
        files.forEach(f => {
            if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        });
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [files, downloadUrl]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                <FileStack className="text-white h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
              PDF合并大师 <span className="text-xs font-normal text-indigo-500 border border-indigo-100 px-2 py-0.5 rounded-full ml-2">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsHistoryOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-indigo-300 transition-all shadow-sm"
            >
                <History size={14} />
                历史记录
            </button>
            <div className="hidden sm:block">
                <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                本地安全处理
                </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4 mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              全能文档合并 <br className="sm:hidden"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">PDF • Word • Excel • HEIC</span>
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
              支持 PDF、Office 文档及 HEIC/WebP 等各类图片。智能解析内容，自动统一排版，保护隐私，无需上传。
            </p>
            <div className="sm:hidden flex justify-center mt-4">
               <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50"
               >
                <History size={14} />
                历史记录
               </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-white overflow-hidden ring-1 ring-slate-200/50 relative">
            
            {/* 明显的进度条覆盖层 */}
            {status.isProcessing && (
                <div className="absolute top-0 left-0 w-full z-30">
                    <div className="h-1.5 w-full bg-indigo-50">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${status.progress}%` }}
                        />
                    </div>
                    {/* 进度提示文本 */}
                    <div className="absolute top-2 right-4 bg-black/75 text-white text-xs px-2 py-1 rounded shadow-md backdrop-blur-sm animate-fade-in">
                        {status.progress}%
                    </div>
                </div>
            )}

            <div className="p-6 sm:p-10">
              <FileUploader onFilesSelected={handleFilesSelected} />

              {/* 后台转换状态提示 */}
              {convertingCount > 0 && !status.isProcessing && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center text-sm text-amber-700 animate-pulse">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>正在后台优化 {convertingCount} 个文档，请稍候...</span>
                  </div>
              )}

              <FileList 
                files={files} 
                onRemove={handleRemoveFile} 
                onReorder={handleReorder}
                onPreview={setPreviewFile}
              />

              {status.message && (
                <div className={`mt-6 text-center text-sm font-medium ${status.message.includes('失败') ? 'text-red-500' : 'text-indigo-600'} animate-fade-in`}>
                   {status.isProcessing && <span className="inline-block animate-spin mr-2">⟳</span>}
                   {status.message}
                </div>
              )}

              {files.length > 0 && (
                 <div className="mt-8 pt-6 border-t border-slate-100 animate-slide-up">
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                             <Button 
                                variant="ghost" 
                                onClick={handleClearAll}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 text-sm w-full sm:w-auto"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                清空
                            </Button>
                            
                            {/* 压缩选项 */}
                            {!downloadUrl && (
                              <div className="flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-full sm:w-auto">
                                <Settings2 size={16} className="text-slate-500 mr-2" />
                                <span className="text-sm text-slate-600 mr-2 font-medium whitespace-nowrap">压缩:</span>
                                <select 
                                  value={compressionLevel}
                                  onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}
                                  className="bg-transparent text-sm text-slate-700 outline-none font-medium cursor-pointer"
                                  disabled={status.isProcessing}
                                >
                                  <option value="none">无 (原画)</option>
                                  <option value="normal">普通 (推荐)</option>
                                  <option value="high">高 (最小)</option>
                                </select>
                              </div>
                            )}
                        </div>

                        {downloadUrl ? (
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
                                {/* 文件名输入框 */}
                                <div className="flex items-center bg-white px-3 py-2 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 w-full sm:w-auto">
                                    <PenLine size={14} className="text-slate-400 mr-2" />
                                    <input 
                                        type="text" 
                                        value={outputFilename}
                                        onChange={(e) => setOutputFilename(e.target.value)}
                                        className="text-sm text-slate-700 outline-none w-full min-w-[120px] placeholder:text-slate-300"
                                        placeholder="输入文件名"
                                    />
                                    <span className="text-xs text-slate-400 font-medium ml-1 bg-slate-100 px-1 rounded">.pdf</span>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button 
                                        onClick={handlePreviewMerged}
                                        variant="secondary"
                                        className="flex-1 sm:flex-initial whitespace-nowrap"
                                        title="预览生成的文件"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        预览
                                    </Button>

                                    <a 
                                        href={downloadUrl} 
                                        download={`${outputFilename}.pdf`}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 border-0 whitespace-nowrap">
                                            <Download className="w-4 h-4 mr-2" />
                                            下载文件
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <Button 
                                onClick={handleMerge} 
                                isLoading={status.isProcessing}
                                disabled={files.length === 0 || convertingCount > 0}
                                className={`w-full sm:w-auto min-w-[180px] border-0 shadow-lg transition-all
                                    ${convertingCount > 0 
                                        ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200'
                                    }
                                `}
                            >
                                {convertingCount > 0 ? (
                                    <>等待文档处理...</>
                                ) : (
                                    <>
                                        {!status.isProcessing && <Sparkles className="w-4 h-4 mr-2" />}
                                        开始合并生成
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                 </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs text-slate-400 px-4">
            <div className="p-3">⚡️ 浏览器本地极速处理</div>
            <div className="p-3">🔒 Office/HEIC 高清转换</div>
            <div className="p-3">📐 智能页面尺寸统一</div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-slate-400 text-sm font-medium">© {new Date().getFullYear()} PDF合并大师</p>
      </footer>

      {/* Preview Modal */}
      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      
      {/* History Drawer */}
      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
      />
    </div>
  );
};

export default App;
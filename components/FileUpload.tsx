import React, { useRef, useState } from 'react';
import { Upload, FileType, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div 
      className={`
        relative w-full max-w-2xl mx-auto h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-all duration-200
        ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'}
        ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-indigo-400 hover:bg-slate-50 cursor-pointer'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleChange}
        disabled={isProcessing}
      />

      {isProcessing ? (
        <div className="flex flex-col items-center animate-pulse">
          <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
          <p className="text-lg font-semibold text-slate-700">Analyzing Invoice...</p>
          <p className="text-sm text-slate-500 mt-2">Identifying items, verifying address, and assigning GL codes</p>
        </div>
      ) : (
        <>
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full mb-4">
            <Upload size={32} />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-1">
            Upload Invoice
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mb-4">
            Drag and drop your invoice here (PDF or Image), or click to browse.
          </p>
          <div className="flex gap-3 text-xs text-slate-400">
            <span className="flex items-center"><FileType size={12} className="mr-1" /> PDF & Images</span>
            <span className="flex items-center"><FileType size={12} className="mr-1" /> Address Verification</span>
          </div>
        </>
      )}
    </div>
  );
};

export default FileUpload;

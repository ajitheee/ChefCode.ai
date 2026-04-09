import React, { useRef, useState } from 'react';
import { Upload, FileType, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    <motion.div 
      whileHover={!isProcessing ? { scale: 1.01 } : {}}
      whileTap={!isProcessing ? { scale: 0.99 } : {}}
      className={`
        relative w-full max-w-2xl mx-auto h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-all duration-300
        ${dragActive ? 'border-indigo-500 bg-indigo-50/50 shadow-inner' : 'border-slate-300 bg-white shadow-sm'}
        ${isProcessing ? 'border-indigo-200 bg-indigo-50/30' : 'hover:border-indigo-400 hover:bg-slate-50 cursor-pointer hover:shadow-md'}
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

      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-4">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-indigo-600 opacity-20"
              />
              <Loader2 size={48} className="text-indigo-600 animate-spin relative z-10" />
            </div>
            <p className="text-lg font-semibold text-slate-800">Analyzing Invoice...</p>
            <p className="text-sm text-slate-500 mt-2 max-w-xs">Identifying items, verifying address, and assigning GL codes</p>
          </motion.div>
        ) : (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center"
          >
            <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full mb-4 shadow-sm">
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FileUpload;

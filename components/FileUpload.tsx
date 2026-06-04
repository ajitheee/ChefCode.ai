import React, { useRef, useState } from 'react';
import { Upload, FileImage, FileText, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
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
      setFileName(e.dataTransfer.files[0].name);
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      onFileSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <motion.div
      whileHover={!isProcessing ? { scale: 1.005 } : {}}
      whileTap={!isProcessing ? { scale: 0.995 } : {}}
      className={`
        relative w-full max-w-2xl mx-auto border-2 border-dashed rounded-2xl transition-all duration-300 overflow-hidden
        ${dragActive
          ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg shadow-cyan-500/10'
          : isProcessing
            ? 'border-cyan-200 bg-gradient-to-br from-cyan-50/30 to-slate-50'
            : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-gradient-to-br hover:from-slate-50 hover:to-cyan-50/30 cursor-pointer hover:shadow-lg hover:shadow-slate-200/50'
        }
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={!isProcessing ? onButtonClick : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleChange}
        disabled={isProcessing}
      />

      <div className="px-8 py-12">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              {/* Animated processing indicator */}
              <div className="relative mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="w-20 h-20 rounded-2xl border-2 border-cyan-200 border-t-cyan-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={28} className="text-cyan-600" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">AI Processing Invoice</h3>
              {fileName && (
                <p className="text-sm text-cyan-600 font-medium mb-3">{fileName}</p>
              )}

              {/* Progress steps */}
              <div className="flex flex-col gap-2 text-sm mt-2">
                {['Reading invoice content...', 'Matching products to database...', 'Assigning GL codes...'].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 1.5 }}
                    className="flex items-center gap-2 text-slate-500"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 1.5 + 1.2 }}
                    >
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </motion.div>
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center"
            >
              {/* Upload icon with glow */}
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl blur-xl scale-150" />
                <div className="relative p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-600 rounded-2xl shadow-sm border border-cyan-200/50">
                  <Upload size={28} strokeWidth={2} />
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Upload Your Invoice
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
                Drag and drop your invoice here, or click to browse.
                Our AI will extract line items and assign GL codes automatically.
              </p>

              {/* File type badges */}
              <div className="flex gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200/60">
                  <FileImage size={13} className="text-blue-500" />
                  JPG, PNG
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200/60">
                  <FileText size={13} className="text-red-500" />
                  PDF
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200/60">
                  <Sparkles size={13} className="text-amber-500" />
                  AI Powered
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subtle animated border glow when dragging */}
      {dragActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 pointer-events-none rounded-2xl ring-2 ring-cyan-400/30 ring-offset-2"
        />
      )}
    </motion.div>
  );
};

export default FileUpload;

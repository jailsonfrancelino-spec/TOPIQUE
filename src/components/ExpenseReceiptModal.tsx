import React, { useRef, useState } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  X, 
  CheckCircle2, 
  Download, 
  AlertCircle, 
  Receipt,
  RotateCw,
  Eye
} from 'lucide-react';
import { ExpenseRecord } from '../types';
import { compressReceiptImage } from '../utils/imageCompressor';
import { formatCurrency } from '../utils/calculations';

interface ExpenseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRecord;
  dayLabel: string;
  onSaveReceipt: (receiptDataUrl: string, fileName: string) => void;
  onRemoveReceipt: () => void;
}

export const ExpenseReceiptModal: React.FC<ExpenseReceiptModalProps> = ({
  isOpen,
  onClose,
  expense,
  dayLabel,
  onSaveReceipt,
  onRemoveReceipt,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const compressedDataUrl = await compressReceiptImage(file);
      const fileName = file.name || `Comprovante_${Date.now()}.jpg`;
      onSaveReceipt(compressedDataUrl, fileName);
      setSuccessToast('Comprovante salvo com sucesso!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Erro ao processar a foto do comprovante.');
    } finally {
      setIsProcessing(false);
      // Limpa os inputs para permitir selecionar novamente o mesmo arquivo se quiser
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (!expense.receiptImage) return;
    const a = document.createElement('a');
    a.href = expense.receiptImage;
    a.download = expense.receiptName || `comprovante_${expense.label.toLowerCase().replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Hidden inputs for camera capture and gallery */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="receipt-camera-input"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="receipt-gallery-input"
        />

        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Comprovante de Despesa
              </h3>
              <p className="text-[11px] text-slate-300">
                {expense.label} • {dayLabel} {expense.value > 0 ? `(${formatCurrency(expense.value)})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Loading state during image compression */}
          {isProcessing && (
            <div className="p-8 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-blue-900">
                Otimizando e salvando foto do comprovante...
              </p>
              <p className="text-[11px] text-blue-700">
                Aguarde um instante.
              </p>
            </div>
          )}

          {/* Existing Receipt Preview */}
          {!isProcessing && expense.receiptImage ? (
            <div className="space-y-3">
              <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-80 group">
                <img
                  src={expense.receiptImage}
                  alt={`Comprovante ${expense.label}`}
                  className="w-full h-auto max-h-80 object-contain"
                />
                
                {/* Overlay actions on hover */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-1.5 text-slate-200 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Baixar imagem"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="truncate max-w-[200px] font-medium text-slate-700">
                  📎 {expense.receiptName || 'Comprovante anexado'}
                </span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Foto salva
                </span>
              </div>

              {/* Action buttons when receipt exists */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Tirar Outra Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>Trocar Arquivo</span>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja realmente remover o comprovante desta despesa?')) {
                      onRemoveReceipt();
                      onClose();
                    }
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Comprovante</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : !isProcessing ? (
            /* Upload options when NO receipt is yet attached */
            <div className="space-y-4 text-center py-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Camera className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Anexar Comprovante de {expense.label}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Tire uma foto direta do cupom fiscal, nota de combustível ou recibo, ou escolha uma imagem salva no seu celular/computador.
                </p>
              </div>

              {/* Two Direct Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl shadow-md flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <Camera className="w-6 h-6 text-blue-200 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs sm:text-sm">Tirar Foto com a Câmera</span>
                  <span className="text-[10px] text-blue-200">Abre a câmera do celular direto</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="p-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border-2 border-slate-300 rounded-xl shadow-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <Upload className="w-6 h-6 text-slate-600 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs sm:text-sm">Escolher da Galeria / Arquivo</span>
                  <span className="text-[10px] text-slate-500">Selecionar imagem já salva</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Formatos aceitos: JPG, PNG, WEBP. A foto é otimizada e salva automaticamente na ficha.
              </div>
            </div>
          ) : null}

        </div>

      </div>
    </div>
  );
};

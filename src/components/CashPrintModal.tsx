import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Receipt, 
  MessageSquare,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { DayRecord, WeeklySheet } from '../types';
import { calculateDayTotals, calculateTripSubtotal, formatCurrency, formatDatePtBR } from '../utils/calculations';
import { generateTicketCanvas } from '../utils/ticketCanvas';

interface CashPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: WeeklySheet;
  day: DayRecord;
  dayIndex: number;
}

export const CashPrintModal: React.FC<CashPrintModalProps> = ({
  isOpen,
  onClose,
  sheet,
  day,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGeneratedToast, setImageGeneratedToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const totals = calculateDayTotals(day);
  const formattedDate = formatDatePtBR(day.date);

  // Generate canvas preview whenever modal opens or day changes
  useEffect(() => {
    if (isOpen && day) {
      try {
        const canvas = generateTicketCanvas(day, sheet);
        setPreviewDataUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Erro ao renderizar canvas:', err);
      }
    }
  }, [isOpen, day, sheet]);

  if (!isOpen) return null;

  // Generate clean, complete and formatted WhatsApp message showing the Day and ALL TRIPS (without vehiclePlate)
  const generateWhatsAppMessage = () => {
    const tripsText = day.trips
      .map((t, index) => {
        const sub = calculateTripSubtotal(t);
        const name = t.tripName || `${index + 1}ª Viagem`;
        return `🚏 *${name.toUpperCase()}*
   • Ida: ${formatCurrency(t.ida)}
   • Volta: ${formatCurrency(t.volta)}
   • Encomendas: ${formatCurrency(t.encom)}
   • PIX (na conta): ${formatCurrency(t.pix)}
   👉 *Subtotal ${name}:* ${formatCurrency(sub)}`;
      })
      .join('\n\n');

    const expensesText = day.expenses
      .map((e) => `   • *${e.label}:* ${formatCurrency(e.value || 0)}`)
      .join('\n');

    return `🚌 *COMPROVANTE DE FECHAMENTO DE CAIXA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *LINHA:* ${sheet.companyRoute}
📅 *DIA:* ${day.dayLabel.toUpperCase()}
🗓️ *DATA:* ${formattedDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚍 *DETALHAMENTO DE TODAS AS VIAGENS (${day.trips.length} VIAGENS):*
${tripsText}

────────────────────────────
📊 *TOTAIS DAS VIAGENS:*
• Total Ida: ${formatCurrency(totals.totalIda)}
• Total Volta: ${formatCurrency(totals.totalVolta)}
• Total Encomendas: ${formatCurrency(totals.totalEncom)}
• Total PIX Viagens: ${formatCurrency(totals.totalPix)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL BRUTO ARRECADADO:* ${formatCurrency(totals.totalArrecadado)}
💳 *Total em PIX (Conta):* ${formatCurrency(totals.totalPix)}
💵 *Total em Dinheiro (Entrada):* ${formatCurrency(totals.totalDinheiro)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛽ *DESPESAS OPERACIONAIS DO DIA:*
${expensesText || '   • Nenhuma despesa'}
🔻 *TOTAL DE DESPESAS:* ${formatCurrency(totals.totalDespesas)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *RESULTADO FINAL DO DIA:*
🔹 *Sobra Líquida Geral:* ${formatCurrency(totals.sobraLiquida)}
_(Arrecadação Bruta menos Despesas do Dia)_

⭐ *SOBRA REAL EM DINHEIRO (ESPÉCIE NO CAIXA):*
👉 *${formatCurrency(totals.sobraDinheiroEspecie)}*
_(Cálculo: Sobra Líquida menos Total PIX)_
_(Valor físico em cédulas/moedas que deve estar no caixa)_
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ *Caixa conferido e fechado com sucesso.*`;
  };

  const handleCopyText = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleDownloadImage = () => {
    try {
      setIsGeneratingImage(true);
      const canvas = generateTicketCanvas(day, sheet);
      const dataUrl = canvas.toDataURL('image/png');
      const safeDate = day.date.replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `Comprovante_Caixa_${day.dayOfWeek}_${safeDate}.png`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setImageGeneratedToast('Comprovante baixado com sucesso!');
      setTimeout(() => setImageGeneratedToast(null), 3500);
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
      alert('Houve um erro ao baixar a imagem. Você pode copiar o texto para o WhatsApp.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyImageToClipboard = async () => {
    try {
      setIsGeneratingImage(true);
      const canvas = generateTicketCanvas(day, sheet);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleCopyText();
          return;
        }
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setCopiedImage(true);
            setImageGeneratedToast('Imagem copiada! Cole direto no WhatsApp com Ctrl+V.');
            setTimeout(() => {
              setCopiedImage(false);
              setImageGeneratedToast(null);
            }, 3500);
            return;
          } catch {
            handleDownloadImage();
          }
        } else {
          handleDownloadImage();
        }
      }, 'image/png');
    } catch (err) {
      console.error('Erro ao copiar imagem:', err);
      handleDownloadImage();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareMobile = async () => {
    const text = generateWhatsAppMessage();
    try {
      setIsGeneratingImage(true);
      const canvas = generateTicketCanvas(day, sheet);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleOpenWhatsApp();
          return;
        }

        const safeDate = day.date.replace(/[^a-zA-Z0-9]/g, '-');
        const file = new File([blob], `Comprovante_${day.dayOfWeek}_${safeDate}.png`, { type: 'image/png' });

        // Se suportar compartilhamento de arquivos nativo do celular
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Comprovante de Fechamento - ${day.dayLabel}`,
              text: text,
              files: [file],
            });
            return;
          } catch (shareErr) {
            console.log('Compartilhamento cancelado ou fallback', shareErr);
          }
        }

        // Se estiver no computador ou navegador desktop, copia a imagem e abre o WhatsApp
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setImageGeneratedToast('Imagem copiada! Abrindo WhatsApp...');
            setTimeout(() => {
              handleOpenWhatsApp();
            }, 800);
            return;
          } catch {
            // Se falhar a cópia, baixa e abre
          }
        }

        // Fallback garantido: baixa a imagem e abre WhatsApp
        handleDownloadImage();
        setTimeout(() => handleOpenWhatsApp(), 600);
      }, 'image/png');
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
      handleOpenWhatsApp();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-emerald-700 text-white px-5 py-3.5 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800/80 rounded-lg">
              <MessageSquare className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Comprovante para WhatsApp
              </h2>
              <p className="text-xs text-emerald-100">
                {day.dayLabel} • {formattedDate} • {sheet.companyRoute}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white hover:bg-emerald-800 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Bar */}
        <div className="bg-emerald-50/80 p-3 sm:p-4 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            
            {/* Direct WhatsApp Share */}
            <button
              onClick={handleShareMobile}
              disabled={isGeneratingImage}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar Imagem no WhatsApp</span>
            </button>

            {/* Download Print Image */}
            <button
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingImage ? 'Processando...' : 'Baixar Imagem (PNG)'}</span>
            </button>

            {/* Copy Image to Clipboard */}
            <button
              onClick={handleCopyImageToClipboard}
              disabled={isGeneratingImage}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer min-h-[44px]"
              title="Copia a imagem para a área de transferência para colar com Ctrl+V"
            >
              {copiedImage ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copiada!</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Copiar Imagem</span>
                </>
              )}
            </button>
          </div>

          {/* Copy Text Button */}
          <button
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Texto Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Texto</span>
              </>
            )}
          </button>
        </div>

        {/* Toast alerts */}
        {imageGeneratedToast && (
          <div className="bg-emerald-700 text-white px-4 py-2.5 text-xs text-center font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
            <span>{imageGeneratedToast}</span>
          </div>
        )}

        {/* View Mode Switcher */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('image')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'image'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Formato de Imagem (WhatsApp)</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'text'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Texto para WhatsApp</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Dia: <strong className="text-slate-800 uppercase">{day.dayLabel}</strong> • {day.trips.length} Viagens
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-5 overflow-y-auto bg-slate-100 flex-1">
          
          {activeTab === 'text' ? (
            /* TEXT VIEW: Clean whatsapp text preview with copy button */
            <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Mensagem Formatada (Pronta para Envio)
                  </span>
                </div>
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>

              <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200 max-h-[500px] overflow-y-auto">
                {generateWhatsAppMessage()}
              </pre>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleOpenWhatsApp}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer min-h-[44px]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Abrir WhatsApp e Enviar Mensagem</span>
                </button>
              </div>
            </div>
          ) : (
            /* IMAGE VIEW: High-definition, 100% reliable image generated via native Canvas */
            <div className="max-w-xl mx-auto flex flex-col items-center">
              <div className="mb-2 text-center">
                <p className="text-xs font-semibold text-slate-700">
                  📸 Imagem oficial do fechamento de <strong>{day.dayLabel.toUpperCase()}</strong> ({day.trips.length} viagens):
                </p>
                <p className="text-[11px] text-slate-500">
                  Esta é a imagem exata gerada para envio por WhatsApp ou download.
                </p>
              </div>

              {previewDataUrl ? (
                <div className="w-full bg-white p-2 rounded-2xl shadow-md border border-slate-200">
                  <img 
                    src={previewDataUrl} 
                    alt={`Comprovante ${day.dayLabel}`} 
                    className="w-full h-auto rounded-xl object-contain shadow-xs"
                  />
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-500">
                  Gerando comprovante em alta definição...
                </div>
              )}

              {/* Quick download & share floating bar under image */}
              <div className="w-full mt-3 flex items-center justify-center gap-3">
                <button
                  onClick={handleDownloadImage}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Imagem PNG</span>
                </button>
                <button
                  onClick={handleShareMobile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="hidden sm:inline">
            A imagem mostra todas as viagens, despesas e a <strong>Sobra Real em Dinheiro</strong> calculada.
          </span>
          <button
            onClick={onClose}
            className="ml-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

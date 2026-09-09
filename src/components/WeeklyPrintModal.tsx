import React, { useEffect, useState } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  MessageSquare,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { WeeklySheet } from '../types';
import { calculateWeeklyTotals, formatCurrency, formatDatePtBR } from '../utils/calculations';
import { generateWeeklySummaryCanvas } from '../utils/weeklyCanvas';
import { downloadWeeklySummaryPdf, getWeeklySummaryPdfBlob } from '../utils/weeklyPdf';

interface WeeklyPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: WeeklySheet;
}

export const WeeklyPrintModal: React.FC<WeeklyPrintModalProps> = ({
  isOpen,
  onClose,
  sheet,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const weekly = calculateWeeklyTotals(sheet);
  const startPt = formatDatePtBR(sheet.startDate);
  const endPt = formatDatePtBR(sheet.endDate);

  useEffect(() => {
    if (isOpen && sheet) {
      try {
        const canvas = generateWeeklySummaryCanvas(sheet);
        setPreviewDataUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Erro ao renderizar canvas semanal:', err);
      }
    }
  }, [isOpen, sheet]);

  if (!isOpen) return null;

  // Mensagem formatada em texto para WhatsApp
  const generateWhatsAppMessage = () => {
    const daysLines = weekly.daysSummary
      .map((d) => {
        return `📅 *${d.dayLabel.toUpperCase()}* (${formatDatePtBR(d.date)})
   • Arrecadação: ${formatCurrency(d.arrecadacao)}
   • Despesas: ${formatCurrency(d.despesas)}
   • Dinheiro: ${formatCurrency(d.dinheiro)} | Pix: ${formatCurrency(d.pix)}
   👉 *Sobra Espécie (Em Mãos):* ${formatCurrency(d.sobraDinheiroEspecie)}`;
      })
      .join('\n\n');

    return `🚌 *RESUMO DO FECHAMENTO SEMANAL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *LINHA:* ${sheet.companyRoute}
🗓️ *SEMANA:* ${startPt} a ${endPt}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *TOTAIS CONSOLIDADOS DA SEMANA:*
💰 *Total Arrecadado:* ${formatCurrency(weekly.totalArrecadacao)} (${weekly.tripsCount} viagens)
⛽ *Total Despesas:* ${formatCurrency(weekly.totalDespesas)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 *Total em Dinheiro:* ${formatCurrency(weekly.totalDinheiro)}
💳 *Total em PIX (Conta):* ${formatCurrency(weekly.totalPix)}
📈 *Sobra Líquida Geral:* ${formatCurrency(weekly.totalSobraLiquida)} (Margem: ${weekly.margemLucroPercent.toFixed(1)}%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ *SOBRA REAL EM DINHEIRO (EM MÃOS):*
👉 *${formatCurrency(weekly.totalSobraDinheiroEspecie)}*
*(Sobra Líquida menos Total Pix)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *DETALHAMENTO DIA A DIA (SEG A DOM):*
${daysLines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Custos Principais:*
• Combustível: ${formatCurrency(weekly.totalCombustivel)}
• Diárias Motoristas: ${formatCurrency(weekly.totalMotorista)}
• Diárias Cobradores: ${formatCurrency(weekly.totalCobrador)}
• Outras Despesas: ${formatCurrency(weekly.totalOutrasDespesas)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✔ *Fechamento Auditado e Aprovado*`;
  };

  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      downloadWeeklySummaryPdf(sheet);
      setToastMessage('Resumo Semanal em PDF baixado com sucesso!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Erro ao gerar PDF semanal:', err);
      alert('Erro ao gerar PDF. Você pode baixar a imagem PNG ou copiar o texto.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadImage = () => {
    try {
      setIsGeneratingImage(true);
      const canvas = generateWeeklySummaryCanvas(sheet);
      const dataUrl = canvas.toDataURL('image/png');

      const safeStart = sheet.startDate.replace(/[^a-zA-Z0-9]/g, '-');
      const safeEnd = sheet.endDate.replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `Resumo_Semanal_${safeStart}_a_${safeEnd}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToastMessage('Imagem do Resumo Semanal baixada com sucesso!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Erro ao baixar imagem semanal:', err);
      alert('Houve um erro ao gerar a imagem.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyImage = async () => {
    try {
      setIsGeneratingImage(true);
      const canvas = generateWeeklySummaryCanvas(sheet);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleDownloadImage();
          return;
        }

        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setCopiedImage(true);
            setToastMessage('Imagem copiada para a área de transferência! Cole no WhatsApp Web com Ctrl + V.');
            setTimeout(() => {
              setCopiedImage(false);
              setToastMessage(null);
            }, 3500);
            return;
          } catch {
            handleDownloadPdf();
          }
        } else {
          handleDownloadPdf();
        }
      }, 'image/png');
    } catch {
      handleDownloadPdf();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareMobile = async () => {
    const text = generateWhatsAppMessage();
    try {
      setIsGeneratingPdf(true);
      const pdfBlob = getWeeklySummaryPdfBlob(sheet);
      const safeStart = sheet.startDate.replace(/[^a-zA-Z0-9]/g, '-');
      const safeEnd = sheet.endDate.replace(/[^a-zA-Z0-9]/g, '-');
      const file = new File([pdfBlob], `Resumo_Semanal_${safeStart}_a_${safeEnd}.pdf`, { type: 'application/pdf' });

      // Se suportar compartilhamento de arquivos nativo do celular
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Resumo Fechamento Semanal (${startPt} a ${endPt})`,
            text: text,
            files: [file],
          });
          return;
        } catch (shareErr) {
          console.log('Compartilhamento cancelado ou fallback', shareErr);
        }
      }

      // No computador: copia a imagem do resumo e abre o WhatsApp Web
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          const canvas = generateWeeklySummaryCanvas(sheet);
          canvas.toBlob(async (imgBlob) => {
            if (imgBlob) {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': imgBlob }),
              ]);
            }
          });
          setToastMessage('Resumo copiado! Abrindo WhatsApp...');
          setTimeout(() => {
            handleOpenWhatsApp();
          }, 800);
          return;
        } catch {
          // Fallback
        }
      }

      // Fallback: baixa o PDF e abre o WhatsApp
      handleDownloadPdf();
      setTimeout(() => handleOpenWhatsApp(), 600);
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
      handleOpenWhatsApp();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const encodedText = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleCopyText = async () => {
    try {
      const text = generateWhatsAppMessage();
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setToastMessage('Texto do resumo semanal copiado com sucesso!');
      setTimeout(() => {
        setCopiedText(false);
        setToastMessage(null);
      }, 3000);
    } catch {
      alert('Não foi possível copiar o texto automaticamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-blue-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between border-b border-blue-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-xl text-blue-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-700/70 text-blue-200 px-2 py-0.5 rounded-md">
                  RELATÓRIO SEMANAL CONSOLIDADO
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight mt-0.5">
                Resumo Fechamento Semanal
              </h2>
              <p className="text-xs text-blue-200">
                {sheet.companyRoute} • {startPt} a {endPt}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-emerald-50/80 p-3 sm:p-4 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
              title="Baixar resumo do fechamento semanal em documento PDF (A4 pronto para imprimir e arquivar)"
            >
              <FileText className="w-4 h-4 text-red-200" />
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar em PDF'}</span>
            </button>

            {/* Direct WhatsApp Share */}
            <button
              onClick={handleShareMobile}
              disabled={isGeneratingPdf || isGeneratingImage}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
              title="Compartilhar resumo semanal no WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>

            {/* Download Print Image (PNG) */}
            <button
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs px-3 py-2.5 rounded-xl shadow-2xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
              title="Baixar também no formato de imagem PNG"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>{isGeneratingImage ? 'Processando...' : 'Baixar Imagem (PNG)'}</span>
            </button>

            {/* Copy Image Button */}
            <button
              onClick={handleCopyImage}
              disabled={isGeneratingImage}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs px-3 py-2.5 rounded-xl shadow-2xs transition-colors cursor-pointer min-h-[44px]"
              title="Copiar imagem para colar no WhatsApp Web com Ctrl+V"
            >
              {copiedImage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedImage ? 'Imagem Copiada!' : 'Copiar Imagem'}</span>
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-auto justify-center">
            <button
              onClick={() => setActiveTab('image')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Imagem / PDF</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Texto WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center">
          
          {activeTab === 'image' ? (
            <div className="flex flex-col items-center w-full">
              
              {/* High definition preview container */}
              <div className="bg-white p-2.5 sm:p-4 rounded-xl shadow-lg border border-slate-300 max-w-2xl w-full flex justify-center">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt={`Resumo Semanal - ${startPt} a ${endPt}`}
                    className="w-full h-auto rounded-lg object-contain shadow-2xs"
                  />
                ) : (
                  <div className="py-20 text-center text-slate-400">
                    Gerando comprovante semanal em alta resolução...
                  </div>
                )}
              </div>

              {/* Quick download & share floating bar under preview */}
              <div className="w-full mt-3.5 flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  title="Baixar resumo formatado em PDF"
                >
                  <FileText className="w-4 h-4 text-red-200" />
                  <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar Resumo em PDF'}</span>
                </button>
                <button
                  onClick={handleDownloadImage}
                  disabled={isGeneratingImage}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                  title="Baixar em formato imagem PNG"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Imagem PNG</span>
                </button>
                <button
                  onClick={handleShareMobile}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="w-full max-w-xl bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Mensagem Pronta para o WhatsApp:
                </span>
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={generateWhatsAppMessage()}
                className="w-full h-96 p-4 text-xs font-mono bg-slate-50/50 border-none resize-none focus:outline-hidden text-slate-800 leading-relaxed"
              />
              <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Ideal para enviar em grupos de prestação de contas no WhatsApp.
                </span>
                <button
                  onClick={handleOpenWhatsApp}
                  className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Abrir no WhatsApp</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="hidden sm:inline">
            Clique em <strong>Baixar em PDF</strong> para salvar o documento oficial ou <strong>Enviar no WhatsApp</strong> para compartilhar.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

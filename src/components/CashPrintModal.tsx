import React, { useRef, useState } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Printer, 
  Calendar, 
  Car, 
  Wallet, 
  Fuel, 
  User, 
  Users, 
  Receipt, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { DayRecord, WeeklySheet } from '../types';
import { calculateDayTotals, calculateTripSubtotal, formatCurrency, formatDatePtBR } from '../utils/calculations';

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
  dayIndex,
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGeneratedToast, setImageGeneratedToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');

  if (!isOpen) return null;

  const totals = calculateDayTotals(day);
  const formattedDate = formatDatePtBR(day.date);
  const isPositiveCash = totals.sobraDinheiroEspecie >= 0;
  const isPositiveLiquida = totals.sobraLiquida >= 0;

  // Generate clean, complete and formatted WhatsApp message showing the Day and ALL TRIPS
  const generateWhatsAppMessage = () => {
    // List ALL trips without filtering out any trip
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
📅 *DIA:* ${day.dayLabel.toUpperCase()}
🗓️ *DATA:* ${formattedDate}
🚐 *VEÍCULO / PLACA:* ${sheet.vehiclePlate || 'Não informada'}
📍 *ROTA:* ${sheet.companyRoute}
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

  const handleDownloadImage = async () => {
    if (!ticketRef.current) return;
    try {
      setIsGeneratingImage(true);
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const safeDate = day.date.replace(/[^a-zA-Z0-9]/g, '-');
      const safePlate = (sheet.vehiclePlate || 'veiculo').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Fechamento_Caixa_${day.dayOfWeek}_${safePlate}_${safeDate}.png`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setImageGeneratedToast('Print do Caixa baixado com sucesso!');
      setTimeout(() => setImageGeneratedToast(null), 3500);
    } catch (err) {
      console.error('Erro ao gerar print:', err);
      alert('Não foi possível gerar a imagem automaticamente. Você pode copiar o texto para o WhatsApp.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareMobile = async () => {
    const text = generateWhatsAppMessage();

    // Check if Web Share API with files is supported
    if (ticketRef.current && navigator.canShare && navigator.share) {
      try {
        setIsGeneratingImage(true);
        const canvas = await html2canvas(ticketRef.current, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `fechamento_${day.dayOfWeek}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: `Fechamento Caixa - ${day.dayLabel}`,
                  text: text,
                });
                return;
              } catch (shareErr) {
                // User cancelled or share failed, fallback to whatsapp link
                handleOpenWhatsApp();
              }
            } else {
              // Fallback to text share
              await navigator.share({
                title: `Fechamento Caixa - ${day.dayLabel}`,
                text: text,
              });
            }
          } else {
            handleOpenWhatsApp();
          }
        }, 'image/png');
      } catch (err) {
        handleOpenWhatsApp();
      } finally {
        setIsGeneratingImage(false);
      }
    } else {
      // Direct WhatsApp text link fallback
      handleOpenWhatsApp();
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
                Print do Caixa & Enviar no WhatsApp
              </h2>
              <p className="text-xs text-emerald-100">
                {day.dayLabel} • {formattedDate} • Veículo: {sheet.vehiclePlate}
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
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar no WhatsApp</span>
            </button>

            {/* Download Print Image */}
            <button
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingImage ? 'Gerando Print...' : 'Baixar Imagem (Print)'}</span>
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
                <span>Copiar Texto Formatado</span>
              </>
            )}
          </button>
        </div>

        {/* Toast alerts */}
        {imageGeneratedToast && (
          <div className="bg-emerald-700 text-white px-4 py-2 text-xs text-center font-medium flex items-center justify-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
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
              <span>Comprovante em Imagem</span>
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
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Abrir WhatsApp e Enviar Mensagem</span>
                </button>
              </div>
            </div>
          ) : (
            /* IMAGE VIEW: The Print Card / Digital Ticket Container */
            <div className="max-w-xl mx-auto">
              <p className="text-xs text-slate-500 text-center mb-2.5">
                📸 Comprovante completo com <strong>{day.dayLabel.toUpperCase()}</strong> e <strong>TODAS AS {day.trips.length} VIAGENS</strong>:
              </p>

              <div 
                ref={ticketRef}
                className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-4 sm:p-6 text-slate-900 font-sans"
                style={{ width: '100%' }}
              >
                
                {/* Ticket Top Header */}
                <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
                  <div className="inline-flex items-center justify-center p-2 bg-blue-50 text-blue-800 rounded-xl mb-1">
                    <Car className="w-6 h-6 text-blue-700" />
                  </div>
                  <h3 className="text-base font-black tracking-wider uppercase text-slate-900">
                    COMPROVANTE DE FECHAMENTO DE CAIXA
                  </h3>
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    {sheet.companyRoute}
                  </p>
                  
                  {/* Big Prominent Day Banner */}
                  <div className="mt-3 bg-emerald-700 text-white py-2.5 px-3 rounded-xl shadow-xs">
                    <div className="text-[10px] font-bold tracking-widest text-emerald-200 uppercase">
                      FECHAMENTO DIÁRIO OFICIAL
                    </div>
                    <div className="text-lg sm:text-xl font-black tracking-wide uppercase">
                      {day.dayLabel} — {formattedDate}
                    </div>
                    <div className="text-xs text-emerald-100 font-mono mt-0.5 flex items-center justify-center gap-2 flex-wrap">
                      <span>PLACA: <strong>{sheet.vehiclePlate || 'BRA-2026'}</strong></span>
                      <span>•</span>
                      <span>SEMANA: <strong>{sheet.weekStartDate} a {sheet.weekEndDate}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Viagens Section: Complete Table of ALL Trips */}
                <div className="py-3 border-b border-slate-200">
                  <div className="flex items-center justify-between text-xs font-black text-slate-800 uppercase mb-2">
                    <span>TODAS AS VIAGENS DO DIA ({day.trips.length} VIAGENS)</span>
                    <span className="text-[10px] text-slate-500 font-medium">Valores em Reais (R$)</span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px]">
                          <th className="py-2 px-2.5 text-left font-bold text-slate-900">Viagem</th>
                          <th className="py-2 px-2 text-right font-bold">Ida</th>
                          <th className="py-2 px-2 text-right font-bold">Volta</th>
                          <th className="py-2 px-2 text-right font-bold">Enc.</th>
                          <th className="py-2 px-2 text-right font-bold text-blue-800 bg-blue-50/70">PIX</th>
                          <th className="py-2 px-2.5 text-right font-black text-slate-900 bg-slate-200/50">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {day.trips.map((t, idx) => {
                          const sub = calculateTripSubtotal(t);
                          return (
                            <tr key={t.id || idx} className="hover:bg-slate-50/80">
                              <td className="py-1.5 px-2.5 font-sans font-bold text-slate-900 whitespace-nowrap">
                                {t.tripName || `${idx + 1}ª Viagem`}
                              </td>
                              <td className="py-1.5 px-2 text-right text-slate-700">
                                {t.ida > 0 ? t.ida.toFixed(2) : '-'}
                              </td>
                              <td className="py-1.5 px-2 text-right text-slate-700">
                                {t.volta > 0 ? t.volta.toFixed(2) : '-'}
                              </td>
                              <td className="py-1.5 px-2 text-right text-slate-700">
                                {t.encom > 0 ? t.encom.toFixed(2) : '-'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold text-blue-700 bg-blue-50/40">
                                {t.pix > 0 ? t.pix.toFixed(2) : '-'}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-bold text-slate-950 bg-slate-50/60">
                                {formatCurrency(sub)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-slate-100 font-mono font-bold text-slate-900">
                          <td className="py-2 px-2.5 font-sans text-slate-900 uppercase text-[10px] font-black">
                            TOTAIS
                          </td>
                          <td className="py-2 px-2 text-right text-[11px] text-slate-800">{totals.totalIda.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-[11px] text-slate-800">{totals.totalVolta.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-[11px] text-slate-800">{totals.totalEncom.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-[11px] text-blue-800 bg-blue-100/50">{totals.totalPix.toFixed(2)}</td>
                          <td className="py-2 px-2.5 text-right text-xs font-black text-blue-950 bg-blue-50">
                            {formatCurrency(totals.totalArrecadado)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Payment Breakdown Cards */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-200">
                      <span className="text-[10px] text-blue-700 font-bold uppercase block">Recebido em PIX (Conta)</span>
                      <span className="font-mono font-black text-blue-950 text-sm">{formatCurrency(totals.totalPix)}</span>
                      <span className="text-[9px] text-blue-600 block mt-0.5">Transferido diretamente ao banco</span>
                    </div>
                    <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block">Recebido em Dinheiro</span>
                      <span className="font-mono font-black text-emerald-950 text-sm">{formatCurrency(totals.totalDinheiro)}</span>
                      <span className="text-[9px] text-emerald-600 block mt-0.5">Cédulas físicas recebidas</span>
                    </div>
                  </div>
                </div>

                {/* Despesas Section */}
                <div className="py-3 border-b border-slate-200">
                  <div className="flex items-center justify-between text-xs font-black text-slate-800 uppercase mb-2">
                    <span>Despesas Operacionais do Dia</span>
                    <span className="text-rose-700 font-mono font-black text-sm">{formatCurrency(totals.totalDespesas)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {day.expenses.map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100">
                        <span className="text-slate-600 font-medium text-[11px] truncate">{e.label}:</span>
                        <span className="font-mono font-bold text-rose-700 text-xs ml-1">
                          {formatCurrency(e.value || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sobra Líquida Geral */}
                <div className="py-2.5 border-b border-slate-200 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg my-2">
                  <div>
                    <span className="font-black text-slate-900 text-xs uppercase block">Sobra Líquida Geral</span>
                    <span className="text-[10px] text-slate-500">(Total Arrecadado - Total Despesas)</span>
                  </div>
                  <span className={`text-base font-black font-mono ${isPositiveLiquida ? 'text-blue-900' : 'text-rose-600'}`}>
                    {formatCurrency(totals.sobraLiquida)}
                  </span>
                </div>

                {/* HIGHLIGHT FINAL: SOBRA REAL EM DINHEIRO EM ESPÉCIE */}
                <div className="mt-3 p-4 rounded-2xl bg-emerald-700 text-white border-2 border-emerald-800 shadow-xs text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Wallet className="w-5 h-5 text-emerald-200" />
                    <span className="text-xs uppercase font-black tracking-wider text-emerald-100">
                      SOBRA REAL EM DINHEIRO (ESPÉCIE NO CAIXA)
                    </span>
                  </div>
                  
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight my-1 text-white">
                    {formatCurrency(totals.sobraDinheiroEspecie)}
                  </div>

                  <div className="text-[11px] font-medium text-emerald-100 bg-emerald-800/90 py-1 px-3 rounded-full inline-block mt-1">
                    Fórmula: Sobra Líquida ({formatCurrency(totals.sobraLiquida)}) — Total PIX ({formatCurrency(totals.totalPix)})
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-emerald-100 mt-2 font-medium leading-relaxed">
                    💵 Este é o valor exato em dinheiro físico (cédulas/moedas) que deve ser entregue na prestação de contas de <strong>{day.dayLabel}</strong>.
                  </p>
                </div>

                {/* Ticket Footer Verification */}
                <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-300 text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-800 text-xs font-bold mb-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Fechamento Conferido & Aprovado</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="hidden sm:inline">
            Clique em <strong>Compartilhar no WhatsApp</strong> para enviar diretamente ao proprietário ou responsável financeiro.
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

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Share2, 
  Download, 
  Camera, 
  Check, 
  Edit3, 
  Image as ImageIcon,
  ExternalLink,
  ZoomIn,
  Eye,
  CheckCircle2,
  Banknote,
  Receipt
} from 'lucide-react';
import { DayRecord, WeeklySheet, Driver, ExpenseRecord } from '../types';
import { 
  calculateDayTotals, 
  calculateTripSubtotal, 
  formatCurrency, 
  formatDatePtBR 
} from '../utils/calculations';
import { generateTicketCanvas } from '../utils/ticketCanvas';
import { downloadTicketPdf } from '../utils/ticketPdf';

interface PhotoItem {
  sheetId: string;
  sheetRoute: string;
  dayId: string;
  dayIndex: number;
  dayLabel: string;
  date: string;
  expenseId: string;
  expenseLabel: string;
  expenseCategory: string;
  expenseValue: number;
  receiptImage: string;
  receiptName?: string;
}

interface DayCashTicketCardProps {
  day: DayRecord;
  dayIndex: number;
  sheet: WeeklySheet;
  driver?: Driver;
  onOpenPhotoZoom?: (photo: PhotoItem) => void;
  onOpenDayInEditor?: (sheetId: string, dayIndex: number) => void;
  onCloseModal?: () => void;
}

export const DayCashTicketCard: React.FC<DayCashTicketCardProps> = ({
  day,
  dayIndex,
  sheet,
  driver,
  onOpenPhotoZoom,
  onOpenDayInEditor,
  onCloseModal,
}) => {
  const [showCanvasImage, setShowCanvasImage] = useState(false);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const totals = calculateDayTotals(day);
  const formattedDate = formatDatePtBR(day.date);

  // Lazy generate canvas image if user wants to inspect exact PNG
  useEffect(() => {
    if (showCanvasImage && !canvasDataUrl) {
      try {
        const canvas = generateTicketCanvas(day, sheet);
        setCanvasDataUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Erro ao gerar imagem canvas:', err);
      }
    }
  }, [showCanvasImage, canvasDataUrl, day, sheet]);

  // Mensagem oficial formatada para o WhatsApp
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
      .map((e) => `   • *${e.label}:* ${formatCurrency(e.value || 0)}${e.receiptImage ? ' 📷 [Comprovante Foto Anexo]' : ''}`)
      .join('\n');

    const driverName = day.driverName || driver?.name || 'Jailson Francelino';
    const driverInfoLine = `👤 *MOTORISTA:* ${driverName.toUpperCase()}${day.vehiclePlate ? ` • 🚘 *PLACA:* ${day.vehiclePlate.toUpperCase()}` : ''}\n`;

    return `🚌 *COMPROVANTE DE FECHAMENTO DE CAIXA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *LINHA:* ${sheet.companyRoute}
📅 *DIA:* ${day.dayLabel.toUpperCase()}
🗓️ *DATA:* ${formattedDate}
${driverInfoLine}━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚍 *DETALHAMENTO DE TODAS AS VIAGENS (${day.trips.length} VIAGENS):*
${tripsText || '   • Nenhuma viagem cadastrada'}

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

  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      downloadTicketPdf(day, sheet);
      setActionToast('PDF do comprovante gerado com sucesso!');
      setTimeout(() => setActionToast(null), 3000);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Houve um erro ao baixar o PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadImage = () => {
    try {
      setIsGeneratingImage(true);
      const canvas = generateTicketCanvas(day, sheet);
      const dataUrl = canvas.toDataURL('image/png');
      const safeDate = day.date.replace(/[^a-zA-Z0-9]/g, '-');
      const safeDay = day.dayLabel.split('—')[0].trim().replace(/\s+/g, '_');
      const filename = `Fechamento_Caixa_${safeDay}_${safeDate}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setActionToast('Imagem PNG baixada com sucesso!');
      setTimeout(() => setActionToast(null), 3000);
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
      alert('Houve um erro ao gerar a imagem.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const activeDriverName = day.driverName || driver?.name || 'Jailson Francelino';

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden transition-all my-4">
      {/* Toast Feedback */}
      {actionToast && (
        <div className="bg-emerald-800 text-white text-xs font-bold px-4 py-2 text-center animate-in fade-in flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Título e Ações Rápidas do Topo */}
      <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider">
            Comprovante Oficial
          </span>
          <span className="font-bold text-sm text-slate-100">
            {day.dayLabel.split('—')[0]}
          </span>
          <span className="text-slate-400 text-xs font-mono">
            ({formattedDate})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Alternar Visualização: Ticket Formatado vs Imagem Gerada */}
          <button
            type="button"
            onClick={() => setShowCanvasImage(!showCanvasImage)}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer border ${
              showCanvasImage 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Alternar entre visualização formatada e a imagem gerada exata"
          >
            {showCanvasImage ? <Eye className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
            <span>{showCanvasImage ? 'Ver Ticket Normal' : 'Ver Imagem PNG'}</span>
          </button>

          {onOpenDayInEditor && (
            <button
              type="button"
              onClick={() => {
                onOpenDayInEditor(sheet.id, dayIndex);
                if (onCloseModal) onCloseModal();
              }}
              className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Abrir dia na ficha do motorista para editar"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar Ficha</span>
            </button>
          )}
        </div>
      </div>

      {/* CASO O USUÁRIO DESEJE VER DIRETAMENTE A IMAGEM EXATA GERADA PELO CANVAS */}
      {showCanvasImage && (
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-col items-center">
          <p className="text-xs text-slate-600 mb-2 font-medium">
            Visualizando a imagem original gerada para WhatsApp e impressão:
          </p>
          {canvasDataUrl ? (
            <div className="relative group max-w-full rounded-lg overflow-hidden border border-slate-300 shadow-sm bg-white">
              <img
                src={canvasDataUrl}
                alt="Comprovante de Fechamento de Caixa"
                className="max-h-[600px] w-auto object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              Gerando imagem em alta resolução...
            </div>
          )}
        </div>
      )}

      {/* CORPO DO COMPROVANTE: EXATAMENTE O DESIGN DA IMAGEM DE FECHAMENTO */}
      <div className="p-5 sm:p-6 space-y-4 bg-white text-slate-800">
        
        {/* 1. CABEÇALHO DO COMPROVANTE */}
        <div className="text-center space-y-1">
          <p className="text-blue-900 font-bold text-xs uppercase tracking-wider">
            {sheet.companyRoute}
          </p>
          <h3 className="text-slate-900 font-black text-base sm:text-lg tracking-tight uppercase">
            COMPROVANTE DE FECHAMENTO DE CAIXA
          </h3>

          {/* Banner do Dia em Verde Esmeralda (Igual à imagem) */}
          <div className="mt-2 bg-emerald-700 text-white rounded-xl py-2.5 px-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200 block">
              FECHAMENTO DIÁRIO OFICIAL
            </span>
            <span className="text-base sm:text-lg font-black tracking-wide block uppercase mt-0.5">
              {day.dayLabel} — {formattedDate}
            </span>
          </div>

          {/* Motorista e Placa */}
          <div className="pt-2 flex items-center justify-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
            <span className="flex items-center gap-1">
              <span>👤</span>
              <span>MOTORISTA:</span>
              <strong className="text-slate-900">{activeDriverName.toUpperCase()}</strong>
            </span>
            {day.vehiclePlate && (
              <span className="flex items-center gap-1 font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                <span>🚗</span>
                <span>PLACA:</span>
                <strong>{day.vehiclePlate.toUpperCase()}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Linha tracejada separadora */}
        <div className="border-b-2 border-dashed border-slate-300 my-2" />

        {/* 2. TABELA DE TODAS AS VIAGENS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              DETALHAMENTO DE TODAS AS VIAGENS ({day.trips.length} VIAGENS)
            </h4>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Valores em Reais (R$)
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2 px-3">VIAGEM</th>
                  <th className="py-2 px-2 text-right">IDA</th>
                  <th className="py-2 px-2 text-right">VOLTA</th>
                  <th className="py-2 px-2 text-right">ENCOM.</th>
                  <th className="py-2 px-2 text-right text-blue-700 bg-blue-50/50">PIX</th>
                  <th className="py-2 px-3 text-right font-black text-slate-900">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {day.trips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 text-center text-slate-400 italic">
                      Nenhuma viagem lançada neste dia.
                    </td>
                  </tr>
                ) : (
                  day.trips.map((trip, idx) => {
                    const sub = calculateTripSubtotal(trip);
                    return (
                      <tr 
                        key={trip.id || idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                      >
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {trip.tripName || `${idx + 1}ª Viagem`}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-700">
                          {trip.ida > 0 ? formatCurrency(trip.ida) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-700">
                          {trip.volta > 0 ? formatCurrency(trip.volta) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-700">
                          {trip.encom > 0 ? formatCurrency(trip.encom) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                          {trip.pix > 0 ? formatCurrency(trip.pix) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                          {formatCurrency(sub)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200/90 text-slate-900 font-bold border-t-2 border-slate-300">
                  <td className="py-2.5 px-3 font-black text-xs uppercase">
                    TOTAIS
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {formatCurrency(totals.totalIda)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {formatCurrency(totals.totalVolta)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {formatCurrency(totals.totalEncom)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-blue-800 font-bold bg-blue-100/50">
                    {formatCurrency(totals.totalPix)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 text-sm">
                    {formatCurrency(totals.totalArrecadado)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 3. BLOCO DE REPARTIÇÃO: TOTAL PIX vs TOTAL DINHEIRO (Igual à imagem) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          
          {/* Box PIX */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
              TOTAL EM PIX (CONTA BANCÁRIA)
            </span>
            <span className="text-xl font-black font-mono text-blue-900 mt-1">
              {formatCurrency(totals.totalPix)}
            </span>
            <span className="text-[10px] text-blue-600 mt-0.5 font-medium">
              Caiu direto na conta bancária digital
            </span>
          </div>

          {/* Box Dinheiro Entrada */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
              TOTAL RECEBIDO EM DINHEIRO
            </span>
            <span className="text-xl font-black font-mono text-emerald-900 mt-1">
              {formatCurrency(totals.totalDinheiro)}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 font-medium">
              Cédulas físicas recebidas no veículo
            </span>
          </div>

        </div>

        {/* Linha tracejada separadora */}
        <div className="border-b-2 border-dashed border-slate-300 my-2" />

        {/* 4. DESPESAS OPERACIONAIS DO DIA */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>⛽</span>
              <span>DESPESAS OPERACIONAIS DO DIA</span>
            </h4>
            <span className="text-xs font-black font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              TOTAL: {formatCurrency(totals.totalDespesas)}
            </span>
          </div>

          {day.expenses.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
              Nenhuma despesa registrada neste dia.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {day.expenses.map((exp) => {
                const hasPic = Boolean(exp.receiptImage);
                return (
                  <div
                    key={exp.id}
                    className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Receipt className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {exp.label}:
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasPic && exp.receiptImage && onOpenPhotoZoom && (
                        <button
                          type="button"
                          onClick={() => onOpenPhotoZoom({
                            sheetId: sheet.id,
                            sheetRoute: sheet.companyRoute,
                            dayId: day.id,
                            dayIndex,
                            dayLabel: day.dayLabel,
                            date: day.date,
                            expenseId: exp.id,
                            expenseLabel: exp.label,
                            expenseCategory: exp.category,
                            expenseValue: exp.value || 0,
                            receiptImage: exp.receiptImage!,
                            receiptName: exp.receiptName,
                          })}
                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="Ver foto do comprovante anexado"
                        >
                          <Camera className="w-3 h-3 text-emerald-700" />
                          <span>Ver Foto</span>
                        </button>
                      )}

                      <span className="font-mono font-bold text-xs text-rose-700">
                        {formatCurrency(exp.value || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Linha tracejada separadora */}
        <div className="border-b-2 border-dashed border-slate-300 my-2" />

        {/* 5. SOBRA LÍQUIDA GERAL */}
        <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              SOBRA LÍQUIDA GERAL
            </span>
            <span className="text-[10px] text-slate-500 block">
              Arrecadação Bruta menos Despesas Operacionais
            </span>
          </div>
          <span className="text-base sm:text-lg font-black font-mono text-blue-900">
            {formatCurrency(totals.sobraLiquida)}
          </span>
        </div>

        {/* 6. DESTAQUE MÁXIMO: SOBRA REAL EM DINHEIRO (ESPÉCIE NO CAIXA) (IDÊNTICO À IMAGEM) */}
        <div className="bg-emerald-700 text-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-800 shadow-md text-center">
          <span className="text-[11px] font-black tracking-wider uppercase text-emerald-200 block">
            ⭐ SOBRA REAL EM DINHEIRO (ESPÉCIE NO CAIXA)
          </span>

          <span className="text-2xl sm:text-3xl font-black font-mono block text-white my-1.5 tracking-tight">
            {formatCurrency(totals.sobraDinheiroEspecie)}
          </span>

          <div className="inline-block bg-emerald-800/90 text-emerald-100 font-bold text-[10px] sm:text-[11px] px-3 py-1 rounded-full border border-emerald-600/50 mt-1">
            Fórmula: Sobra Líquida ({formatCurrency(totals.sobraLiquida)}) — Total PIX ({formatCurrency(totals.totalPix)})
          </div>

          <p className="text-[10px] text-emerald-200 italic mt-2">
            💵 Este é o valor exato em cédulas físicas que deve estar no caixa em mãos para prestar contas.
          </p>
        </div>

        {/* 7. RODAPÉ DE VALIDAÇÃO */}
        <div className="text-center pt-2 pb-1 text-slate-500 text-xs">
          <p className="font-bold text-emerald-700 flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Fechamento Conferido e Aprovado</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Documento de fechamento diário de caixa
          </p>
        </div>

      </div>

      {/* 8. BARRA DE BOTÕES DE AÇÃO NA BASE DO COMPROVANTE */}
      <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Enviar no WhatsApp */}
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Enviar este fechamento completo pelo WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Enviar no WhatsApp</span>
          </button>

          {/* Baixar Imagem */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isGeneratingImage}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title="Baixar imagem PNG idêntica"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{isGeneratingImage ? 'Gerando...' : 'Baixar Imagem'}</span>
          </button>

          {/* Baixar PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title="Baixar comprovante oficial em PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-500">
          Caixa: <strong className={totals.sobraDinheiroEspecie >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatCurrency(totals.sobraDinheiroEspecie)}</strong>
        </span>
      </div>

    </div>
  );
};

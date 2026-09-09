import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Fuel, 
  Users, 
  Package, 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle,
  Printer,
  Download,
  Calendar,
  Share2,
  MessageSquare,
  Banknote,
  FileText,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { DayRecord, WeeklySheet } from '../types';
import { calculateWeeklyTotals, formatCurrency, formatDatePtBR } from '../utils/calculations';
import { CashPrintModal } from './CashPrintModal';
import { WeeklyPrintModal } from './WeeklyPrintModal';
import { downloadWeeklySummaryPdf } from '../utils/weeklyPdf';
import { generateWeeklySummaryCanvas } from '../utils/weeklyCanvas';

interface WeeklySummaryProps {
  sheet: WeeklySheet;
  onPrint: () => void;
  onExportCsv: () => void;
  onNavigateToDay?: (dayIndex: number) => void;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({
  sheet,
  onPrint,
  onExportCsv,
  onNavigateToDay,
}) => {
  const [printModalDay, setPrintModalDay] = useState<{ day: DayRecord; idx: number } | null>(null);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const weekly = calculateWeeklyTotals(sheet);

  const handleDownloadPdf = () => {
    try {
      setIsDownloadingPdf(true);
      downloadWeeklySummaryPdf(sheet);
      setActionToast('Resumo Semanal em PDF baixado com sucesso!');
      setTimeout(() => setActionToast(null), 3500);
    } catch (err) {
      console.error('Erro ao baixar PDF semanal:', err);
      alert('Houve um erro ao gerar o PDF. Você pode visualizar e baixar no botão WhatsApp/Comprovante.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = () => {
    try {
      setIsDownloadingImage(true);
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

      setActionToast('Imagem do Resumo Semanal baixada com sucesso!');
      setTimeout(() => setActionToast(null), 3500);
    } catch (err) {
      console.error('Erro ao baixar imagem semanal:', err);
      alert('Houve um erro ao baixar a imagem.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const pixPercentage = weekly.totalArrecadacao > 0
    ? (weekly.totalPix / weekly.totalArrecadacao) * 100
    : 0;
  
  const dinheiroPercentage = weekly.totalArrecadacao > 0
    ? (weekly.totalDinheiro / weekly.totalArrecadacao) * 100
    : 0;

  const isProfitable = weekly.totalSobraLiquida >= 0;
  const isCashProfitable = weekly.totalSobraDinheiroEspecie >= 0;

  return (
    <div className="space-y-6">

      {/* Action Toast Feedback */}
      {actionToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 shadow-sm animate-in fade-in duration-150">
          <Check className="w-4 h-4" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Executive Quick Download & Share Bar */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-blue-700/80 text-blue-200 px-2.5 py-1 rounded-md">
            EXPORTAÇÃO OFICIAL DO FECHAMENTO SEMANAL
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1">
            Baixar Comprovante Consolidado da Semana
          </h3>
          <p className="text-xs text-blue-200 mt-0.5">
            Semana completa de {formatDatePtBR(sheet.startDate)} a {formatDatePtBR(sheet.endDate)} pronta para envio e arquivamento
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          {/* Main PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer min-h-[42px] disabled:opacity-50"
            title="Baixar Resumo Semanal em documento PDF (formato A4 oficial)"
          >
            <FileText className="w-4 h-4 text-red-200" />
            <span>{isDownloadingPdf ? 'Gerando PDF...' : 'Baixar em PDF'}</span>
          </button>

          {/* Download Image Button */}
          <button
            onClick={handleDownloadImage}
            disabled={isDownloadingImage}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/20 font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[42px] disabled:opacity-50"
            title="Baixar Resumo Semanal em formato de imagem PNG em alta resolução"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>{isDownloadingImage ? 'Baixando...' : 'Baixar Imagem (PNG)'}</span>
          </button>

          {/* WhatsApp & Preview Modal */}
          <button
            onClick={() => setIsWeeklyModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer min-h-[42px]"
            title="Abrir visualização completa, copiar imagem e compartilhar no WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>
      
      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Arrecadado */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Arrecadação Total
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatCurrency(weekly.totalArrecadacao)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Receita bruta ({weekly.tripsCount} viagens registradas)
          </p>
        </div>

        {/* Total Despesas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Despesas Operacionais
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600 font-mono tracking-tight">
              {formatCurrency(weekly.totalDespesas)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Combustível + Diárias + Manutenção
          </p>
        </div>

        {/* Sobra Líquida (Lucro Geral) */}
        <div className={`rounded-xl p-5 border shadow-xs ${
          isProfitable
            ? 'bg-blue-900 text-white border-blue-950'
            : 'bg-rose-700 text-white border-rose-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">
              Sobra Líquida Geral
            </span>
            <div className="p-2 rounded-lg bg-white/20 text-white">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight">
              {formatCurrency(weekly.totalSobraLiquida)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs opacity-90">
            <span>Margem de Lucro:</span>
            <span className="font-bold font-mono">{weekly.margemLucroPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* HIGHLIGHT: TOTAL SOBRA REAL EM DINHEIRO EM ESPÉCIE */}
        <div className={`rounded-xl p-5 border-2 shadow-xs ${
          isCashProfitable
            ? 'bg-emerald-700 text-white border-emerald-800'
            : 'bg-rose-600 text-white border-rose-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-100">
              SOBRA EM ESPÉCIE (CAIXA)
            </span>
            <div className="p-2 rounded-lg bg-emerald-800 text-emerald-200">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {formatCurrency(weekly.totalSobraDinheiroEspecie)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">
            Sobra Líquida menos Total Pix (Dinheiro físico total em mãos)
          </p>
        </div>

        {/* Forma de Recebimento: Dinheiro vs Pix */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Composição do Caixa
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                Dinheiro ({dinheiroPercentage.toFixed(0)}%):
              </span>
              <span className="font-mono font-bold text-slate-800">
                {formatCurrency(weekly.totalDinheiro)}
              </span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-blue-700 flex items-center gap-1 font-semibold">
                PIX ({pixPercentage.toFixed(0)}%):
              </span>
              <span className="font-mono font-bold text-blue-900">
                {formatCurrency(weekly.totalPix)}
              </span>
            </div>
            
            {/* Visual ratio bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex mt-2">
              <div 
                style={{ width: `${dinheiroPercentage}%` }} 
                className="bg-emerald-500 h-full" 
                title={`Dinheiro: ${dinheiroPercentage.toFixed(1)}%`}
              />
              <div 
                style={{ width: `${pixPercentage}%` }} 
                className="bg-blue-600 h-full" 
                title={`Pix: ${pixPercentage.toFixed(1)}%`}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-2">
            Dinheiro no caixa vs transferências em conta
          </p>
        </div>

      </div>

      {/* Main Table: Exact layout of Page 2 of the PDF */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Header Banner */}
        <div className="bg-blue-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                RESUMO DO FECHAMENTO SEMANAL (SEGUNDA A DOMINGO)
              </h2>
              <p className="text-xs text-blue-200">
                {sheet.companyRoute} • Semana: {formatDatePtBR(sheet.startDate)} a {formatDatePtBR(sheet.endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar Resumo Semanal em documento PDF oficial"
            >
              <FileText className="w-3.5 h-3.5 text-red-200" />
              <span>{isDownloadingPdf ? 'Gerando...' : 'Baixar em PDF'}</span>
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={isDownloadingImage}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar Resumo Semanal em formato de imagem PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Imagem</span>
            </button>
            <button
              onClick={() => setIsWeeklyModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Visualizar e Enviar Resumo no WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-800 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg border border-blue-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Table matching Page 2 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase text-xs font-bold border-b border-slate-200 text-center">
                <th className="py-3.5 px-4 text-left font-bold text-slate-800 w-44">
                  DIA DA SEMANA
                </th>
                <th className="py-3.5 px-2.5 text-right">
                  ARRECADAÇÃO (R$)
                </th>
                <th className="py-3.5 px-2.5 text-right text-rose-700">
                  DESPESAS (R$)
                </th>
                <th className="py-3.5 px-2.5 text-right text-emerald-700">
                  DINHEIRO (R$)
                </th>
                <th className="py-3.5 px-2.5 text-right text-blue-700 bg-blue-50/50 border-x border-blue-200 font-bold">
                  PIX (R$)
                </th>
                <th className="py-3.5 px-3 text-right font-bold text-slate-800 bg-slate-50">
                  SOBRA LÍQUIDA (R$)
                </th>
                <th className="py-3.5 px-3 text-right font-extrabold text-emerald-900 bg-emerald-50/70 border-l border-emerald-100">
                  SOBRA ESPÉCIE (R$)
                </th>
                <th className="py-3.5 px-3 text-center w-28">
                  PRINT / WHATSAPP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {weekly.daysSummary.map((day, idx) => {
                const isDayProfitable = day.sobraLiquida >= 0;
                const isDayCashProfitable = day.sobraDinheiroEspecie >= 0;
                return (
                  <tr 
                    key={day.dayOfWeek}
                    onClick={() => onNavigateToDay && onNavigateToDay(idx)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    title="Clique para editar este dia"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center justify-between">
                      <span className="group-hover:text-blue-700 transition-colors">
                        {day.dayLabel}
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">
                        {formatDatePtBR(day.date)}
                      </span>
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono font-medium text-slate-800">
                      {formatCurrency(day.arrecadacao)}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono font-medium text-rose-600">
                      {formatCurrency(day.despesas)}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono font-medium text-emerald-700">
                      {formatCurrency(day.dinheiro)}
                    </td>
                    <td className="py-3.5 px-2.5 text-right font-mono font-medium text-blue-900 bg-blue-50/30 border-x border-blue-100">
                      {formatCurrency(day.pix)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        isDayProfitable 
                          ? 'text-slate-900 bg-slate-100' 
                          : 'text-rose-700 bg-rose-50'
                      }`}>
                        {formatCurrency(day.sobraLiquida)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-black bg-emerald-50/40 border-l border-emerald-100">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        isDayCashProfitable 
                          ? 'text-emerald-800 bg-emerald-100/80 font-extrabold' 
                          : 'text-rose-800 bg-rose-100/80'
                      }`}>
                        {formatCurrency(day.sobraDinheiroEspecie)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetDay = sheet.days[idx];
                          if (targetDay) {
                            setPrintModalDay({ day: targetDay, idx });
                          }
                        }}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        title="Enviar Print do Caixa no WhatsApp"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-sm sm:text-base border-t-2 border-slate-900">
                <td className="py-4 px-4 uppercase tracking-wider text-amber-400 font-extrabold">
                  TOTAL DA SEMANA
                </td>
                <td className="py-4 px-2.5 text-right font-mono text-sm">
                  {formatCurrency(weekly.totalArrecadacao)}
                </td>
                <td className="py-4 px-2.5 text-right font-mono text-rose-300 text-sm">
                  {formatCurrency(weekly.totalDespesas)}
                </td>
                <td className="py-4 px-2.5 text-right font-mono text-emerald-300 text-sm">
                  {formatCurrency(weekly.totalDinheiro)}
                </td>
                <td className="py-4 px-2.5 text-right font-mono text-blue-300 bg-slate-800 border-x border-slate-700 text-sm">
                  {formatCurrency(weekly.totalPix)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-slate-100 bg-slate-950 font-bold text-base">
                  {formatCurrency(weekly.totalSobraLiquida)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-emerald-300 bg-emerald-950/80 font-black text-lg border-l border-emerald-900">
                  {formatCurrency(weekly.totalSobraDinheiroEspecie)}
                </td>
                <td className="py-4 px-3 text-center bg-slate-900 text-xs text-slate-400">
                  7 dias
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer instruction note matching Page 2 verbatim */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">* Instrução de preenchimento:</span> Anote os valores de Pix de cada viagem na coluna destacada. O Subtotal de cada viagem inclui (Ida + Volta + Encomenda). A Sobra Líquida diária é obtida subtraindo as Despesas do Total Arrecadado.
          </div>
        </div>

      </div>

      {/* Secondary Operational Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Detalhamento de Receitas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-blue-600" />
            <span>Origem das Receitas da Semana</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Passagens - Viagens de Ida</span>
                <span className="font-mono text-slate-900">{formatCurrency(weekly.totalIda)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  style={{ width: `${weekly.totalArrecadacao > 0 ? (weekly.totalIda / weekly.totalArrecadacao) * 100 : 0}%` }}
                  className="bg-blue-600 h-full rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Passagens - Viagens de Volta</span>
                <span className="font-mono text-slate-900">{formatCurrency(weekly.totalVolta)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  style={{ width: `${weekly.totalArrecadacao > 0 ? (weekly.totalVolta / weekly.totalArrecadacao) * 100 : 0}%` }}
                  className="bg-indigo-600 h-full rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Encomendas & Fretes</span>
                <span className="font-mono text-amber-700">{formatCurrency(weekly.totalEncomendas)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  style={{ width: `${weekly.totalArrecadacao > 0 ? (weekly.totalEncomendas / weekly.totalArrecadacao) * 100 : 0}%` }}
                  className="bg-amber-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detalhamento de Despesas Operacionais */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Fuel className="w-4 h-4 text-rose-600" />
            <span>Detalhamento dos Custos da Semana</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Combustível (Diesel / Gasolina)</span>
                <span className="font-mono text-rose-700">{formatCurrency(weekly.totalCombustivel)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  style={{ width: `${weekly.totalDespesas > 0 ? (weekly.totalCombustivel / weekly.totalDespesas) * 100 : 0}%` }}
                  className="bg-rose-500 h-full rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Diárias de Motoristas</span>
                <span className="font-mono text-blue-700">{formatCurrency(weekly.totalMotorista)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  style={{ width: `${weekly.totalDespesas > 0 ? (weekly.totalMotorista / weekly.totalDespesas) * 100 : 0}%` }}
                  className="bg-blue-600 h-full rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Diárias de Cobradores</span>
                <span className="font-mono text-emerald-700">{formatCurrency(weekly.totalCobrador)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  style={{ width: `${weekly.totalDespesas > 0 ? (weekly.totalCobrador / weekly.totalDespesas) * 100 : 0}%` }}
                  className="bg-emerald-600 h-full rounded-full"
                />
              </div>
            </div>

            {weekly.totalOutrasDespesas > 0 && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Outras Despesas (Manutenção / Pedágio)</span>
                  <span className="font-mono text-slate-700">{formatCurrency(weekly.totalOutrasDespesas)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    style={{ width: `${weekly.totalDespesas > 0 ? (weekly.totalOutrasDespesas / weekly.totalDespesas) * 100 : 0}%` }}
                    className="bg-slate-500 h-full rounded-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* WhatsApp & Cash Print Modal */}
      {printModalDay && (
        <CashPrintModal
          isOpen={!!printModalDay}
          onClose={() => setPrintModalDay(null)}
          sheet={sheet}
          day={printModalDay.day}
          dayIndex={printModalDay.idx}
        />
      )}

      {/* Weekly Consolidated Print & Share Modal */}
      {isWeeklyModalOpen && (
        <WeeklyPrintModal
          isOpen={isWeeklyModalOpen}
          onClose={() => setIsWeeklyModalOpen(false)}
          sheet={sheet}
        />
      )}

    </div>
  );
};

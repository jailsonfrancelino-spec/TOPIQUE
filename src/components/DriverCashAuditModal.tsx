import React, { useState, useMemo } from 'react';
import { 
  X, 
  Wallet, 
  Receipt, 
  Camera, 
  Calendar, 
  Download, 
  Eye, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Car, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronRight,
  User,
  ShieldCheck,
  Edit3,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Driver, WeeklySheet, DayRecord, ExpenseRecord, TripRecord } from '../types';
import { calculateTripSubtotal, formatCurrency, formatDatePtBR } from '../utils/calculations';
import { DayCashTicketCard } from './DayCashTicketCard';

interface DriverCashAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  currentSheet: WeeklySheet;
  allSheets: WeeklySheet[];
  onOpenDayInEditor?: (sheetId: string, dayIndex: number) => void;
  onOpenReceiptUpload?: (dayId: string, expense: ExpenseRecord, dayLabel: string) => void;
}

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

export const DriverCashAuditModal: React.FC<DriverCashAuditModalProps> = ({
  isOpen,
  onClose,
  driver,
  currentSheet,
  allSheets,
  onOpenDayInEditor,
  onOpenReceiptUpload,
}) => {
  // Seleção de semana para auditoria (padrão é a semana ativa)
  const [selectedSheetId, setSelectedSheetId] = useState<string>(currentSheet.id);
  const [activeSubTab, setActiveSubTab] = useState<'caixa' | 'fotos' | 'dias'>('caixa');
  
  // Estado para visualização da foto em tela cheia com zoom
  const [zoomedPhoto, setZoomedPhoto] = useState<PhotoItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Planilha selecionada para a auditoria
  const activeSheet = useMemo(() => {
    return allSheets.find((s) => s.id === selectedSheetId) || currentSheet;
  }, [allSheets, selectedSheetId, currentSheet]);

  // Dias operados por este motorista nesta planilha
  // Considera tanto se o day.driverId for do motorista OU se o day.driverName bater OU se a semana inteira for dele
  const driverDays = useMemo(() => {
    return activeSheet.days
      .map((day, idx) => ({ day, idx }))
      .filter(({ day }) => {
        if (day.driverId === driver.id) return true;
        if (day.driverName && day.driverName.toLowerCase().includes(driver.name.toLowerCase())) return true;
        // Se alguma viagem dentro do dia foi marcada especificamente com este motorista
        if (day.trips.some((t) => t.driverId === driver.id)) return true;
        return false;
      });
  }, [activeSheet, driver]);

  // Se nenhum dia foi vinculado especificamente, mas o motorista opera na rota ativa
  const effectiveDays = useMemo(() => {
    if (driverDays.length > 0) return driverDays;
    // Se não há dias vinculados explicitamente, mostra todos os dias da semana para o admin poder inspecionar e vincular
    return activeSheet.days.map((day, idx) => ({ day, idx }));
  }, [driverDays, activeSheet]);

  // Cálculo dos totais do motorista nesta semana
  const totals = useMemo(() => {
    let totalArrecadado = 0;
    let totalPix = 0;
    let totalDespesas = 0;
    let totalViagensCount = 0;
    let fotosCount = 0;

    effectiveDays.forEach(({ day }) => {
      // Viagens
      day.trips.forEach((trip) => {
        const sub = calculateTripSubtotal(trip);
        totalArrecadado += sub;
        totalPix += Number(trip.pix) || 0;
        if (sub > 0) totalViagensCount++;
      });

      // Despesas
      day.expenses.forEach((exp) => {
        totalDespesas += Number(exp.value) || 0;
        if (exp.receiptImage) fotosCount++;
      });
    });

    const totalDinheiroArrecadado = Math.max(0, totalArrecadado - totalPix);
    const sobraLiquida = totalArrecadado - totalDespesas;
    // Dinheiro físico que deve estar em mãos com o motorista para prestar contas
    const sobraDinheiroEspecie = sobraLiquida - totalPix;

    return {
      totalArrecadado,
      totalPix,
      totalDespesas,
      totalDinheiroArrecadado,
      sobraLiquida,
      sobraDinheiroEspecie,
      totalViagensCount,
      fotosCount,
    };
  }, [effectiveDays]);

  // Lista de todas as fotos de comprovantes coletadas nos dias do motorista
  const allDriverPhotos = useMemo<PhotoItem[]>(() => {
    const photos: PhotoItem[] = [];

    // Busca na semana selecionada
    effectiveDays.forEach(({ day, idx }) => {
      day.expenses.forEach((exp) => {
        if (exp.receiptImage) {
          photos.push({
            sheetId: activeSheet.id,
            sheetRoute: activeSheet.companyRoute,
            dayId: day.id,
            dayIndex: idx,
            dayLabel: day.dayLabel,
            date: day.date,
            expenseId: exp.id,
            expenseLabel: exp.label,
            expenseCategory: exp.category,
            expenseValue: exp.value,
            receiptImage: exp.receiptImage,
            receiptName: exp.receiptName,
          });
        }
      });
    });

    return photos;
  }, [effectiveDays, activeSheet]);

  // Estado para filtrar dia na aba de Lançamentos Dia a Dia (null = todos)
  const [selectedDayFilterIndex, setSelectedDayFilterIndex] = useState<number | null>(null);

  // Resumo oficial linha a linha por dia da semana (Segunda a Domingo)
  const dailySummary = useMemo(() => {
    // Verifica se este motorista tem dias explicitamente vinculados nesta planilha
    const hasExplicitDays = activeSheet.days.some((d) => 
      d.driverId === driver.id || 
      (d.driverName && d.driverName.toLowerCase().includes(driver.name.toLowerCase())) ||
      d.trips.some((t) => t.driverId === driver.id)
    );

    return activeSheet.days.map((day, dayIndex) => {
      // Se há dias vinculados explicitamente a este motorista, verifica se este dia é dele
      const isDayOfDriver = 
        day.driverId === driver.id ||
        (day.driverName && day.driverName.toLowerCase().includes(driver.name.toLowerCase())) ||
        day.trips.some((t) => t.driverId === driver.id);

      // Se não há vínculo explícito nenhum na semana, audita todos os dias para o Admin não ver tudo zerado
      const shouldInclude = hasExplicitDays ? isDayOfDriver : true;

      let valorIda = 0;
      let valorVolta = 0;
      let valorEncom = 0;
      let valorPix = 0;
      let tripsCount = 0;

      if (shouldInclude) {
        day.trips.forEach((trip) => {
          // Se a viagem específica for de outro motorista diferente, não soma
          if (hasExplicitDays && trip.driverId && trip.driverId !== driver.id) {
            return;
          }
          const ida = Number(trip.ida) || 0;
          const volta = Number(trip.volta) || 0;
          const encom = Number(trip.encom) || 0;
          const pix = Number(trip.pix) || 0;
          valorIda += ida;
          valorVolta += volta;
          valorEncom += encom;
          valorPix += pix;
          if (ida + volta + encom > 0) tripsCount++;
        });
      }

      let totalDespesa = 0;
      const dayPhotos: PhotoItem[] = [];

      if (shouldInclude) {
        day.expenses.forEach((exp) => {
          const val = Number(exp.value) || 0;
          totalDespesa += val;
          if (exp.receiptImage) {
            dayPhotos.push({
              sheetId: activeSheet.id,
              sheetRoute: activeSheet.companyRoute,
              dayId: day.id,
              dayIndex,
              dayLabel: day.dayLabel,
              date: day.date,
              expenseId: exp.id,
              expenseLabel: exp.label,
              expenseCategory: exp.category,
              expenseValue: val,
              receiptImage: exp.receiptImage,
              receiptName: exp.receiptName,
            });
          }
        });
      }

      const totalArrecadado = valorIda + valorVolta + valorEncom;
      // Saldo final físico em dinheiro do dia: (Arrecadação - Pix) - Despesas
      const valorFinalDinheiro = (totalArrecadado - valorPix) - totalDespesa;
      const hasMovement = tripsCount > 0 || totalDespesa > 0;

      return {
        dayIndex,
        day,
        dayLabel: day.dayLabel.split('—')[0].trim(),
        fullDayLabel: day.dayLabel,
        date: day.date,
        driverName: day.driverName || driver.name,
        vehiclePlate: day.vehiclePlate || driver.vehiclePlate,
        valorIda,
        valorVolta,
        valorEncom,
        valorPix,
        totalArrecadado,
        totalDespesa,
        valorFinalDinheiro,
        photos: dayPhotos,
        tripsCount,
        hasMovement,
      };
    });
  }, [activeSheet, driver]);

  // Totais consolidados da tabela do resumo (Segunda a Domingo)
  const weeklyDailyTotals = useMemo(() => {
    let totalIda = 0;
    let totalVolta = 0;
    let totalEncom = 0;
    let totalPix = 0;
    let totalArrecadado = 0;
    let totalDespesa = 0;
    let totalValorFinalDinheiro = 0;
    let totalFotos = 0;

    dailySummary.forEach((row) => {
      totalIda += row.valorIda;
      totalVolta += row.valorVolta;
      totalEncom += row.valorEncom;
      totalPix += row.valorPix;
      totalArrecadado += row.totalArrecadado;
      totalDespesa += row.totalDespesa;
      totalValorFinalDinheiro += row.valorFinalDinheiro;
      totalFotos += row.photos.length;
    });

    return {
      totalIda,
      totalVolta,
      totalEncom,
      totalPix,
      totalArrecadado,
      totalDespesa,
      totalValorFinalDinheiro,
      totalFotos,
    };
  }, [dailySummary]);

  if (!isOpen) return null;

  const handleDownloadPhoto = (photo: PhotoItem) => {
    const a = document.createElement('a');
    a.href = photo.receiptImage;
    a.download = photo.receiptName || `comprovante_${photo.expenseLabel.toLowerCase().replace(/\s+/g, '_')}_${photo.date}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenZoom = (photo: PhotoItem) => {
    setZoomedPhoto(photo);
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Modal Header: Informações do Motorista & Seletor de Semana */}
        <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
              {driver.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-[10px] uppercase tracking-wider border border-blue-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  Painel de Auditoria do Admin
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Login: <strong className="text-slate-200">{driver.username}</strong>
                </span>
                {driver.vehiclePlate && (
                  <span className="text-[11px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    🚗 {driver.vehiclePlate}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Controle de Caixa & Fotos: {driver.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Semana */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                  Semana:
                </span>
                <select
                  value={selectedSheetId}
                  onChange={(e) => setSelectedSheetId(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs border-none p-0 focus:ring-0 cursor-pointer outline-none"
                >
                  {allSheets.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {formatDatePtBR(s.startDate)} a {formatDatePtBR(s.endDate)} ({s.companyRoute})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-navegação interna: Caixa Geral | Fotos & Comprovantes | Dias Detalhados */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('caixa')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'caixa'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Resumo do Caixa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('fotos')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'fotos'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Comprovantes com Foto</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeSubTab === 'fotos' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
              }`}>
                {allDriverPhotos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('dias')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'dias'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Lançamentos Dia a Dia</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                {effectiveDays.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
            <span>Período:</span>
            <span className="font-bold text-slate-800 font-mono">
              {formatDatePtBR(activeSheet.startDate)} a {formatDatePtBR(activeSheet.endDate)}
            </span>
          </div>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          
          {/* CARDS DE RESUMO FINANCEIRO (Sempre visíveis no topo para clareza imediata do caixa) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* Total Arrecadado */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Arrecadado
              </span>
              <span className="text-base sm:text-xl font-black text-slate-900 font-mono mt-1 block">
                {formatCurrency(totals.totalArrecadado)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {totals.totalViagensCount} viagem{totals.totalViagensCount !== 1 ? 'ns' : ''} realizada{totals.totalViagensCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Total Pix */}
            <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 shadow-xs">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                Recebido via PIX
              </span>
              <span className="text-base sm:text-xl font-black text-blue-900 font-mono mt-1 block">
                {formatCurrency(totals.totalPix)}
              </span>
              <span className="text-[10px] text-blue-700 mt-0.5 block">
                Caiu direto na conta digital
              </span>
            </div>

            {/* Total Despesas */}
            <div className="bg-rose-50/80 p-3.5 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                Total Despesas
              </span>
              <span className="text-base sm:text-xl font-black text-rose-700 font-mono mt-1 block">
                {formatCurrency(totals.totalDespesas)}
              </span>
              <span className="text-[10px] text-rose-600 mt-0.5 block">
                Combustível, cobrador e extras
              </span>
            </div>

            {/* Dinheiro Físico em Mãos (Espécie) */}
            <div className={`p-3.5 rounded-xl border shadow-xs ${
              totals.sobraDinheiroEspecie >= 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                Dinheiro em Mãos (Espécie)
              </span>
              <span className="text-base sm:text-xl font-black font-mono mt-1 block">
                {formatCurrency(totals.sobraDinheiroEspecie)}
              </span>
              <span className="text-[10px] opacity-80 mt-0.5 block font-medium">
                Valor a prestar contas físico
              </span>
            </div>

            {/* Sobra Líquida */}
            <div className="col-span-2 lg:col-span-1 bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Sobra Líquida Real
              </span>
              <span className="text-base sm:text-xl font-black font-mono mt-1 block text-emerald-400">
                {formatCurrency(totals.sobraLiquida)}
              </span>
              <span className="text-[10px] text-slate-300 mt-0.5 block">
                Arrecadação menos Despesas
              </span>
            </div>

          </div>

          {/* ABA 1: RESUMO DO CAIXA COM AUDITORIA GERAL */}
          {activeSubTab === 'caixa' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* TABELA DE FÁCIL ENTENDIMENTO: VALORES FINAIS DIA A DIA (SEGUNDA A DOMINGO) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-white uppercase flex items-center gap-2">
                        <span>Resumo do Caixa por Dia — Segunda a Domingo</span>
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        Valores finais calculados por dia com total geral da semana para {driver.name}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-lg font-bold self-start sm:self-auto">
                    Sequência Semanal Oficial
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4 text-left">Dia da Semana</th>
                        <th className="py-3 px-3 text-right">Valor Ida</th>
                        <th className="py-3 px-3 text-right">Valor Volta</th>
                        <th className="py-3 px-3 text-right text-blue-700 bg-blue-50/50">Recebido PIX</th>
                        <th className="py-3 px-3 text-right text-rose-700">Total Despesa</th>
                        <th className="py-3 px-4 text-right text-emerald-900 font-black bg-emerald-50/60">Valor Final em Dinheiro</th>
                        <th className="py-3 px-3 text-center w-32">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dailySummary.map((row) => {
                        const isProfitable = row.valorFinalDinheiro >= 0;
                        return (
                          <tr
                            key={row.dayIndex}
                            className={`hover:bg-blue-50/40 transition-colors ${row.hasMovement ? 'bg-white' : 'bg-slate-50/40 opacity-75'}`}
                          >
                            {/* Dia da Semana */}
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900">
                                  {row.dayLabel}
                                </span>
                                <span className="text-[11px] font-mono font-medium text-slate-400">
                                  ({formatDatePtBR(row.date)})
                                </span>
                              </div>
                            </td>

                            {/* Valor Ida */}
                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                              {row.valorIda > 0 ? formatCurrency(row.valorIda) : '-'}
                            </td>

                            {/* Valor Volta */}
                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                              {row.valorVolta > 0 ? formatCurrency(row.valorVolta) : '-'}
                            </td>

                            {/* Recebido PIX */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                              {row.valorPix > 0 ? formatCurrency(row.valorPix) : '-'}
                            </td>

                            {/* Total Despesa */}
                            <td className="py-3 px-3 text-right font-mono text-rose-700">
                              <div className="flex items-center justify-end gap-1.5">
                                {row.photos.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenZoom(row.photos[0])}
                                    className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                    title="Ver foto do comprovante deste dia"
                                  >
                                    <Camera className="w-3 h-3 text-emerald-700" />
                                    <span>{row.photos.length} foto{row.photos.length !== 1 ? 's' : ''}</span>
                                  </button>
                                )}
                                <span className="font-bold">
                                  {row.totalDespesa > 0 ? formatCurrency(row.totalDespesa) : '-'}
                                </span>
                              </div>
                            </td>

                            {/* Valor Final em Dinheiro */}
                            <td className="py-3 px-4 text-right font-mono font-black text-sm bg-emerald-50/40">
                              <span className={`px-2.5 py-1 rounded-md inline-block font-mono ${
                                isProfitable 
                                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' 
                                  : 'bg-rose-100 text-rose-950 border border-rose-300'
                              }`}>
                                {formatCurrency(row.valorFinalDinheiro)}
                              </span>
                            </td>

                            {/* Ação rápida para ver o cupom/imagem na aba de Lançamentos */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDayFilterIndex(row.dayIndex);
                                  setActiveSubTab('dias');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                                title="Ver comprovante no formato de fechamento de caixa deste dia"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Ver Fechamento</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-700">
                        <td className="py-3.5 px-4 text-xs uppercase tracking-wider text-emerald-300">
                          VALOR FINAL (TOTAIS DA SEMANA)
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                          {formatCurrency(weeklyDailyTotals.totalIda)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                          {formatCurrency(weeklyDailyTotals.totalVolta)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-blue-300 bg-blue-950/60">
                          {formatCurrency(weeklyDailyTotals.totalPix)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-rose-300">
                          <div className="flex items-center justify-end gap-1">
                            {weeklyDailyTotals.totalFotos > 0 && (
                              <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                                📷 {weeklyDailyTotals.totalFotos}
                              </span>
                            )}
                            <span>{formatCurrency(weeklyDailyTotals.totalDespesa)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-base font-black text-emerald-300 bg-emerald-950/90 border-l border-r border-emerald-700">
                          <span className="text-xs font-normal text-emerald-400 mr-1 block sm:inline">Total em mãos:</span>
                          <span className="text-lg font-black text-emerald-300">{formatCurrency(weeklyDailyTotals.totalValorFinalDinheiro)}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDayFilterIndex(null);
                              setActiveSubTab('dias');
                            }}
                            className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                          >
                            Ver Todos
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Card de Prestação de Contas Resumido */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-700" />
                    <span>Fechamento do Caixa: {driver.name}</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {effectiveDays.length} dia{effectiveDays.length !== 1 ? 's' : ''} registrado{effectiveDays.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200 text-xs sm:text-sm">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">1. Arrecadação Bruta das Viagens (Ida + Volta + Encomendas):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(totals.totalArrecadado)}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-blue-700 font-medium">2. (-) Valores recebidos em PIX (Conta Digital):</span>
                    <span className="font-mono font-bold text-blue-800">-{formatCurrency(totals.totalPix)}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between font-semibold bg-blue-50/50 px-2 rounded">
                    <span className="text-blue-900">3. (=) Dinheiro em Espécie que entrou no veículo:</span>
                    <span className="font-mono text-blue-950">{formatCurrency(totals.totalDinheiroArrecadado)}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-rose-700 font-medium">4. (-) Total de Despesas pagas pelo motorista:</span>
                    <span className="font-mono font-bold text-rose-700">-{formatCurrency(totals.totalDespesas)}</span>
                  </div>
                  <div className="py-3 flex items-center justify-between font-black text-sm sm:text-base bg-emerald-50/80 px-2 rounded-lg border border-emerald-200">
                    <span className="text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>5. (=) Saldo em Dinheiro Físico a ser Repassado ao Admin:</span>
                    </span>
                    <span className="font-mono text-emerald-900 text-lg">
                      {formatCurrency(totals.sobraDinheiroEspecie)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Destaque das Fotos de Comprovantes Recentes */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-700" />
                      <span>Comprovantes e Notas Anexadas pelo Motorista ({allDriverPhotos.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fotos de cupons de combustível, notas fiscais e recibos salvos por {driver.name}.
                    </p>
                  </div>

                  {allDriverPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('fotos')}
                      className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Ver todas em grade</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {allDriverPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {allDriverPhotos.slice(0, 4).map((photo) => (
                      <div
                        key={`${photo.dayId}-${photo.expenseId}`}
                        className="group bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
                      >
                        <div className="relative aspect-4/3 bg-slate-950 overflow-hidden cursor-pointer" onClick={() => handleOpenZoom(photo)}>
                          <img
                            src={photo.receiptImage}
                            alt={photo.expenseLabel}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                            <span className="p-1.5 bg-white/20 backdrop-blur-xs rounded-lg text-xs font-bold flex items-center gap-1">
                              <Maximize2 className="w-3.5 h-3.5" />
                              Ver Foto
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 text-xs flex flex-col justify-between flex-1">
                          <div>
                            <span className="font-bold text-slate-900 block truncate">
                              {photo.expenseLabel}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {photo.dayLabel.split('—')[0]} • {formatDatePtBR(photo.date)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="font-mono font-bold text-rose-700">
                              {formatCurrency(photo.expenseValue)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownloadPhoto(photo)}
                              className="p-1 text-slate-500 hover:text-blue-700 transition-colors"
                              title="Baixar comprovante"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                    <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">
                      Nenhum comprovante com foto foi anexado nesta semana
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Quando o motorista tirar foto de cupons ou notas de combustível, elas aparecerão aqui automaticamente.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ABA 2: GALERIA COMPLETA DE FOTOS E COMPROVANTES */}
          {activeSubTab === 'fotos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-700" />
                    <span>Galeria de Comprovantes: {driver.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clique em qualquer foto para ampliar em tela cheia, inspecionar detalhes ou baixar.
                  </p>
                </div>
                <span className="text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full shrink-0">
                  {allDriverPhotos.length} foto{allDriverPhotos.length !== 1 ? 's' : ''} encontrada{allDriverPhotos.length !== 1 ? 's' : ''}
                </span>
              </div>

              {allDriverPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {allDriverPhotos.map((photo) => (
                    <div
                      key={`gallery-${photo.dayId}-${photo.expenseId}`}
                      className="group bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col"
                    >
                      {/* Miniatura da foto */}
                      <div
                        className="relative aspect-4/3 bg-slate-950 overflow-hidden cursor-pointer"
                        onClick={() => handleOpenZoom(photo)}
                      >
                        <img
                          src={photo.receiptImage}
                          alt={photo.expenseLabel}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-2 left-2">
                          <span className="text-[10px] font-bold bg-slate-900/80 text-white px-2 py-0.5 rounded backdrop-blur-xs">
                            {photo.expenseCategory.toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                          <span className="p-2 bg-white/20 backdrop-blur-xs rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            Ampliar
                          </span>
                        </div>
                      </div>

                      {/* Informações da Despesa */}
                      <div className="p-3 text-xs flex flex-col justify-between flex-1">
                        <div>
                          <h4 className="font-extrabold text-slate-900 truncate" title={photo.expenseLabel}>
                            {photo.expenseLabel}
                          </h4>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            📅 {photo.dayLabel.split('—')[0]} • {formatDatePtBR(photo.date)}
                          </span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block leading-none">Valor:</span>
                            <span className="font-mono font-black text-rose-700 text-sm">
                              {formatCurrency(photo.expenseValue)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDownloadPhoto(photo)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Baixar comprovante"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenZoom(photo)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Ver em tela cheia"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
                  <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 text-sm">Nenhum comprovante fotográfico encontrado</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Este motorista ainda não salvou fotos de notas ou cupons fiscais nas despesas desta semana.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: LANÇAMENTOS DETALHADOS DIA A DIA — IDÊNTICO À IMAGEM DE FECHAMENTO DE CAIXA */}
          {activeSubTab === 'dias' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Barra Superior de Filtro de Dias da Semana (Segunda a Domingo) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1 px-2 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    <span>Visualizar Dia:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedDayFilterIndex(null)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedDayFilterIndex === null
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Todos os Dias
                  </button>

                  {dailySummary.map((row) => (
                    <button
                      key={row.dayIndex}
                      type="button"
                      onClick={() => setSelectedDayFilterIndex(row.dayIndex)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                        selectedDayFilterIndex === row.dayIndex
                          ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500'
                          : row.hasMovement
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={`${row.dayLabel} (${formatDatePtBR(row.date)})`}
                    >
                      <span>{row.dayLabel.split('-')[0]}</span>
                      {row.photos.length > 0 && (
                        <span className="text-[10px]">📷</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium self-end md:self-auto shrink-0">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Layout idêntico ao comprovante de fechamento de caixa</span>
                </div>
              </div>

              {/* LISTA DE TICKETS OFICIAIS NO FORMATO DA IMAGEM DE FECHAMENTO */}
              {(() => {
                const daysToRender = selectedDayFilterIndex !== null
                  ? dailySummary.filter((r) => r.dayIndex === selectedDayFilterIndex)
                  : dailySummary.filter((r) => r.hasMovement || effectiveDays.some(ed => ed.idx === r.dayIndex));

                const finalRenderList = daysToRender.length > 0 ? daysToRender : dailySummary;

                return (
                  <div className="space-y-6">
                    {finalRenderList.map((row) => (
                      <DayCashTicketCard
                        key={row.day.id || row.dayIndex}
                        day={row.day}
                        dayIndex={row.dayIndex}
                        sheet={activeSheet}
                        driver={driver}
                        onOpenPhotoZoom={handleOpenZoom}
                        onOpenDayInEditor={onOpenDayInEditor}
                        onCloseModal={onClose}
                      />
                    ))}
                  </div>
                );
              })()}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Auditoria em tempo real de <strong>{driver.name}</strong> • Sincronizado com Supabase
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Fechar Auditoria
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE ZOOM / TELA CHEIA PARA A FOTO DO COMPROVANTE */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-3 animate-in fade-in duration-200">
          {/* Top Bar com Controles de Zoom e Fechar */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white py-3 px-4 border-b border-white/10 shrink-0">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Comprovante: {zoomedPhoto.expenseLabel} ({formatCurrency(zoomedPhoto.expenseValue)})
              </h3>
              <p className="text-xs text-slate-400">
                {zoomedPhoto.dayLabel.split('—')[0]} • {formatDatePtBR(zoomedPhoto.date)} • Motorista: {driver.name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold px-1 text-slate-300">
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                title="Girar foto"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPhoto(zoomedPhoto)}
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Baixar imagem original"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Baixar</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="p-2 bg-white/10 hover:bg-rose-600 rounded-lg text-white transition-colors cursor-pointer ml-2"
                title="Fechar foto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Imagem com Zoom e Rotação */}
          <div className="flex-1 w-full max-w-4xl flex items-center justify-center overflow-auto p-4">
            <img
              src={zoomedPhoto.receiptImage}
              alt={zoomedPhoto.expenseLabel}
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
            />
          </div>

          {/* Rodapé com nome do arquivo */}
          <div className="text-slate-400 text-xs py-2 text-center w-full shrink-0">
            {zoomedPhoto.receiptName || 'Foto do comprovante'} • Clique nos botões acima para aplicar zoom ou girar
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  DollarSign, 
  ArrowDownRight, 
  ArrowUpRight, 
  Fuel, 
  User, 
  Users, 
  Receipt, 
  Check, 
  Sparkles,
  Calendar,
  AlertCircle,
  Share2,
  MessageSquare,
  Wallet,
  FileText,
  Camera,
  RotateCcw,
  PlusCircle,
  Car,
  UserCheck,
  Database,
  RefreshCw,
  Save,
  CheckCircle2
} from 'lucide-react';
import { DayRecord, ExpenseRecord, TripRecord, WeeklySheet, Driver, AuthUser } from '../types';
import { calculateDayTotals, calculateTripSubtotal, formatCurrency, formatDatePtBR } from '../utils/calculations';
import { CashPrintModal } from './CashPrintModal';
import { ExpenseReceiptModal } from './ExpenseReceiptModal';

interface DayEditorProps {
  sheet: WeeklySheet;
  onUpdateDay: (dayId: string, updatedDay: DayRecord) => void;
  onCopyExpensesFromPreviousDay: (currentDayIndex: number) => void;
  selectedDayIndex?: number;
  onSelectDayIndex?: (index: number) => void;
  drivers?: Driver[];
  currentUser?: AuthUser | null;
  onNewWeek?: () => void;
  onOpenDriversTab?: () => void;
  syncState?: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedTime?: string | null;
  onTriggerInstantSave?: () => void;
  onOpenSupabaseModal?: () => void;
}

export const DayEditor: React.FC<DayEditorProps> = ({
  sheet,
  onUpdateDay,
  onCopyExpensesFromPreviousDay,
  selectedDayIndex: controlledIndex,
  onSelectDayIndex: setControlledIndex,
  drivers = [],
  currentUser,
  onNewWeek,
  onOpenDriversTab,
  syncState = 'saved',
  lastSavedTime,
  onTriggerInstantSave,
  onOpenSupabaseModal,
}) => {
  const [internalDayIndex, setInternalDayIndex] = useState<number>(0);
  const selectedDayIndex = controlledIndex !== undefined ? controlledIndex : internalDayIndex;
  const setSelectedDayIndex = (idx: number) => {
    if (setControlledIndex) setControlledIndex(idx);
    else setInternalDayIndex(idx);
  };
  const [viewAllDays, setViewAllDays] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [printModalDay, setPrintModalDay] = useState<{ day: DayRecord; idx: number } | null>(null);
  
  // Estado para o modal de comprovante de despesa com foto/câmera
  const [receiptModalData, setReceiptModalData] = useState<{
    dayId: string;
    expense: ExpenseRecord;
    dayLabel: string;
  } | null>(null);

  const currentDay = sheet.days[selectedDayIndex] || sheet.days[0];

  // Helper to update trip values and link to active driver
  const handleTripChange = (
    dayId: string, 
    tripId: string, 
    field: 'ida' | 'volta' | 'encom' | 'pix', 
    rawValue: string
  ) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;

    const val = rawValue === '' ? 0 : parseFloat(rawValue.replace(',', '.')) || 0;

    const updatedTrips = day.trips.map((t) => {
      if (t.id === tripId) {
        return { ...t, [field]: val };
      }
      return t;
    });

    const activeDriverName = currentUser?.displayName || day.driverName || 'Jailson Francelino';
    const activeDriverId = currentUser?.driverId || currentUser?.username || day.driverId;
    const driverMatch = drivers.find(d => d.id === activeDriverId || d.username === currentUser?.username);

    onUpdateDay(dayId, { 
      ...day, 
      driverName: activeDriverName,
      driverId: activeDriverId,
      vehiclePlate: driverMatch?.vehiclePlate || day.vehiclePlate,
      trips: updatedTrips 
    });
  };

  // Helper to add trip
  const handleAddTrip = (dayId: string) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;

    const newTripNum = day.trips.length + 1;
    const newTrip: TripRecord = {
      id: `${day.dayOfWeek}-trip-${Date.now()}`,
      tripName: `${newTripNum}ª Viagem`,
      ida: 0,
      volta: 0,
      encom: 0,
      pix: 0,
    };

    onUpdateDay(dayId, { ...day, trips: [...day.trips, newTrip] });
  };

  // Helper to remove trip
  const handleRemoveTrip = (dayId: string, tripId: string) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day || day.trips.length <= 1) return;

    const updatedTrips = day.trips.filter((t) => t.id !== tripId);
    onUpdateDay(dayId, { ...day, trips: updatedTrips });
  };

  // Helper to update expense
  const handleExpenseChange = (dayId: string, expenseId: string, rawValue: string) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;

    const val = rawValue === '' ? 0 : parseFloat(rawValue.replace(',', '.')) || 0;

    const updatedExpenses = day.expenses.map((e) => {
      if (e.id === expenseId) {
        return { ...e, value: val };
      }
      return e;
    });

    const activeDriverName = currentUser?.displayName || day.driverName || 'Jailson Francelino';
    const activeDriverId = currentUser?.driverId || currentUser?.username || day.driverId;
    const driverMatch = drivers.find(d => d.id === activeDriverId || d.username === currentUser?.username);

    onUpdateDay(dayId, { 
      ...day, 
      driverName: activeDriverName,
      driverId: activeDriverId,
      vehiclePlate: driverMatch?.vehiclePlate || day.vehiclePlate,
      expenses: updatedExpenses 
    });
  };

  // Zerar valores de um dia específico
  const handleZeroDay = (dayId: string) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;

    if (confirm(`Deseja realmente zerar todos os lançamentos de ${day.dayLabel}? As viagens e despesas voltarão a 0,00.`)) {
      const zeroedTrips = day.trips.map((t) => ({ ...t, ida: 0, volta: 0, encom: 0, pix: 0 }));
      const zeroedExpenses = day.expenses.map((e) => ({ ...e, value: 0 }));
      onUpdateDay(dayId, {
        ...day,
        trips: zeroedTrips,
        expenses: zeroedExpenses,
      });
      setCopiedToast(`Valores de ${day.dayLabel} zerados com sucesso!`);
      setTimeout(() => setCopiedToast(null), 3000);
    }
  };

  // Salvar foto do comprovante de despesa
  const handleSaveReceipt = (receiptDataUrl: string, fileName: string) => {
    if (!receiptModalData) return;
    const { dayId, expense } = receiptModalData;
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;

    const updatedExpenses = day.expenses.map((e) => {
      if (e.id === expense.id) {
        return {
          ...e,
          receiptImage: receiptDataUrl,
          receiptName: fileName,
        };
      }
      return e;
    });

    onUpdateDay(dayId, { ...day, expenses: updatedExpenses });
    
    // Atualiza o estado do modal com a nova imagem
    setReceiptModalData({
      ...receiptModalData,
      expense: {
        ...expense,
        receiptImage: receiptDataUrl,
        receiptName: fileName,
      },
    });

    setCopiedToast(`Foto do comprovante de "${expense.label}" salva com sucesso!`);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  // Remover foto do comprovante de despesa
  const handleRemoveReceipt = () => {
    if (!receiptModalData) return;
    const { dayId, expense } = receiptModalData;
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;

    const updatedExpenses = day.expenses.map((e) => {
      if (e.id === expense.id) {
        return {
          ...e,
          receiptImage: undefined,
          receiptName: undefined,
        };
      }
      return e;
    });

    onUpdateDay(dayId, { ...day, expenses: updatedExpenses });
    setReceiptModalData(null);
    setCopiedToast(`Comprovante de "${expense.label}" removido.`);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  // Helper to add extra custom expense
  const handleAddExpense = (dayId: string) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;

    const label = prompt('Nome da despesa (ex: Lavagem, Manutenção, Pedágio):', 'Outra Despesa');
    if (!label) return;

    const newExpense: ExpenseRecord = {
      id: `exp-custom-${Date.now()}`,
      category: 'extra',
      label: label.trim(),
      value: 0,
    };

    onUpdateDay(dayId, { ...day, expenses: [...day.expenses, newExpense] });
  };

  // Helper to delete extra expense
  const handleRemoveExpense = (dayId: string, expenseId: string) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;

    const updatedExpenses = day.expenses.filter((e) => e.id !== expenseId);
    onUpdateDay(dayId, { ...day, expenses: updatedExpenses });
  };

  // Helper to update day date
  const handleDateChange = (dayId: string, newDate: string) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;
    onUpdateDay(dayId, { ...day, date: newDate });
  };

  const triggerCopyExpenses = (idx: number) => {
    if (idx === 0) {
      alert('Segunda-feira é o primeiro dia da semana. Não há dia anterior para copiar.');
      return;
    }
    onCopyExpensesFromPreviousDay(idx);
    setCopiedToast(`Despesas copiadas de ${sheet.days[idx - 1].dayLabel.split('—')[0]}!`);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  const handleSelectDayDriver = (dayId: string, driverId: string) => {
    const day = sheet.days.find((d) => d.id === dayId);
    if (!day) return;
    const selectedDriver = drivers.find((d) => d.id === driverId);
    if (selectedDriver) {
      onUpdateDay(dayId, {
        ...day,
        driverId: selectedDriver.id,
        driverName: selectedDriver.name,
        vehiclePlate: selectedDriver.vehiclePlate,
        trips: day.trips.map((t) => ({
          ...t,
          driverId: t.driverId || selectedDriver.id,
          driverName: t.driverName || selectedDriver.name,
        })),
      });
      setCopiedToast(`Motorista ${selectedDriver.name} vinculado ao dia!`);
      setTimeout(() => setCopiedToast(null), 2500);
    } else {
      onUpdateDay(dayId, {
        ...day,
        driverId: undefined,
        driverName: undefined,
        vehiclePlate: undefined,
      });
    }
  };

  const renderSingleDayCard = (day: DayRecord, dayIdx: number) => {
    const totals = calculateDayTotals(day);
    const isPositive = totals.sobraLiquida >= 0;

    return (
      <div 
        key={day.id} 
        id={`day-card-${day.dayOfWeek}`}
        className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all mb-6"
      >
        {/* Card Header matching PDF Style */}
        <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
              {day.dayLabel}
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Data:</span>
              <input
                type="date"
                value={day.date}
                onChange={(e) => handleDateChange(day.id, e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-400"
              />
              <span className="text-slate-400 text-xs hidden sm:inline">
                ({formatDatePtBR(day.date)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPrintModalDay({ day, idx: dayIdx })}
              className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Gerar e Baixar Comprovante em PDF ou Enviar no WhatsApp"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-100" />
              <span>Comprovante PDF / WhatsApp</span>
            </button>

            {dayIdx > 0 && (
              <button
                onClick={() => triggerCopyExpenses(dayIdx)}
                className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                title="Copiar diárias do motorista, cobrador e combustível do dia anterior"
              >
                <Copy className="w-3 h-3 text-blue-400" />
                <span className="hidden sm:inline">Copiar despesas dia anterior</span>
                <span className="sm:hidden">Copiar</span>
              </button>
            )}

            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              totals.sobraDinheiroEspecie >= 0 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              Espécie: {formatCurrency(totals.sobraDinheiroEspecie)}
            </span>
          </div>
        </div>

        {/* Driver Operator Bar - Identificado pelo login ou ajustado pelo Admin */}
        <div className="bg-slate-50/90 px-4 py-2.5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {currentUser?.role === 'admin' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold shadow-2xs">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Motorista do Dia:</span>
                <select
                  value={day.driverId || ''}
                  onChange={(e) => handleSelectDayDriver(day.id, e.target.value)}
                  className="bg-white border border-blue-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Nenhum / Selecionar motorista...</option>
                  {drivers.map((drv) => (
                    <option key={drv.id} value={drv.id}>
                      {drv.name} {drv.vehiclePlate ? `(${drv.vehiclePlate})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold shadow-2xs">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Motorista Logado:</span>
                <span className="font-black text-blue-950">
                  {currentUser?.displayName || day.driverName || 'Jailson Francelino'}
                </span>
              </span>
            )}

            {(day.vehiclePlate || currentUser?.role === 'driver') && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-200 font-bold text-[11px]">
                <Car className="w-3.5 h-3.5 text-blue-700" />
                <span>Veículo / Placa:</span>
                <span className="font-mono text-slate-900 font-extrabold">
                  {day.vehiclePlate || 'Conforme Escala'}
                </span>
              </span>
            )}

            {/* Contador de comprovantes com foto salvos no dia */}
            {(() => {
              const photosCount = day.expenses.filter((e) => !!e.receiptImage).length;
              if (photosCount === 0) return null;
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{photosCount} foto{photosCount !== 1 ? 's' : ''} de comprovante salva{photosCount !== 1 ? 's' : ''}</span>
                </span>
              );
            })()}

            {currentUser?.role === 'admin' && onOpenDriversTab && (
              <button
                type="button"
                onClick={onOpenDriversTab}
                className="inline-flex items-center gap-1 text-[11px] bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                title="Acessar painel do Admin para auditar todo o caixa do motorista e ver todas as fotos salvas"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auditar Caixas & Fotos</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Indicador de Salvamento Automático em Tempo Real */}
            <div 
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors shadow-2xs ${
                syncState === 'saving'
                  ? 'bg-blue-50 border-blue-200 text-blue-800 animate-pulse'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
              title="Todas as alterações são salvas automaticamente no banco de dados"
            >
              {syncState === 'saving' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                  <span>Salvando no banco...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Salvo no banco</span>
                  {lastSavedTime && <span className="font-mono text-emerald-700 font-normal">({lastSavedTime})</span>}
                </>
              )}
            </div>

            {onNewWeek && (
              <button
                type="button"
                id={`new-week-btn-day-${day.id}`}
                onClick={onNewWeek}
                className="inline-flex items-center gap-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                title="Criar uma nova semana de trabalho com caixa zerado"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Gerar Nova Semana</span>
              </button>
            )}

            <button
              type="button"
              id={`zero-day-btn-${day.id}`}
              onClick={() => handleZeroDay(day.id)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
              title="Zerar todas as viagens e despesas deste dia"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Zerar Dia</span>
            </button>

            {onOpenDriversTab && currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={onOpenDriversTab}
                className="text-[11px] text-slate-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline cursor-pointer ml-1"
                title="Abrir o painel de cadastro e gerenciamento de motoristas"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gerenciar Motoristas</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area: Grid with Trips (left/top) and Expenses (right) */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Table: Viagens (Ida, Volta, Encomendas, Pix, Subtotal) */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <span>Controle de Viagens</span>
                <span className="text-xs font-normal text-slate-500">
                  (Ida + Volta + Encomendas = Subtotal)
                </span>
              </h2>

              <button
                onClick={() => handleAddTrip(day.id)}
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Viagem</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                    <th className="py-2 px-3 text-left w-28">VIAGEM</th>
                    <th className="py-2 px-2 text-right">IDA (R$)</th>
                    <th className="py-2 px-2 text-right">VOLTA (R$)</th>
                    <th className="py-2 px-2 text-right">ENCOM. (R$)</th>
                    <th className="py-2 px-2 text-right bg-blue-50/70 text-blue-900 border-x border-blue-200">
                      PIX (R$)
                    </th>
                    <th className="py-2 px-3 text-right bg-slate-50 font-bold text-slate-900">
                      SUBTOTAL
                    </th>
                    <th className="py-2 px-1 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {day.trips.map((trip) => {
                    const subtotal = calculateTripSubtotal(trip);
                    return (
                      <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {trip.tripName}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={trip.ida === 0 ? '' : trip.ida}
                            onChange={(e) => handleTripChange(day.id, trip.id, 'ida', e.target.value)}
                            onBlur={onTriggerInstantSave}
                            placeholder="0,00"
                            className="w-20 sm:w-24 text-right py-1.5 px-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono text-xs sm:text-sm bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={trip.volta === 0 ? '' : trip.volta}
                            onChange={(e) => handleTripChange(day.id, trip.id, 'volta', e.target.value)}
                            onBlur={onTriggerInstantSave}
                            placeholder="0,00"
                            className="w-20 sm:w-24 text-right py-1.5 px-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono text-xs sm:text-sm bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={trip.encom === 0 ? '' : trip.encom}
                            onChange={(e) => handleTripChange(day.id, trip.id, 'encom', e.target.value)}
                            onBlur={onTriggerInstantSave}
                            placeholder="0,00"
                            className="w-20 sm:w-24 text-right py-1.5 px-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono text-xs sm:text-sm bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right bg-blue-50/40 border-x border-blue-100">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={trip.pix === 0 ? '' : trip.pix}
                            onChange={(e) => handleTripChange(day.id, trip.id, 'pix', e.target.value)}
                            onBlur={onTriggerInstantSave}
                            placeholder="0,00"
                            className="w-20 sm:w-24 text-right py-1.5 px-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 font-mono text-xs sm:text-sm bg-blue-50/50 text-blue-900 font-medium"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/70">
                          {formatCurrency(subtotal)}
                        </td>
                        <td className="py-1 px-1 text-center">
                          {day.trips.length > 1 && (
                            <button
                              onClick={() => handleRemoveTrip(day.id, trip.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                              title="Remover esta viagem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs sm:text-sm">
                    <td className="py-2 px-3">Subtotais:</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-700">
                      {formatCurrency(totals.totalIda)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-700">
                      {formatCurrency(totals.totalVolta)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-700">
                      {formatCurrency(totals.totalEncom)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-blue-800 bg-blue-100/60 border-x border-blue-200">
                      {formatCurrency(totals.totalPix)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-blue-900 bg-blue-50 font-extrabold">
                      {formatCurrency(totals.totalArrecadado)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <p className="text-xs text-slate-500 mt-2 italic">
              * O Subtotal inclui (Ida + Volta + Encomendas). Os valores informados em PIX são contabilizados no fechamento de dinheiro vs conta digital.
            </p>
          </div>

          {/* Table: Despesas (Motorista, Cobrador, Combustível, Outras) */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-600" />
                  <span>Despesas do Dia</span>
                </h2>

                <button
                  onClick={() => handleAddExpense(day.id)}
                  className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors cursor-pointer"
                  title="Adicionar outra despesa personalizada"
                >
                  <Plus className="w-3 h-3" />
                  <span>Outra</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 divide-y divide-slate-200">
                {day.expenses.map((expense) => {
                  let icon = <Receipt className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
                  if (expense.category === 'combustivel') icon = <Fuel className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
                  if (expense.category === 'motorista') icon = <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
                  if (expense.category === 'cobrador') icon = <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;

                  const hasReceipt = Boolean(expense.receiptImage);

                  return (
                    <div key={expense.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-white transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {icon}
                        <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                          {expense.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Botão de Anexo / Envio de Comprovante de Foto ou Câmera Direta */}
                        <button
                          type="button"
                          id={`btn-receipt-${day.id}-${expense.id}`}
                          onClick={() => setReceiptModalData({ dayId: day.id, expense, dayLabel: day.dayLabel })}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            hasReceipt
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-700'
                          }`}
                          title={hasReceipt ? 'Ver / Trocar foto do comprovante' : 'Tirar foto direto ou enviar imagem do comprovante'}
                        >
                          <Camera className={`w-3.5 h-3.5 ${hasReceipt ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="hidden sm:inline">
                            {hasReceipt ? 'Comprovante' : 'Foto'}
                          </span>
                          {hasReceipt && (
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          )}
                        </button>

                        {/* Miniatura clicável para ver rápido a foto salva */}
                        {hasReceipt && expense.receiptImage && (
                          <button
                            type="button"
                            onClick={() => setReceiptModalData({ dayId: day.id, expense, dayLabel: day.dayLabel })}
                            className="w-7 h-7 rounded border border-emerald-400 overflow-hidden cursor-pointer shrink-0 hover:opacity-80 transition-opacity shadow-2xs"
                            title="Clique para ampliar ou ver o comprovante"
                          >
                            <img
                              src={expense.receiptImage}
                              alt="Comprovante"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        )}

                        <span className="text-xs text-slate-400 font-mono">R$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={expense.value === 0 ? '' : expense.value}
                          onChange={(e) => handleExpenseChange(day.id, expense.id, e.target.value)}
                          onBlur={onTriggerInstantSave}
                          placeholder="0,00"
                          className="w-20 sm:w-24 text-right py-1.5 px-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono text-xs sm:text-sm bg-white"
                        />
                        {expense.category === 'extra' && (
                          <button
                            onClick={() => handleRemoveExpense(day.id, expense.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Remover despesa extra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="p-2.5 bg-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900">
                  <span>Total Despesas:</span>
                  <span className="font-mono text-rose-700">
                    {formatCurrency(totals.totalDespesas)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick helper note */}
            <div className="mt-3 bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-900">
              <span className="font-semibold">Dica de Diária:</span> Valores habituais de motorista e cobrador podem ser mantidos e copiados rapidamente entre os dias da semana.
            </div>
          </div>

        </div>

        {/* Bottom Bar: Daily Totals & Cash In Hand (Sobra em Espécie) */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 sm:p-6 space-y-4">
          
          {/* 4 Base Metrics + Sobra Líquida */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Total Arrecadado</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                {formatCurrency(totals.totalArrecadado)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Total Despesas</span>
              <span className="text-base sm:text-lg font-bold text-rose-600 font-mono">
                {formatCurrency(totals.totalDespesas)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Dinheiro (Entrada)</span>
              <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono">
                {formatCurrency(totals.totalDinheiro)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs">
              <span className="text-[11px] sm:text-xs text-blue-700 font-medium block">Total Pix (Na Conta)</span>
              <span className="text-base sm:text-lg font-bold text-blue-900 font-mono">
                {formatCurrency(totals.totalPix)}
              </span>
            </div>

            <div className={`col-span-2 sm:col-span-1 p-3 rounded-xl border shadow-xs ${
              totals.sobraLiquida >= 0 
                ? 'bg-blue-800 text-white border-blue-900' 
                : 'bg-rose-700 text-white border-rose-800'
            }`}>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold opacity-90 block">
                Sobra Líquida Geral
              </span>
              <span className="text-base sm:text-lg font-extrabold font-mono tracking-tight">
                {formatCurrency(totals.sobraLiquida)}
              </span>
              <span className="text-[9px] opacity-75 block">Arrecadado - Despesas</span>
            </div>

          </div>

          {/* HIGHLIGHT HERO CARD: SOBRA REAL EM DINHEIRO (ESPÉCIE NO CAIXA) */}
          <div className={`p-4 sm:p-5 rounded-2xl border-2 shadow-sm text-center transition-all ${
            totals.sobraDinheiroEspecie >= 0 
              ? 'bg-emerald-700 text-white border-emerald-800' 
              : 'bg-rose-700 text-white border-rose-800'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-emerald-200" />
              <span className="text-xs sm:text-sm uppercase tracking-wider font-extrabold">
                QUANTO REALMENTE SOBROU EM DINHEIRO EM ESPÉCIE (CAIXA FÍSICO)
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight my-1.5">
              {formatCurrency(totals.sobraDinheiroEspecie)}
            </div>

            <div className="inline-flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-xs font-medium">
              <span>Cálculo: Sobra Líquida ({formatCurrency(totals.sobraLiquida)})</span>
              <span>—</span>
              <span>Total Pix ({formatCurrency(totals.totalPix)})</span>
            </div>

            <p className="text-[11px] sm:text-xs opacity-90 mt-2 max-w-xl mx-auto">
              * Este é o valor exato em cédulas e moedas físicas que deve estar na mão do cobrador/motorista para prestação de contas no final do dia.
            </p>
          </div>

          {/* Action Bar: WhatsApp Share & Print Buttons */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button
                onClick={() => setPrintModalDay({ day, idx: dayIdx })}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
              >
                <Share2 className="w-4 h-4" />
                <span>📲 Enviar Print do Caixa no WhatsApp</span>
              </button>

              <button
                onClick={() => setPrintModalDay({ day, idx: dayIdx })}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-3 rounded-xl transition-all cursor-pointer min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>📸 Ver Comprovante</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 text-center sm:text-right">
              <span className="font-semibold text-slate-700">{day.dayLabel}</span>
              <span className="mx-1">•</span>
              <span>{day.trips.length} viagens cadastradas</span>
            </div>
          </div>

        </div>

      </div>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Copied toast notification */}
      {copiedToast && (
        <div className="bg-emerald-800 text-white px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 shadow-lg transition-all animate-bounce">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Barra de Status de Salvamento Automático em Tempo Real */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5">
          {syncState === 'saving' ? (
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Digitando... Salvando no banco de dados em tempo real...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-900 font-bold flex-wrap">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <Database className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Salvamento Automático Ativo:</span>
              <span className="font-semibold text-slate-700">
                digitou qualquer viagem ou despesa, já salva instantaneamente no banco de dados.
              </span>
              {lastSavedTime && (
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                  Salvo às {lastSavedTime}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onTriggerInstantSave && (
            <button
              type="button"
              id="instant-save-btn"
              onClick={onTriggerInstantSave}
              className="text-[11px] text-slate-700 hover:text-blue-700 font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
              title="Garantir gravação imediata agora"
            >
              <Save className="w-3.5 h-3.5 text-blue-600" />
              <span>Gravar Agora</span>
            </button>
          )}

          {onOpenSupabaseModal && (
            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              title="Ver status e tabelas do banco de dados"
            >
              Status do Banco
            </button>
          )}
        </div>
      </div>

      {/* Day Selector Navigation Pills */}
      <div className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {sheet.days.map((day, idx) => {
            const dayTotals = calculateDayTotals(day);
            const isSelected = !viewAllDays && selectedDayIndex === idx;
            const shortName = day.dayLabel.split('—')[0].replace('-feira', '').replace(' (Caso Haja Viagem)', '');

            return (
              <button
                key={day.id}
                onClick={() => {
                  setViewAllDays(false);
                  setSelectedDayIndex(idx);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex flex-col items-start transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-700/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{shortName}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    dayTotals.sobraDinheiroEspecie >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
                  }`} />
                </div>
                <div className="flex flex-col text-[10px] font-mono mt-0.5 leading-tight">
                  <span className={isSelected ? 'text-blue-100 font-medium' : 'text-slate-500'}>
                    Líq: {formatCurrency(dayTotals.sobraLiquida)}
                  </span>
                  <span className={`font-bold ${
                    isSelected ? 'text-emerald-200' : 'text-emerald-700'
                  }`}>
                    Espécie: {formatCurrency(dayTotals.sobraDinheiroEspecie)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
          {onNewWeek && (
            <button
              type="button"
              id="day-editor-top-new-week-btn"
              onClick={onNewWeek}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Gerar uma nova semana zerada para alimentação"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova Semana</span>
            </button>
          )}

          <button
            onClick={() => setViewAllDays(!viewAllDays)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
              viewAllDays
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {viewAllDays ? 'Visualizar Um Dia' : 'Ver Todos os Dias'}
          </button>
        </div>

      </div>

      {/* Render Days */}
      {viewAllDays ? (
        <div className="space-y-6">
          {sheet.days.map((day, idx) => renderSingleDayCard(day, idx))}
        </div>
      ) : (
        renderSingleDayCard(currentDay, selectedDayIndex)
      )}

      {/* Cash Print & WhatsApp Share Modal */}
      {printModalDay && (
        <CashPrintModal
          isOpen={!!printModalDay}
          onClose={() => setPrintModalDay(null)}
          sheet={sheet}
          day={printModalDay.day}
          dayIndex={printModalDay.idx}
        />
      )}

      {/* Modal de Comprovante de Despesa com Foto/Câmera */}
      {receiptModalData && (
        <ExpenseReceiptModal
          isOpen={!!receiptModalData}
          onClose={() => setReceiptModalData(null)}
          expense={receiptModalData.expense}
          dayLabel={receiptModalData.dayLabel}
          onSaveReceipt={handleSaveReceipt}
          onRemoveReceipt={handleRemoveReceipt}
        />
      )}

    </div>
  );
};

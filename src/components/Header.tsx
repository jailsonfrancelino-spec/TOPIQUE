import React, { useState } from 'react';
import { 
  Bus, 
  Calendar, 
  Car, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  History, 
  MapPin, 
  PlusCircle, 
  Printer, 
  RotateCcw, 
  Upload
} from 'lucide-react';
import { WeeklySheet } from '../types';
import { formatDatePtBR } from '../utils/calculations';

interface HeaderProps {
  sheet: WeeklySheet;
  sheetsList: WeeklySheet[];
  onSelectSheet: (id: string) => void;
  onUpdateHeader: (updates: Partial<Pick<WeeklySheet, 'companyRoute' | 'vehiclePlate' | 'startDate' | 'endDate'>>) => void;
  onNewWeek: () => void;
  onLoadSample: () => void;
  onPrint: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeTab: 'daily' | 'weekly' | 'print' | 'history';
  setActiveTab: (tab: 'daily' | 'weekly' | 'print' | 'history') => void;
}

export const Header: React.FC<HeaderProps> = ({
  sheet,
  sheetsList,
  onSelectSheet,
  onUpdateHeader,
  onNewWeek,
  onLoadSample,
  onPrint,
  onExportCsv,
  onExportJson,
  onImportJson,
  activeTab,
  setActiveTab,
}) => {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [routeInput, setRouteInput] = useState(sheet.companyRoute);
  const [plateInput, setPlateInput] = useState(sheet.vehiclePlate);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateHeader({
      companyRoute: routeInput.trim() || 'Transporte de Passageiros e Encomendas',
      vehiclePlate: plateInput.trim() || 'Sem Placa',
    });
    setIsEditingHeader(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
      {/* Top Banner with Route and Vehicle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
          
          {/* Brand & Route info */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Bus className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Fluxo de Caixa Operacional
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Auto-salvo
                </span>
              </div>

              {!isEditingHeader ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                    {sheet.companyRoute}
                  </h1>
                  <button
                    onClick={() => {
                      setRouteInput(sheet.companyRoute);
                      setPlateInput(sheet.vehiclePlate);
                      setIsEditingHeader(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
                    title="Editar rota e placa do veículo"
                  >
                    Editar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveHeader} className="flex items-center gap-2 mt-1 flex-wrap">
                  <input
                    type="text"
                    value={routeInput}
                    onChange={(e) => setRouteInput(e.target.value)}
                    placeholder="Nome da Rota / Empresa"
                    className="text-sm px-2.5 py-1 border border-blue-400 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 w-64"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={plateInput}
                    onChange={(e) => setPlateInput(e.target.value)}
                    placeholder="Placa / Veículo"
                    className="text-sm px-2.5 py-1 border border-blue-400 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 w-32 uppercase"
                  />
                  <button
                    type="submit"
                    className="text-xs bg-blue-700 text-white font-semibold px-2.5 py-1.5 rounded-md hover:bg-blue-800 cursor-pointer"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingHeader(false)}
                    className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-md hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick controls: Vehicle Plate, Week Picker, Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Vehicle Pill */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
              <Car className="w-3.5 h-3.5 text-slate-500" />
              <span>VEÍCULO:</span>
              <span className="text-blue-700 font-bold uppercase">{sheet.vehiclePlate || 'Não informado'}</span>
            </div>

            {/* Week date range */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>SEMANA:</span>
              <span className="font-semibold text-slate-900">
                {formatDatePtBR(sheet.startDate)} a {formatDatePtBR(sheet.endDate)}
              </span>
            </div>

            {/* Week selector dropdown */}
            <select
              value={sheet.id}
              onChange={(e) => onSelectSheet(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
              title="Alternar entre semanas gravadas"
            >
              {sheetsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDatePtBR(s.startDate)} - {s.vehiclePlate} ({s.days.length} dias)
                </option>
              ))}
            </select>

            {/* Nova Semana Button */}
            <button
              onClick={onNewWeek}
              className="inline-flex items-center gap-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Iniciar uma nova semana limpa"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova Semana</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Tool Buttons */}
        <div className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          
          {/* Main Views Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Controle Diário (Ficha)</span>
            </button>

            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'weekly'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>2. Resumo Fechamento Semanal</span>
            </button>

            <button
              onClick={() => setActiveTab('print')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'print'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>3. Visualizar Impressão (Ficha A4)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico ({sheetsList.length})</span>
            </button>
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Imprimir ficha diária ou resumo semanal"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Baixar planilha para Excel / Google Planilhas"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Exportar Excel (CSV)</span>
            </button>

            <button
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Carregar dados de exemplo real de Tianguá x Viçosa"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Restaurar Exemplo</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

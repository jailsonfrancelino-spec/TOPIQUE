import React, { useState } from 'react';
import { 
  Bus, 
  Calendar, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  History, 
  PlusCircle, 
  Printer, 
  RotateCcw,
  Database,
  Users,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { WeeklySheet, AuthUser } from '../types';
import { formatDatePtBR } from '../utils/calculations';
import { SupabaseStatus } from '../utils/supabase';

interface HeaderProps {
  sheet: WeeklySheet;
  sheetsList: WeeklySheet[];
  onSelectSheet: (id: string) => void;
  onChangeWeekDate: (newDateIso: string) => void;
  onShiftWeek: (weeksDelta: number) => void;
  onUpdateHeader: (updates: Partial<Pick<WeeklySheet, 'companyRoute' | 'startDate' | 'endDate'>>) => void;
  onNewWeek: () => void;
  onLoadSample: () => void;
  onPrint: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeTab: 'daily' | 'weekly' | 'drivers' | 'print' | 'history';
  setActiveTab: (tab: 'daily' | 'weekly' | 'drivers' | 'print' | 'history') => void;
  supabaseStatus: SupabaseStatus;
  syncState: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedTime: string | null;
  onOpenSupabaseModal: () => void;
  onLogout: () => void;
  driversCount?: number;
  currentUser?: AuthUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  sheet,
  sheetsList,
  onSelectSheet,
  onChangeWeekDate,
  onShiftWeek,
  onUpdateHeader,
  onNewWeek,
  onLoadSample,
  onPrint,
  onExportCsv,
  activeTab,
  setActiveTab,
  supabaseStatus,
  syncState,
  lastSavedTime,
  onOpenSupabaseModal,
  onLogout,
  driversCount = 0,
  currentUser,
}) => {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [routeInput, setRouteInput] = useState(sheet.companyRoute);

  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateHeader({
      companyRoute: routeInput.trim() || 'TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON',
    });
    setIsEditingHeader(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs print:hidden">
      {/* Top Banner with Route & Brand */}
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
                
                {/* Supabase Realtime Status Button */}
                <button
                  onClick={onOpenSupabaseModal}
                  className={`text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-bold transition-all cursor-pointer border shadow-2xs ${
                    syncState === 'saving'
                      ? 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse'
                      : supabaseStatus.tableExists
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  }`}
                  title="Conexão com banco de dados Supabase em tempo real. Clique para gerenciar."
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {syncState === 'saving' ? (
                      'Salvando no Supabase...'
                    ) : supabaseStatus.tableExists ? (
                      'Supabase: Tempo Real Ativo'
                    ) : (
                      'Supabase: Criar Tabela'
                    )}
                  </span>
                  {supabaseStatus.tableExists && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  {lastSavedTime && syncState === 'saved' && (
                    <span className="text-[10px] font-normal opacity-80">({lastSavedTime})</span>
                  )}
                </button>
              </div>

              {!isEditingHeader ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <h1 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 leading-tight">
                    {sheet.companyRoute}
                  </h1>
                  <button
                    onClick={() => {
                      setRouteInput(sheet.companyRoute);
                      setIsEditingHeader(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
                    title="Editar nome da rota ou linha"
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
                    placeholder="Nome da Linha / Rota"
                    className="text-sm px-2.5 py-1 border border-blue-400 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 w-80 max-w-full"
                    autoFocus
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

          {/* Week Date Picker & Week Navigation Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Week Navigator (Previous / Date Picker / Next) */}
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-1 gap-1">
              <button
                onClick={() => onShiftWeek(-1)}
                className="p-1.5 text-slate-700 hover:text-blue-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Semana anterior (Segunda a Domingo)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <Calendar className="w-4 h-4 text-blue-700 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase leading-none">
                    Mudar Semana:
                  </span>
                  <input
                    type="date"
                    value={sheet.startDate}
                    onChange={(e) => onChangeWeekDate(e.target.value)}
                    className="text-xs font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                    title="Escolha qualquer dia para carregar a semana correspondente (Segunda a Domingo)"
                  />
                </div>
              </div>

              <button
                onClick={() => onShiftWeek(1)}
                className="p-1.5 text-slate-700 hover:text-blue-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Próxima semana (Segunda a Domingo)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week range indicator */}
            <div className="hidden sm:flex flex-col bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-blue-800 uppercase">
                Período Atual (Seg a Dom)
              </span>
              <span className="font-extrabold text-blue-950 font-mono text-xs">
                {formatDatePtBR(sheet.startDate)} a {formatDatePtBR(sheet.endDate)}
              </span>
            </div>

            {/* Week selector dropdown for stored sheets */}
            <select
              value={sheet.id}
              onChange={(e) => onSelectSheet(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[190px]"
              title="Alternar entre semanas salvas"
            >
              {sheetsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDatePtBR(s.startDate)} a {formatDatePtBR(s.endDate)}
                </option>
              ))}
            </select>

            {/* Nova Semana Button - Sempre visível para gerar nova semana limpa */}
            <button
              id="header-new-week-btn"
              onClick={onNewWeek}
              className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs min-h-[38px]"
              title="Iniciar uma nova semana com caixa zerado"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Semana</span>
            </button>

            {/* User Profile & Logout Button */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {currentUser?.role === 'admin' ? 'Administrador' : 'Motorista'}
                </span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  {currentUser?.role === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  {currentUser?.displayName || 'Usuário'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-2 rounded-xl transition-colors cursor-pointer"
                title="Sair do sistema e voltar para a tela de login"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Sair</span>
              </button>
            </div>
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

            {/* Aba de Gestão de Motoristas (Exclusiva para Administrador) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('drivers')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'drivers'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>3. Gestão de Motoristas</span>
                {driversCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'drivers' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {driversCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab('print')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'print'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>4. Visualizar Impressão</span>
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

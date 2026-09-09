import React from 'react';
import { 
  Calendar, 
  Trash2, 
  ArrowRight, 
  PlusCircle, 
  Download, 
  Bus, 
  Wallet, 
  TrendingUp, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { WeeklySheet } from '../types';
import { calculateWeeklyTotals, formatCurrency, formatDatePtBR } from '../utils/calculations';

interface HistoryViewProps {
  sheets: WeeklySheet[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onNewWeek: () => void;
  onDeleteSheet: (id: string) => void;
  onExportCsv: (sheet: WeeklySheet) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onNewWeek,
  onDeleteSheet,
  onExportCsv,
}) => {
  // Global aggregate stats across all recorded weeks
  let grandTotalArrecadacao = 0;
  let grandTotalDespesas = 0;
  let grandTotalSobraLiquida = 0;

  sheets.forEach((s) => {
    const w = calculateWeeklyTotals(s);
    grandTotalArrecadacao += w.totalArrecadacao;
    grandTotalDespesas += w.totalDespesas;
    grandTotalSobraLiquida += w.totalSobraLiquida;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stats across all weeks */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Histórico de Fechamentos Semanais</span>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              {sheets.length} {sheets.length === 1 ? 'semana' : 'semanas'} registradas
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe o desempenho do caixa ao longo das semanas e exporte dados a qualquer momento.
          </p>
        </div>

        <button
          onClick={onNewWeek}
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Iniciar Nova Semana</span>
        </button>
      </div>

      {/* Aggregate Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Faturamento Acumulado
          </span>
          <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
            {formatCurrency(grandTotalArrecadacao)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Despesas Operacionais Totais
          </span>
          <span className="text-xl font-extrabold text-rose-600 font-mono mt-1 block">
            {formatCurrency(grandTotalDespesas)}
          </span>
        </div>

        <div className="bg-emerald-600 text-white p-4 rounded-xl border border-emerald-700 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider block opacity-90">
            Sobra Líquida Total Acumulada
          </span>
          <span className="text-xl font-extrabold font-mono mt-1 block">
            {formatCurrency(grandTotalSobraLiquida)}
          </span>
        </div>
      </div>

      {/* List of Sheets */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Semanas Salvas no Sistema
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {sheets.map((sheet) => {
            const weekly = calculateWeeklyTotals(sheet);
            const isActive = sheet.id === activeSheetId;
            const isProfitable = weekly.totalSobraLiquida >= 0;

            return (
              <div 
                key={sheet.id}
                className={`p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
                  isActive ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-base">
                        Semana: {formatDatePtBR(sheet.startDate)} a {formatDatePtBR(sheet.endDate)}
                      </h3>
                      {isActive && (
                        <span className="text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Em Edição
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5">
                      {sheet.companyRoute} • Veículo: <strong className="text-slate-800 uppercase">{sheet.vehiclePlate}</strong>
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span>
                        Arrecadação:{' '}
                        <strong className="text-slate-800 font-mono">
                          {formatCurrency(weekly.totalArrecadacao)}
                        </strong>
                      </span>
                      <span>
                        Despesas:{' '}
                        <strong className="text-rose-600 font-mono">
                          {formatCurrency(weekly.totalDespesas)}
                        </strong>
                      </span>
                      <span>
                        Sobra Líquida:{' '}
                        <strong className={`font-mono ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(weekly.totalSobraLiquida)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => onExportCsv(sheet)}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    title="Exportar esta semana para CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {sheets.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja excluir o fechamento da semana ${formatDatePtBR(sheet.startDate)}?`)) {
                          onDeleteSheet(sheet.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      title="Excluir semana"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onSelectSheet(sheet.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{isActive ? 'Abrir Ficha' : 'Selecionar'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};

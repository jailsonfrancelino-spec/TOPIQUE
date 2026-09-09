/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WeeklySheet, DayRecord } from './types';
import { 
  loadAllSheets, 
  saveAllSheets, 
  getActiveSheetId, 
  setActiveSheetId, 
  createNewWeeklySheet, 
  createSampleWeeklySheet, 
  exportSheetToCsv, 
  exportBackupJson,
  getMonday,
  formatDateIso,
  updateSheetDatesForWeek
} from './utils/storage';
import { Header } from './components/Header';
import { DayEditor } from './components/DayEditor';
import { WeeklySummary } from './components/WeeklySummary';
import { PrintableSheet } from './components/PrintableSheet';
import { HistoryView } from './components/HistoryView';
import { NewWeekModal } from './components/NewWeekModal';

export default function App() {
  const [sheets, setSheets] = useState<WeeklySheet[]>(() => loadAllSheets());
  const [activeId, setActiveId] = useState<string>(() => {
    const storedActive = getActiveSheetId();
    const initialSheets = loadAllSheets();
    if (storedActive && initialSheets.some((s) => s.id === storedActive)) {
      return storedActive;
    }
    return initialSheets[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'print' | 'history'>('daily');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false);

  // Sync active sheet
  const activeSheet = sheets.find((s) => s.id === activeId) || sheets[0];

  // Auto-save whenever sheets change
  useEffect(() => {
    if (sheets.length > 0) {
      saveAllSheets(sheets);
    }
  }, [sheets]);

  // Keep activeSheetId in localStorage
  useEffect(() => {
    if (activeId) {
      setActiveSheetId(activeId);
    }
  }, [activeId]);

  const handleSelectSheet = (id: string) => {
    setActiveId(id);
  };

  const handleUpdateHeader = (
    updates: Partial<Pick<WeeklySheet, 'companyRoute' | 'vehiclePlate' | 'startDate' | 'endDate'>>
  ) => {
    if (!activeSheet) return;
    const updated = {
      ...activeSheet,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setSheets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleUpdateDay = (dayId: string, updatedDay: DayRecord) => {
    if (!activeSheet) return;
    const updatedDays = activeSheet.days.map((d) => (d.id === dayId ? updatedDay : d));
    const updatedSheet: WeeklySheet = {
      ...activeSheet,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
  };

  const handleCopyExpensesFromPreviousDay = (currentDayIndex: number) => {
    if (!activeSheet || currentDayIndex <= 0) return;
    const prevDay = activeSheet.days[currentDayIndex - 1];
    const currDay = activeSheet.days[currentDayIndex];

    // Clone expenses from previous day, assigning new IDs
    const clonedExpenses = prevDay.expenses.map((e) => ({
      ...e,
      id: `${currDay.dayOfWeek}-exp-${e.category}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    }));

    handleUpdateDay(currDay.id, {
      ...currDay,
      expenses: clonedExpenses,
    });
  };

  const handleUpdateWeekStartDate = (newIsoDate: string) => {
    if (!activeSheet || !newIsoDate) return;
    const parts = newIsoDate.split('-').map(Number);
    const dateObj = (parts.length === 3 && !isNaN(parts[0]))
      ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
      : new Date();
    
    const mondayObj = getMonday(dateObj);
    const mondayIso = formatDateIso(mondayObj);
    const updatedSheet = updateSheetDatesForWeek(activeSheet, mondayIso);

    setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
  };

  const handleShiftWeek = (delta: number) => {
    if (!activeSheet) return;
    const parts = activeSheet.startDate.split('-').map(Number);
    const dateObj = (parts.length === 3 && !isNaN(parts[0]))
      ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
      : new Date();
    
    dateObj.setDate(dateObj.getDate() + (delta * 7));
    const mondayObj = getMonday(dateObj);
    const mondayIso = formatDateIso(mondayObj);
    const updatedSheet = updateSheetDatesForWeek(activeSheet, mondayIso);

    setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
  };

  const handleCreateNewWeek = (startDate: string, companyRoute: string) => {
    const newSheet = createNewWeeklySheet(startDate, undefined, companyRoute);
    setSheets((prev) => [newSheet, ...prev]);
    setActiveId(newSheet.id);
    setActiveTab('daily');
  };

  const handleDeleteSheet = (sheetId: string) => {
    setSheets((prev) => {
      const remaining = prev.filter((s) => s.id !== sheetId);
      if (remaining.length === 0) {
        const fresh = createNewWeeklySheet();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (activeId === sheetId) {
        setActiveId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleLoadSample = () => {
    if (confirm('Deseja carregar a planilha de exemplo com dados reais de Tianguá x Viçosa?')) {
      const sample = createSampleWeeklySheet();
      setSheets((prev) => {
        const exists = prev.some((s) => s.id === sample.id);
        if (exists) {
          return prev.map((s) => (s.id === sample.id ? sample : s));
        }
        return [sample, ...prev];
      });
      setActiveId(sample.id);
      setActiveTab('daily');
    }
  };

  const handlePrint = () => {
    setActiveTab('print');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleExportCsv = (sheetToExport?: WeeklySheet) => {
    const target = sheetToExport || activeSheet;
    if (target) {
      exportSheetToCsv(target);
    }
  };

  const handleExportJson = () => {
    exportBackupJson(sheets);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].days) {
          setSheets(parsed);
          setActiveId(parsed[0].id);
          alert('Backup importado com sucesso!');
        } else {
          alert('Arquivo JSON com formato inválido.');
        }
      } catch (err) {
        alert('Erro ao carregar arquivo de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      
      {/* Top Header */}
      {activeSheet && (
        <Header
          sheet={activeSheet}
          sheetsList={sheets}
          onSelectSheet={handleSelectSheet}
          onChangeWeekDate={handleUpdateWeekStartDate}
          onShiftWeek={handleShiftWeek}
          onUpdateHeader={handleUpdateHeader}
          onNewWeek={() => setIsNewWeekModalOpen(true)}
          onLoadSample={handleLoadSample}
          onPrint={handlePrint}
          onExportCsv={() => handleExportCsv()}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeSheet ? (
          <>
            {activeTab === 'daily' && (
              <DayEditor
                sheet={activeSheet}
                onUpdateDay={handleUpdateDay}
                onCopyExpensesFromPreviousDay={handleCopyExpensesFromPreviousDay}
                selectedDayIndex={selectedDayIndex}
                onSelectDayIndex={setSelectedDayIndex}
              />
            )}

            {activeTab === 'weekly' && (
              <WeeklySummary
                sheet={activeSheet}
                onPrint={handlePrint}
                onExportCsv={() => handleExportCsv()}
                onNavigateToDay={(dayIdx) => {
                  setSelectedDayIndex(dayIdx);
                  setActiveTab('daily');
                }}
              />
            )}

            {activeTab === 'print' && (
              <PrintableSheet sheet={activeSheet} />
            )}

            {activeTab === 'history' && (
              <HistoryView
                sheets={sheets}
                activeSheetId={activeId}
                onSelectSheet={(id) => {
                  handleSelectSheet(id);
                  setActiveTab('daily');
                }}
                onNewWeek={() => setIsNewWeekModalOpen(true)}
                onDeleteSheet={handleDeleteSheet}
                onExportCsv={(s) => handleExportCsv(s)}
              />
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-lg font-bold text-slate-700">Nenhuma ficha semanal encontrada</h2>
            <button
              onClick={() => handleCreateNewWeek('2026-09-07', 'TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON')}
              className="mt-4 px-4 py-2 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800"
            >
              Criar Nova Ficha
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON</strong> • Fluxo de Caixa Operacional
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Controle Diário, Fechamento Semanal e Comprovantes em Imagem para WhatsApp</span>
          </div>
        </div>
      </footer>

      {/* Modal for creating a new week */}
      {activeSheet && (
        <NewWeekModal
          isOpen={isNewWeekModalOpen}
          onClose={() => setIsNewWeekModalOpen(false)}
          onCreate={handleCreateNewWeek}
          defaultRoute={activeSheet.companyRoute}
        />
      )}

    </div>
  );
}

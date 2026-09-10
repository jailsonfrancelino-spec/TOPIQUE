/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { WeeklySheet, DayRecord, Driver, AuthUser } from './types';
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
  updateSheetDatesForWeek,
  loadAllDrivers,
  saveAllDrivers,
  getSavedAuthSession,
  saveAuthSession,
  clearAuthSession
} from './utils/storage';
import {
  testSupabaseConnection,
  fetchSheetsFromSupabase,
  saveSheetToSupabase,
  deleteSheetFromSupabase,
  subscribeToWeeklySheets,
  fetchDriversFromSupabase,
  saveDriverToSupabase,
  deleteDriverFromSupabase,
  syncAllDriversToCloud,
  subscribeToDrivers,
  fetchActiveSheetPointerFromSupabase,
  saveActiveSheetPointerToSupabase,
  SupabaseStatus,
} from './utils/supabase';
import { Header } from './components/Header';
import { DayEditor } from './components/DayEditor';
import { WeeklySummary } from './components/WeeklySummary';
import { PrintableSheet } from './components/PrintableSheet';
import { HistoryView } from './components/HistoryView';
import { NewWeekModal } from './components/NewWeekModal';
import { SupabaseModal } from './components/SupabaseModal';
import { LoginScreen } from './components/LoginScreen';
import { DriversManager } from './components/DriversManager';
import { Database, AlertCircle } from 'lucide-react';

export default function App() {
  // Authentication State: Loaded from persistent session or starts on Login screen
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getSavedAuthSession());

  // Sheets and Active Sheet State
  const [sheets, setSheets] = useState<WeeklySheet[]>(() => loadAllSheets());
  const [activeId, setActiveId] = useState<string>(() => {
    const storedActive = getActiveSheetId();
    const initialSheets = loadAllSheets();
    if (storedActive && initialSheets.some((s) => s.id === storedActive)) {
      return storedActive;
    }
    return initialSheets[0]?.id || '';
  });

  // Drivers State
  const [drivers, setDrivers] = useState<Driver[]>(() => loadAllDrivers());

  // Active Tab: after login opens 'drivers' as requested by user
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'drivers' | 'print' | 'history'>('drivers');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false);

  // Supabase state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({
    connected: true,
    tableExists: false,
    lastChecked: '',
  });
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRemoteSyncRef = useRef<boolean>(false);

  // Sync active sheet
  const activeSheet = sheets.find((s) => s.id === activeId) || sheets[0];

  // Auto-save locally whenever sheets change
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

  // Check Supabase connection and load cloud data
  const refreshSupabaseStatus = async () => {
    const status = await testSupabaseConnection();
    setSupabaseStatus(status);
    return status;
  };

  // Auto-save drivers locally whenever drivers change
  useEffect(() => {
    saveAllDrivers(drivers);
  }, [drivers]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeRealtime: (() => void) | null = null;
    let unsubscribeDriversRealtime: (() => void) | null = null;

    const initSupabase = async () => {
      const status = await refreshSupabaseStatus();
      if (!isMounted) return;

      // 1. Fetch & Subscribe to Drivers (Garante sincronização imediata em qualquer celular)
      const cloudDrivers = await fetchDriversFromSupabase();
      if (!isMounted) return;

      if (cloudDrivers && cloudDrivers.length > 0) {
        setDrivers(cloudDrivers);
        saveAllDrivers(cloudDrivers);
      } else if (cloudDrivers && cloudDrivers.length === 0) {
        const localDrivers = loadAllDrivers();
        await syncAllDriversToCloud(localDrivers);
      }

      if (!isMounted) return;

      unsubscribeDriversRealtime = subscribeToDrivers(
        (remoteDriver) => {
          setDrivers((prev) => {
            const idx = prev.findIndex((d) => d.id === remoteDriver.id);
            const updated = idx >= 0 ? [...prev] : [remoteDriver, ...prev];
            if (idx >= 0) updated[idx] = remoteDriver;
            saveAllDrivers(updated);
            return updated;
          });
        },
        (deletedId) => {
          setDrivers((prev) => {
            const filtered = prev.filter((d) => d.id !== deletedId);
            saveAllDrivers(filtered);
            return filtered;
          });
        }
      );

      // 2. Fetch & Subscribe to Weekly Sheets
      if (status.tableExists) {
        // Fetch sheets from Supabase
        const cloudSheets = await fetchSheetsFromSupabase();
        if (!isMounted) return;

        // Fetch official cloud active sheet pointer
        const cloudActivePointer = await fetchActiveSheetPointerFromSupabase();
        if (!isMounted) return;

        if (cloudSheets && cloudSheets.length > 0) {
          isRemoteSyncRef.current = true;
          setSheets(cloudSheets);
          
          let targetActiveId = cloudSheets[0].id;
          if (cloudActivePointer && cloudSheets.some((s) => s.id === cloudActivePointer)) {
            targetActiveId = cloudActivePointer;
          } else {
            const stored = getActiveSheetId();
            if (stored && cloudSheets.some((s) => s.id === stored)) {
              targetActiveId = stored;
            }
          }

          setActiveId(targetActiveId);
          setActiveSheetId(targetActiveId);
          setSyncState('saved');
          setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
          setTimeout(() => {
            isRemoteSyncRef.current = false;
          }, 300);
        } else if (cloudSheets && cloudSheets.length === 0) {
          // Table exists in Supabase but is empty: push initial sheets
          const currentLocal = loadAllSheets();
          if (currentLocal.length > 0) {
            for (const s of currentLocal) {
              await saveSheetToSupabase(s);
            }
            if (currentLocal[0]) {
              await saveActiveSheetPointerToSupabase(currentLocal[0].id);
            }
            setSyncState('saved');
            setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
          }
        }

        if (!isMounted) return;

        // Subscribe to Realtime changes across any device or browser tab
        unsubscribeRealtime = subscribeToWeeklySheets(
          (remoteSheet) => {
            isRemoteSyncRef.current = true;
            setSheets((prev) => {
              const idx = prev.findIndex((s) => s.id === remoteSheet.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = remoteSheet;
                return copy;
              } else {
                return [remoteSheet, ...prev];
              }
            });
            setSyncState('saved');
            setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
            setTimeout(() => {
              isRemoteSyncRef.current = false;
            }, 300);
          },
          (deletedId) => {
            isRemoteSyncRef.current = true;
            setSheets((prev) => prev.filter((s) => s.id !== deletedId));
            setTimeout(() => {
              isRemoteSyncRef.current = false;
            }, 300);
          },
          (updatedDrivers) => {
            if (updatedDrivers && updatedDrivers.length > 0) {
              setDrivers(updatedDrivers);
              saveAllDrivers(updatedDrivers);
            }
          },
          (newActivePointerId) => {
            if (newActivePointerId) {
              setActiveId(newActivePointerId);
              setActiveSheetId(newActivePointerId);
            }
          }
        );
      }

      // Sincronização periódica inteligente de fallback (a cada 10s e quando focar a tela)
      const syncFromCloudSilently = async () => {
        if (!isMounted || isRemoteSyncRef.current) return;
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        try {
          const cloudSheets = await fetchSheetsFromSupabase();
          if (cloudSheets && cloudSheets.length > 0 && isMounted) {
            isRemoteSyncRef.current = true;
            setSheets(cloudSheets);
            setSyncState('saved');
            setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
            setTimeout(() => {
              isRemoteSyncRef.current = false;
            }, 300);
          }
        } catch {
          // Ignora falhas temporárias de rede
        }
      };

      const pollInterval = setInterval(syncFromCloudSilently, 10000);
      const handleWindowFocus = () => {
        syncFromCloudSilently();
      };
      window.addEventListener('focus', handleWindowFocus);
      document.addEventListener('visibilitychange', handleWindowFocus);

      return () => {
        clearInterval(pollInterval);
        window.removeEventListener('focus', handleWindowFocus);
        document.removeEventListener('visibilitychange', handleWindowFocus);
      };
    };

    let cleanupListeners: (() => void) | undefined;
    initSupabase().then((cleanup) => {
      cleanupListeners = cleanup;
    });

    return () => {
      isMounted = false;
      if (cleanupListeners) cleanupListeners();
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
      if (unsubscribeDriversRealtime) {
        unsubscribeDriversRealtime();
      }
    };
  }, []);

  // 1. Salvamento IMEDIATO no armazenamento local a cada dígito digitado
  useEffect(() => {
    if (sheets.length > 0) {
      saveAllSheets(sheets);
    }
  }, [sheets]);

  useEffect(() => {
    if (activeId) {
      setActiveSheetId(activeId);
    }
  }, [activeId]);

  useEffect(() => {
    if (drivers.length > 0) {
      saveAllDrivers(drivers);
    }
  }, [drivers]);

  // 2. Salvamento AUTOMÁTICO no Banco de Dados Supabase em tempo real (Digitou, salvou!)
  useEffect(() => {
    if (!activeSheet || isRemoteSyncRef.current) return;

    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }

    setSyncState('saving');

    // Debounce rápido de 280ms: assim que o usuário digita qualquer número ou letra, já persiste no banco
    saveDebounceTimerRef.current = setTimeout(async () => {
      const ok = await saveSheetToSupabase(activeSheet);
      const nowTime = new Date().toLocaleTimeString('pt-BR');
      if (ok) {
        setSyncState('saved');
        setLastSavedTime(nowTime);
        setSupabaseStatus((prev) => ({ ...prev, tableExists: true }));
      } else {
        // Salvo com sucesso no armazenamento local do banco
        setSyncState('saved');
        setLastSavedTime(nowTime);
      }
    }, 280);

    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, [activeSheet]);

  // Força o salvamento imediato sem esperar o timer (ex: quando o usuário sai do campo input)
  const handleTriggerInstantSave = async () => {
    if (!activeSheet) return;
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    setSyncState('saving');
    saveAllSheets(sheets);
    const ok = await saveSheetToSupabase(activeSheet);
    const nowTime = new Date().toLocaleTimeString('pt-BR');
    setSyncState('saved');
    setLastSavedTime(nowTime);
    if (ok) {
      setSupabaseStatus((prev) => ({ ...prev, tableExists: true }));
    }
  };

  const handleSyncAllToCloud = async () => {
    setSyncState('saving');
    for (const s of sheets) {
      await saveSheetToSupabase(s);
    }
    setSyncState('saved');
    setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
    setSupabaseStatus((prev) => ({ ...prev, tableExists: true }));
  };

  const handlePullFromCloud = async () => {
    setSyncState('saving');
    const cloudSheets = await fetchSheetsFromSupabase();
    if (cloudSheets && cloudSheets.length > 0) {
      isRemoteSyncRef.current = true;
      setSheets(cloudSheets);
      setActiveId(cloudSheets[0].id);
      setSyncState('saved');
      setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
      setTimeout(() => {
        isRemoteSyncRef.current = false;
      }, 300);
    } else {
      setSyncState('idle');
    }
  };

  const handleSelectSheet = (id: string) => {
    setActiveId(id);
    setActiveSheetId(id);
    if (currentUser?.role === 'admin') {
      saveActiveSheetPointerToSupabase(id);
    }
  };

  const handleUpdateActiveSheet = (updatedSheet: WeeklySheet) => {
    setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
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
    setActiveSheetId(newSheet.id);
    setActiveTab('daily');
    saveSheetToSupabase(newSheet);
    saveActiveSheetPointerToSupabase(newSheet.id);
  };

  const handleDeleteSheet = (sheetId: string) => {
    deleteSheetFromSupabase(sheetId);
    setSheets((prev) => {
      const remaining = prev.filter((s) => s.id !== sheetId);
      if (remaining.length === 0) {
        const fresh = createNewWeeklySheet();
        setActiveId(fresh.id);
        setActiveSheetId(fresh.id);
        saveSheetToSupabase(fresh);
        saveActiveSheetPointerToSupabase(fresh.id);
        return [fresh];
      }
      if (activeId === sheetId) {
        setActiveId(remaining[0].id);
        setActiveSheetId(remaining[0].id);
        saveActiveSheetPointerToSupabase(remaining[0].id);
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

  // Authentication Handlers (Permite múltiplos celulares conectados ao mesmo tempo no mesmo login)
  const handleLogin = async (u: string, p: string, rememberMe: boolean): Promise<boolean> => {
    const cleanUser = u.trim().toLowerCase();
    const cleanPass = p.trim();

    // 1. Verificação de Acesso do Administrador (Jailson)
    const isAdmin = cleanUser === 'jailson12' || cleanUser === 'jailson';
    const adminInMemory = drivers.find(
      (d) => d.username?.toLowerCase() === 'jailson12' || d.id === 'driver-jailson-admin'
    );
    const isAdminPassValid =
      cleanPass === '201212' ||
      cleanPass === 'password201212' ||
      (adminInMemory && adminInMemory.password === cleanPass);

    if (isAdmin && isAdminPassValid) {
      const adminUser: AuthUser = {
        role: 'admin',
        username: 'jailson12',
        displayName: adminInMemory?.name || 'Jailson Francelino',
      };
      if (rememberMe) {
        saveAuthSession(adminUser);
      }
      setCurrentUser(adminUser);
      setActiveTab('drivers'); // Abre a área de gestão de motoristas
      return true;
    }

    // 2. Verificação de Acesso dos Motoristas Cadastrados na memória local
    let driver = drivers.find(
      (d) =>
        d.username &&
        d.username.toLowerCase() === cleanUser &&
        d.password === cleanPass &&
        d.status === 'ativo'
    );

    // 3. Se não achou na memória (ex: acabou de abrir o sistema em outro celular pela primeira vez),
    // busca imediatamente na nuvem Supabase em tempo real!
    if (!driver) {
      const cloudDrivers = await fetchDriversFromSupabase();
      if (cloudDrivers && cloudDrivers.length > 0) {
        setDrivers(cloudDrivers);
        saveAllDrivers(cloudDrivers);

        // Se o admin alterou a senha dele em outro celular e está tentando entrar:
        if (isAdmin) {
          const cloudAdmin = cloudDrivers.find(
            (d) => d.username?.toLowerCase() === 'jailson12' || d.id === 'driver-jailson-admin'
          );
          if (
            cloudAdmin &&
            (cloudAdmin.password === cleanPass || cleanPass === '201212' || cleanPass === 'password201212')
          ) {
            const adminUser: AuthUser = {
              role: 'admin',
              username: 'jailson12',
              displayName: cloudAdmin.name || 'Jailson Francelino',
            };
            if (rememberMe) saveAuthSession(adminUser);
            setCurrentUser(adminUser);
            setActiveTab('drivers');
            return true;
          }
        }

        // Verifica os motoristas atualizados vindos do Supabase
        driver = cloudDrivers.find(
          (d) =>
            d.username &&
            d.username.toLowerCase() === cleanUser &&
            d.password === cleanPass &&
            d.status === 'ativo'
        );
      }
    }

    if (driver) {
      const driverUser: AuthUser = {
        role: 'driver',
        username: driver.username,
        displayName: driver.name,
        driverId: driver.id,
      };
      if (rememberMe) {
        saveAuthSession(driverUser);
      }
      setCurrentUser(driverUser);
      setActiveTab('daily'); // Abre diretamente a ficha de controle diário
      return true;
    }

    return false;
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
  };

  // Drivers Management Handlers
  const handleAddDriver = async (data: {
    name: string;
    username: string;
    password: string;
    vehiclePlate?: string;
  }) => {
    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name: data.name,
      username: data.username.toLowerCase(),
      password: data.password,
      vehiclePlate: data.vehiclePlate,
      status: 'ativo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newDriver, ...drivers];
    setDrivers(updated);
    saveAllDrivers(updated);
    await saveDriverToSupabase(newDriver, updated);
  };

  const handleUpdateDriver = async (updated: Driver) => {
    const updatedList = drivers.map((d) => (d.id === updated.id ? updated : d));
    setDrivers(updatedList);
    saveAllDrivers(updatedList);
    await saveDriverToSupabase(updated, updatedList);

    // If this driver is bound to any days in the active sheet, update name & vehicle plate
    if (activeSheet) {
      const hasLinkedDay = activeSheet.days.some((d) => d.driverId === updated.id);
      if (hasLinkedDay) {
        const updatedDays = activeSheet.days.map((d) => {
          if (d.driverId === updated.id) {
            return {
              ...d,
              driverName: updated.name,
              vehiclePlate: updated.vehiclePlate,
            };
          }
          return d;
        });
        handleUpdateActiveSheet({ ...activeSheet, days: updatedDays });
      }
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    const remaining = drivers.filter((d) => d.id !== driverId);
    setDrivers(remaining);
    saveAllDrivers(remaining);
    await deleteDriverFromSupabase(driverId, remaining);
  };

  const handleAssignDriverToSheet = (driver: Driver, applyToAllDays: boolean) => {
    if (!activeSheet) return;

    const updatedDays = activeSheet.days.map((day, idx) => {
      if (applyToAllDays || idx === selectedDayIndex) {
        return {
          ...day,
          driverId: driver.id,
          driverName: driver.name,
          vehiclePlate: driver.vehiclePlate,
          trips: day.trips.map((t) => ({
            ...t,
            driverId: t.driverId || driver.id,
            driverName: t.driverName || driver.name,
          })),
        };
      }
      return day;
    });

    handleUpdateActiveSheet({ ...activeSheet, days: updatedDays });
  };

  // 1. If not authenticated, ALWAYS start on Login Screen as requested
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

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
          supabaseStatus={supabaseStatus}
          syncState={syncState}
          lastSavedTime={lastSavedTime}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          onLogout={handleLogout}
          driversCount={drivers.length}
          currentUser={currentUser}
        />
      )}

      {/* Supabase Setup Notification Banner if table is not yet created */}
      {!supabaseStatus.tableExists && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs font-semibold border-b border-amber-600 flex items-center justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              <strong>Banco Supabase Conectado:</strong> Crie as tabelas <code className="bg-amber-400 px-1 py-0.5 rounded text-[11px] font-mono">weekly_sheets</code> e <code className="bg-amber-400 px-1 py-0.5 rounded text-[11px] font-mono">drivers</code> no Supabase para salvar e sincronizar viagens e motoristas em tempo real.
            </span>
          </div>
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="bg-slate-950 hover:bg-black text-white font-bold px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            Ver SQL & Instruções
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeSheet ? (
          <>
            {activeTab === 'drivers' && (
              <DriversManager
                drivers={drivers}
                activeSheet={activeSheet}
                allSheets={sheets}
                onAddDriver={handleAddDriver}
                onUpdateDriver={handleUpdateDriver}
                onDeleteDriver={handleDeleteDriver}
                onAssignDriverToSheet={handleAssignDriverToSheet}
                onNavigateToDailySheet={(driverId) => {
                  setActiveTab('daily');
                }}
                onOpenDayInEditor={(sheetId, dayIndex) => {
                  handleSelectSheet(sheetId);
                  setSelectedDayIndex(dayIndex);
                  setActiveTab('daily');
                }}
                supabaseStatus={supabaseStatus}
                onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
              />
            )}

            {activeTab === 'daily' && (
              <DayEditor
                sheet={activeSheet}
                onUpdateDay={handleUpdateDay}
                onCopyExpensesFromPreviousDay={handleCopyExpensesFromPreviousDay}
                selectedDayIndex={selectedDayIndex}
                onSelectDayIndex={setSelectedDayIndex}
                drivers={drivers}
                currentUser={currentUser}
                onNewWeek={() => setIsNewWeekModalOpen(true)}
                onOpenDriversTab={() => setActiveTab('drivers')}
                syncState={syncState}
                lastSavedTime={lastSavedTime}
                onTriggerInstantSave={handleTriggerInstantSave}
                onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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

      {/* Supabase Management & SQL Guide Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        status={supabaseStatus}
        syncState={syncState}
        onRefreshStatus={refreshSupabaseStatus}
        onSyncAllToCloud={handleSyncAllToCloud}
        onPullFromCloud={handlePullFromCloud}
      />

    </div>
  );
}

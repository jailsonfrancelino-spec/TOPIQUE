import { DayRecord, ExpenseRecord, TripRecord, WeeklySheet, Driver, AuthUser } from '../types';
import { calculateDayTotals, calculateTripSubtotal, calculateWeeklyTotals, formatCurrencySimple } from './calculations';

const STORAGE_KEY = 'transport_cashflow_sheets_v1';
const ACTIVE_SHEET_ID_KEY = 'transport_cashflow_active_id_v1';
const DRIVERS_STORAGE_KEY = 'transport_cashflow_drivers_v1';
const AUTH_SESSION_KEY = 'transport_cashflow_auth_session_v1';
export const DEFAULT_ROUTE = 'TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON';

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'driver-jailson-admin',
    name: 'Jailson Francelino',
    username: 'jailson12',
    password: 'password201212',
    phone: '(88) 99912-3456',
    vehiclePlate: 'BRA-2E19',
    vehicleModel: 'Van Sprinter / Micro Linha',
    status: 'ativo',
    notes: 'Motorista Principal e Administrador da Rota Tianguá x Viçosa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export function getSavedAuthSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler sessão salva:', err);
    return null;
  }
}

export function saveAuthSession(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Erro ao salvar sessão local:', err);
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (err) {
    console.error('Erro ao limpar sessão:', err);
  }
}

export function loadAllDrivers(): Driver[] {
  try {
    const raw = localStorage.getItem(DRIVERS_STORAGE_KEY);
    if (!raw) {
      saveAllDrivers(INITIAL_DRIVERS);
      return INITIAL_DRIVERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Garantir compatibilidade com drivers antigos sem username/password
      return parsed.map((d: any) => ({
        ...d,
        username: d.username || d.name?.toLowerCase().replace(/\s+/g, '') || 'motorista',
        password: d.password || '123456',
      }));
    }
    return INITIAL_DRIVERS;
  } catch (err) {
    console.error('Erro ao carregar motoristas locais:', err);
    return INITIAL_DRIVERS;
  }
}

export function saveAllDrivers(drivers: Driver[]): void {
  try {
    localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
  } catch (err) {
    console.error('Erro ao salvar motoristas no localStorage:', err);
  }
}

/**
 * Retorna sempre a SEGUNDA-FEIRA correspondente à data fornecida,
 * usando meio-dia (12:00) para evitar desvios de fuso horário / UTC.
 * Domingo (0) volta 6 dias para a Segunda da mesma semana.
 */
export function getMonday(input?: Date | string): Date {
  let date: Date;
  if (!input) {
    const now = new Date();
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  } else if (typeof input === 'string') {
    const cleanStr = input.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    } else {
      const now = new Date();
      date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    }
  } else {
    date = new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0);
  }

  const day = date.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff, 12, 0, 0);
}

export function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Desloca a semana atual em N semanas (ex: -1 para semana anterior, +1 para próxima)
 */
export function shiftWeekIso(startDateIso: string, weeksDelta: number): string {
  const currentMonday = getMonday(startDateIso);
  currentMonday.setDate(currentMonday.getDate() + weeksDelta * 7);
  return formatDateIso(currentMonday);
}

export function createEmptyDay(dayOfWeek: DayRecord['dayOfWeek'], dayLabel: string, dateIso: string): DayRecord {
  const tripsCount = dayOfWeek === 'domingo' ? 1 : 4;
  const trips: TripRecord[] = [];

  for (let i = 1; i <= tripsCount; i++) {
    trips.push({
      id: `${dayOfWeek}-trip-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tripName: `${i}ª Viagem`,
      ida: 0,
      volta: 0,
      encom: 0,
      pix: 0,
    });
  }

  const expenses: ExpenseRecord[] = dayOfWeek === 'domingo'
    ? [
        {
          id: `${dayOfWeek}-exp-dom-${Date.now()}`,
          category: 'outras',
          label: 'Despesas Dom.',
          value: 0,
        },
      ]
    : [
        {
          id: `${dayOfWeek}-exp-motorista-${Date.now()}`,
          category: 'motorista',
          label: 'Motorista',
          value: 0,
        },
        {
          id: `${dayOfWeek}-exp-cobrador-${Date.now()}`,
          category: 'cobrador',
          label: 'Cobrador',
          value: 0,
        },
        {
          id: `${dayOfWeek}-exp-combustivel-${Date.now()}`,
          category: 'combustivel',
          label: 'Combustível',
          value: 0,
        },
        {
          id: `${dayOfWeek}-exp-outras-${Date.now()}`,
          category: 'outras',
          label: 'Outras Desp.',
          value: 0,
        },
      ];

  return {
    id: `${dayOfWeek}-${Date.now()}`,
    dayOfWeek,
    dayLabel,
    date: dateIso,
    trips,
    expenses,
  };
}

export function createNewWeeklySheet(startDateInput?: string, _vehiclePlate?: string, route = DEFAULT_ROUTE): WeeklySheet {
  const monday = getMonday(startDateInput);
  
  const dayConfigs: { dayOfWeek: DayRecord['dayOfWeek']; label: string; offset: number }[] = [
    { dayOfWeek: 'segunda', label: 'Segunda-feira', offset: 0 },
    { dayOfWeek: 'terca', label: 'Terça-feira', offset: 1 },
    { dayOfWeek: 'quarta', label: 'Quarta-feira', offset: 2 },
    { dayOfWeek: 'quinta', label: 'Quinta-feira', offset: 3 },
    { dayOfWeek: 'sexta', label: 'Sexta-feira', offset: 4 },
    { dayOfWeek: 'sabado', label: 'Sábado', offset: 5 },
    { dayOfWeek: 'domingo', label: 'Domingo (Caso Haja Viagem)', offset: 6 },
  ];

  const days: DayRecord[] = dayConfigs.map((cfg) => {
    const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + cfg.offset, 12, 0, 0);
    return createEmptyDay(cfg.dayOfWeek, cfg.label, formatDateIso(dayDate));
  });

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);

  return {
    id: `sheet-${Date.now()}`,
    companyRoute: route,
    startDate: formatDateIso(monday),
    endDate: formatDateIso(sunday),
    days,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Atualiza com precisão as datas de uma ficha existente para uma nova semana
 * garantindo início na Segunda-feira e término no Domingo.
 */
export function updateSheetDatesForWeek(sheet: WeeklySheet, anyDateInWeek: string): WeeklySheet {
  const monday = getMonday(anyDateInWeek);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);

  const updatedDays = sheet.days.map((day, idx) => {
    const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx, 12, 0, 0);
    return {
      ...day,
      date: formatDateIso(dayDate),
    };
  });

  return {
    ...sheet,
    startDate: formatDateIso(monday),
    endDate: formatDateIso(sunday),
    days: updatedDays,
    updatedAt: new Date().toISOString(),
  };
}

export function createSampleWeeklySheet(): WeeklySheet {
  // Caixa inicia 100% ZERADO para o motorista/administrador ir alimentando
  const sheet = createNewWeeklySheet(formatDateIso(getMonday()), undefined, DEFAULT_ROUTE);
  sheet.id = 'sheet-zerada-tiangua-vicosa';
  return sheet;
}

export function zeroOutSheet(sheet: WeeklySheet): WeeklySheet {
  return {
    ...sheet,
    days: sheet.days.map((day) => ({
      ...day,
      trips: day.trips.map((t) => ({ ...t, ida: 0, volta: 0, encom: 0, pix: 0 })),
      expenses: day.expenses.map((e) => ({ ...e, value: 0, receiptImage: undefined, receiptName: undefined })),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function loadAllSheets(): WeeklySheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const clean = createSampleWeeklySheet();
      saveAllSheets([clean]);
      setActiveSheetId(clean.id);
      return [clean];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Se for a planilha de exemplo antiga com valores fictícios pré-preenchidos, zera automaticamente
      const updated = parsed.map((s: WeeklySheet) => {
        if (s.id === 'sheet-sample-tiangua-vicosa') {
          return zeroOutSheet(s);
        }
        return s;
      });
      return updated;
    }
  } catch (err) {
    console.error('Erro ao ler do localStorage:', err);
  }
  const clean = createSampleWeeklySheet();
  saveAllSheets([clean]);
  setActiveSheetId(clean.id);
  return [clean];
}

export function saveAllSheets(sheets: WeeklySheet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }
}

export function getActiveSheetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SHEET_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveSheetId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_SHEET_ID_KEY, id);
  } catch (err) {
    console.error('Erro ao salvar active sheet ID:', err);
  }
}

export function exportSheetToCsv(sheet: WeeklySheet): void {
  const lines: string[] = [];

  lines.push(`"FICHA DE CONTROLE DIÁRIO E SEMANAL"`);
  lines.push(`"ROTA: ${sheet.companyRoute}"`);
  lines.push(`"PERÍODO: De ${sheet.startDate} a ${sheet.endDate}"`);
  lines.push('');

  // Daily details
  for (const day of sheet.days) {
    const totals = calculateDayTotals(day);
    lines.push(`"--- ${day.dayLabel.toUpperCase()} (Data: ${day.date}) ---"`);
    lines.push(`"VIAGEM","IDA (R$)","VOLTA (R$)","ENCOM. (R$)","PIX (R$)","SUBTOTAL (R$)"`);
    for (const t of day.trips) {
      const sub = calculateTripSubtotal(t);
      lines.push(`"${t.tripName}","${formatCurrencySimple(t.ida)}","${formatCurrencySimple(t.volta)}","${formatCurrencySimple(t.encom)}","${formatCurrencySimple(t.pix)}","${formatCurrencySimple(sub)}"`);
    }
    lines.push(`"DESPESAS:"`);
    for (const e of day.expenses) {
      lines.push(`"${e.label}","${formatCurrencySimple(e.value)}"`);
    }
    lines.push(`"TOTAL ARRECADADO:","${formatCurrencySimple(totals.totalArrecadado)}"`);
    lines.push(`"TOTAL DESPESAS:","${formatCurrencySimple(totals.totalDespesas)}"`);
    lines.push(`"TOTAL DINHEIRO:","${formatCurrencySimple(totals.totalDinheiro)}"`);
    lines.push(`"TOTAL PIX:","${formatCurrencySimple(totals.totalPix)}"`);
    lines.push(`"SOBRA LÍQUIDA:","${formatCurrencySimple(totals.sobraLiquida)}"`);
    lines.push('');
  }

  // Summary Table (Page 2)
  lines.push(`"RESUMO DO FECHAMENTO SEMANAL (SEGUNDA A DOMINGO)"`);
  lines.push(`"DIA DA SEMANA","ARRECADAÇÃO (R$)","DESPESAS (R$)","DINHEIRO (R$)","PIX (R$)","SOBRA LÍQUIDA (R$)"`);
  const weekly = calculateWeeklyTotals(sheet);
  for (const row of weekly.daysSummary) {
    lines.push(`"${row.dayLabel}","${formatCurrencySimple(row.arrecadacao)}","${formatCurrencySimple(row.despesas)}","${formatCurrencySimple(row.dinheiro)}","${formatCurrencySimple(row.pix)}","${formatCurrencySimple(row.sobraLiquida)}"`);
  }
  lines.push(`"TOTAL DA SEMANA","${formatCurrencySimple(weekly.totalArrecadacao)}","${formatCurrencySimple(weekly.totalDespesas)}","${formatCurrencySimple(weekly.totalDinheiro)}","${formatCurrencySimple(weekly.totalPix)}","${formatCurrencySimple(weekly.totalSobraLiquida)}"`);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `fechamento_transporte_${sheet.startDate}_a_${sheet.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBackupJson(sheets: WeeklySheet[]): void {
  const jsonStr = JSON.stringify(sheets, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_fluxo_caixa_transporte_${formatDateIso(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

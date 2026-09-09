import { DayRecord, ExpenseRecord, TripRecord, WeeklySheet } from '../types';
import { calculateDayTotals, calculateTripSubtotal, calculateWeeklyTotals, formatCurrencySimple } from './calculations';

const STORAGE_KEY = 'transport_cashflow_sheets_v1';
const ACTIVE_SHEET_ID_KEY = 'transport_cashflow_active_id_v1';
export const DEFAULT_ROUTE = 'TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON';

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
  const sheet = createNewWeeklySheet('2026-09-07', undefined, DEFAULT_ROUTE);
  sheet.id = 'sheet-sample-tiangua-vicosa';

  // Sample data realistic for Tianguá x Viçosa (Passageiros e Encomendas)
  // Segunda
  sheet.days[0].trips[0] = { ...sheet.days[0].trips[0], ida: 240, volta: 260, encom: 80, pix: 180 };
  sheet.days[0].trips[1] = { ...sheet.days[0].trips[1], ida: 190, volta: 220, encom: 50, pix: 120 };
  sheet.days[0].trips[2] = { ...sheet.days[0].trips[2], ida: 210, volta: 180, encom: 90, pix: 140 };
  sheet.days[0].trips[3] = { ...sheet.days[0].trips[3], ida: 280, volta: 310, encom: 110, pix: 220 };
  sheet.days[0].expenses[0].value = 130; // Motorista
  sheet.days[0].expenses[1].value = 80;  // Cobrador
  sheet.days[0].expenses[2].value = 240; // Combustível
  sheet.days[0].expenses[3].value = 35;  // Outras (Pedágio/Lanche)
  sheet.days[0].trips[3] = { ...sheet.days[0].trips[3], ida: 280, volta: 310, encom: 110, pix: 220 };
  sheet.days[0].expenses[0].value = 130; // Motorista
  sheet.days[0].expenses[1].value = 80;  // Cobrador
  sheet.days[0].expenses[2].value = 240; // Combustível
  sheet.days[0].expenses[3].value = 35;  // Outras (Pedágio/Lanche)

  // Terça
  sheet.days[1].trips[0] = { ...sheet.days[1].trips[0], ida: 210, volta: 230, encom: 60, pix: 150 };
  sheet.days[1].trips[1] = { ...sheet.days[1].trips[1], ida: 180, volta: 190, encom: 40, pix: 90 };
  sheet.days[1].trips[2] = { ...sheet.days[1].trips[2], ida: 200, volta: 220, encom: 75, pix: 130 };
  sheet.days[1].trips[3] = { ...sheet.days[1].trips[3], ida: 260, volta: 270, encom: 85, pix: 190 };
  sheet.days[1].expenses[0].value = 130;
  sheet.days[1].expenses[1].value = 80;
  sheet.days[1].expenses[2].value = 230;
  sheet.days[1].expenses[3].value = 20;

  // Quarta
  sheet.days[2].trips[0] = { ...sheet.days[2].trips[0], ida: 250, volta: 280, encom: 95, pix: 200 };
  sheet.days[2].trips[1] = { ...sheet.days[2].trips[1], ida: 220, volta: 210, encom: 60, pix: 140 };
  sheet.days[2].trips[2] = { ...sheet.days[2].trips[2], ida: 230, volta: 240, encom: 70, pix: 160 };
  sheet.days[2].trips[3] = { ...sheet.days[2].trips[3], ida: 300, volta: 320, encom: 120, pix: 260 };
  sheet.days[2].expenses[0].value = 130;
  sheet.days[2].expenses[1].value = 80;
  sheet.days[2].expenses[2].value = 250;
  sheet.days[2].expenses[3].value = 40;

  // Quinta
  sheet.days[3].trips[0] = { ...sheet.days[3].trips[0], ida: 200, volta: 220, encom: 50, pix: 130 };
  sheet.days[3].trips[1] = { ...sheet.days[3].trips[1], ida: 190, volta: 180, encom: 45, pix: 110 };
  sheet.days[3].trips[2] = { ...sheet.days[3].trips[2], ida: 210, volta: 230, encom: 80, pix: 150 };
  sheet.days[3].trips[3] = { ...sheet.days[3].trips[3], ida: 270, volta: 290, encom: 90, pix: 210 };
  sheet.days[3].expenses[0].value = 130;
  sheet.days[3].expenses[1].value = 80;
  sheet.days[3].expenses[2].value = 220;
  sheet.days[3].expenses[3].value = 25;

  // Sexta (Mais movimento)
  sheet.days[4].trips[0] = { ...sheet.days[4].trips[0], ida: 310, volta: 340, encom: 130, pix: 280 };
  sheet.days[4].trips[1] = { ...sheet.days[4].trips[1], ida: 280, volta: 300, encom: 100, pix: 230 };
  sheet.days[4].trips[2] = { ...sheet.days[4].trips[2], ida: 320, volta: 350, encom: 115, pix: 290 };
  sheet.days[4].trips[3] = { ...sheet.days[4].trips[3], ida: 380, volta: 410, encom: 150, pix: 350 };
  sheet.days[4].expenses[0].value = 150;
  sheet.days[4].expenses[1].value = 90;
  sheet.days[4].expenses[2].value = 280;
  sheet.days[4].expenses[3].value = 50;

  // Sábado
  sheet.days[5].trips[0] = { ...sheet.days[5].trips[0], ida: 290, volta: 260, encom: 85, pix: 210 };
  sheet.days[5].trips[1] = { ...sheet.days[5].trips[1], ida: 250, volta: 240, encom: 70, pix: 180 };
  sheet.days[5].trips[2] = { ...sheet.days[5].trips[2], ida: 220, volta: 210, encom: 60, pix: 140 };
  sheet.days[5].trips[3] = { ...sheet.days[5].trips[3], ida: 240, volta: 250, encom: 65, pix: 170 };
  sheet.days[5].expenses[0].value = 130;
  sheet.days[5].expenses[1].value = 80;
  sheet.days[5].expenses[2].value = 230;
  sheet.days[5].expenses[3].value = 30;

  // Domingo (Caso Haja Viagem - viagem especial)
  sheet.days[6].trips[0] = { ...sheet.days[6].trips[0], ida: 350, volta: 380, encom: 120, pix: 320 };
  sheet.days[6].expenses[0].value = 180; // Despesas Dom.

  return sheet;
}

export function loadAllSheets(): WeeklySheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const sample = createSampleWeeklySheet();
      saveAllSheets([sample]);
      setActiveSheetId(sample.id);
      return [sample];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Erro ao ler do localStorage:', err);
  }
  const sample = createSampleWeeklySheet();
  saveAllSheets([sample]);
  setActiveSheetId(sample.id);
  return [sample];
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

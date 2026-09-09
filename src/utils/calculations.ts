import { CalculatedDayTotals, CalculatedWeeklyTotals, DayRecord, TripRecord, WeeklySheet } from '../types';

export function calculateTripSubtotal(trip: TripRecord): number {
  const ida = Number(trip.ida) || 0;
  const volta = Number(trip.volta) || 0;
  const encom = Number(trip.encom) || 0;
  return ida + volta + encom;
}

export function calculateDayTotals(day: DayRecord): CalculatedDayTotals {
  let totalIda = 0;
  let totalVolta = 0;
  let totalEncom = 0;
  let totalPix = 0;
  let totalArrecadado = 0;

  for (const trip of day.trips) {
    const ida = Number(trip.ida) || 0;
    const volta = Number(trip.volta) || 0;
    const encom = Number(trip.encom) || 0;
    const pix = Number(trip.pix) || 0;

    totalIda += ida;
    totalVolta += volta;
    totalEncom += encom;
    totalPix += pix;
    totalArrecadado += (ida + volta + encom);
  }

  const totalDespesas = day.expenses.reduce((acc, exp) => acc + (Number(exp.value) || 0), 0);
  
  // Conforme a ficha: Total Arrecadado é a soma das viagens (Ida + Volta + Encomendas).
  // Total Dinheiro = Arrecadado - Pix
  // Sobra Líquida = Total Arrecadado - Total Despesas
  // Sobra Real em Dinheiro em Espécie (Físico no Caixa) = Sobra Líquida - Total Pix
  const totalDinheiro = Math.max(0, totalArrecadado - totalPix);
  const sobraLiquida = totalArrecadado - totalDespesas;
  const sobraDinheiroEspecie = sobraLiquida - totalPix;

  return {
    totalArrecadado,
    totalDespesas,
    totalDinheiro,
    totalPix,
    sobraLiquida,
    sobraDinheiroEspecie,
    totalIda,
    totalVolta,
    totalEncom,
  };
}

export function calculateWeeklyTotals(sheet: WeeklySheet): CalculatedWeeklyTotals {
  let totalArrecadacao = 0;
  let totalDespesas = 0;
  let totalDinheiro = 0;
  let totalPix = 0;
  let totalSobraLiquida = 0;
  let totalIda = 0;
  let totalVolta = 0;
  let totalEncomendas = 0;
  let totalCombustivel = 0;
  let totalMotorista = 0;
  let totalCobrador = 0;
  let totalOutrasDespesas = 0;
  let tripsCount = 0;

  const daysSummary = sheet.days.map((day) => {
    const dayTotals = calculateDayTotals(day);
    
    totalArrecadacao += dayTotals.totalArrecadado;
    totalDespesas += dayTotals.totalDespesas;
    totalDinheiro += dayTotals.totalDinheiro;
    totalPix += dayTotals.totalPix;
    totalSobraLiquida += dayTotals.sobraLiquida;
    totalIda += dayTotals.totalIda;
    totalVolta += dayTotals.totalVolta;
    totalEncomendas += dayTotals.totalEncom;

    // Count non-empty trips
    for (const trip of day.trips) {
      if ((trip.ida || 0) > 0 || (trip.volta || 0) > 0 || (trip.encom || 0) > 0) {
        tripsCount++;
      }
    }

    // Expense breakdowns
    for (const exp of day.expenses) {
      const val = Number(exp.value) || 0;
      if (exp.category === 'combustivel') totalCombustivel += val;
      else if (exp.category === 'motorista') totalMotorista += val;
      else if (exp.category === 'cobrador') totalCobrador += val;
      else totalOutrasDespesas += val;
    }

    return {
      dayOfWeek: day.dayOfWeek,
      dayLabel: day.dayLabel,
      date: day.date,
      arrecadacao: dayTotals.totalArrecadado,
      despesas: dayTotals.totalDespesas,
      dinheiro: dayTotals.totalDinheiro,
      pix: dayTotals.totalPix,
      sobraLiquida: dayTotals.sobraLiquida,
      sobraDinheiroEspecie: dayTotals.sobraDinheiroEspecie,
    };
  });

  const totalSobraDinheiroEspecie = totalSobraLiquida - totalPix;

  const margemLucroPercent = totalArrecadacao > 0 
    ? (totalSobraLiquida / totalArrecadacao) * 100 
    : 0;

  return {
    daysSummary,
    totalArrecadacao,
    totalDespesas,
    totalDinheiro,
    totalPix,
    totalSobraLiquida,
    totalSobraDinheiroEspecie,
    totalIda,
    totalVolta,
    totalEncomendas,
    totalCombustivel,
    totalMotorista,
    totalCobrador,
    totalOutrasDespesas,
    tripsCount,
    margemLucroPercent,
  };
}

export function formatCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencySimple(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  // Strip non-numeric characters except comma and dot
  const clean = value.replace(/[^\d,-]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function formatDatePtBR(dateStr: string): string {
  if (!dateStr) return '__/__/____';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

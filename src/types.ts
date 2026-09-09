export interface TripRecord {
  id: string;
  tripName: string; // e.g. "1ª Viagem", "2ª Viagem", etc.
  ida: number;
  volta: number;
  encom: number; // Encomendas
  pix: number;
}

export interface ExpenseRecord {
  id: string;
  category: 'motorista' | 'cobrador' | 'combustivel' | 'outras' | 'extra';
  label: string;
  value: number;
  description?: string;
}

export type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

export interface DayRecord {
  id: string;
  dayOfWeek: DayOfWeek;
  dayLabel: string; // e.g. "Segunda-feira", "Terça-feira", ..., "Domingo (Caso Haja Viagem)"
  date: string; // YYYY-MM-DD or DD/MM/YYYY
  trips: TripRecord[];
  expenses: ExpenseRecord[];
  notes?: string;
}

export interface WeeklySheet {
  id: string;
  companyRoute: string; // e.g. "TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON"
  vehiclePlate?: string; // Optional (not needed per user request)
  vehicleModel?: string;
  weekNumber?: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: DayRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CalculatedDayTotals {
  totalArrecadado: number;
  totalDespesas: number;
  totalDinheiro: number;
  totalPix: number;
  sobraLiquida: number;
  sobraDinheiroEspecie: number; // Sobra Líquida menos Total Pix (Dinheiro físico que sobrou em mãos)
  totalIda: number;
  totalVolta: number;
  totalEncom: number;
}

export interface CalculatedWeeklyTotals {
  daysSummary: {
    dayOfWeek: DayOfWeek;
    dayLabel: string;
    date: string;
    arrecadacao: number;
    despesas: number;
    dinheiro: number;
    pix: number;
    sobraLiquida: number;
    sobraDinheiroEspecie: number;
  }[];
  totalArrecadacao: number;
  totalDespesas: number;
  totalDinheiro: number;
  totalPix: number;
  totalSobraLiquida: number;
  totalSobraDinheiroEspecie: number;
  totalIda: number;
  totalVolta: number;
  totalEncomendas: number;
  totalCombustivel: number;
  totalMotorista: number;
  totalCobrador: number;
  totalOutrasDespesas: number;
  tripsCount: number;
  margemLucroPercent: number;
}

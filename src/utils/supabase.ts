import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { WeeklySheet, Driver } from '../types';

// 1. Obter variáveis de ambiente exatamente conforme definido pelo Vite usando import.meta.env
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Função de normalização para evitar erros comuns de digitação (espaços, aspas ou erros de caixa)
function normalizeApiKey(key?: string): string {
  if (!key) return 'sb_publishable_lBpEEfa34UJGoZURzh-qfQ_6J9hDLZw';
  const clean = key.trim().replace(/^['"]|['"]$/g, '');
  // Corrige erro de digitação comum ('F' maiúsculo em vez de 'f' minúsculo)
  if (clean === 'sb_publishable_lBpEEFa34UJGoZURzh-qfQ_6J9hDLZw') {
    return 'sb_publishable_lBpEEfa34UJGoZURzh-qfQ_6J9hDLZw';
  }
  return clean;
}

export const SUPABASE_URL = 
  (rawSupabaseUrl ? rawSupabaseUrl.trim().replace(/^['"]|['"]$/g, '') : '') || 
  'https://rwjebkvhijnygwwczdjk.supabase.co';

export const SUPABASE_ANON_KEY = normalizeApiKey(rawSupabaseAnonKey);

export const TABLE_NAME = 'weekly_sheets';
export const DRIVERS_TABLE_NAME = 'drivers';

/**
 * Cliente oficial Supabase configurado para o projeto do usuário.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface SupabaseStatus {
  connected: boolean;
  tableExists: boolean;
  driversTableExists?: boolean;
  lastChecked: string;
  errorMessage?: string;
}

export const SUPABASE_SETUP_SQL = `-- ==========================================================
-- SCRIPT DE INICIALIZAÇÃO COMPLETA: RELATÓRIO DE VIAGENS
-- PROJETO: TRANSPORTE DE PASSAGEIROS - TIANGUÁ X VIÇOSA
-- ==========================================================

-- 1. Tabela de fechamento semanal (Viagens e Despesas)
create table if not exists public.weekly_sheets (
  id text primary key,
  company_route text,
  start_date text,
  end_date text,
  days jsonb not null default '[]'::jsonb,
  data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS e políticas para weekly_sheets
alter table public.weekly_sheets enable row level security;
create policy if not exists "Permitir leitura pública" on public.weekly_sheets for select using (true);
create policy if not exists "Permitir inserção pública" on public.weekly_sheets for insert with check (true);
create policy if not exists "Permitir atualização pública" on public.weekly_sheets for update using (true);
create policy if not exists "Permitir exclusão pública" on public.weekly_sheets for delete using (true);

-- 2. Tabela de Gestão de Motoristas
create table if not exists public.drivers (
  id text primary key,
  name text not null,
  username text,
  password text,
  phone text,
  vehicle_plate text,
  vehicle_model text,
  status text default 'ativo',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS e políticas para drivers
alter table public.drivers enable row level security;
create policy if not exists "Permitir leitura pública motoristas" on public.drivers for select using (true);
create policy if not exists "Permitir inserção pública motoristas" on public.drivers for insert with check (true);
create policy if not exists "Permitir atualização pública motoristas" on public.drivers for update using (true);
create policy if not exists "Permitir exclusão pública motoristas" on public.drivers for delete using (true);

-- 3. Habilitar sincronização em tempo real (Realtime)
alter publication supabase_realtime add table public.weekly_sheets;
alter publication supabase_realtime add table public.drivers;
`;

/**
 * Converte um registro do Supabase para o modelo WeeklySheet da aplicação.
 */
export function mapRowToSheet(row: any): WeeklySheet {
  if (row.data && typeof row.data === 'object' && row.data.days) {
    return {
      ...row.data,
      id: row.id || row.data.id,
      companyRoute: row.company_route || row.data.companyRoute,
      startDate: row.start_date || row.data.startDate,
      endDate: row.end_date || row.data.endDate,
      updatedAt: row.updated_at || row.data.updatedAt || new Date().toISOString(),
    };
  }

  return {
    id: row.id,
    companyRoute: row.company_route || 'TRANSPORTE DE PASSAGEIROS - TIANGUA X VICOSA / JAILSON',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    days: Array.isArray(row.days) ? row.days : [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Converte um registro do Supabase para o modelo Driver.
 */
export function mapRowToDriver(row: any): Driver {
  return {
    id: row.id,
    name: row.name || 'Motorista',
    username: row.username || (row.name ? row.name.toLowerCase().replace(/\s+/g, '') : 'motorista'),
    password: row.password || '123456',
    phone: row.phone || '',
    vehiclePlate: row.vehicle_plate || '',
    vehicleModel: row.vehicle_model || '',
    status: row.status === 'inativo' ? 'inativo' : 'ativo',
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Converte um Driver para o formato de inserção/atualização no Supabase.
 */
export function mapDriverToRow(driver: Driver): any {
  return {
    id: driver.id,
    name: driver.name,
    username: driver.username,
    password: driver.password,
    phone: driver.phone || '',
    vehicle_plate: driver.vehiclePlate || '',
    vehicle_model: driver.vehicleModel || '',
    status: driver.status || 'ativo',
    notes: driver.notes || '',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Converte um WeeklySheet para o formato de inserção/atualização no Supabase.
 */
export function mapSheetToRow(sheet: WeeklySheet): any {
  return {
    id: sheet.id,
    company_route: sheet.companyRoute,
    start_date: sheet.startDate,
    end_date: sheet.endDate,
    days: sheet.days,
    data: sheet,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Verifica a conexão e se as tabelas weekly_sheets e drivers existem no Supabase.
 */
export async function testSupabaseConnection(): Promise<SupabaseStatus> {
  try {
    const { error: sheetsError } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .limit(1);

    const { error: driversError } = await supabase
      .from(DRIVERS_TABLE_NAME)
      .select('id')
      .limit(1);

    const isSheetsMissing = sheetsError && (
      sheetsError.message?.includes('schema cache') || 
      sheetsError.message?.includes('does not exist') ||
      sheetsError.code === 'PGRST116' ||
      sheetsError.code === '42P01'
    );

    const isDriversMissing = driversError && (
      driversError.message?.includes('schema cache') || 
      driversError.message?.includes('does not exist') ||
      driversError.code === 'PGRST116' ||
      driversError.code === '42P01'
    );

    const isAuthError = sheetsError && (
      sheetsError.message?.toLowerCase().includes('api key') ||
      sheetsError.message?.toLowerCase().includes('apikey') ||
      sheetsError.message?.toLowerCase().includes('jwt') ||
      (sheetsError as any).status === 401 ||
      (sheetsError as any).status === 403
    );

    return {
      connected: !isAuthError && (!sheetsError || isSheetsMissing),
      tableExists: !isSheetsMissing && !isAuthError,
      driversTableExists: !isDriversMissing && !isAuthError,
      lastChecked: new Date().toLocaleTimeString('pt-BR'),
      errorMessage: sheetsError ? sheetsError.message : undefined,
    };
  } catch (err: any) {
    return {
      connected: false,
      tableExists: false,
      driversTableExists: false,
      lastChecked: new Date().toLocaleTimeString('pt-BR'),
      errorMessage: err?.message || 'Erro ao conectar ao Supabase',
    };
  }
}

export const DRIVERS_BACKUP_ROW_ID = '__app_drivers_catalog_cloud__';

/**
 * Carrega todos os motoristas cadastrados do Supabase.
 * Tenta primeiro a tabela 'drivers'; caso não exista ou esteja vazia,
 * busca o catálogo unificado salvo na tabela 'weekly_sheets'.
 */
export async function fetchDriversFromSupabase(): Promise<Driver[] | null> {
  try {
    // 1. Tentar ler da tabela DRIVERS_TABLE_NAME ('drivers')
    const { data, error } = await supabase
      .from(DRIVERS_TABLE_NAME)
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map(mapRowToDriver);
    }

    // 2. Fallback: buscar o catálogo global de motoristas sincronizado na tabela 'weekly_sheets'
    const { data: backupRow, error: backupErr } = await supabase
      .from(TABLE_NAME)
      .select('data')
      .eq('id', DRIVERS_BACKUP_ROW_ID)
      .maybeSingle();

    if (!backupErr && backupRow?.data?.drivers && Array.isArray(backupRow.data.drivers)) {
      return backupRow.data.drivers;
    }

    if (data && data.length === 0) return [];
    return null;
  } catch (err) {
    console.warn('Erro ao buscar motoristas do Supabase:', err);
    return null;
  }
}

/**
 * Salva ou atualiza a lista completa de motoristas no Supabase (em ambas as tabelas para redundância total).
 */
export async function syncAllDriversToCloud(drivers: Driver[]): Promise<boolean> {
  try {
    // 1. Salva no catálogo em weekly_sheets (garantia imediata independente de SQL adicional)
    const backupPayload = {
      id: DRIVERS_BACKUP_ROW_ID,
      company_route: '__SISTEMA_CATALOGO_MOTORISTAS__',
      start_date: '2020-01-01',
      end_date: '2035-12-31',
      days: [],
      data: {
        type: 'drivers_catalog',
        drivers,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };
    await supabase.from(TABLE_NAME).upsert(backupPayload, { onConflict: 'id' });

    // 2. Tenta também salvar individualmente na tabela drivers se existir
    for (const d of drivers) {
      const payload = mapDriverToRow(d);
      await supabase.from(DRIVERS_TABLE_NAME).upsert(payload, { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.warn('Falha ao sincronizar motoristas na nuvem:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um motorista no Supabase.
 */
export async function saveDriverToSupabase(driver: Driver, allDrivers?: Driver[]): Promise<boolean> {
  try {
    const payload = mapDriverToRow(driver);
    await supabase
      .from(DRIVERS_TABLE_NAME)
      .upsert(payload, { onConflict: 'id' });

    // Se fornecida a lista ou se puder sincronizar, garante o backup na tabela weekly_sheets
    if (allDrivers && allDrivers.length > 0) {
      await syncAllDriversToCloud(allDrivers);
    }

    return true;
  } catch (err) {
    console.error('Falha na requisição para salvar motorista:', err);
    return false;
  }
}

/**
 * Exclui um motorista do Supabase.
 */
export async function deleteDriverFromSupabase(driverId: string, remainingDrivers?: Driver[]): Promise<boolean> {
  try {
    await supabase
      .from(DRIVERS_TABLE_NAME)
      .delete()
      .eq('id', driverId);

    if (remainingDrivers) {
      await syncAllDriversToCloud(remainingDrivers);
    }

    return true;
  } catch (err) {
    console.error('Falha ao excluir motorista do Supabase:', err);
    return false;
  }
}

/**
 * Assina atualizações em tempo real (Supabase Realtime) na tabela drivers.
 * Os callbacks .on('postgres_changes', ...) são adicionados estritamente ANTES de chamar o .subscribe().
 */
export function subscribeToDrivers(
  onUpsert: (driver: Driver) => void,
  onDelete: (driverId: string) => void
): () => void {
  let channel: RealtimeChannel | null = null;

  try {
    // 1. Cria um canal com identificador único para evitar conflito com canais já subscritos
    const uniqueChannelName = `drivers_changes_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newChannel = supabase.channel(uniqueChannelName);

    // 2. Adiciona os callbacks (.on('postgres_changes', ...)) ANTES de chamar o .subscribe()
    newChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: DRIVERS_TABLE_NAME,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (payload.new) {
            const driver = mapRowToDriver(payload.new);
            onUpsert(driver);
          }
        } else if (payload.eventType === 'DELETE') {
          if (payload.old && payload.old.id) {
            onDelete(payload.old.id);
          }
        }
      }
    );

    // 3. Chama .subscribe() estritamente DEPOIS de registrar os callbacks .on()
    newChannel.subscribe((status, err) => {
      console.log(`Supabase Realtime Status (${DRIVERS_TABLE_NAME}):`, status);
      if (err) {
        console.warn(`Aviso de Realtime em (${DRIVERS_TABLE_NAME}):`, err);
      }
    });

    channel = newChannel;
  } catch (err) {
    console.error('Erro ao inicializar Supabase Realtime para drivers:', err);
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Carrega todas as planilhas semanais do Supabase ordenadas pela data mais recente.
 */
export async function fetchSheetsFromSupabase(): Promise<WeeklySheet[] | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.warn('Supabase fetchSheets error:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filtra para remover registros reservados do sistema (ex: catálogo de motoristas)
    const validRows = data.filter((r) => r.id !== DRIVERS_BACKUP_ROW_ID && !r.id?.startsWith('__'));
    return validRows.map(mapRowToSheet);
  } catch (err) {
    console.warn('Erro ao buscar planilhas do Supabase:', err);
    return null;
  }
}

/**
 * Salva ou atualiza uma planilha semanal no Supabase (Upsert).
 */
export async function saveSheetToSupabase(sheet: WeeklySheet): Promise<boolean> {
  try {
    const payload = mapSheetToRow(sheet);
    let { error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: 'id' });

    // Se falhar por ausência da coluna opcional 'data', tenta upsert sem ela
    if (error && (error.message?.includes('column "data"') || error.message?.includes('column data'))) {
      const fallbackPayload = {
        id: sheet.id,
        company_route: sheet.companyRoute,
        start_date: sheet.startDate,
        end_date: sheet.endDate,
        days: sheet.days,
        updated_at: new Date().toISOString(),
      };
      const res = await supabase.from(TABLE_NAME).upsert(fallbackPayload, { onConflict: 'id' });
      error = res.error;
    }

    if (error) {
      console.warn('Aviso ao salvar no Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Falha na requisição para o Supabase (salvando localmente):', err);
    return false;
  }
}

/**
 * Exclui uma planilha semanal do Supabase pelo ID.
 */
export async function deleteSheetFromSupabase(sheetId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', sheetId);

    if (error) {
      console.error('Erro ao deletar do Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Falha ao excluir planilha do Supabase:', err);
    return false;
  }
}

/**
 * Assina atualizações em tempo real (Supabase Realtime) na tabela weekly_sheets.
 * Notifica callback quando outra aba, dispositivo ou usuário alterar os dados.
 * Os callbacks .on('postgres_changes', ...) são adicionados estritamente ANTES de chamar o .subscribe().
 */
export function subscribeToWeeklySheets(
  onUpsert: (sheet: WeeklySheet) => void,
  onDelete: (sheetId: string) => void,
  onDriversBackupUpdate?: (drivers: Driver[]) => void
): () => void {
  let channel: RealtimeChannel | null = null;

  try {
    // 1. Cria um canal com identificador único para evitar conflito com canais já subscritos
    const uniqueChannelName = `weekly_sheets_changes_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newChannel = supabase.channel(uniqueChannelName);

    // 2. Adiciona os callbacks (.on('postgres_changes', ...)) ANTES de chamar o .subscribe()
    newChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      (payload) => {
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        // Se for atualização no catálogo unificado de motoristas
        if (newRow && (newRow.id === DRIVERS_BACKUP_ROW_ID || newRow.id?.startsWith('__'))) {
          if (onDriversBackupUpdate && newRow.data?.drivers && Array.isArray(newRow.data.drivers)) {
            onDriversBackupUpdate(newRow.data.drivers);
          }
          return;
        }
        if (oldRow && (oldRow.id === DRIVERS_BACKUP_ROW_ID || oldRow.id?.startsWith('__'))) {
          return;
        }

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (newRow) {
            const sheet = mapRowToSheet(newRow);
            onUpsert(sheet);
          }
        } else if (payload.eventType === 'DELETE') {
          if (oldRow && oldRow.id) {
            onDelete(oldRow.id);
          }
        }
      }
    );

    // 3. Chama .subscribe() estritamente DEPOIS de registrar os callbacks .on()
    newChannel.subscribe((status, err) => {
      console.log(`Supabase Realtime Status (${TABLE_NAME}):`, status);
      if (err) {
        console.warn(`Aviso de Realtime em (${TABLE_NAME}):`, err);
      }
    });

    channel = newChannel;
  } catch (err) {
    console.error('Erro ao inicializar Supabase Realtime para planilhas:', err);
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

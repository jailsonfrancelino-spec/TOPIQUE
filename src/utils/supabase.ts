import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { WeeklySheet } from '../types';

export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://rwjebkvhijnygwwczdjk.supabase.co';
export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lBpEEfa34UJGoZURzh-qfQ_6J9hDLZw';

export const TABLE_NAME = 'weekly_sheets';

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
  lastChecked: string;
  errorMessage?: string;
}

export const SUPABASE_SETUP_SQL = `-- 1. Criar a tabela de fechamento semanal se não existir
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

-- 2. Habilitar segurança em nível de linha (RLS)
alter table public.weekly_sheets enable row level security;

-- 3. Políticas públicas para salvar, editar e carregar
create policy if not exists "Permitir leitura pública" on public.weekly_sheets
  for select using (true);

create policy if not exists "Permitir inserção pública" on public.weekly_sheets
  for insert with check (true);

create policy if not exists "Permitir atualização pública" on public.weekly_sheets
  for update using (true);

create policy if not exists "Permitir exclusão pública" on public.weekly_sheets
  for delete using (true);

-- 4. Habilitar sincronização em tempo real (Realtime)
alter publication supabase_realtime add table public.weekly_sheets;
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
 * Verifica a conexão e se a tabela weekly_sheets já existe no Supabase.
 */
export async function testSupabaseConnection(): Promise<SupabaseStatus> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .limit(1);

    if (error) {
      const isMissingTable = 
        error.message?.includes('schema cache') || 
        error.message?.includes('does not exist') ||
        error.code === 'PGRST116' ||
        error.code === '42P01';

      return {
        connected: true,
        tableExists: !isMissingTable,
        lastChecked: new Date().toLocaleTimeString('pt-BR'),
        errorMessage: error.message,
      };
    }

    return {
      connected: true,
      tableExists: true,
      lastChecked: new Date().toLocaleTimeString('pt-BR'),
    };
  } catch (err: any) {
    return {
      connected: false,
      tableExists: false,
      lastChecked: new Date().toLocaleTimeString('pt-BR'),
      errorMessage: err?.message || 'Erro ao conectar ao Supabase',
    };
  }
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

    return data.map(mapRowToSheet);
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
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Erro ao salvar no Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Falha na requisição para o Supabase:', err);
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
 */
export function subscribeToWeeklySheets(
  onUpsert: (sheet: WeeklySheet) => void,
  onDelete: (sheetId: string) => void
): () => void {
  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase
      .channel('public:weekly_sheets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_NAME,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.new) {
              const sheet = mapRowToSheet(payload.new);
              onUpsert(sheet);
            }
          } else if (payload.eventType === 'DELETE') {
            if (payload.old && payload.old.id) {
              onDelete(payload.old.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Supabase Realtime Status (${TABLE_NAME}):`, status);
      });
  } catch (err) {
    console.error('Erro ao inicializar Supabase Realtime:', err);
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

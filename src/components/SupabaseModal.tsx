import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle, 
  Radio, 
  UploadCloud, 
  DownloadCloud,
  CheckCircle2
} from 'lucide-react';
import { 
  SUPABASE_URL, 
  SUPABASE_SETUP_SQL, 
  SupabaseStatus, 
  testSupabaseConnection 
} from '../utils/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SupabaseStatus;
  syncState: 'idle' | 'saving' | 'saved' | 'error';
  onRefreshStatus: () => void;
  onSyncAllToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  status,
  syncState,
  onRefreshStatus,
  onSyncAllToCloud,
  onPullFromCloud,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      alert('Não foi possível copiar o texto automaticamente.');
    }
  };

  const handlePush = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await onSyncAllToCloud();
      setSyncFeedback('Dados locais enviados com sucesso para o Supabase!');
    } catch (err: any) {
      setSyncFeedback('Erro ao enviar dados: ' + (err?.message || 'Verifique se a tabela existe'));
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handlePull = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await onPullFromCloud();
      setSyncFeedback('Dados do Supabase baixados e sincronizados!');
    } catch (err: any) {
      setSyncFeedback('Erro ao baixar dados: ' + (err?.message || 'Verifique a conexão'));
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700 rounded-xl text-emerald-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600/80 text-emerald-100 px-2 py-0.5 rounded-md">
                  BANCO DE DADOS EM TEMPO REAL
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Integração Supabase
              </h2>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Status Box */}
          <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
            status.tableExists
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/90 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {status.tableExists ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <span className="font-bold text-sm">
                  {status.tableExists 
                    ? 'Tabela weekly_sheets conectada e ativa!'
                    : 'Conectado ao Supabase, mas a tabela "weekly_sheets" ainda precisa ser criada.'}
                </span>
              </div>

              <button
                onClick={onRefreshStatus}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer text-slate-700"
                title="Checar conexão agora"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Verificar Conexão</span>
              </button>
            </div>

            <div className="text-xs space-y-1 font-mono text-slate-600 bg-white/60 p-2.5 rounded-lg border border-slate-200/60">
              <p><strong>Projeto:</strong> {SUPABASE_URL}</p>
              <p><strong>Tabela:</strong> public.weekly_sheets</p>
              <p><strong>Status de Salvamento:</strong> {
                syncState === 'saving' ? 'Salvando no banco...' :
                syncState === 'saved' ? 'Sincronizado em tempo real' :
                syncState === 'error' ? 'Aguardando tabela' : 'Pronto'
              }</p>
            </div>
          </div>

          {/* Setup Guide if table is not yet created */}
          {!status.tableExists && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Passo Rápido: Criar a Tabela no Supabase
                </span>
                <button
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer bg-emerald-100/80 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar Comando SQL'}</span>
                </button>
              </div>

              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Abra o painel do seu projeto no Supabase: <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold inline-flex items-center gap-0.5">supabase.com/dashboard <ExternalLink className="w-3 h-3" /></a></li>
                <li>Clique no menu lateral esquerdo em <strong>SQL Editor</strong>.</li>
                <li>Clique em <strong>New query</strong>, cole o código abaixo e clique em <strong>RUN</strong>.</li>
                <li>Pronto! Volte aqui e clique em <strong>Verificar Conexão</strong>.</li>
              </ol>

              <div className="relative">
                <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto max-h-48 border border-slate-800">
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            </div>
          )}

          {/* Sync actions */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              Sincronização Manual & Backup
            </span>
            <p className="text-xs text-slate-600">
              Todas as alterações nos inputs da tabela são salvas automaticamente em tempo real. Se você já tinha dados salvos anteriormente no navegador e deseja enviá-los todos para o Supabase, utilize os botões abaixo:
            </p>

            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              <button
                onClick={handlePush}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isSyncing ? 'Sincronizando...' : 'Enviar Dados Locais p/ Supabase'}</span>
              </button>

              <button
                onClick={handlePull}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Recarregar Tudo do Supabase</span>
              </button>
            </div>

            {syncFeedback && (
              <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-100/70 p-2 rounded-lg flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{syncFeedback}</span>
              </div>
            )}
          </div>

          {/* Realtime status info */}
          <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Realtime ativado: alterações feitas em qualquer dispositivo aparecem nesta tela instantaneamente.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

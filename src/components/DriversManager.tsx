import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Car, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  ArrowRight,
  ShieldCheck,
  X,
  Plus,
  Lock,
  KeyRound,
  UserCheck,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { Driver, WeeklySheet } from '../types';
import { SupabaseStatus } from '../utils/supabase';

interface DriversManagerProps {
  drivers: Driver[];
  activeSheet: WeeklySheet;
  onAddDriver: (data: {
    name: string;
    username: string;
    password: string;
    vehiclePlate?: string;
  }) => Promise<void>;
  onUpdateDriver: (driver: Driver) => Promise<void>;
  onDeleteDriver: (driverId: string) => Promise<void>;
  onAssignDriverToSheet: (driver: Driver, applyToAllDays: boolean) => void;
  onNavigateToDailySheet: (driverId?: string) => void;
  supabaseStatus: SupabaseStatus;
  onOpenSupabaseModal: () => void;
}

export const DriversManager: React.FC<DriversManagerProps> = ({
  drivers,
  activeSheet,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onAssignDriverToSheet,
  onNavigateToDailySheet,
  supabaseStatus,
  onOpenSupabaseModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form State simplificado: Focado em Nome, Login e Senha
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // State para controlar visibilidade de senhas individuais na listagem
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const togglePasswordVisibility = (driverId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [driverId]: !prev[driverId],
    }));
  };

  const copyToClipboard = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setSuccessToast(`${label} copiado!`);
    setTimeout(() => {
      setCopiedKey(null);
      setSuccessToast(null);
    }, 2000);
  };

  // Abrir modal para novo motorista
  const handleOpenNew = () => {
    setEditingDriver(null);
    setName('');
    setUsername('');
    setPassword('');
    setVehiclePlate('');
    setStatus('ativo');
    setShowPasswordInModal(false);
    setIsFormOpen(true);
  };

  // Abrir modal para editar motorista existente
  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.name);
    setUsername(driver.username || '');
    setPassword(driver.password || '');
    setVehiclePlate(driver.vehiclePlate || '');
    setStatus(driver.status);
    setShowPasswordInModal(false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!username.trim()) return;
    if (!password.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingDriver) {
        await onUpdateDriver({
          ...editingDriver,
          name: name.trim(),
          username: username.trim().toLowerCase(),
          password: password.trim(),
          vehiclePlate: vehiclePlate.trim().toUpperCase() || undefined,
          status,
          updatedAt: new Date().toISOString(),
        });
        setSuccessToast(`Motorista "${name}" atualizado com sucesso!`);
      } else {
        await onAddDriver({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          password: password.trim(),
          vehiclePlate: vehiclePlate.trim().toUpperCase() || undefined,
        });
        setSuccessToast(`Motorista "${name}" cadastrado! Login: "${username.trim().toLowerCase()}"`);
      }
      setIsFormOpen(false);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (confirm(`Tem certeza que deseja excluir o acesso do motorista "${driver.name}" (Login: ${driver.username})?`)) {
      await onDeleteDriver(driver.id);
      setSuccessToast(`Motorista "${driver.name}" removido.`);
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  // Motoristas filtrados por busca
  const filteredDrivers = drivers.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(term) ||
      (d.username && d.username.toLowerCase().includes(term)) ||
      (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(term))
    );
  });

  // Quantidade de dias da semana vinculados
  const getLinkedDaysCount = (driverId: string) => {
    return activeSheet.days.filter((d) => d.driverId === driverId).length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-emerald-500 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner: Informações & Ações */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px] uppercase tracking-wider">
              Controle de Acessos & Logins
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {drivers.length} motorista{drivers.length !== 1 ? 's' : ''} cadastrado{drivers.length !== 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Gestão de Logins dos Motoristas
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Cadastre o login e a senha de cada motorista para ele acessar a tela de lançamentos diários e registrar as viagens dele.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Novo Motorista</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, login ou placa..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>Semana Ativa:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-mono text-[11px]">
            {activeSheet.companyRoute}
          </span>
        </div>
      </div>

      {/* Cards de Motoristas Cadastrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredDrivers.map((driver) => {
          const linkedDays = getLinkedDaysCount(driver.id);
          const isPasswordVisible = !!visiblePasswords[driver.id];

          return (
            <div
              key={driver.id}
              className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                driver.status === 'inativo' ? 'border-slate-300 opacity-75' : 'border-slate-200'
              }`}
            >
              <div className="p-5">
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
                      {driver.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {driver.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            driver.status === 'ativo'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              driver.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {driver.status === 'ativo' ? 'Acesso Ativo' : 'Inativo'}
                        </span>

                        {driver.vehiclePlate && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.2 rounded border border-slate-200">
                            🚗 {driver.vehiclePlate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box com Dados de Login e Senha para o Motorista */}
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold">Login:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 select-all">
                        {driver.username || 'Não cadastrado'}
                      </span>
                      {driver.username && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(driver.username, 'Login', `u-${driver.id}`)}
                          className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Copiar nome de usuário"
                        >
                          {copiedKey === `u-${driver.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold">Senha:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {isPasswordVisible ? driver.password : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(driver.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                        title={isPasswordVisible ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      {driver.password && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(driver.password, 'Senha', `p-${driver.id}`)}
                          className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Copiar senha de acesso"
                        >
                          {copiedKey === `p-${driver.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dias vinculados nesta semana */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Vinculado nesta semana:</span>
                  </span>
                  <span className={`font-bold ${linkedDays > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                    {linkedDays} {linkedDays === 1 ? 'dia' : 'dias'}
                  </span>
                </div>
              </div>

              {/* Card Footer com Ações */}
              <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAssignDriverToSheet(driver, true);
                    setSuccessToast(`Motorista "${driver.name}" vinculado a todos os dias da semana!`);
                    setTimeout(() => setSuccessToast(null), 3000);
                  }}
                  className="flex-1 py-1.5 px-2 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer text-center"
                  title="Atribuir este motorista a todos os 7 dias da semana ativa"
                >
                  Vincular Semana Toda
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(driver)}
                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Editar dados de login e senha"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(driver)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Excluir cadastro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">Nenhum motorista encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Nenhum motorista corresponde ao termo pesquisado. Tente outra busca.'
              : 'Você ainda não possui motoristas cadastrados. Clique no botão abaixo para adicionar.'}
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeiro Motorista</span>
          </button>
        </div>
      )}

      {/* Modal Simplificado: Cadastro de Login e Senha */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingDriver ? 'Editar Login do Motorista' : 'Cadastrar Login do Motorista'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Motorista *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Silva, Marcos, João..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Login / Nome de Usuário para Acesso *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Ex: marcos12, carlossilva"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Este é o usuário que o motorista vai digitar na tela inicial para entrar.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Senha de Acesso *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPasswordInModal ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha para o motorista"
                    required
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPasswordInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Crie uma senha simples para o motorista lembrar (ex: 123456 ou data).
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Placa do Veículo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="Ex: BRA2E19"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ativo' | 'inativo')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    <option value="ativo">Ativo (Pode Entrar)</option>
                    <option value="inativo">Inativo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingDriver ? 'Atualizar Login' : 'Salvar e Criar Login'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

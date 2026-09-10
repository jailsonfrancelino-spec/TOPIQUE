import React, { useState } from 'react';
import { 
  Bus, 
  Lock, 
  User, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => Promise<boolean> | boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  // Campos iniciam estritamente vazios, sem nenhum valor pré-salvo
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Por favor, informe o seu nome de usuário e senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      const success = await onLogin(cleanUsername, cleanPassword, rememberMe);
      if (!success) {
        setErrorMsg('Nome de usuário ou senha incorretos. Verifique os dados digitados e tente novamente.');
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMsg('Falha ao conectar com o banco de dados. Verifique a internet do aparelho e tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Luz ambiente de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 text-center relative border-b border-slate-800">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3 shadow-inner">
            <Bus className="w-7 h-7 text-blue-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Relatório de Viagens
          </h1>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            Transporte de Passageiros • Tianguá x Viçosa
          </p>
        </div>

        {/* Formulário de Acesso */}
        <div className="p-6 sm:p-8 bg-slate-50/60">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Falha no Acesso:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Form com tags semânticas para disparar a oferta de salvar senha no Google/Navegador */}
          <form 
            id="login-form" 
            name="login" 
            method="post" 
            action="#" 
            onSubmit={handleSubmit} 
            className="space-y-4"
          >
            <div>
              <label 
                htmlFor="username" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Nome de Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Opção de Lembrar / Manter conectado */}
            <div className="pt-1 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700">
                  Lembrar login neste dispositivo
                </span>
              </label>
            </div>

            {/* Botão Entrar */}
            <div className="pt-2">
              <button
                type="submit"
                id="login-submit-btn"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Acessando...' : 'Entrar no Sistema'}</span>
              </button>
            </div>
          </form>

          {/* Rodapé explicativo discreto */}
          <div className="mt-5 pt-3.5 border-t border-slate-200 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold">
              <Smartphone className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>Acesso liberado em múltiplos celulares simultaneamente</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Você pode acessar o mesmo login em vários aparelhos ao mesmo tempo sem desconectar.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Shield, KeyRound, Mail, X, AlertCircle, CheckCircle, Lock, Eye, EyeOff, UserCheck, Sparkles, Scissors } from 'lucide-react';
import { Barber, AdminUser } from '../types/barbershop';
import { authenticateAdmin } from '../utils/barbershop-logic';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  onLoginSuccess: (user: AdminUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  barbers,
  onLoginSuccess,
}) => {
  const [loginType, setLoginType] = useState<'master' | 'barber'>('master');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = authenticateAdmin(
      loginType === 'master'
        ? { type: 'master', password }
        : { type: 'barber', email },
      barbers
    );

    if (result.success && result.user) {
      onLoginSuccess(result.user);
      setPassword('');
      setEmail('');
      setError(null);
    } else {
      setError(result.error || 'Credenciais inválidas.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#181818] border border-[#383838] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#141414] border-b border-[#303030] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c99a35]/20 border border-[#c99a35]/40 text-[#f0cf7b] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#f0cf7b]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base leading-tight">
                Painel Administrativo
              </h3>
              <p className="text-[11px] text-zinc-400">
                Acesso restrito de gestão e equipe
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar login"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-[#121212] border-b border-[#2a2a2a] gap-1">
          <button
            type="button"
            onClick={() => {
              setLoginType('master');
              setError(null);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginType === 'master'
                ? 'bg-[#c99a35] text-[#141009] shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Administrador</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginType('barber');
              setError(null);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginType === 'barber'
                ? 'bg-[#c99a35] text-[#141009] shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Barbeiro da Equipe</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {loginType === 'master' ? (
            <div>
              <div className="mb-1.5">
                <label htmlFor="masterPassword" className="block text-xs font-semibold text-zinc-300">
                  Senha de Administrador Geral *
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="masterPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha de administrador..."
                  autoFocus
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#101010] border border-[#3e3e3e] focus:border-[#c99a35] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-[#c99a35]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>Acesso total do proprietário e gestor geral.</span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="barberEmail" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  E-mail Cadastrado do Barbeiro *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="barberEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: lucas.blade@barbearia.com.br"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#101010] border border-[#3e3e3e] focus:border-[#c99a35] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-[#c99a35]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                  ✂️ Digite o seu <strong className="text-zinc-200">e-mail cadastrado na barbearia</strong>. O acesso é exclusivo para profissionais com autorização concedida pelo administrador.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-black text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Acessar Painel de Controle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

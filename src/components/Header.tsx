import React from 'react';
import { Scissors, User, Shield, Download, Lock } from 'lucide-react';
import { BarbershopConfig, AdminUser, Barber } from '../types/barbershop';
import { isUserAuthorizedAdmin } from '../utils/barbershop-logic';

interface HeaderProps {
  config: BarbershopConfig;
  currentUser?: AdminUser | null;
  barbers?: Barber[];
  onOpenBooking: () => void;
  onOpenClientArea: () => void;
  onOpenAdmin: () => void;
  onOpenLoginModal?: () => void;
  onOpenAiChat: () => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  currentUser = null,
  barbers = [],
  onOpenBooking,
  onOpenClientArea,
  onOpenAdmin,
  onOpenLoginModal,
  onOpenAiChat,
  onOpenInstall,
  isInstalled = false,
}) => {
  // Option only appears for master administrator and barbers authorized by administrator
  const isAuthorized = isUserAuthorizedAdmin(currentUser, barbers);
  return (
    <header className="sticky top-0 z-40 bg-[#151515]/95 backdrop-blur-md border-b border-[#333333]">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-0 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand with photo preview and 'Acesso à equipe' underneath */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 shrink">
          {/* Photo Column with 'Acesso à equipe' underneath */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className="w-10 h-10 sm:w-16 sm:h-14 shrink-0 border border-dashed border-[#c99a35] rounded-lg bg-[#201d17] text-[#f0cf7b] flex flex-col items-center justify-center text-center p-0.5 sm:p-1 overflow-hidden shadow-inner group relative"
              title="Barbearia Afonso Cortes"
            >
              {config.photoUrl ? (
                <img
                  src={config.photoUrl}
                  alt={config.name}
                  className="w-full h-full object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <>
                  <span className="text-xs sm:text-lg leading-none">📷</span>
                  <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-wider leading-tight text-white/80">
                    Afonso
                  </span>
                </>
              )}
            </div>

            {/* Option: Acesso à equipe underneath the photo */}
            <button
              type="button"
              onClick={isAuthorized ? onOpenAdmin : (onOpenLoginModal || onOpenAdmin)}
              className="mt-1 inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-semibold text-zinc-400 hover:text-[#f0cf7b] bg-[#1a1a1a] hover:bg-[#252525] border border-zinc-700/60 hover:border-[#c99a35]/60 px-1 sm:px-1.5 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap shadow-sm"
              title="Acesso à equipe (Administrador e Barbeiros autorizados)"
              aria-label="Acesso à equipe"
            >
              {isAuthorized ? (
                <Shield className="w-2.5 h-2.5 text-[#c99a35]" />
              ) : (
                <Lock className="w-2.5 h-2.5 text-[#c99a35]" />
              )}
              <span>Acesso à equipe</span>
            </button>
          </div>

          {/* Brand Name & Subtitle */}
          <a href="#" className="flex flex-col min-w-0 truncate">
            <span className="text-sm sm:text-2xl font-extrabold tracking-tight text-[#f0cf7b] hover:text-[#ffd984] transition-colors leading-none truncate">
              {config.name}
            </span>
            <small className="text-[8px] sm:text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase mt-0.5 sm:mt-1 truncate">
              {config.subtitle}
            </small>
          </a>
        </div>

        {/* Action navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* PWA Install Button */}
          {onOpenInstall && !isInstalled && (
            <button
              type="button"
              onClick={onOpenInstall}
              className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-sm font-bold rounded-lg bg-[#c99a35]/15 hover:bg-[#c99a35]/25 text-[#f0cf7b] border border-[#c99a35]/40 transition-colors cursor-pointer"
              title="Instalar aplicativo no dispositivo"
            >
              <Download className="w-3.5 h-3.5 text-[#f0cf7b]" />
              <span className="hidden md:inline">Instalar App</span>
              <span className="md:hidden">App</span>
            </button>
          )}

          {/* Booking jump button: Agendar - always visible next to Meus agendamentos */}
          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-sm font-bold rounded-lg bg-[#c99a35] hover:bg-[#d6a742] text-[#141009] transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer shrink-0"
            title="Agendar horário"
          >
            <Scissors className="w-3.5 h-3.5 text-[#141009] shrink-0" />
            <span className="whitespace-nowrap">Agendar</span>
          </button>

          {/* Admin panel button - ONLY visible for authorized administrator or authorized staff barbers */}
          {isAuthorized && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-sm font-semibold rounded-lg text-[#f0cf7b] hover:text-white bg-[#1f1b13] hover:bg-[#2c2415] border border-[#c99a35]/60 hover:border-[#c99a35] transition-colors cursor-pointer shadow-sm animate-in fade-in shrink-0"
              aria-label="Painel Administrativo"
            >
              <Shield className="w-3.5 h-3.5 text-[#c99a35] shrink-0" />
              <span className="hidden lg:inline">
                {currentUser?.type === 'barber' ? 'Painel Barbeiro' : 'Administração'}
              </span>
              <span className="lg:hidden">Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

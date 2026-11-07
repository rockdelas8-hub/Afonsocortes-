import React from 'react';
import { MapPin, Clock, Phone, Instagram, Scissors, Lock, Shield } from 'lucide-react';
import { BarbershopConfig, AdminUser, Barber } from '../types/barbershop';
import { isUserAuthorizedAdmin } from '../utils/barbershop-logic';

interface FooterProps {
  config: BarbershopConfig;
  currentUser?: AdminUser | null;
  barbers?: Barber[];
  onOpenStaffLogin?: () => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  config,
  currentUser = null,
  barbers = [],
  onOpenStaffLogin,
  onOpenAdmin,
}) => {
  const isAuthorized = isUserAuthorizedAdmin(currentUser, barbers);
  return (
    <footer className="bg-[#0e0e0e] border-t border-[#2a2a2a] pt-12 pb-8 text-zinc-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Brand & Concept */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#f0cf7b]">
              <Scissors className="w-5 h-5 text-[#c99a35]" />
              <span className="font-extrabold text-lg tracking-tight text-white">
                {config.name}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tradição e modernidade em cada detalhe. Cortes masculinos de alta precisão, barboterapia relaxante e atendimento exclusivo.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-[#f0cf7b]">
              <span>★ 4.9 de avaliação no Google</span>
            </div>
          </div>

          {/* Operating Hours & Contact */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Atendimento
            </h4>
            <div className="flex items-start gap-2.5 text-xs">
              <Clock className="w-4 h-4 text-[#c99a35] shrink-0 mt-0.5" />
              <span>{config.openingHours}</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <Phone className="w-4 h-4 text-[#c99a35] shrink-0 mt-0.5" />
              <a
                href={`https://wa.me/${config.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {config.phone} (WhatsApp Oficial)
              </a>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <Instagram className="w-4 h-4 text-[#c99a35] shrink-0 mt-0.5" />
              <a
                href={`https://instagram.com/${config.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {config.instagram}
              </a>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Onde Estamos
            </h4>
            <div className="flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-[#c99a35] shrink-0 mt-0.5" />
              <span>{config.address}</span>
            </div>
            <p className="text-[11px] text-zinc-500 pt-1">
              Estacionamento conveniado no local • Wi-Fi • Cerveja gelada e café espresso cortesia.
            </p>
          </div>
        </div>

        <div className="border-t border-[#222222] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} {config.name} • Todos os direitos reservados.</p>
          
          <div className="flex items-center gap-4 text-[11px]">
            <span>Sistema Inteligente com Consultor Visagista Gemini AI</span>

            {/* When already authorized, show direct access button */}
            {isAuthorized ? (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1 text-[#f0cf7b] hover:underline font-semibold cursor-pointer"
                title="Acessar Painel"
              >
                <Shield className="w-3 h-3 text-[#c99a35]" />
                <span>Painel Ativo ({currentUser?.name})</span>
              </button>
            ) : onOpenStaffLogin ? (
              /* When not logged in, discrete staff lock icon so authorized barbers/admin can authenticate */
              <button
                type="button"
                onClick={onOpenStaffLogin}
                className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-400 transition-colors p-1 rounded cursor-pointer"
                title="Acesso da Equipe e Gestão"
                aria-label="Acesso de Barbeiros Autorizados e Gestão"
              >
                <Lock className="w-3 h-3" />
                <span className="text-[10px] text-zinc-600 hover:text-zinc-400">Acesso Equipe</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
};

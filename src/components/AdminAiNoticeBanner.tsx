import React, { useState } from 'react';
import { Sparkles, Bot, Clock, Scissors, Calendar, Users, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { AdminUpdateNotice } from '../types/barbershop';

interface AdminAiNoticeBannerProps {
  notice: AdminUpdateNotice | null | undefined;
  onJumpToServices?: () => void;
  onJumpToBooking?: () => void;
}

export const AdminAiNoticeBanner: React.FC<AdminAiNoticeBannerProps> = ({
  notice,
  onJumpToServices,
  onJumpToBooking,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!notice) return null;

  const getCategoryIcon = () => {
    switch (notice.category) {
      case 'servicos':
        return <Scissors className="w-4 h-4 text-[#c99a35]" />;
      case 'horarios':
        return <Clock className="w-4 h-4 text-[#c99a35]" />;
      case 'equipe':
        return <Users className="w-4 h-4 text-[#c99a35]" />;
      case 'agendamentos':
        return <Calendar className="w-4 h-4 text-[#c99a35]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#c99a35]" />;
    }
  };

  const getCategoryBadge = () => {
    switch (notice.category) {
      case 'servicos':
        return 'Tabela de Serviços';
      case 'horarios':
        return 'Dias & Horários';
      case 'equipe':
        return 'Equipe de Barbeiros';
      case 'agendamentos':
        return 'Agendamentos';
      default:
        return 'Informações Gerais';
    }
  };

  // Format date/time
  const formattedTime = (() => {
    try {
      const d = new Date(notice.updatedAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' de ' +
        d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch {
      return 'Recente';
    }
  })();

  return (
    <div className="w-full bg-gradient-to-r from-[#1c1710] via-[#241e14] to-[#1c1710] border-b border-[#c99a35]/40 shadow-lg relative overflow-hidden transition-all duration-300">
      {/* Subtle background glow */}
      <div className="absolute -top-12 left-1/4 w-72 h-24 bg-[#c99a35]/15 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Main Info */}
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-[#2e2617] border border-[#c99a35]/50 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-inner">
              {getCategoryIcon()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#c99a35]/20 text-[#f0cf7b] border border-[#c99a35]/40">
                  <Sparkles className="w-3 h-3 text-[#f0cf7b]" />
                  <span>IA • Atualização do Administrador</span>
                </span>

                <span className="text-[11px] font-semibold text-zinc-400">
                  {getCategoryBadge()} • {formattedTime}
                </span>
              </div>

              <div className="mt-0.5">
                <h4 className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                  {notice.title}
                </h4>
                <p className="text-xs text-zinc-300 leading-snug line-clamp-1 sm:line-clamp-none">
                  {notice.summary}
                </p>
              </div>

              {/* Expanded detail */}
              {isExpanded && notice.detail && (
                <div className="mt-2 pt-2 border-t border-[#c99a35]/20 text-xs text-zinc-300 leading-relaxed animate-in fade-in duration-150">
                  <p>{notice.detail}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Esta informação foi processada pela IA e permanecerá ativa para todos os clientes até que o administrador realize uma nova alteração.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {notice.category === 'servicos' && onJumpToServices && (
              <button
                type="button"
                onClick={onJumpToServices}
                className="px-2.5 py-1 text-xs font-bold text-[#141009] bg-[#c99a35] hover:bg-[#d8a83d] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <span>Ver Serviços</span>
              </button>
            )}

            {(notice.category === 'horarios' || notice.category === 'equipe') && onJumpToBooking && (
              <button
                type="button"
                onClick={onJumpToBooking}
                className="px-2.5 py-1 text-xs font-bold text-[#141009] bg-[#c99a35] hover:bg-[#d8a83d] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <span>Ver Horários</span>
              </button>
            )}

            {notice.detail && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2 py-1 text-xs font-semibold text-[#f0cf7b] hover:text-white bg-black/40 hover:bg-black/60 rounded-lg border border-[#c99a35]/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                aria-expanded={isExpanded}
              >
                <span>{isExpanded ? 'Menos' : 'Detalhes'}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

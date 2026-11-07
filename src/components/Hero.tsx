import { User, Scissors, Sparkles, Clock, Award, ShieldCheck, MapPin } from 'lucide-react';
import { BarbershopConfig } from '../types/barbershop';

interface HeroProps {
  config: BarbershopConfig;
  onBookNow: () => void;
  onConsultAi: () => void;
  onOpenClientArea: () => void;
}

export const Hero: React.FC<HeroProps> = ({ config, onBookNow, onConsultAi, onOpenClientArea }) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 text-center bg-[radial-gradient(ellipse_at_top,#493719_0%,#1b1915_42%,#111111_78%)] border-b border-[#2a2a2a]">
      {/* Decorative background grid and glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#c99a35]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#241f17] border border-[#c99a35]/40 text-[#f0cf7b] text-xs font-bold uppercase tracking-[0.2em] mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#f0cf7b]" />
          <span>{config.eyebrow}</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] mb-6 text-white">
          <span>{config.heroTitleMain}</span>{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c99a35] via-[#f0cf7b] to-[#c99a35]">
            {config.heroTitleAccent}
          </span>
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto mb-6 leading-relaxed font-normal">
          {config.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBookNow}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-extrabold text-base rounded-xl transition-all shadow-lg shadow-[#c99a35]/20 hover:shadow-[#c99a35]/35 hover:-translate-y-0.5 cursor-pointer"
            >
              <Scissors className="w-5 h-5 text-[#141009]" />
              <span>Agendar meu horário</span>
            </button>

            <button
              type="button"
              onClick={onOpenClientArea}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#1a1a1a] hover:bg-[#252525] text-zinc-300 border border-zinc-700/60 hover:border-zinc-500 font-bold text-base rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <User className="w-5 h-5 text-[#c99a35]" />
              <span>Meus Agendamentos</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onConsultAi}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1f1d19]/40 hover:bg-[#28251e]/60 text-[#f0cf7b] border border-[#c99a35]/30 hover:border-[#c99a35]/50 font-semibold text-sm rounded-xl transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#f0cf7b]" />
            <span>Consultar Afonso AI (Visagista)</span>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 text-left">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#181818]/60 border border-white/5">
            <Award className="w-5 h-5 text-[#c99a35] shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">Barbeiros Mestres</p>
              <p className="text-zinc-400">Atendimento vip</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#181818]/60 border border-white/5">
            <Clock className="w-5 h-5 text-[#c99a35] shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">Pontualidade</p>
              <p className="text-zinc-400">Sem filas de espera</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#181818]/60 border border-white/5">
            <ShieldCheck className="w-5 h-5 text-[#c99a35] shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">Higiene Rígida</p>
              <p className="text-zinc-400">Materiais esterilizados</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#181818]/60 border border-white/5">
            <MapPin className="w-5 h-5 text-[#c99a35] shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">Localização Central</p>
              <p className="text-zinc-400">Fácil acesso</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

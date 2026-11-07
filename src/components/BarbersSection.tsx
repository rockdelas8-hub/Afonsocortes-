import React from 'react';
import { Star, Scissors, Award } from 'lucide-react';
import { Barber } from '../types/barbershop';

interface BarbersSectionProps {
  barbers: Barber[];
  onSelectBarber: (barber: Barber) => void;
}

export const BarbersSection: React.FC<BarbersSectionProps> = ({
  barbers,
  onSelectBarber,
}) => {
  return (
    <section id="equipe" className="py-16 sm:py-20 bg-[#121212] border-b border-[#252525]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Nossa Equipe de Mestres
          </h2>
          <p className="text-sm sm:text-base text-zinc-400">
            Profissionais apaixonados por corte, barboterapia e visagismo.
          </p>
          <div className="h-1 w-12 bg-[#c99a35] mx-auto mt-4 rounded-full" />
        </div>

        {/* Barbers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                barber.active
                  ? 'border-[#333333] hover:border-[#c99a35]/60 hover:shadow-xl hover:-translate-y-1'
                  : 'border-zinc-800 opacity-60'
              }`}
            >
              <div>
                {/* Photo Header */}
                <div className="relative h-48 w-full overflow-hidden bg-[#222]">
                  {barber.avatar ? (
                    <img
                      src={barber.avatar}
                      alt={barber.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-600">
                      👤
                    </div>
                  )}

                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 flex items-center gap-1 text-xs font-bold text-[#f0cf7b]">
                    <Star className="w-3.5 h-3.5 fill-[#f0cf7b] text-[#f0cf7b]" />
                    <span>{barber.rating.toFixed(1)}</span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute bottom-3 left-3">
                    {barber.active ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#183d2b] text-[#9ff0bd] border border-[#2b6848]">
                        Atendendo Hoje
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#482020] text-[#ffb4b4]">
                        Ausente
                      </span>
                    )}
                  </div>
                </div>

                {/* Barber Info */}
                <div className="p-5">
                  <h3 className="text-lg font-extrabold text-white mb-0.5">
                    {barber.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#f0cf7b] mb-3">
                    {barber.role}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {barber.bio}
                  </p>

                  {/* Specialties Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {barber.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#24221c] text-[#f0cf7b] border border-[#c99a35]/20"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => onSelectBarber(barber)}
                  disabled={!barber.active}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#26241e] hover:bg-[#c99a35] text-[#f0cf7b] hover:text-[#141009] disabled:bg-zinc-800 disabled:text-zinc-600 border border-[#c99a35]/40 hover:border-transparent text-xs font-bold transition-all duration-150 cursor-pointer"
                >
                  Agendar com {barber.name.split(' ')[0]}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

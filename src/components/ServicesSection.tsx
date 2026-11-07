import React, { useState } from 'react';
import { Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Service } from '../types/barbershop';

interface ServicesSectionProps {
  services: Service[];
  onSelectService: (service: Service) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  onSelectService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  const categories = [
    { id: 'todos', label: 'Todos os Serviços' },
    { id: 'cabelo', label: 'Cabelo' },
    { id: 'barba', label: 'Barba' },
    { id: 'combo', label: 'Combos Especiais' },
    { id: 'especial', label: 'Tratamentos' },
  ];

  const filteredServices = services.filter((s) => {
    if (selectedCategory === 'todos') return true;
    return s.category === selectedCategory;
  });

  return (
    <section
      id="servicos"
      className="py-16 sm:py-20 bg-[#141414] border-b border-[#252525]"
      style={{
        marginTop: '-76px',
        marginBottom: '0px',
        paddingBottom: '80px',
        paddingRight: '2px',
        paddingLeft: '0px',
      }}
    >
      <div
        className="max-w-6xl mx-auto px-4 sm:px-6"
        style={{
          marginBottom: '1px',
          marginLeft: '1px',
          marginTop: '-5px',
        }}
      >
        {/* Section Heading */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Nossos Serviços
          </h2>
          <p className="text-sm sm:text-base text-zinc-400">
            Escolha o serviço ideal para o seu perfil. Cortes clássicos, degradês precisos e barboterapia de excelência.
          </p>
          <div className="h-1 w-12 bg-[#c99a35] mx-auto mt-4 rounded-full" />
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#c99a35] text-[#141009] shadow-md'
                  : 'bg-[#1e1e1e] text-zinc-300 hover:text-white hover:bg-[#282828] border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="group relative bg-[#1c1c1c] hover:bg-[#202020] border border-[#323232] hover:border-[#c99a35]/60 rounded-2xl p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-3xl p-2.5 rounded-xl bg-[#26241e] border border-[#c99a35]/20 group-hover:scale-110 transition-transform">
                    {service.icon || '✂️'}
                  </span>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-[#f0cf7b]">
                      R$ {service.price.toFixed(2).replace('.', ',')}
                    </span>
                    <div className="flex items-center justify-end gap-1 text-[11px] text-zinc-400 mt-0.5">
                      <Clock className="w-3 h-3 text-[#c99a35]" />
                      <span>~{service.durationMinutes} min</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-[#f0cf7b] transition-colors mb-2">
                  {service.name}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
                  {service.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectService(service)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#282622] hover:bg-[#c99a35] text-[#f0cf7b] hover:text-[#141009] border border-[#c99a35]/40 hover:border-transparent font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer"
              >
                <span>Agendar este serviço</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-500 mt-8">
          * Os valores e serviços podem ser ajustados pela administração. Pagamento no local (Cartão, PIX ou Dinheiro).
        </p>
      </div>
    </section>
  );
};

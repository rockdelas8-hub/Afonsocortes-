import React, { useState } from 'react';
import { X, Search, Calendar, Clock, User, Scissors, Phone, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Appointment, Barber, Service } from '../types/barbershop';

interface ClientAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  services: Service[];
  allAppointments: Appointment[];
  shopPhone: string;
}

export const ClientAreaModal: React.FC<ClientAreaModalProps> = ({
  isOpen,
  onClose,
  barbers,
  services,
  allAppointments,
  shopPhone,
}) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const clean = searchPhone.replace(/\D/g, '');

  const clientAppointments = searched && clean.length >= 4
    ? allAppointments.filter((a) => a.clientPhone.replace(/\D/g, '').includes(clean))
    : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (clean.length < 4) {
      setError('Digite ao menos os 4 últimos dígitos do seu WhatsApp.');
      return;
    }
    setError(null);
    setSearched(true);
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmado':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#173d2b] text-[#8ce6b0]">Confirmado</span>;
      case 'pendente':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#55431d] text-[#ffdc83]">Pendente</span>;
      case 'concluido':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-blue-300">Concluído</span>;
      case 'cancelado':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4a2222] text-[#ffaaaa]">Cancelado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#1a1a1a] border border-[#383838] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#141414] border-b border-[#303030] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#282828] text-[#c99a35] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Meus Agendamentos</h3>
              <p className="text-[11px] text-zinc-400">Consulte o status do seu horário na Barbearia</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Informe seu WhatsApp (com DDD)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#101010] border border-[#3e3e3e] focus:border-[#c99a35] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-bold text-sm rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Consultar</span>
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results list */}
          {clientAppointments !== null && (
            <div>
              {clientAppointments.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-700 rounded-xl text-zinc-400 text-xs sm:text-sm">
                  Nenhum agendamento encontrado para este número. Verifique o número digitado ou faça um novo agendamento!
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      {clientAppointments.length} agendamento(s) localizado(s):
                    </p>
                    <span className="text-[10px] font-bold text-[#8ce6b0] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
                      <span>Atualização em Tempo Real</span>
                    </span>
                  </div>
                  {clientAppointments.map((app) => {
                    const barber = barbers.find((b) => b.id === app.barberId);
                    const service = services.find((s) => s.id === app.serviceId);
                    return (
                      <div
                        key={app.id}
                        className="p-4 rounded-xl bg-[#141414] border border-[#333333] space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-white text-sm">
                              {service?.name || 'Serviço da Barbearia'}
                            </h4>
                            <p className="text-xs text-[#f0cf7b]">
                              Profissional: {barber?.name || 'Afonso Cortes'}
                            </p>
                          </div>
                          {getStatusBadge(app.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 pt-1 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{app.date.split('-').reverse().join('/')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{app.time}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-xs font-bold text-[#c99a35]">
                            R$ {app.price?.toFixed(2).replace('.', ',') || '45,00'}
                          </span>

                          <a
                            href={`https://wa.me/${shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá! Gostaria de falar sobre meu agendamento nº ${app.id} marcado para ${app.date.split('-').reverse().join('/')} às ${app.time}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#25d366] hover:underline"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Dúvida no WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

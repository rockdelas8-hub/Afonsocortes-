import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Scissors, User, Phone, CheckCircle, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { Barber, Service, Appointment, BarbershopConfig } from '../types/barbershop';
import {
  getAvailableSlots,
  validateBookingForm,
  formatWhatsAppBookingMessage,
  formatClientBookingRequestMessage,
  getDayScheduleForDate,
  DEFAULT_SCHEDULE_CONFIG,
} from '../utils/barbershop-logic';

interface BookingSectionProps {
  barbers: Barber[];
  services: Service[];
  appointments: Appointment[];
  config?: BarbershopConfig;
  preSelectedService?: Service | null;
  onAppointmentCreated: (newApp: Appointment) => void;
}

export const BookingSection: React.FC<BookingSectionProps> = ({
  barbers,
  services,
  appointments,
  config,
  preSelectedService,
  onAppointmentCreated,
}) => {
  // Form fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState(barbers[0]?.id || '');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  
  // Default to today
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  
  // Timer to force re-calculation of available slots as time passes
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Status & validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    appointment: Appointment;
    barberName: string;
    serviceName: string;
    whatsappLink: string;
  } | null>(null);

  // Sync default selected barber and service when data loads from server
  useEffect(() => {
    if (!selectedBarberId && barbers.length > 0) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [barbers, selectedBarberId]);

  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  // Sync pre-selected service if user clicked from services grid
  useEffect(() => {
    if (preSelectedService) {
      setSelectedServiceId(preSelectedService.id);
    }
  }, [preSelectedService]);

  const schedule = config?.schedule || DEFAULT_SCHEDULE_CONFIG;
  const daySchedule = getDayScheduleForDate(selectedDate, schedule);
  const isShopOpenOnSelectedDate = daySchedule.isOpen;

  // Compute available slots based on the shop's active schedule
  const availableSlots = React.useMemo(() => {
    const selectedService = services.find(s => s.id === selectedServiceId);
    const duration = selectedService ? selectedService.durationMinutes : 45;

    return getAvailableSlots(
      selectedDate,
      selectedBarberId,
      appointments,
      schedule,
      duration
    );
  }, [selectedDate, selectedBarberId, appointments, schedule, selectedServiceId, services, currentTime]);

  // If currently selected time is not in available slots, reset it
  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(selectedTime)) {
      setSelectedTime(availableSlots[0]);
    } else if (availableSlots.length === 0) {
      setSelectedTime('');
    }
  }, [availableSlots, selectedTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = validateBookingForm({
      clientName,
      clientPhone,
      barberId: selectedBarberId,
      serviceId: selectedServiceId,
      date: selectedDate,
      time: selectedTime,
    }, schedule);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          barberId: selectedBarberId,
          serviceId: selectedServiceId,
          date: selectedDate,
          time: selectedTime,
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao registrar agendamento no servidor.');
      }

      const created: Appointment = await response.json();
      onAppointmentCreated(created);

      const barberObj = barbers.find((b) => b.id === selectedBarberId);
      const serviceObj = services.find((s) => s.id === selectedServiceId);
      const barberName = barberObj ? barberObj.name : 'Barbeiro Afonso Cortes';
      const serviceName = serviceObj ? serviceObj.name : 'Corte / Barba';

      const fallbackConfig: BarbershopConfig = config || {
        name: 'AFONSO CORTES',
        subtitle: 'BARBEARIA',
        eyebrow: 'Estilo • Precisão • Qualidade',
        heroTitleMain: 'Seu estilo,',
        heroTitleAccent: 'nosso trabalho.',
        description: 'Barbearia premium no coração da cidade.',
        phone: '(11) 98765-4321',
        address: 'Rua Augusta, 1420 - Consolação, São Paulo - SP',
        instagram: '@barbeariaafonsocortes',
        photoUrl: '',
        openingHours: 'Segunda a Sábado das 09:00 às 20:00',
      };

      const { link } = formatClientBookingRequestMessage(
        {
          clientName: created.clientName,
          clientPhone: created.clientPhone,
          date: created.date,
          time: created.time,
          serviceName,
          barberName,
          price: created.price,
          notes: created.notes,
        },
        fallbackConfig
      );

      setConfirmedBooking({
        appointment: created,
        barberName,
        serviceName,
        whatsappLink: link,
      });

      // Clear input
      setClientName('');
      setClientPhone('');
      setNotes('');
    } catch (err: any) {
      setErrors({ form: err.message || 'Erro ao processar agendamento.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceObj = services.find((s) => s.id === selectedServiceId);
  const selectedBarberObj = barbers.find((b) => b.id === selectedBarberId);

  return (
    <section id="agendamento" className="py-16 sm:py-20 bg-[#171717] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Agende Seu Horário
          </h2>
          <p className="text-sm sm:text-base text-zinc-400">
            Preencha seus dados com rapidez e garanta sua cadeira na Barbearia Afonso Cortes.
          </p>
          <div className="h-1 w-12 bg-[#c99a35] mx-auto mt-4 rounded-full" />
        </div>

        {/* Success Modal / Card */}
        {confirmedBooking ? (
          <div className="bg-[#1f1e1a] border border-[#c99a35] rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-[#25d366]/20 text-[#25d366] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
              Horário Solicitado com Sucesso!
            </h3>
            <p className="text-sm text-zinc-300 mb-6">
              Parabéns, <strong className="text-white">{confirmedBooking.appointment.clientName}</strong>! Seu pedido foi registrado no sistema.
            </p>

            <div className="bg-[#151515] rounded-xl p-4 text-left border border-white/10 space-y-2 text-xs sm:text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-zinc-400">Serviço:</span>
                <span className="font-bold text-white">{confirmedBooking.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Profissional:</span>
                <span className="font-bold text-[#f0cf7b]">{confirmedBooking.barberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Data e Hora:</span>
                <span className="font-bold text-white">
                  {confirmedBooking.appointment.date.split('-').reverse().join('/')} às {confirmedBooking.appointment.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Valor Estimado:</span>
                <span className="font-black text-[#c99a35]">
                  R$ {confirmedBooking.appointment.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-zinc-400">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#55431d] text-[#ffdc83]">
                  Pendente de Confirmação
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={confirmedBooking.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#25d366] hover:bg-[#20ba59] text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Confirmar no WhatsApp Oficial</span>
              </a>

              <button
                type="button"
                onClick={() => setConfirmedBooking(null)}
                className="w-full py-2.5 px-4 bg-[#262626] hover:bg-[#333333] text-zinc-300 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Fazer Outro Agendamento
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form
            onSubmit={handleSubmit}
            className="bg-[#1c1c1c] border border-[#343434] rounded-2xl p-6 sm:p-8 shadow-xl"
          >
            {errors.form && (
              <div className="mb-5 p-3.5 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errors.form}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              {/* Client Name */}
              <div>
                <label htmlFor="clientName" className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                  Seu Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="clientName"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-[#444444] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#c99a35] focus:ring-1 focus:ring-[#c99a35]"
                  />
                </div>
                {errors.clientName && (
                  <p className="text-red-400 text-xs mt-1">{errors.clientName}</p>
                )}
              </div>

              {/* Client Phone (WhatsApp) */}
              <div>
                <label htmlFor="clientPhone" className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                  WhatsApp com DDD *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="clientPhone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-[#444444] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#c99a35] focus:ring-1 focus:ring-[#c99a35]"
                  />
                </div>
                {errors.clientPhone && (
                  <p className="text-red-400 text-xs mt-1">{errors.clientPhone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              {/* Service Select */}
              <div>
                <label htmlFor="serviceSelect" className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                  Serviço Desejado *
                </label>
                <div className="relative">
                  <Scissors className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="serviceSelect"
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-[#444444] rounded-xl text-white text-sm focus:outline-none focus:border-[#c99a35] focus:ring-1 focus:ring-[#c99a35] cursor-pointer appearance-none"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - R$ {s.price.toFixed(2).replace('.', ',')}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedServiceObj && (
                  <p className="text-[11px] text-[#f0cf7b] mt-1.5 flex items-center gap-1">
                    <span>{selectedServiceObj.icon}</span>
                    <span>Duração média: ~{selectedServiceObj.durationMinutes} minutos</span>
                  </p>
                )}
                {errors.serviceId && (
                  <p className="text-red-400 text-xs mt-1">{errors.serviceId}</p>
                )}
              </div>

              {/* Barber Select */}
              <div>
                <label htmlFor="barberSelect" className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                  Profissional / Barbeiro *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="barberSelect"
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-[#444444] rounded-xl text-white text-sm focus:outline-none focus:border-[#c99a35] focus:ring-1 focus:ring-[#c99a35] cursor-pointer appearance-none"
                  >
                    {barbers
                      .filter((b) => b.active)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.role})
                        </option>
                      ))}
                  </select>
                </div>
                {selectedBarberObj && (
                  <p className="text-[11px] text-zinc-400 mt-1.5">
                    ⭐ {selectedBarberObj.rating} • {selectedBarberObj.specialties.join(', ')}
                  </p>
                )}
                {errors.barberId && (
                  <p className="text-red-400 text-xs mt-1">{errors.barberId}</p>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="bookingDate" className="block text-xs sm:text-sm font-semibold text-zinc-300">
                  Escolha a Data *
                </label>
                {isShopOpenOnSelectedDate ? (
                  <span className="text-[11px] font-semibold text-[#8ce6b0] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#25d366] shadow-[0_0_6px_#25d366]" />
                    <span>{daySchedule.dayName} • Aberto das {daySchedule.openTime} às {daySchedule.closeTime}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-red-400 flex items-center gap-1.5 bg-red-950/60 px-2 py-0.5 rounded-md border border-red-500/30">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span>{daySchedule.dayName} • Barbearia Fechada</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <Calendar className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="bookingDate"
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className={`w-full pl-10 pr-4 py-3 bg-[#111111] border rounded-xl text-white text-sm focus:outline-none focus:ring-1 ${
                    !isShopOpenOnSelectedDate
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
                      : 'border-[#444444] focus:border-[#c99a35] focus:ring-[#c99a35]'
                  }`}
                />
              </div>
              {errors.date && (
                <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.date}</p>
              )}
            </div>

            {/* Available Time Slots Grid */}
            <div className="mb-6">
              <label className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-2">
                Horários Disponíveis para esta Data e Barbeiro *
              </label>

              {!isShopOpenOnSelectedDate ? (
                <div className="p-5 rounded-xl bg-red-950/30 border border-red-500/40 text-center text-xs sm:text-sm text-red-200 space-y-1">
                  <p className="font-bold text-red-300 flex items-center justify-center gap-1.5">
                    <span>🚫 Barbearia fechada aos {daySchedule.dayName}s</span>
                  </p>
                  <p className="text-xs text-red-300/80">
                    Por favor, selecione outro dia da semana no calendário acima para visualizar os horários disponíveis.
                  </p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#141414] border border-dashed border-[#444] text-center text-xs text-zinc-400">
                  Nenhum horário livre para este profissional nesta data. Por favor, tente outra data ou outro profissional.
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#c99a35] text-[#141009] border-[#c99a35] shadow-md scale-105'
                            : 'bg-[#121212] hover:bg-[#202020] text-zinc-300 border-zinc-700/60 hover:border-zinc-500'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.time && (
                <p className="text-red-400 text-xs mt-1.5">{errors.time}</p>
              )}
            </div>

            {/* Notes Field */}
            <div className="mb-7">
              <label htmlFor="bookingNotes" className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                Observações ou Preferências (Opcional)
              </label>
              <textarea
                id="bookingNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Primeira vez na barbearia, degradê bem baixo, pele sensível para toalha quente..."
                rows={2}
                className="w-full p-3 bg-[#111111] border border-[#444444] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#c99a35] focus:ring-1 focus:ring-[#c99a35] resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || availableSlots.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 bg-[#c99a35] hover:bg-[#d8a83d] disabled:bg-zinc-700 disabled:text-zinc-500 text-[#141009] font-black text-base rounded-xl transition-all shadow-lg shadow-[#c99a35]/20 hover:shadow-[#c99a35]/35 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processando agendamento...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-5 h-5" />
                  <span>Confirmar e Solicitar Agendamento</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-400 mt-4">
              🔒 Seus dados serão utilizados apenas para a confirmação e lembrete do horário via WhatsApp.
            </p>
          </form>
        )}
      </div>
    </section>
  );
};

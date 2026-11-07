import React from 'react';
import { Bell, MessageSquare, Clock } from 'lucide-react';
import { Appointment, BarbershopConfig } from '../types/barbershop';
import {
  renderWhatsAppTemplate,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
} from '../utils/barbershop-logic';

interface WhatsAppReminderButtonProps {
  appointment: Appointment;
  barberName: string;
  serviceName: string;
  config: BarbershopConfig;
}

export const WhatsAppReminderButton: React.FC<WhatsAppReminderButtonProps> = ({
  appointment,
  barberName,
  serviceName,
  config,
}) => {
  // Calculate time 10 minutes prior to appointment
  const calculateTenMinutesBefore = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const totalMinutes = h * 60 + m - 10;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${String(newH >= 0 ? newH : 0).padStart(2, '0')}:${String(newM >= 0 ? newM : 0).padStart(2, '0')}`;
  };

  const reminderTime = calculateTenMinutesBefore(appointment.time);
  const template = config.whatsappReminderTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE;
  const reminderMessage = renderWhatsAppTemplate(template, {
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    serviceName,
    barberName,
    date: appointment.date,
    time: appointment.time,
    price: appointment.price,
    notes: appointment.notes,
    shopName: config.name,
    shopAddress: config.address,
    shopPhone: config.phone,
  });

  const cleanPhone = (appointment.clientPhone || '').replace(/\D/g, '');
  const phoneParam = cleanPhone.length >= 10 ? cleanPhone : '';
  const encodedMsg = encodeURIComponent(reminderMessage);
  const whatsappLink = phoneParam
    ? `https://wa.me/${phoneParam}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  const formattedDate = appointment.date.includes('-')
    ? appointment.date.split('-').reverse().join('/')
    : appointment.date;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ffdc83]/20 hover:bg-[#ffdc83]/30 text-[#f0cf7b] border border-[#c99a35]/40 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer group"
      title={`Enviar lembrete de 10 min antes (${reminderTime}) para ${appointment.clientName}`}
    >
      <Bell className="w-3.5 h-3.5 text-[#c99a35] group-hover:animate-bounce" />
      <span>Lembrete -10min ({reminderTime})</span>
    </a>
  );
};

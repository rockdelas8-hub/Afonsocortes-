import React, { useEffect, useState } from 'react';
import { Bell, MessageSquare, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { Appointment, Barber, Service, BarbershopConfig } from '../types/barbershop';
import { renderWhatsAppTemplate, DEFAULT_WHATSAPP_REMINDER_TEMPLATE } from '../utils/barbershop-logic';

interface AutoReminderManagerProps {
  appointments: Appointment[];
  barbers: Barber[];
  services: Service[];
  config: BarbershopConfig;
}

interface TriggeredReminder {
  appointment: Appointment;
  barberName: string;
  serviceName: string;
  reminderMessage: string;
  whatsappLink: string;
}

export const AutoReminderManager: React.FC<AutoReminderManagerProps> = ({
  appointments,
  barbers,
  services,
  config,
}) => {
  const [activeReminders, setActiveReminders] = useState<TriggeredReminder[]>([]);
  const [sentReminderIds, setSentReminderIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('afonso_sent_reminders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Monitor appointments every 20 seconds
  useEffect(() => {
    const checkAppointments = () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeTotalMinutes = currentHours * 60 + currentMinutes;

      const triggered: TriggeredReminder[] = [];

      for (const app of appointments) {
        if (app.status === 'cancelado' || app.status === 'concluido') continue;
        if (sentReminderIds.includes(app.id)) continue;

        // Check if appointment date matches today
        let appDateNormalized = app.date;
        if (app.date.includes('/')) {
          const parts = app.date.split('/');
          if (parts.length === 3) {
            appDateNormalized = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }

        if (appDateNormalized !== todayStr) continue;

        // Parse appointment time HH:mm
        const [appH, appM] = app.time.split(':').map(Number);
        if (isNaN(appH) || isNaN(appM)) continue;

        const appTimeTotalMinutes = appH * 60 + appM;
        const reminderTimeTotalMinutes = appTimeTotalMinutes - 10;

        // Trigger if current time is at or slightly past the 10-minute prior mark (within a 3-minute window)
        const diff = currentTimeTotalMinutes - reminderTimeTotalMinutes;
        if (diff >= 0 && diff <= 3) {
          const barber = barbers.find((b) => b.id === app.barberId);
          const service = services.find((s) => s.id === app.serviceId);
          const barberName = barber ? barber.name : 'Barbeiro';
          const serviceName = service ? service.name : 'Serviço';

          const template = config.whatsappReminderTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE;
          const reminderMessage = renderWhatsAppTemplate(template, {
            clientName: app.clientName,
            clientPhone: app.clientPhone,
            serviceName,
            barberName,
            date: app.date,
            time: app.time,
            price: app.price,
            notes: app.notes,
            shopName: config.name,
            shopAddress: config.address,
            shopPhone: config.phone,
          });

          const cleanPhone = (app.clientPhone || '').replace(/\D/g, '');
          const phoneParam = cleanPhone.length >= 10 ? cleanPhone : '';
          const encodedMsg = encodeURIComponent(reminderMessage);
          const whatsappLink = phoneParam
            ? `https://wa.me/${phoneParam}?text=${encodedMsg}`
            : `https://wa.me/?text=${encodedMsg}`;

          triggered.push({
            appointment: app,
            barberName,
            serviceName,
            reminderMessage,
            whatsappLink,
          });

          // Send browser notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Lembrete Automático - 10 min | ${config.name}`, {
                body: `Faltam 10 min para o agendamento de ${app.clientName} (${app.time}) com ${barberName}!`,
                icon: config.photoUrl || undefined,
              });
            } catch {}
          }
        }
      }

      if (triggered.length > 0) {
        setActiveReminders((prev) => [...prev, ...triggered]);
        const newIds = [...sentReminderIds, ...triggered.map((t) => t.appointment.id)];
        setSentReminderIds(newIds);
        try {
          sessionStorage.setItem('afonso_sent_reminders', JSON.stringify(newIds));
        } catch {}
      }
    };

    checkAppointments();
    const interval = setInterval(checkAppointments, 20000);
    return () => clearInterval(interval);
  }, [appointments, barbers, services, config, sentReminderIds]);

  const handleDismiss = (appId: string) => {
    setActiveReminders((prev) => prev.filter((r) => r.appointment.id !== appId));
  };

  if (activeReminders.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 animate-fade-in">
      {activeReminders.map((reminder) => (
        <div
          key={reminder.appointment.id}
          className="bg-[#1a1a1a] border-2 border-[#ffdc83] rounded-2xl p-4 shadow-2xl text-white space-y-3 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c99a35] via-[#ffdc83] to-[#c99a35]" />

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#423315] border border-[#ffdc83]/40 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-[#ffdc83] animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#ffdc83] bg-[#423315] px-2 py-0.5 rounded-full border border-[#ffdc83]/30">
                  Lembrete Automático (-10 min)
                </span>
                <h4 className="font-bold text-sm text-white mt-0.5">
                  {reminder.appointment.clientName}
                </h4>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(reminder.appointment.id)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-zinc-300 space-y-1 bg-[#141414] p-2.5 rounded-xl border border-white/5">
            <p className="flex justify-between">
              <span className="text-zinc-400">Horário:</span>
              <span className="font-bold text-[#ffdc83]">{reminder.appointment.time}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-zinc-400">Serviço:</span>
              <span className="font-medium">{reminder.serviceName}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-zinc-400">Barbeiro:</span>
              <span className="font-medium">{reminder.barberName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={reminder.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleDismiss(reminder.appointment.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#25d366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>Enviar WhatsApp Agora</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
            <button
              onClick={() => handleDismiss(reminder.appointment.id)}
              className="px-3 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Dispensar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

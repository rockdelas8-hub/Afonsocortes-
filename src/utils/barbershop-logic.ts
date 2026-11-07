import { Appointment, Barber, Service, DaySchedule, BarbershopScheduleConfig } from '../types/barbershop';

export interface BusinessHours {
  startHour: number; // e.g. 9
  endHour: number;   // e.g. 20
  intervalMinutes: number; // e.g. 45
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  startHour: 9,
  endHour: 20,
  intervalMinutes: 45,
};

export const DEFAULT_DAY_SCHEDULES: DaySchedule[] = [
  { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '14:00' },
  { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:30', closeTime: '19:30' },
];

export const DEFAULT_SCHEDULE_CONFIG: BarbershopScheduleConfig = {
  intervalMinutes: 45,
  days: DEFAULT_DAY_SCHEDULES,
};

/**
 * Returns the day of week (0 = Sunday ... 6 = Saturday) safely without timezone offset issues.
 */
export function getDayOfWeekFromDateString(dateStr: string): number {
  if (!dateStr) return new Date().getDay();
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  }
  return new Date(dateStr).getDay();
}

/**
 * Gets the schedule configuration for a given date.
 */
export function getDayScheduleForDate(
  dateStr: string,
  schedule?: BarbershopScheduleConfig
): DaySchedule {
  const dayOfWeek = getDayOfWeekFromDateString(dateStr);
  const daysList = schedule?.days && schedule.days.length > 0 ? schedule.days : DEFAULT_DAY_SCHEDULES;
  const match = daysList.find((d) => d.dayOfWeek === dayOfWeek);
  if (match) return match;

  const names = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return {
    dayOfWeek,
    dayName: names[dayOfWeek] || 'Dia',
    isOpen: dayOfWeek !== 0,
    openTime: '09:00',
    closeTime: '20:00',
  };
}

/**
 * Generates slots between two time strings like "09:00" and "20:00".
 */
export function generateTimeSlotsBetween(
  openTime: string = '09:00',
  closeTime: string = '20:00',
  intervalMinutes: number = 45
): string[] {
  const [startH, startM] = openTime.split(':').map(Number);
  const [endH, endM] = closeTime.split(':').map(Number);
  const startTotalMinutes = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM);
  const endTotalMinutes = (isNaN(endH) ? 20 : endH) * 60 + (isNaN(endM) ? 0 : endM);

  if (endTotalMinutes <= startTotalMinutes || intervalMinutes <= 0) {
    return [];
  }

  const slots: string[] = [];
  for (let m = startTotalMinutes; m + intervalMinutes <= endTotalMinutes; m += intervalMinutes) {
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    const formattedHour = String(hour).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    slots.push(`${formattedHour}:${formattedMinute}`);
  }
  return slots;
}

/**
 * Generates all possible time slots between start and end hour (legacy compatibility).
 */
export function generateDayTimeSlots(hours: BusinessHours = DEFAULT_BUSINESS_HOURS): string[] {
  const openTime = `${String(hours.startHour).padStart(2, '0')}:00`;
  const closeTime = `${String(hours.endHour).padStart(2, '0')}:00`;
  return generateTimeSlotsBetween(openTime, closeTime, hours.intervalMinutes);
}

/**
 * Generates a clean human-readable summary of the active schedule.
 */
export function formatScheduleSummary(schedule?: BarbershopScheduleConfig): string {
  const sched = schedule || DEFAULT_SCHEDULE_CONFIG;
  const openDays = sched.days.filter((d) => d.isOpen);
  if (openDays.length === 0) {
    return 'Temporariamente fechada para agendamentos online';
  }

  const monToSat = sched.days.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 6);
  const sunday = sched.days.find((d) => d.dayOfWeek === 0);
  const allMonToSatOpen = monToSat.every((d) => d.isOpen);
  const firstOpen = monToSat[0];
  const sameHoursMonToSat = allMonToSatOpen && monToSat.every(
    (d) => d.openTime === firstOpen.openTime && d.closeTime === firstOpen.closeTime
  );

  if (allMonToSatOpen && sameHoursMonToSat && (!sunday || !sunday.isOpen)) {
    return `Segunda a Sábado das ${firstOpen.openTime} às ${firstOpen.closeTime} • Domingo fechado`;
  }

  if (allMonToSatOpen && sameHoursMonToSat && sunday?.isOpen) {
    return `Segunda a Sábado das ${firstOpen.openTime} às ${firstOpen.closeTime} • Domingo das ${sunday.openTime} às ${sunday.closeTime}`;
  }

  // Fallback: list active days
  const activeNames = openDays.map((d) => d.dayName.replace('-feira', '')).join(', ');
  return `Aberto: ${activeNames} (horários por serviço)`;
}

/**
 * Helper to convert "HH:mm" to total minutes from midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Returns available slots for a given barber on a specific date,
 * filtering out slots that are already booked (status not 'cancelado').
 * Adjusts the interval based on the requested service duration.
 */
export function getAvailableSlots(
  date: string,
  barberId: string,
  appointments: Appointment[],
  schedule: BarbershopScheduleConfig,
  requestedDurationMinutes?: number
): string[] {
  const daySchedule = getDayScheduleForDate(date, schedule);
  if (!daySchedule.isOpen) {
    return [];
  }

  // Use the requested duration or the schedule's configured interval
  const duration = requestedDurationMinutes && requestedDurationMinutes > 0
    ? requestedDurationMinutes
    : (schedule?.intervalMinutes || 45);

  const allSlots = generateTimeSlotsBetween(
    daySchedule.openTime,
    daySchedule.closeTime,
    duration
  );

  const dayAppointments = appointments.filter(
    (app) => app.date === date && app.barberId === barberId && app.status !== 'cancelado'
  );

  const todayStr = new Date().toLocaleDateString('en-CA');
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return allSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + duration;

    // Filter out past slots if date is today
    if (date === todayStr && slotStart <= currentMinutes) {
      return false;
    }

    // Check overlap with any existing appointment
    const hasOverlap = dayAppointments.some((app) => {
      const appStart = timeToMinutes(app.time);
      const appDuration = app.serviceDurationMinutes || 45; // Fallback for old data
      const appEnd = appStart + appDuration;

      // Overlap formula: (StartA < EndB) and (EndA > StartB)
      return slotStart < appEnd && slotEnd > appStart;
    });

    return !hasOverlap;
  });
}

/**
 * Filters appointments based on status, search query, date, or barber.
 */
export function filterAppointments(
  appointments: Appointment[],
  filters: {
    status?: string;
    search?: string;
    date?: string;
    barberId?: string;
  }
): Appointment[] {
  return appointments.filter((app) => {
    if (filters.status && filters.status !== 'todos' && app.status !== filters.status) {
      return false;
    }
    if (filters.date && app.date !== filters.date) {
      return false;
    }
    if (filters.barberId && filters.barberId !== 'todos' && app.barberId !== filters.barberId) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const matchName = app.clientName.toLowerCase().includes(q);
      const matchPhone = app.clientPhone.toLowerCase().includes(q);
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });
}

/**
 * Calculates dashboard statistics from appointment list.
 */
export function calculateMetrics(appointments: Appointment[]): {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  projectedRevenue: number;
} {
  let pending = 0;
  let confirmed = 0;
  let completed = 0;
  let cancelled = 0;
  let totalRevenue = 0;
  let projectedRevenue = 0;

  for (const app of appointments) {
    if (app.status === 'pendente') {
      pending++;
      projectedRevenue += app.price || 0;
    } else if (app.status === 'confirmado') {
      confirmed++;
      projectedRevenue += app.price || 0;
    } else if (app.status === 'concluido') {
      completed++;
      totalRevenue += app.price || 0;
      projectedRevenue += app.price || 0;
    } else if (app.status === 'cancelado') {
      cancelled++;
    }
  }

  return {
    total: appointments.length,
    pending,
    confirmed,
    completed,
    cancelled,
    totalRevenue,
    projectedRevenue,
  };
}

export const DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE = `Olá, {barbearia}! Gostaria de solicitar a confirmação do meu agendamento:

✂ *Serviço:* {servico}
👤 *Profissional:* {barbeiro}
📅 *Data:* {data}
⏰ *Horário:* {horario}
💰 *Valor Estimado:* {valor}
{observacao}
Nome do cliente: *{cliente}*
WhatsApp: {telefone}

Aguardo a confirmação da barbearia. Obrigado!`;

export const DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE = `💈 *{barbearia}*
Olá, *{cliente}*! Seu agendamento foi *CONFIRMADO* com sucesso! 🎉

✂ *Serviço:* {servico}
👤 *Profissional:* {barbeiro}
📅 *Data:* {data}
⏰ *Horário:* {horario}
💰 *Valor:* {valor}
📍 *Endereço:* {endereco}
{observacao}
Estamos te esperando! Caso precise avisar algum imprevisto, é só responder a esta mensagem.`;

export const DEFAULT_WHATSAPP_REMINDER_TEMPLATE = `💈 *{barbearia}* - Lembrete de Horário ⏰

Olá, *{cliente}*! Passando para lembrar que seu horário para o serviço *{servico}* com *{barbeiro}* é hoje às *{horario}* (daqui a 10 minutos).

📍 *Endereço:* {endereco}
Estamos te aguardando com aquela toalha quente e café fresquinho! Em caso de imprevisto, por favor nos avise por aqui. ✂️`;

/**
 * Replaces placeholders in a WhatsApp message template with actual appointment values.
 */
export function renderWhatsAppTemplate(
  template: string,
  data: {
    clientName: string;
    clientPhone?: string;
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    price: number;
    notes?: string;
    shopName?: string;
    shopAddress?: string;
    shopPhone?: string;
  }
): string {
  let formattedDate = data.date;
  if (data.date && data.date.includes('-')) {
    const parts = data.date.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  const formattedPrice = `R$ ${data.price.toFixed(2).replace('.', ',')}`;
  const notesText = data.notes && data.notes.trim() ? `📝 *Observação:* ${data.notes.trim()}` : '';

  let result = (template || DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE)
    .replace(/\{cliente\}/gi, data.clientName || 'Cliente')
    .replace(/\{nome_cliente\}/gi, data.clientName || 'Cliente')
    .replace(/\{telefone\}/gi, data.clientPhone || '')
    .replace(/\{servico\}/gi, data.serviceName || 'Serviço')
    .replace(/\{barbeiro\}/gi, data.barberName || 'Barbeiro')
    .replace(/\{data\}/gi, formattedDate || '')
    .replace(/\{horario\}/gi, data.time || '')
    .replace(/\{valor\}/gi, formattedPrice)
    .replace(/\{barbearia\}/gi, data.shopName || 'Barbearia Afonso Cortes')
    .replace(/\{endereco\}/gi, data.shopAddress || 'Rua Augusta, 1420 - Consolação, São Paulo - SP')
    .replace(/\{telefone_barbearia\}/gi, data.shopPhone || '');

  if (notesText) {
    result = result.replace(/\{observacao\}/gi, notesText);
  } else {
    result = result.replace(/\{observacao\}\n?/gi, '');
  }

  return result.trim();
}

/**
 * Formats a clean WhatsApp message and link for appointment confirmation or notifications.
 */
export function formatWhatsAppBookingMessage(
  appointment: {
    clientName: string;
    clientPhone: string;
    date: string;
    time: string;
    serviceName: string;
    barberName: string;
    price: number;
    notes?: string;
  },
  shopName: string = 'Barbearia Afonso Cortes',
  template?: string,
  targetPhone?: string,
  extra?: { address?: string; shopPhone?: string }
): { text: string; link: string } {
  const chosenTemplate = template || DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE;
  const message = renderWhatsAppTemplate(chosenTemplate, {
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    date: appointment.date,
    time: appointment.time,
    serviceName: appointment.serviceName,
    barberName: appointment.barberName,
    price: appointment.price,
    notes: appointment.notes,
    shopName,
    shopAddress: extra?.address,
    shopPhone: extra?.shopPhone,
  });

  const phone = targetPhone || appointment.clientPhone;
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneParam = cleanPhone.length >= 10 ? cleanPhone : '';
  const encodedMsg = encodeURIComponent(message);
  const link = phoneParam ? `https://wa.me/${phoneParam}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

  return { text: message, link };
}

/**
 * Formats the official confirmation message sent by the barbershop to the client.
 */
export function formatBarbershopConfirmMessage(
  appointment: {
    clientName: string;
    clientPhone: string;
    date: string;
    time: string;
    serviceName: string;
    barberName: string;
    price: number;
    notes?: string;
  },
  shopConfig: import('../types/barbershop').BarbershopConfig
): { text: string; link: string } {
  const template = shopConfig.whatsappBarbershopConfirmTemplate || DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE;
  const message = renderWhatsAppTemplate(template, {
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    date: appointment.date,
    time: appointment.time,
    serviceName: appointment.serviceName,
    barberName: appointment.barberName,
    price: appointment.price,
    notes: appointment.notes,
    shopName: shopConfig.name,
    shopAddress: shopConfig.address,
    shopPhone: shopConfig.phone,
  });

  const cleanPhone = (appointment.clientPhone || '').replace(/\D/g, '');
  const phoneParam = cleanPhone.length >= 10 ? cleanPhone : '';
  const encodedMsg = encodeURIComponent(message);
  const link = phoneParam ? `https://wa.me/${phoneParam}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

  return { text: message, link };
}

/**
 * Formats the confirmation request message sent by the client to the barbershop.
 */
export function formatClientBookingRequestMessage(
  appointment: {
    clientName: string;
    clientPhone: string;
    date: string;
    time: string;
    serviceName: string;
    barberName: string;
    price: number;
    notes?: string;
  },
  shopConfig: import('../types/barbershop').BarbershopConfig
): { text: string; link: string } {
  const template = shopConfig.whatsappClientRequestTemplate || DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE;
  const message = renderWhatsAppTemplate(template, {
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    date: appointment.date,
    time: appointment.time,
    serviceName: appointment.serviceName,
    barberName: appointment.barberName,
    price: appointment.price,
    notes: appointment.notes,
    shopName: shopConfig.name,
    shopAddress: shopConfig.address,
    shopPhone: shopConfig.phone,
  });

  // Client sends to the shop's WhatsApp phone
  const cleanPhone = (shopConfig.phone || '').replace(/\D/g, '');
  const phoneParam = cleanPhone.length >= 10 ? cleanPhone : '';
  const encodedMsg = encodeURIComponent(message);
  const link = phoneParam ? `https://wa.me/${phoneParam}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

  return { text: message, link };
}

/**
 * Validates booking form inputs.
 */
export function validateBookingForm(
  data: {
    clientName: string;
    clientPhone: string;
    barberId: string;
    serviceId: string;
    date: string;
    time: string;
  },
  schedule?: BarbershopScheduleConfig
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.clientName || data.clientName.trim().length < 3) {
    errors.clientName = 'Nome deve ter pelo menos 3 caracteres.';
  }

  const phoneDigits = data.clientPhone.replace(/\D/g, '');
  if (!phoneDigits || phoneDigits.length < 10) {
    errors.clientPhone = 'Informe um WhatsApp válido com DDD (mínimo 10 dígitos).';
  }

  if (!data.barberId) {
    errors.barberId = 'Selecione um profissional.';
  }

  if (!data.serviceId) {
    errors.serviceId = 'Selecione um serviço.';
  }

  if (!data.date) {
    errors.date = 'Selecione uma data.';
  } else {
    // Check if date is not in the past (using YYYY-MM-DD comparison)
    const today = new Date().toLocaleDateString('en-CA');
    if (data.date < today) {
      errors.date = 'A data não pode ser anterior a hoje.';
    } else {
      const daySched = getDayScheduleForDate(data.date, schedule || DEFAULT_SCHEDULE_CONFIG);
      if (!daySched.isOpen) {
        errors.date = `A barbearia está fechada aos ${daySched.dayName}s. Por favor, selecione outro dia.`;
      }
    }
  }

  if (!data.time) {
    errors.time = 'Selecione um horário disponível.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Pure state reducer for real-time WebSocket events.
 * Guarantees idempotency (no duplicate entries) and atomic state transitions.
 */
export function applyRealtimeEvent(
  prevState: import('../types/barbershop').BarbershopState,
  event: import('../types/barbershop').RealtimeEvent
): import('../types/barbershop').BarbershopState {
  switch (event.type) {
    case 'init':
      return {
        config: event.data.config,
        barbers: event.data.barbers,
        services: event.data.services,
        appointments: event.data.appointments,
        lastAdminNotice: event.data.lastAdminNotice ?? prevState.lastAdminNotice,
      };

    case 'config:updated':
      return {
        ...prevState,
        config: { ...prevState.config, ...event.data },
      };

    case 'service:created': {
      // Idempotent: check if already exists
      if (prevState.services.some((s) => s.id === event.data.id)) {
        return prevState;
      }
      return {
        ...prevState,
        services: [...prevState.services, event.data],
      };
    }

    case 'service:updated': {
      return {
        ...prevState,
        services: prevState.services.map((s) =>
          s.id === event.data.id ? { ...s, ...event.data } : s
        ),
      };
    }

    case 'service:deleted': {
      return {
        ...prevState,
        services: prevState.services.filter((s) => s.id !== event.data.id),
      };
    }

    case 'barber:created': {
      if (prevState.barbers.some((b) => b.id === event.data.id)) {
        return prevState;
      }
      return {
        ...prevState,
        barbers: [...prevState.barbers, event.data],
      };
    }

    case 'barber:updated': {
      return {
        ...prevState,
        barbers: prevState.barbers.map((b) =>
          b.id === event.data.id ? { ...b, ...event.data } : b
        ),
      };
    }

    case 'barber:deleted': {
      return {
        ...prevState,
        barbers: prevState.barbers.filter((b) => b.id !== event.data.id),
      };
    }

    case 'appointment:created': {
      if (prevState.appointments.some((a) => a.id === event.data.id)) {
        return prevState;
      }
      return {
        ...prevState,
        appointments: [event.data, ...prevState.appointments],
      };
    }

    case 'appointment:status_updated': {
      return {
        ...prevState,
        appointments: prevState.appointments.map((a) =>
          a.id === event.data.id ? { ...a, status: event.data.status } : a
        ),
      };
    }

    case 'appointment:deleted': {
      return {
        ...prevState,
        appointments: prevState.appointments.filter((a) => a.id !== event.data.id),
      };
    }

    case 'notice:updated': {
      return {
        ...prevState,
        lastAdminNotice: event.data,
      };
    }

    default:
      return prevState;
  }
}

/**
 * Helper to authenticate master administrator or staff barber.
 * Barbers can only access using an email registered in the barber management tab
 * that has the 'hasAdminAccess' permission enabled by the administrator.
 */
export function authenticateAdmin(
  credentials: { type: 'master'; password?: string } | { type: 'barber'; email?: string },
  barbers: import('../types/barbershop').Barber[]
): { success: boolean; user?: import('../types/barbershop').AdminUser; error?: string } {
  if (credentials.type === 'master') {
    const pass = (credentials.password || '').trim();
    if (pass === 'afonso123') {
      return {
        success: true,
        user: {
          type: 'master',
          name: 'Administrador Geral',
        },
      };
    }
    return {
      success: false,
      error: 'Senha de administrador incorreta.',
    };
  } else {
    const inputEmail = credentials.email?.toLowerCase().trim() || '';
    if (!inputEmail) {
      return {
        success: false,
        error: 'Por favor, informe seu e-mail cadastrado.',
      };
    }

    const barber = barbers.find(
      (b) => b.email && b.email.toLowerCase().trim() === inputEmail
    );

    if (!barber) {
      return {
        success: false,
        error: 'E-mail não encontrado. O barbeiro só terá acesso com o e-mail cadastrado na aba de contratar barbeiro.',
      };
    }

    if (!barber.hasAdminAccess) {
      return {
        success: false,
        error: `O barbeiro ${barber.name} possui este e-mail cadastrado, mas a opção de dar acesso ao painel de administrador ainda não foi ativada.`,
      };
    }

    return {
      success: true,
      user: {
        type: 'barber',
        name: barber.name,
        email: barber.email,
        barberId: barber.id,
      },
    };
  }
}

/**
 * Checks whether an AdminUser has currently valid active privileges.
 * Master administrator always has privileges.
 * Barbers only have privileges if they are present in the barbers list and have hasAdminAccess: true.
 */
export function isUserAuthorizedAdmin(
  user: import('../types/barbershop').AdminUser | null | undefined,
  barbers: import('../types/barbershop').Barber[]
): boolean {
  if (!user) return false;
  if (user.type === 'master') return true;
  if (user.type === 'barber') {
    return barbers.some(
      (b) => b.id === user.barberId && Boolean(b.hasAdminAccess)
    );
  }
  return false;
}


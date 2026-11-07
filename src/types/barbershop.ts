export interface Barber {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  active: boolean;
  bio: string;
  specialties: string[];
  rating: number;
  email?: string;
  hasAdminAccess?: boolean;
}

export interface AdminUser {
  type: 'master' | 'barber';
  name: string;
  email?: string;
  barberId?: string;
}

export interface Service {
  id: string;
  name: string;
  category: 'cabelo' | 'barba' | 'combo' | 'especial';
  price: number;
  durationMinutes: number;
  description: string;
  icon: string;
}

export type AppointmentStatus = 'pendente' | 'confirmado' | 'cancelado' | 'concluido';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  barberId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
  price: number;
  serviceDurationMinutes: number;
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  dayName: string;
  isOpen: boolean;
  openTime: string; // e.g. "09:00"
  closeTime: string; // e.g. "20:00"
}

export interface BarbershopScheduleConfig {
  intervalMinutes: number; // e.g. 30, 45, 60
  days: DaySchedule[];
}

export interface BarbershopConfig {
  name: string;
  subtitle: string;
  eyebrow: string;
  heroTitleMain: string;
  heroTitleAccent: string;
  description: string;
  phone: string;
  address: string;
  instagram: string;
  photoUrl: string;
  openingHours: string;
  schedule?: BarbershopScheduleConfig;
  whatsappClientRequestTemplate?: string;
  whatsappBarbershopConfirmTemplate?: string;
  whatsappReminderTemplate?: string;
}

export type ChatMode = 'fast' | 'general' | 'thinking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  mode?: ChatMode;
  isThinking?: boolean;
}

export interface AdminUpdateNotice {
  id: string;
  category: 'servicos' | 'horarios' | 'equipe' | 'informacoes' | 'agendamentos' | 'geral';
  title: string;
  summary: string;
  detail?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface BarbershopState {
  config: BarbershopConfig;
  barbers: Barber[];
  services: Service[];
  appointments: Appointment[];
  lastAdminNotice?: AdminUpdateNotice | null;
}

export interface AdminChange {
  id: string;
  adminId?: string;
  adminName: string;
  action: string;
  details: string;
  category: string;
  timestamp: string;
  previousData?: any;
  newData?: any;
}

export type RealtimeEvent =
  | { type: 'init'; data: BarbershopState }
  | { type: 'config:updated'; data: BarbershopConfig }
  | { type: 'service:created'; data: Service }
  | { type: 'service:updated'; data: Service }
  | { type: 'service:deleted'; data: { id: string } }
  | { type: 'barber:created'; data: Barber }
  | { type: 'barber:updated'; data: Barber }
  | { type: 'barber:deleted'; data: { id: string } }
  | { type: 'appointment:created'; data: Appointment }
  | { type: 'appointment:status_updated'; data: { id: string; status: AppointmentStatus } }
  | { type: 'appointment:deleted'; data: { id: string } }
  | { type: 'notice:updated'; data: AdminUpdateNotice };


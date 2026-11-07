import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  DollarSign,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  Edit2,
  Phone,
  MessageSquare,
  Search,
  Settings,
  Users,
  Layers,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  ArrowRight,
  Sliders,
  Copy,
  Mail,
  Shield,
  Lock,
  LogOut,
  KeyRound,
  UserCheck,
  Camera,
  Upload,
  Star,
  Image as ImageIcon,
  Bell,
} from 'lucide-react';
import { Appointment, Barber, Service, BarbershopConfig, DaySchedule, BarbershopScheduleConfig, AdminUser } from '../types/barbershop';
import { WhatsAppReminderButton } from './WhatsAppReminderButton';
import {
  calculateMetrics,
  filterAppointments,
  formatWhatsAppBookingMessage,
  formatBarbershopConfirmMessage,
  renderWhatsAppTemplate,
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_DAY_SCHEDULES,
  DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE,
  DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
  formatScheduleSummary,
  generateTimeSlotsBetween,
} from '../utils/barbershop-logic';

export const BARBER_PHOTO_PRESETS = [
  {
    name: 'Afonso Clássico',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Lucas Blade',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mestre Visagista',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Modern Fade',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Barba Terapia',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Hair Stylist',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
];

export const SUGGESTED_SPECIALTIES = [
  'Degradê Navalhado',
  'Barba Terapia',
  'Visagismo Facial',
  'Pigmentação Capilar',
  'Freestyle Hair Design',
  'Corte Clássico na Tesoura',
  'Alisamento / Botox',
  'Sobrancelha na Navalha',
];

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  barbers: Barber[];
  services: Service[];
  config: BarbershopConfig;
  currentUser?: AdminUser | null;
  onLogout?: () => void;
  onUpdateStatus: (id: string, newStatus: Appointment['status']) => void;
  onDeleteAppointment: (id: string) => void;
  onUpdateConfig: (newConfig: BarbershopConfig) => void;
  onSaveBarber: (barber: Partial<Barber> & { id?: string }) => void;
  onDeleteBarber: (id: string) => void;
  onSaveService: (service: Partial<Service> & { id?: string }) => void;
  onDeleteService: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  appointments,
  barbers,
  services,
  config,
  currentUser,
  onLogout,
  onUpdateStatus,
  onDeleteAppointment,
  onUpdateConfig,
  onSaveBarber,
  onDeleteBarber,
  onSaveService,
  onDeleteService,
}) => {
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'barbeiros' | 'servicos' | 'config'>('agendamentos');

  // Sub-tab inside "Serviços & Preços": 'catalogo' or 'horarios'
  const [servicesSubTab, setServicesSubTab] = useState<'catalogo' | 'horarios'>('catalogo');

  // Filters for appointments
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [barberFilter, setBarberFilter] = useState(
    currentUser?.type === 'barber' && currentUser.barberId ? currentUser.barberId : 'todos'
  );

  // Editing Barber state
  const [editingBarber, setEditingBarber] = useState<Partial<Barber> | null>(null);
  const [barberFormError, setBarberFormError] = useState<string | null>(null);
  const [newSpecialtyInput, setNewSpecialtyInput] = useState('');
  const [showPhotoUrlInput, setShowPhotoUrlInput] = useState(false);

  // Photo upload and compression handler
  const handleBarberPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBarberFormError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setEditingBarber((prev) => (prev ? { ...prev, avatar: dataUrl } : prev));
          setBarberFormError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddSpecialty = (specName?: string) => {
    const toAdd = (specName || newSpecialtyInput).trim();
    if (!toAdd || !editingBarber) return;
    const currentSpecs = editingBarber.specialties || [];
    if (!currentSpecs.includes(toAdd)) {
      setEditingBarber({
        ...editingBarber,
        specialties: [...currentSpecs, toAdd],
      });
    }
    setNewSpecialtyInput('');
  };

  const handleRemoveSpecialty = (indexToRemove: number) => {
    if (!editingBarber) return;
    const currentSpecs = editingBarber.specialties || [];
    setEditingBarber({
      ...editingBarber,
      specialties: currentSpecs.filter((_, idx) => idx !== indexToRemove),
    });
  };

  // Editing Service state
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  // Shop settings form state
  const [configForm, setConfigForm] = useState<BarbershopConfig>(config);
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  // Schedule editor state
  const [scheduleForm, setScheduleForm] = useState<BarbershopScheduleConfig>(
    config.schedule || DEFAULT_SCHEDULE_CONFIG
  );
  const [scheduleSavedNotice, setScheduleSavedNotice] = useState(false);
  const [bulkOpenTime, setBulkOpenTime] = useState('09:00');
  const [bulkCloseTime, setBulkCloseTime] = useState('20:00');

  // Keep state synchronized with prop updates
  useEffect(() => {
    setConfigForm(config);
    if (config.schedule && config.schedule.days) {
      setScheduleForm(config.schedule);
    }
  }, [config]);

  // Adjust default filter if currentUser changes
  useEffect(() => {
    if (currentUser?.type === 'barber' && currentUser.barberId) {
      setBarberFilter(currentUser.barberId);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const metrics = calculateMetrics(appointments);
  const filteredAppointments = filterAppointments(appointments, {
    status: statusFilter,
    search: searchQuery,
    barberId: barberFilter,
  });

  const handleSaveConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(configForm);
    setConfigSavedNotice(true);
    setTimeout(() => setConfigSavedNotice(false), 3000);
  };

  const handleBarberFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarber) return;
    setBarberFormError(null);

    // If hasAdminAccess is requested, email must be valid
    if (editingBarber.hasAdminAccess) {
      const emailVal = editingBarber.email?.trim() || '';
      if (!emailVal || !emailVal.includes('@')) {
        setBarberFormError(
          'Para dar acesso ao painel de administrador, é obrigatório cadastrar um e-mail válido para o barbeiro.'
        );
        return;
      }
    }

    const barberToSave = {
      ...editingBarber,
      rating: editingBarber.rating !== undefined ? Number(editingBarber.rating) : 5.0,
      specialties:
        Array.isArray(editingBarber.specialties) && editingBarber.specialties.length > 0
          ? editingBarber.specialties
          : ['Corte Clássico', 'Barba Terapia'],
    };

    onSaveBarber(barberToSave);
    setEditingBarber(null);
    setBarberFormError(null);
    setNewSpecialtyInput('');
    setShowPhotoUrlInput(false);
  };

  const handleToggleBarberAdminAccess = (barber: Barber) => {
    // If giving access and no email is registered, prompt edit form
    if (!barber.hasAdminAccess && (!barber.email || !barber.email.includes('@'))) {
      setEditingBarber({ ...barber, hasAdminAccess: true });
      setBarberFormError(
        'Cadastre o e-mail do barbeiro abaixo para poder liberar o acesso ao painel de administrador.'
      );
      return;
    }

    onSaveBarber({
      ...barber,
      hasAdminAccess: !barber.hasAdminAccess,
    });
  };

  const handleServiceFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    onSaveService(editingService);
    setEditingService(null);
  };

  // Toggle Day open/closed
  const handleToggleDay = (dayOfWeek: number) => {
    setScheduleForm((prev) => {
      const updatedDays = prev.days.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, isOpen: !d.isOpen } : d
      );
      return { ...prev, days: updatedDays };
    });
  };

  // Change open or close time for a day
  const handleChangeDayTime = (dayOfWeek: number, field: 'openTime' | 'closeTime', value: string) => {
    setScheduleForm((prev) => {
      const updatedDays = prev.days.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d
      );
      return { ...prev, days: updatedDays };
    });
  };

  // Apply bulk open/close time to all open days
  const handleApplyBulkTimes = () => {
    setScheduleForm((prev) => {
      const updatedDays = prev.days.map((d) =>
        d.isOpen ? { ...d, openTime: bulkOpenTime, closeTime: bulkCloseTime } : d
      );
      return { ...prev, days: updatedDays };
    });
  };

  // Quick Presets
  const handleApplyPreset = (preset: 'seg_sab' | 'seg_sex' | 'ter_sab' | 'todos') => {
    let newDays: DaySchedule[] = [];
    if (preset === 'seg_sab') {
      newDays = [
        { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '14:00' },
        { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:30', closeTime: '19:30' },
      ];
    } else if (preset === 'seg_sex') {
      newDays = [
        { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '14:00' },
        { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime: '09:00', closeTime: '19:00' },
        { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '19:00' },
        { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '19:00' },
        { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '19:00' },
        { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '19:00' },
        { dayOfWeek: 6, dayName: 'Sábado', isOpen: false, openTime: '09:00', closeTime: '18:00' },
      ];
    } else if (preset === 'ter_sab') {
      newDays = [
        { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '14:00' },
        { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: false, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:30', closeTime: '20:00' },
      ];
    } else if (preset === 'todos') {
      newDays = [
        { dayOfWeek: 0, dayName: 'Domingo', isOpen: true, openTime: '09:00', closeTime: '15:00' },
        { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
        { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      ];
    }

    const updatedSched: BarbershopScheduleConfig = {
      ...scheduleForm,
      days: newDays,
    };
    setScheduleForm(updatedSched);
    const autoSummary = formatScheduleSummary(updatedSched);
    setConfigForm((prev) => ({ ...prev, openingHours: autoSummary }));
  };

  // Change interval minutes
  const handleIntervalChange = (minutes: number) => {
    setScheduleForm((prev) => ({ ...prev, intervalMinutes: minutes }));
  };

  // Generate automated summary text
  const handleAutoGenerateSummary = () => {
    const summary = formatScheduleSummary(scheduleForm);
    setConfigForm((prev) => ({ ...prev, openingHours: summary }));
  };

  // Save Schedule to config
  const handleSaveSchedule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updatedConfig: BarbershopConfig = {
      ...configForm,
      schedule: scheduleForm,
      openingHours: configForm.openingHours || formatScheduleSummary(scheduleForm),
    };
    onUpdateConfig(updatedConfig);
    setScheduleSavedNotice(true);
    setTimeout(() => setScheduleSavedNotice(false), 3500);
  };

  // Insert dynamic tag into Client Request Template
  const handleInsertTagClient = (tag: string) => {
    const current = configForm.whatsappClientRequestTemplate ?? DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE;
    setConfigForm((prev) => ({
      ...prev,
      whatsappClientRequestTemplate: `${current} ${tag}`,
    }));
  };

  // Insert dynamic tag into Barbershop Confirm Template
  const handleInsertTagBarbershop = (tag: string) => {
    const current = configForm.whatsappBarbershopConfirmTemplate ?? DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE;
    setConfigForm((prev) => ({
      ...prev,
      whatsappBarbershopConfirmTemplate: `${current} ${tag}`,
    }));
  };

  // Reset Client Request Template
  const handleResetClientTemplate = () => {
    setConfigForm((prev) => ({
      ...prev,
      whatsappClientRequestTemplate: DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE,
    }));
  };

  // Reset Barbershop Confirm Template
  const handleResetBarbershopTemplate = () => {
    setConfigForm((prev) => ({
      ...prev,
      whatsappBarbershopConfirmTemplate: DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE,
    }));
  };

  // Insert dynamic tag into Reminder Template
  const handleInsertTagReminder = (tag: string) => {
    const current = configForm.whatsappReminderTemplate ?? DEFAULT_WHATSAPP_REMINDER_TEMPLATE;
    setConfigForm((prev) => ({
      ...prev,
      whatsappReminderTemplate: `${current} ${tag}`,
    }));
  };

  // Reset Reminder Template
  const handleResetReminderTemplate = () => {
    setConfigForm((prev) => ({
      ...prev,
      whatsappReminderTemplate: DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
    }));
  };

  // Sample data for real-time live WhatsApp preview speech bubbles
  const sampleAppointment = {
    clientName: 'Carlos Eduardo',
    clientPhone: '(11) 98765-4321',
    serviceName: 'Combo Completo: Cabelo + Barba',
    barberName: 'Afonso Cortes',
    date: '2026-10-27',
    time: '14:30',
    price: 75,
    notes: 'Degradê baixo na 0.5 e toalha quente',
    shopName: configForm.name || 'AFONSO CORTES',
    shopAddress: configForm.address || 'Rua Augusta, 1420 - Consolação, São Paulo - SP',
    shopPhone: configForm.phone || '(11) 98765-4321',
  };

  const previewClientMessage = renderWhatsAppTemplate(
    configForm.whatsappClientRequestTemplate || DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE,
    sampleAppointment
  );

  const previewBarbershopMessage = renderWhatsAppTemplate(
    configForm.whatsappBarbershopConfirmTemplate || DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE,
    sampleAppointment
  );

  const previewReminderMessage = renderWhatsAppTemplate(
    configForm.whatsappReminderTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
    sampleAppointment
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#181818] border border-[#343434] rounded-2xl w-full max-w-5xl h-[92vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#141414] border-b border-[#303030] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c99a35]/20 border border-[#c99a35]/40 text-[#f0cf7b] flex items-center justify-center font-bold">
              ⚙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                  Painel Administrativo
                </h2>
                {currentUser?.type === 'barber' ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                    <Scissors className="w-3 h-3" />
                    Barbeiro da Equipe
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#c99a35]/20 text-[#f0cf7b] border border-[#c99a35]/40">
                    <Shield className="w-3 h-3" />
                    Administrador Geral
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                {currentUser?.type === 'barber'
                  ? `Conectado como ${currentUser.name} (${currentUser.email || 'e-mail cadastrado'})`
                  : 'Gestão completa da Barbearia Afonso Cortes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                title="Sair ou trocar de usuário"
              >
                <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Sair / Trocar Usuário</span>
                <span className="sm:hidden">Sair</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar painel"
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 bg-[#161616] border-b border-[#2c2c2c] flex gap-2 overflow-x-auto no-scrollbar py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('agendamentos')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'agendamentos'
                ? 'bg-[#c99a35] text-[#141009] shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#222]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Agendamentos ({appointments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('barbeiros')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'barbeiros'
                ? 'bg-[#c99a35] text-[#141009] shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#222]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Equipe de Barbeiros ({barbers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('servicos')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'servicos'
                ? 'bg-[#c99a35] text-[#141009] shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#222]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Serviços & Preços ({services.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-[#c99a35] text-[#141009] shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#222]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações da Barbearia</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: AGENDAMENTOS */}
          {activeTab === 'agendamentos' && (
            <div className="space-y-6">
              {/* Metrics cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-3.5 text-center">
                  <span className="text-xl sm:text-2xl font-black text-[#f0cf7b] block">
                    {metrics.total}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Total
                  </span>
                </div>

                <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-3.5 text-center">
                  <span className="text-xl sm:text-2xl font-black text-[#ffdc83] block">
                    {metrics.pending}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Pendentes
                  </span>
                </div>

                <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-3.5 text-center">
                  <span className="text-xl sm:text-2xl font-black text-[#8ce6b0] block">
                    {metrics.confirmed}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Confirmados
                  </span>
                </div>

                <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-3.5 text-center">
                  <span className="text-xl sm:text-2xl font-black text-[#c99a35] block">
                    R$ {metrics.totalRevenue.toFixed(0)}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Realizado (R$)
                  </span>
                </div>
              </div>

              {/* Logged in Barber Quick Notice */}
              {currentUser?.type === 'barber' && (
                <div className="p-3 bg-[#13221b] border border-emerald-500/30 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-emerald-200">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Olá, <strong>{currentUser.name}</strong>! Visualizando agendamentos com acesso autorizado via e-mail.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setBarberFilter(currentUser.barberId || 'todos')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        barberFilter === currentUser.barberId
                          ? 'bg-[#25d366] text-black shadow-xs'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      Meus Agendamentos
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarberFilter('todos')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        barberFilter === 'todos'
                          ? 'bg-[#25d366] text-black shadow-xs'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      Todos os Barbeiros
                    </button>
                  </div>
                </div>
              )}

              {/* Filters toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar cliente ou telefone..."
                    className="w-full pl-9 pr-3 py-2 bg-[#121212] border border-[#3a3a3a] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#c99a35]"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-[#121212] border border-[#3a3a3a] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#c99a35] cursor-pointer"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>

                  <select
                    value={barberFilter}
                    onChange={(e) => setBarberFilter(e.target.value)}
                    className="px-3 py-2 bg-[#121212] border border-[#3a3a3a] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#c99a35] cursor-pointer"
                  >
                    <option value="todos">Todos os Barbeiros</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Appointments List */}
              <div className="space-y-3">
                {filteredAppointments.length === 0 ? (
                  <div className="p-10 text-center border border-dashed border-[#383838] rounded-xl text-zinc-400 text-sm">
                    Nenhum agendamento encontrado com os filtros selecionados.
                  </div>
                ) : (
                  filteredAppointments.map((app) => {
                    const barber = barbers.find((b) => b.id === app.barberId);
                    const service = services.find((s) => s.id === app.serviceId);
                    const barberName = barber ? barber.name : 'Barbeiro Afonso';
                    const serviceName = service ? service.name : 'Corte / Barba';

                    const { link: whatsappLink } = formatBarbershopConfirmMessage(
                      {
                        clientName: app.clientName,
                        clientPhone: app.clientPhone,
                        date: app.date,
                        time: app.time,
                        serviceName,
                        barberName,
                        price: app.price,
                        notes: app.notes,
                      },
                      config
                    );

                    return (
                      <div
                        key={app.id}
                        className="bg-[#141414] border border-[#333333] hover:border-[#444444] rounded-xl p-4 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-base">
                                {app.clientName}
                              </h4>
                              <span className="text-xs text-zinc-400">
                                ({app.clientPhone})
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 mt-0.5">
                              ✂ <strong>{serviceName}</strong> com <span className="text-[#f0cf7b]">{barberName}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-[#c99a35]">
                              R$ {app.price?.toFixed(2).replace('.', ',')}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                app.status === 'confirmado'
                                  ? 'bg-[#173d2b] text-[#8ce6b0]'
                                  : app.status === 'pendente'
                                  ? 'bg-[#55431d] text-[#ffdc83]'
                                  : app.status === 'concluido'
                                  ? 'bg-blue-950 text-blue-300'
                                  : 'bg-[#4a2222] text-[#ffaaaa]'
                              }`}
                            >
                              {app.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-400 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Data: {app.date.split('-').reverse().join('/')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Horário: {app.time}</span>
                          </div>
                          {app.notes && (
                            <div className="text-zinc-400 truncate" title={app.notes}>
                              Obs: {app.notes}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                          {app.status !== 'confirmado' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(app.id, 'confirmado')}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#183d2b] hover:bg-[#205139] text-[#9ff0bd] border border-[#2b6848] transition-colors cursor-pointer"
                            >
                              Confirmar
                            </button>
                          )}

                          {app.status !== 'concluido' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(app.id, 'concluido')}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-800 transition-colors cursor-pointer"
                            >
                              Concluir Atendimento
                            </button>
                          )}

                          {app.status !== 'cancelado' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(app.id, 'cancelado')}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#482020] hover:bg-[#5e2b2b] text-[#ffb4b4] border border-[#753434] transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}

                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#25d366]/20 hover:bg-[#25d366]/30 text-[#25d366] border border-[#25d366]/40 transition-colors cursor-pointer ml-auto"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <WhatsAppReminderButton
                            appointment={app}
                            barberName={barberName}
                            serviceName={serviceName}
                            config={config}
                          />

                          <button
                            type="button"
                            onClick={() => onDeleteAppointment(app.id)}
                            title="Remover agendamento"
                            className="p-1 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BARBEIROS (EQUIPE & CONTRATAÇÃO) */}
          {activeTab === 'barbeiros' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Equipe & Gestão Completa de Barbeiros</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#c99a35]/20 text-[#f0cf7b] rounded-full border border-[#c99a35]/30">
                      100% Editável
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Edite fotos de perfil, nomes, cargos, estrelas de avaliação, especialidades, biografias e permissões de acesso da equipe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBarberFormError(null);
                    setShowPhotoUrlInput(false);
                    setNewSpecialtyInput('');
                    setEditingBarber({
                      name: '',
                      role: 'Barbeiro Profissional & Visagista',
                      avatar: BARBER_PHOTO_PRESETS[0].url,
                      email: '',
                      hasAdminAccess: true,
                      bio: 'Especialista em cortes masculinos clássicos e contemporâneos com acabamento de alta precisão.',
                      specialties: ['Degradê Navalhado', 'Barba Terapia', 'Visagismo Facial'],
                      active: true,
                      rating: 5.0,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-black text-xs rounded-xl transition-all cursor-pointer shadow-md self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Contratar Novo Barbeiro</span>
                </button>
              </div>

              {/* Editing Barber Form Modal / Card */}
              {editingBarber && (
                <form
                  onSubmit={handleBarberFormSubmit}
                  className="bg-[#151515] border border-[#c99a35]/60 rounded-2xl p-5 sm:p-6 space-y-5 animate-in fade-in duration-150 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-[#282828] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#c99a35]/20 text-[#f0cf7b] flex items-center justify-center font-bold">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-white">
                          {editingBarber.id ? `Editar Perfil de ${editingBarber.name || 'Barbeiro'}` : 'Contratar / Cadastrar Novo Barbeiro'}
                        </h4>
                        <p className="text-[11px] text-[#f0cf7b]">
                          Todas as alterações ficam visíveis imediatamente aos clientes na página inicial e no agendamento.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBarber(null);
                        setBarberFormError(null);
                        setShowPhotoUrlInput(false);
                      }}
                      className="text-xs text-zinc-400 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-800"
                    >
                      ✕
                    </button>
                  </div>

                  {barberFormError && (
                    <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{barberFormError}</span>
                    </div>
                  )}

                  {/* 1. SEÇÃO DE FOTO DE PERFIL DO BARBEIRO */}
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-[#c99a35]" />
                        <span>Foto de Perfil do Barbeiro *</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        Visível nos Cards & Agendamento
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      {/* Avatar Preview */}
                      <div className="relative group shrink-0">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-[#c99a35] bg-[#111] shadow-lg flex items-center justify-center">
                          {editingBarber.avatar ? (
                            <img
                              src={editingBarber.avatar}
                              alt={editingBarber.name || 'Barbeiro'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-4xl text-zinc-500">👤</div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#183d2b] border border-[#9ff0bd]/40 text-[#9ff0bd] text-[10px] font-bold">
                          {editingBarber.active ? 'Ativo' : 'Ausente'}
                        </div>
                      </div>

                      {/* Upload / URL Options */}
                      <div className="flex-1 space-y-3 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* File input button */}
                          <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#262626] hover:bg-[#333] text-white border border-[#444] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs">
                            <Upload className="w-3.5 h-3.5 text-[#c99a35]" />
                            <span>Escolher Foto do Computador / Celular</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBarberPhotoUpload}
                              className="hidden"
                            />
                          </label>

                          {/* Toggle URL input */}
                          <button
                            type="button"
                            onClick={() => setShowPhotoUrlInput(!showPhotoUrlInput)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#202020] hover:bg-[#282828] text-zinc-300 hover:text-white border border-[#444] rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{showPhotoUrlInput ? 'Ocultar Link URL' : 'Colar Link URL da Foto'}</span>
                          </button>

                          {/* Remove photo */}
                          {editingBarber.avatar && (
                            <button
                              type="button"
                              onClick={() => setEditingBarber({ ...editingBarber, avatar: '' })}
                              className="inline-flex items-center gap-1 px-2.5 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded-xl text-xs font-medium transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remover</span>
                            </button>
                          )}
                        </div>

                        {/* URL input field */}
                        {showPhotoUrlInput && (
                          <div className="pt-1">
                            <input
                              type="url"
                              value={editingBarber.avatar || ''}
                              onChange={(e) => setEditingBarber({ ...editingBarber, avatar: e.target.value })}
                              placeholder="https://exemplo.com/foto-do-barbeiro.jpg"
                              className="w-full px-3 py-2 bg-[#121212] border border-[#444] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c99a35]"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1">
                              Cole o link direto de uma imagem na web (Unsplash, Instagram, etc.).
                            </p>
                          </div>
                        )}

                        {/* Quick Presets */}
                        <div>
                          <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                            Ou escolha uma foto de barbeiro pronta em 1 clique:
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {BARBER_PHOTO_PRESETS.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setEditingBarber({ ...editingBarber, avatar: preset.url })}
                                className={`flex items-center gap-1.5 p-1 pr-2.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                                  editingBarber.avatar === preset.url
                                    ? 'bg-[#c99a35]/20 border-[#c99a35] text-[#f0cf7b]'
                                    : 'bg-[#121212] border-[#333] text-zinc-400 hover:border-zinc-500 hover:text-white'
                                }`}
                              >
                                <img
                                  src={preset.url}
                                  alt={preset.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                                <span className="text-[11px]">{preset.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. DADOS PRINCIPAIS: NOME, CARGO E AVALIAÇÃO */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Nome do Barbeiro *
                      </label>
                      <input
                        type="text"
                        value={editingBarber.name || ''}
                        onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                        required
                        placeholder="ex: Carlos 'Navalha' Silva"
                        className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Cargo / Título Profissional *
                      </label>
                      <input
                        type="text"
                        value={editingBarber.role || ''}
                        onChange={(e) => setEditingBarber({ ...editingBarber, role: e.target.value })}
                        required
                        placeholder="ex: Mestre Barbeiro & Visagista"
                        className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-[#f0cf7b] text-[#f0cf7b]" />
                          <span>Avaliação (Estrelas) *</span>
                        </span>
                        <span className="text-[#f0cf7b] font-bold">
                          {Number(editingBarber.rating ?? 5.0).toFixed(1)} ⭐
                        </span>
                      </label>
                      <input
                        type="number"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={editingBarber.rating ?? 5.0}
                        onChange={(e) =>
                          setEditingBarber({ ...editingBarber, rating: parseFloat(e.target.value) || 5.0 })
                        }
                        required
                        className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35] font-bold"
                      />
                    </div>
                  </div>

                  {/* 3. ESPECIALIDADES DO BARBEIRO (TAGS INTERATIVAS) */}
                  <div className="bg-[#121212] border border-[#353535] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-[#c99a35]" />
                        <span>Especialidades & Técnicas Dominadas</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        Exibidas no card do cliente
                      </span>
                    </div>

                    {/* Active specialties badges */}
                    <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] p-2 bg-[#171717] rounded-lg border border-white/5">
                      {(editingBarber.specialties && editingBarber.specialties.length > 0) ? (
                        editingBarber.specialties.map((spec, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#24221c] text-[#f0cf7b] border border-[#c99a35]/30 text-xs font-semibold"
                          >
                            <span>{spec}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecialty(idx)}
                              className="text-zinc-400 hover:text-red-400 font-bold ml-0.5 cursor-pointer"
                              title="Remover especialidade"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-500 italic">
                          Nenhuma especialidade adicionada. Adicione abaixo para destacar o perfil.
                        </span>
                      )}
                    </div>

                    {/* Add specialty input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSpecialtyInput}
                        onChange={(e) => setNewSpecialtyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSpecialty();
                          }
                        }}
                        placeholder="Digite uma especialidade (ex: Taper Fade, Pigmentação)..."
                        className="flex-1 px-3 py-1.5 bg-[#1a1a1a] border border-[#444] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c99a35]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSpecialty()}
                        className="px-3 py-1.5 bg-[#252525] hover:bg-[#333] text-[#f0cf7b] border border-white/10 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {/* Quick suggestion pills */}
                    <div className="pt-1">
                      <span className="text-[10px] text-zinc-400 block mb-1">Sugestões rápidas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_SPECIALTIES.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddSpecialty(s)}
                            className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 cursor-pointer transition-colors"
                          >
                            + {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. BIOGRAFIA COMPLETA VISÍVEL AO CLIENTE */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                      <span>Biografia / Apresentação Profissional (Visível aos clientes)</span>
                      <span className="text-[10px] text-zinc-500">
                        {(editingBarber.bio || '').length} caracteres
                      </span>
                    </label>
                    <textarea
                      value={editingBarber.bio || ''}
                      onChange={(e) => setEditingBarber({ ...editingBarber, bio: e.target.value })}
                      rows={2}
                      placeholder="Breve resumo da trajetória, experiência com barboterapia, cortes e atendimento do barbeiro..."
                      className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white resize-none focus:outline-none focus:border-[#c99a35]"
                    />
                  </div>

                  {/* 5. E-MAIL & PERMISSÃO DE ACESSO AO PAINEL */}
                  <div className="bg-[#121212] border border-[#353535] rounded-xl p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#c99a35]" />
                          <span>E-mail Cadastrado do Barbeiro</span>
                        </label>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Para acesso ao painel
                        </span>
                      </div>
                      <input
                        type="email"
                        value={editingBarber.email || ''}
                        onChange={(e) => setEditingBarber({ ...editingBarber, email: e.target.value })}
                        placeholder="ex: barbeiro@barbearia.com.br"
                        className="w-full px-3 py-2 bg-[#181818] border border-[#444] focus:border-[#c99a35] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none font-mono"
                      />
                      <p className="text-[11px] text-zinc-400 mt-1">
                        ✉️ O profissional utilizará exatamente este e-mail na opção &quot;Barbeiro da Equipe&quot; para entrar no painel.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <label className="flex items-start gap-3 text-xs text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(editingBarber.hasAdminAccess)}
                          onChange={(e) =>
                            setEditingBarber({ ...editingBarber, hasAdminAccess: e.target.checked })
                          }
                          className="w-4 h-4 rounded accent-[#c99a35] mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="font-extrabold text-[#f0cf7b] flex items-center gap-1.5 text-xs sm:text-sm">
                            <KeyRound className="w-4 h-4 text-[#c99a35]" />
                            Dar acesso ao painel de administrador para este barbeiro contratado
                          </span>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                            Quando ativado, o barbeiro terá permissão de login no painel administrativo utilizando apenas a opção de e-mail cadastrado acima.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 6. STATUS DO BARBEIRO (ATIVO / AUSENTE) */}
                  <div className="p-3 bg-[#171717] border border-white/5 rounded-xl flex items-center justify-between">
                    <label className="flex items-center gap-3 text-xs text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingBarber.active !== false}
                        onChange={(e) => setEditingBarber({ ...editingBarber, active: e.target.checked })}
                        className="w-4 h-4 rounded accent-[#c99a35] cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-white block">
                          Barbeiro Ativo (Recebendo agendamentos online)
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Quando desativado, o barbeiro é marcado como &quot;Ausente&quot; e os clientes não conseguem selecioná-lo para agendamentos.
                        </span>
                      </div>
                    </label>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        editingBarber.active !== false
                          ? 'bg-[#183d2b] text-[#9ff0bd]'
                          : 'bg-[#482020] text-[#ffb4b4]'
                      }`}
                    >
                      {editingBarber.active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* BOTÕES DE SALVAR / CANCELAR */}
                  <div className="flex gap-2 justify-end pt-3 border-t border-[#262626]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBarber(null);
                        setBarberFormError(null);
                        setShowPhotoUrlInput(false);
                      }}
                      className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-zinc-300 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] text-xs font-black rounded-lg cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Perfil Completo do Barbeiro</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Barbers Roster List Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {barbers.map((b) => (
                  <div
                    key={b.id}
                    className="bg-[#141414] border border-[#333] hover:border-[#444] rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-md group"
                  >
                    <div>
                      {/* Barber Header with Photo Avatar */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#c99a35]/60 bg-[#202020] flex items-center justify-center">
                            {b.avatar ? (
                              <img
                                src={b.avatar}
                                alt={b.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <span className="text-2xl text-zinc-600">👤</span>
                            )}
                          </div>
                          <span
                            className={`w-3.5 h-3.5 rounded-full absolute -top-1 -right-1 border-2 border-[#141414] ${
                              b.active ? 'bg-[#25d366]' : 'bg-red-500'
                            }`}
                            title={b.active ? 'Atendendo' : 'Ausente'}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-extrabold text-white text-base leading-tight truncate">
                              {b.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                b.active ? 'bg-[#183d2b] text-[#9ff0bd]' : 'bg-[#482020] text-[#ffb4b4]'
                              }`}
                            >
                              {b.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <p className="text-xs text-[#f0cf7b] font-medium truncate mt-0.5">{b.role}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs font-bold text-[#f0cf7b]">
                            <Star className="w-3.5 h-3.5 fill-[#f0cf7b] text-[#f0cf7b]" />
                            <span>{(b.rating ?? 5.0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Barber Email */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono mb-2 py-1 px-2 rounded-lg bg-black/40 border border-white/5">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{b.email || <em className="text-zinc-500 font-sans">Sem e-mail</em>}</span>
                      </div>

                      {/* Admin Access Badge */}
                      <div className="mb-2.5">
                        {b.hasAdminAccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#c99a35]/20 text-[#f0cf7b] border border-[#c99a35]/40 shadow-xs">
                            <KeyRound className="w-3 h-3 text-[#c99a35]" />
                            <span>Acesso Admin Liberado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-400 border border-white/5">
                            <Lock className="w-3 h-3 text-zinc-500" />
                            <span>Sem Acesso Admin</span>
                          </span>
                        )}
                      </div>

                      {/* Specialties Pills */}
                      {b.specialties && b.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {b.specialties.slice(0, 3).map((spec, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#201e18] text-[#f0cf7b] border border-[#c99a35]/20"
                            >
                              {spec}
                            </span>
                          ))}
                          {b.specialties.length > 3 && (
                            <span className="text-[10px] font-bold text-zinc-400 px-1.5 py-0.5">
                              +{b.specialties.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed line-clamp-2">{b.bio}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBarberFormError(null);
                            setShowPhotoUrlInput(false);
                            setNewSpecialtyInput('');
                            setEditingBarber(b);
                          }}
                          className="px-2.5 py-1 text-xs font-bold bg-[#c99a35]/20 hover:bg-[#c99a35]/30 text-[#f0cf7b] border border-[#c99a35]/40 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar Perfil & Foto</span>
                        </button>

                        {/* Quick Toggle Access */}
                        <button
                          type="button"
                          onClick={() => handleToggleBarberAdminAccess(b)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                            b.hasAdminAccess
                              ? 'bg-red-950/40 hover:bg-red-950/70 text-red-300 border-red-500/30'
                              : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
                          }`}
                          title={
                            b.hasAdminAccess
                              ? 'Clique para revogar o acesso deste barbeiro ao painel'
                              : 'Clique para dar acesso ao painel de administrador com o e-mail cadastrado'
                          }
                        >
                          {b.hasAdminAccess ? 'Revogar Acesso' : 'Liberar Acesso'}
                        </button>
                      </div>

                      {barbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteBarber(b.id)}
                          className="text-xs text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/30 cursor-pointer transition-colors"
                          title="Excluir barbeiro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SERVIÇOS & PREÇOS + DIAS E HORÁRIOS */}
          {activeTab === 'servicos' && (
            <div className="space-y-6">
              {/* Sub-tabs inside Serviços & Preços */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-[#151515] border border-[#2e2e2e] rounded-xl">
                <div className="flex items-center gap-1.5 bg-[#1f1f1f] p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setServicesSubTab('catalogo')}
                    className={`px-3.5 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      servicesSubTab === 'catalogo'
                        ? 'bg-[#c99a35] text-[#141009] shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-[#282828]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Catálogo de Serviços ({services.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServicesSubTab('horarios')}
                    className={`px-3.5 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      servicesSubTab === 'horarios'
                        ? 'bg-[#c99a35] text-[#141009] shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-[#282828]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Dias e Horários Disponíveis</span>
                    <span className="w-2 h-2 rounded-full bg-[#25d366] shadow-[0_0_6px_#25d366]" />
                  </button>
                </div>

                <div className="text-xs text-zinc-400 flex items-center gap-2 px-1">
                  <span className="text-[11px] text-zinc-400">Escala ativa:</span>
                  <span className="text-[11px] font-semibold text-[#f0cf7b] truncate max-w-[260px] sm:max-w-xs">
                    {configForm.openingHours || 'Segunda a Sábado das 09:00 às 20:00'}
                  </span>
                </div>
              </div>

              {/* VIEW 1: CATÁLOGO DE SERVIÇOS */}
              {servicesSubTab === 'catalogo' && (
                <div className="space-y-6">
                  {/* Quick Barbershop Schedule Callout Card */}
                  <div className="bg-[#191919] border border-[#333333] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#c99a35]/15 border border-[#c99a35]/30 text-[#f0cf7b] flex items-center justify-center shrink-0 font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Dias & Horários de Atendimento da Barbearia</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#183d2b] text-[#9ff0bd] font-bold">
                            Ativo
                          </span>
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {configForm.openingHours || 'Segunda a Sábado das 09:00 às 20:00'} • Intervalos de {scheduleForm.intervalMinutes || 45} min
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setServicesSubTab('horarios')}
                      className="px-3.5 py-2 bg-[#252525] hover:bg-[#303030] border border-white/10 text-[#f0cf7b] hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Editar Dias e Horários</span>
                      <ArrowRight className="w-3 h-3 text-zinc-500" />
                    </button>
                  </div>

                  {/* Header & New Service Button */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h3 className="text-base font-bold text-white">Catálogo de Serviços</h3>
                      <p className="text-xs text-zinc-400">Ajuste os valores, nomes e tempo estimado dos serviços</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingService({
                          name: '',
                          category: 'cabelo',
                          price: 50,
                          durationMinutes: 40,
                          description: '',
                          icon: '✂️',
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Novo Serviço</span>
                    </button>
                  </div>

                  {/* Editing Service Form */}
                  {editingService && (
                    <form
                      onSubmit={handleServiceFormSubmit}
                      className="bg-[#151515] border border-[#c99a35]/60 rounded-xl p-5 space-y-4"
                    >
                      <h4 className="font-bold text-sm text-[#f0cf7b]">
                        {editingService.id ? 'Editar Serviço' : 'Adicionar Novo Serviço'}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome do Serviço</label>
                          <input
                            type="text"
                            value={editingService.name || ''}
                            onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                            required
                            className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">Preço (R$)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={editingService.price || 0}
                            onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) || 0 })}
                            required
                            className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">Categoria</label>
                          <select
                            value={editingService.category || 'cabelo'}
                            onChange={(e) => setEditingService({ ...editingService, category: e.target.value as any })}
                            className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white"
                          >
                            <option value="cabelo">Cabelo</option>
                            <option value="barba">Barba</option>
                            <option value="combo">Combo</option>
                            <option value="especial">Especial / Tratamento</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">Duração (minutos)</label>
                          <input
                            type="number"
                            value={editingService.durationMinutes || 30}
                            onChange={(e) => setEditingService({ ...editingService, durationMinutes: parseInt(e.target.value, 10) || 30 })}
                            className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1">Ícone (Emoji)</label>
                          <input
                            type="text"
                            value={editingService.icon || '✂️'}
                            onChange={(e) => setEditingService({ ...editingService, icon: e.target.value })}
                            className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">Descrição</label>
                        <textarea
                          value={editingService.description || ''}
                          onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white resize-none"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingService(null)}
                          className="px-3 py-1.5 bg-[#252525] text-zinc-300 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#c99a35] text-[#141009] text-xs font-black rounded-lg cursor-pointer"
                        >
                          Salvar Serviço
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Service list table / cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((s) => (
                      <div key={s.id} className="bg-[#141414] border border-[#333] rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{s.icon}</span>
                              <div>
                                <h4 className="font-bold text-white text-sm">{s.name}</h4>
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.category}</span>
                              </div>
                            </div>
                            <span className="text-base font-black text-[#c99a35]">
                              R$ {s.price.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mb-2">{s.description}</p>
                          <p className="text-[11px] text-zinc-500">⏱ ~{s.durationMinutes} minutos</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                          <button
                            type="button"
                            onClick={() => setEditingService(s)}
                            className="text-xs font-bold text-[#c99a35] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {services.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteService(s.id)}
                              className="text-xs text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 2: DIAS E HORÁRIOS DISPONÍVEIS DA BARBEARIA */}
              {servicesSubTab === 'horarios' && (
                <div className="space-y-6">
                  {/* Success Alert */}
                  {scheduleSavedNotice && (
                    <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong className="block font-bold">Dias e horários salvos com sucesso!</strong>
                        <span>A nova escala e disponibilidade de vagas já estão valendo para os agendamentos online.</span>
                      </div>
                    </div>
                  )}

                  {/* Header info */}
                  <div className="bg-[#141414] border border-[#303030] rounded-xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#282828]">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#c99a35]" />
                          <span>Configuração de Dias e Horários da Barbearia</span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Ative ou desative dias da semana e ajuste os horários de início, término e intervalo dos agendamentos.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveSchedule}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-black text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer self-start sm:self-auto"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar Dias e Horários</span>
                      </button>
                    </div>

                    {/* Presets and Global Interval */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Presets */}
                      <div className="bg-[#1b1b1b] border border-[#2b2b2b] rounded-lg p-3.5">
                        <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
                          ⚡ Predefinições Rápidas de Escala:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('seg_sab')}
                            className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#323232] text-xs font-semibold text-zinc-200 rounded-lg border border-white/5 transition-all cursor-pointer"
                          >
                            Seg a Sáb (09h - 20h)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('seg_sex')}
                            className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#323232] text-xs font-semibold text-zinc-200 rounded-lg border border-white/5 transition-all cursor-pointer"
                          >
                            Seg a Sex (09h - 19h)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('ter_sab')}
                            className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#323232] text-xs font-semibold text-zinc-200 rounded-lg border border-white/5 transition-all cursor-pointer"
                          >
                            Ter a Sáb (09h - 20h)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset('todos')}
                            className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#323232] text-xs font-semibold text-zinc-200 rounded-lg border border-white/5 transition-all cursor-pointer"
                          >
                            Todos os 7 dias
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Interval Notice */}
                      <div className="bg-[#1b1b1b] border border-[#c99a35]/30 rounded-lg p-3.5">
                        <label className="block text-[11px] font-bold text-[#f0cf7b] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⏱ Intervalo de Agendamentos:</span>
                        </label>
                        <div className="text-[11px] text-zinc-400 leading-relaxed">
                          Os horários disponíveis agora são calculados <strong>automaticamente</strong> de acordo com a duração de cada serviço cadastrado. 
                          Isso otimiza sua agenda e evita espaços vazios desnecessários.
                        </div>
                      </div>
                    </div>

                    {/* Bulk set hours for all open days */}
                    <div className="mt-4 p-3 bg-[#181818] border border-[#2a2a2a] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Sliders className="w-4 h-4 text-[#c99a35]" />
                        <span>Definir horário padrão para todos os dias abertos:</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={bulkOpenTime}
                          onChange={(e) => setBulkOpenTime(e.target.value)}
                          className="px-2 py-1 bg-[#101010] border border-[#444] rounded text-white text-xs"
                        />
                        <span className="text-zinc-500">às</span>
                        <input
                          type="time"
                          value={bulkCloseTime}
                          onChange={(e) => setBulkCloseTime(e.target.value)}
                          className="px-2 py-1 bg-[#101010] border border-[#444] rounded text-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleApplyBulkTimes}
                          className="px-3 py-1 bg-[#282828] hover:bg-[#343434] text-[#f0cf7b] hover:text-white border border-white/10 rounded font-semibold text-xs cursor-pointer transition-colors"
                        >
                          Aplicar a todos
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Day by Day Schedule List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Disponibilidade Dia a Dia (Segunda a Domingo)
                      </h4>
                      <span className="text-[11px] text-zinc-500">
                        Dias fechados não permitirão agendamentos de clientes
                      </span>
                    </div>

                    {/* Render days ordered Monday to Sunday */}
                    {[...scheduleForm.days]
                      .sort((a, b) => {
                        const orderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
                        const orderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
                        return orderA - orderB;
                      })
                      .map((day) => {
                        const slots = day.isOpen
                          ? generateTimeSlotsBetween(day.openTime, day.closeTime, scheduleForm.intervalMinutes)
                          : [];

                        return (
                          <div
                            key={day.dayOfWeek}
                            className={`p-4 rounded-xl border transition-all ${
                              day.isOpen
                                ? 'bg-[#151515] border-[#383838]'
                                : 'bg-[#121212] border-[#252525] opacity-75'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Day Name and Open/Close Toggle */}
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDay(day.dayOfWeek)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                    day.isOpen
                                      ? 'bg-[#183d2b] text-[#9ff0bd] border border-[#25d366]/40 hover:bg-[#1e4e37]'
                                      : 'bg-[#332222] text-[#fca5a5] border border-red-500/30 hover:bg-[#442c2c]'
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      day.isOpen ? 'bg-[#25d366]' : 'bg-red-400'
                                    }`}
                                  />
                                  <span>{day.isOpen ? 'Aberto' : 'Fechado'}</span>
                                </button>

                                <div>
                                  <span className="text-sm font-bold text-white block">
                                    {day.dayName}
                                  </span>
                                  <span className="text-[11px] text-zinc-400">
                                    {day.isOpen
                                      ? `${slots.length} vagas de atendimento estimadas (~${scheduleForm.intervalMinutes}m cada)`
                                      : 'Barbearia fechada neste dia'}
                                  </span>
                                </div>
                              </div>

                              {/* Hours Inputs */}
                              {day.isOpen ? (
                                <div className="flex items-center gap-2 self-start sm:self-auto bg-[#1b1b1b] p-1.5 rounded-lg border border-[#303030]">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-zinc-400 text-[11px]">Início:</span>
                                    <input
                                      type="time"
                                      value={day.openTime}
                                      onChange={(e) =>
                                        handleChangeDayTime(day.dayOfWeek, 'openTime', e.target.value)
                                      }
                                      className="px-2 py-1 bg-[#101010] border border-[#444] rounded text-white text-xs font-semibold focus:outline-none focus:border-[#c99a35]"
                                    />
                                  </div>

                                  <span className="text-zinc-500 text-xs">até</span>

                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-zinc-400 text-[11px]">Término:</span>
                                    <input
                                      type="time"
                                      value={day.closeTime}
                                      onChange={(e) =>
                                        handleChangeDayTime(day.dayOfWeek, 'closeTime', e.target.value)
                                      }
                                      className="px-2 py-1 bg-[#101010] border border-[#444] rounded text-white text-xs font-semibold focus:outline-none focus:border-[#c99a35]"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-500 italic px-2">
                                  Nenhum agendamento online permitido
                                </div>
                              )}
                            </div>

                            {/* Slot preview chips if open */}
                            {day.isOpen && slots.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
                                  Prévia de horários:
                                </span>
                                {slots.slice(0, 10).map((s) => (
                                  <span
                                    key={s}
                                    className="px-2 py-0.5 rounded bg-[#202020] text-zinc-300 text-[11px] font-mono shrink-0"
                                  >
                                    {s}
                                  </span>
                                ))}
                                {slots.length > 10 && (
                                  <span className="text-[11px] text-zinc-500 shrink-0">
                                    +{slots.length - 10} mais
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Public Opening Hours Display Text */}
                  <div className="bg-[#151515] border border-[#303030] rounded-xl p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-white uppercase tracking-wider">
                        Texto de Exibição no Site (Cabeçalho, Rodapé e IA):
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateSummary}
                        className="text-xs font-bold text-[#c99a35] hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Gerar texto automático com base nos dias acima</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={configForm.openingHours}
                      onChange={(e) => setConfigForm({ ...configForm, openingHours: e.target.value })}
                      placeholder="Ex: Segunda a Sábado das 09:00 às 20:00 • Domingo fechado"
                      className="w-full px-3.5 py-2.5 bg-[#101010] border border-[#444] rounded-xl text-sm text-white focus:outline-none focus:border-[#c99a35]"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Este texto é exibido para os clientes no rodapé do site, na barra informativa e pelo Afonso AI.
                    </p>
                  </div>

                  {/* Bottom Save Action */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setServicesSubTab('catalogo')}
                      className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      ← Voltar ao Catálogo de Serviços
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveSchedule}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-black text-sm rounded-xl transition-all shadow-lg cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Dias e Horários da Barbearia</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONFIGURAÇÕES DA BARBEARIA */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfigSubmit} className="max-w-4xl mx-auto space-y-6">
              {configSavedNotice && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="block font-bold">Configurações e mensagens salvas com sucesso!</strong>
                    <span>As alterações gerais e os modelos de WhatsApp já estão ativos em todo o sistema.</span>
                  </div>
                </div>
              )}

              {/* Informações Básicas da Barbearia */}
              <div className="bg-[#141414] border border-[#2e2e2e] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#252525]">
                  <Settings className="w-4 h-4 text-[#c99a35]" />
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                    Dados Principais da Barbearia
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome da Barbearia</label>
                    <input
                      type="text"
                      value={configForm.name}
                      onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Subtítulo</label>
                    <input
                      type="text"
                      value={configForm.subtitle}
                      onChange={(e) => setConfigForm({ ...configForm, subtitle: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Slogan / Eyebrow</label>
                  <input
                    type="text"
                    value={configForm.eyebrow}
                    onChange={(e) => setConfigForm({ ...configForm, eyebrow: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Título Hero (Principal)</label>
                    <input
                      type="text"
                      value={configForm.heroTitleMain}
                      onChange={(e) => setConfigForm({ ...configForm, heroTitleMain: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Título Hero (Destaque Dourado)</label>
                    <input
                      type="text"
                      value={configForm.heroTitleAccent}
                      onChange={(e) => setConfigForm({ ...configForm, heroTitleAccent: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Descrição</label>
                  <textarea
                    value={configForm.description}
                    onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white resize-none focus:outline-none focus:border-[#c99a35]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">WhatsApp de Atendimento</label>
                    <input
                      type="text"
                      value={configForm.phone}
                      onChange={(e) => setConfigForm({ ...configForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Horário de Funcionamento (Resumo)</label>
                    <input
                      type="text"
                      value={configForm.openingHours}
                      onChange={(e) => setConfigForm({ ...configForm, openingHours: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={configForm.address}
                    onChange={(e) => setConfigForm({ ...configForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">URL da Foto da Barbearia (Cabeçalho)</label>
                  <input
                    type="text"
                    value={configForm.photoUrl}
                    onChange={(e) => setConfigForm({ ...configForm, photoUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#c99a35]"
                  />
                </div>
              </div>

              {/* SEÇÃO: MENSAGENS PERSONALIZADAS DE WHATSAPP (LADO A LADO) */}
              <div className="bg-[#141414] border border-[#2e2e2e] rounded-xl p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#252525]">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#25d366]" />
                      <span>Mensagens de WhatsApp (Confirmação de Agendamento)</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Edite lado a lado a mensagem enviada pelo cliente e a mensagem enviada pela barbearia.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#8ce6b0] bg-[#183d2b] border border-[#25d366]/40 px-2.5 py-1 rounded-full self-start sm:self-auto flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#25d366] shadow-[0_0_6px_#25d366]" />
                    <span>Tags dinâmicas automáticas</span>
                  </span>
                </div>

                {/* Tags Guide / Cheat Sheet */}
                <div className="bg-[#191919] border border-[#333333] rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-white text-[11px] uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#c99a35]" />
                    <span>Variáveis disponíveis para inserir no texto:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { tag: '{cliente}', desc: 'Nome do cliente' },
                      { tag: '{servico}', desc: 'Serviço' },
                      { tag: '{barbeiro}', desc: 'Barbeiro' },
                      { tag: '{data}', desc: 'Data (DD/MM/AAAA)' },
                      { tag: '{horario}', desc: 'Horário (HH:mm)' },
                      { tag: '{valor}', desc: 'Valor em R$' },
                      { tag: '{telefone}', desc: 'WhatsApp do cliente' },
                      { tag: '{barbearia}', desc: 'Nome barbearia' },
                      { tag: '{endereco}', desc: 'Endereço barbearia' },
                      { tag: '{observacao}', desc: 'Obs / Preferências' },
                    ].map((item) => (
                      <span
                        key={item.tag}
                        className="px-2 py-0.5 bg-[#121212] border border-white/10 rounded-md text-[11px] font-mono text-[#f0cf7b]"
                        title={item.desc}
                      >
                        {item.tag} <span className="text-zinc-500 font-sans text-[10px]">({item.desc})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Grid Lado a Lado: Coluna 1 (Cliente -> Barbearia) e Coluna 2 (Barbearia -> Cliente) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  
                  {/* COLUNA ESQUERDA: CLIENTE -> BARBEARIA */}
                  <div className="bg-[#191919] border border-[#333333] rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3 pb-2.5 border-b border-[#282828]">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-600/30 mb-1.5 inline-block">
                            1. Cliente ➔ Barbearia
                          </span>
                          <h4 className="font-bold text-sm text-white">Pedido de Confirmação do Cliente</h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Mensagem que o cliente envia no WhatsApp para pedir a confirmação da reserva.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetClientTemplate}
                          className="text-[10px] font-bold text-zinc-400 hover:text-white px-2 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Restaurar modelo original"
                        >
                          Restaurar
                        </button>
                      </div>

                      {/* Tag insertion buttons */}
                      <div className="mb-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                          Inserir tag no texto:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {['{cliente}', '{servico}', '{barbeiro}', '{data}', '{horario}', '{valor}', '{observacao}'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleInsertTagClient(t)}
                              className="px-2 py-0.5 rounded bg-[#131313] hover:bg-[#252525] text-[11px] font-mono text-[#f0cf7b] border border-white/5 transition-colors cursor-pointer"
                            >
                              +{t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Message Textarea */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Modelo da Mensagem:
                        </label>
                        <textarea
                          value={configForm.whatsappClientRequestTemplate ?? DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE}
                          onChange={(e) =>
                            setConfigForm({ ...configForm, whatsappClientRequestTemplate: e.target.value })
                          }
                          rows={8}
                          className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#25d366] resize-y"
                          placeholder="Digite o texto da mensagem que o cliente enviará..."
                        />
                      </div>
                    </div>

                    {/* Speech bubble preview */}
                    <div className="bg-[#0b141a] border border-[#233138] rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]" />
                          Prévia no WhatsApp (Cliente):
                        </span>
                        <span className="text-zinc-500 font-mono text-[9px]">14:30</span>
                      </div>
                      <div className="bg-[#005c4b] text-white p-3 rounded-lg text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-sm">
                        {previewClientMessage}
                      </div>
                    </div>
                  </div>

                  {/* COLUNA DIREITA: BARBEARIA -> CLIENTE */}
                  <div className="bg-[#191919] border border-[#333333] rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3 pb-2.5 border-b border-[#282828]">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-600/30 mb-1.5 inline-block">
                            2. Barbearia ➔ Cliente
                          </span>
                          <h4 className="font-bold text-sm text-white">Confirmação Oficial da Barbearia</h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Mensagem que a barbearia envia para notificar o cliente confirmando o agendamento.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetBarbershopTemplate}
                          className="text-[10px] font-bold text-zinc-400 hover:text-white px-2 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Restaurar modelo original"
                        >
                          Restaurar
                        </button>
                      </div>

                      {/* Tag insertion buttons */}
                      <div className="mb-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                          Inserir tag no texto:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {['{cliente}', '{servico}', '{barbeiro}', '{data}', '{horario}', '{valor}', '{endereco}', '{observacao}'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleInsertTagBarbershop(t)}
                              className="px-2 py-0.5 rounded bg-[#131313] hover:bg-[#252525] text-[11px] font-mono text-[#8ce6b0] border border-white/5 transition-colors cursor-pointer"
                            >
                              +{t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Message Textarea */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Modelo da Mensagem:
                        </label>
                        <textarea
                          value={configForm.whatsappBarbershopConfirmTemplate ?? DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE}
                          onChange={(e) =>
                            setConfigForm({ ...configForm, whatsappBarbershopConfirmTemplate: e.target.value })
                          }
                          rows={8}
                          className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#25d366] resize-y"
                          placeholder="Digite o texto da mensagem que a barbearia enviará..."
                        />
                      </div>
                    </div>

                    {/* Speech bubble preview */}
                    <div className="bg-[#0b141a] border border-[#233138] rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]" />
                          Prévia no WhatsApp (Barbearia):
                        </span>
                        <span className="text-zinc-500 font-mono text-[9px]">14:32</span>
                      </div>
                      <div className="bg-[#202c33] text-white p-3 rounded-lg text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-sm border border-white/5">
                        {previewBarbershopMessage}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* SEÇÃO: CONFIGURAÇÃO DO LEMBRETE DE 10 MINUTOS */}
              <div className="bg-[#141414] border border-[#2e2e2e] rounded-xl p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#252525]">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#ffdc83]" />
                      <span>Configurar Lembrete de 10 Minutos antes do Agendamento</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Personalize a mensagem de lembrete que é enviada ao cliente minutos antes do horário marcado.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#ffdc83] bg-[#423315] border border-[#ffdc83]/30 px-2.5 py-1 rounded-full self-start sm:self-auto flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#ffdc83]" />
                    <span>Envio Antecipado</span>
                  </span>
                </div>

                <div className="bg-[#191919] border border-[#333333] rounded-xl p-4 flex flex-col justify-between space-y-4 max-w-2xl mx-auto">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2.5 border-b border-[#282828]">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#423315] text-[#ffdc83] border border-[#ffdc83]/30 mb-1.5 inline-block">
                          3. Lembrete -10 min ➔ Cliente
                        </span>
                        <h4 className="font-bold text-sm text-white">Mensagem de Lembrete Antecipado</h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Disparada via WhatsApp pelo botão de lembrete no painel de agendamentos.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetReminderTemplate}
                        className="text-[10px] font-bold text-zinc-400 hover:text-white px-2 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Restaurar modelo original"
                      >
                        Restaurar
                      </button>
                    </div>

                    {/* Tag insertion buttons */}
                    <div className="mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                        Inserir tag no texto:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {['{cliente}', '{servico}', '{barbeiro}', '{data}', '{horario}', '{valor}', '{endereco}', '{observacao}'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleInsertTagReminder(t)}
                            className="px-2 py-0.5 rounded bg-[#131313] hover:bg-[#252525] text-[11px] font-mono text-[#ffdc83] border border-white/5 transition-colors cursor-pointer"
                          >
                            +{t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Textarea */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Modelo da Mensagem de Lembrete:
                      </label>
                      <textarea
                        value={configForm.whatsappReminderTemplate ?? DEFAULT_WHATSAPP_REMINDER_TEMPLATE}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, whatsappReminderTemplate: e.target.value })
                        }
                        rows={6}
                        className="w-full px-3 py-2 bg-[#101010] border border-[#444] rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#ffdc83] resize-y"
                        placeholder="Digite o texto do lembrete..."
                      />
                    </div>
                  </div>

                  {/* Speech bubble preview */}
                  <div className="bg-[#0b141a] border border-[#233138] rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-[#ffdc83]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ffdc83]" />
                        Prévia do Lembrete no WhatsApp:
                      </span>
                      <span className="text-zinc-500 font-mono text-[9px]">14:20</span>
                    </div>
                    <div className="bg-[#202c33] text-white p-3 rounded-lg text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-sm border border-white/5">
                      {previewReminderMessage}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão Salvar Todas as Configurações */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-black text-sm rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações e Mensagens da Barbearia</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Barber,
  Service,
  Appointment,
  BarbershopConfig,
  RealtimeEvent,
  BarbershopState,
} from '../types/barbershop';
import {
  applyRealtimeEvent,
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE,
  DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE,
} from '../utils/barbershop-logic';

export interface LiveNotification {
  id: string;
  type: 'info' | 'success' | 'warning';
  message: string;
  timestamp: number;
}

const DEFAULT_CONFIG: BarbershopConfig = {
  name: 'AFONSO CORTES',
  subtitle: 'BARBEARIA',
  eyebrow: 'Estilo • Precisão • Qualidade',
  heroTitleMain: 'Seu estilo,',
  heroTitleAccent: 'nosso trabalho.',
  description: 'Bem-vindo à Barbearia Afonso Cortes. Seu visual merece cuidado, personalidade e excelência no coração da cidade.',
  phone: '(11) 98765-4321',
  address: 'Rua Augusta, 1420 - Consolação, São Paulo - SP',
  instagram: '@barbeariaafonsocortes',
  photoUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80',
  openingHours: 'Segunda a Sábado das 09:00 às 20:00',
  schedule: DEFAULT_SCHEDULE_CONFIG,
  whatsappClientRequestTemplate: DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE,
  whatsappBarbershopConfirmTemplate: DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE,
};

export function useRealtimeBarbershop() {
  const [state, setState] = useState<BarbershopState>({
    config: DEFAULT_CONFIG,
    barbers: [],
    services: [],
    appointments: [],
  });

  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const addNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: LiveNotification = {
      id,
      type,
      message,
      timestamp: Date.now(),
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 3)]);

    // Auto-remove after 4.5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Clear any existing reconnect timer
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload: RealtimeEvent = JSON.parse(event.data);

          setState((prevState) => {
            const nextState = applyRealtimeEvent(prevState, payload);

            // Notify user of relevant admin updates
            if (payload.type === 'config:updated') {
              addNotification('💈 Informações da barbearia foram atualizadas pelo administrador!', 'info');
            } else if (payload.type === 'service:created') {
              addNotification(`✂️ Novo serviço adicionado pelo administrador: ${payload.data.name}`, 'info');
            } else if (payload.type === 'service:updated') {
              addNotification(`✂️ Serviço atualizado pelo administrador: ${payload.data.name} (R$ ${payload.data.price})`, 'info');
            } else if (payload.type === 'service:deleted') {
              addNotification('✂️ Um serviço foi atualizado na tabela oficial da barbearia.', 'info');
            } else if (payload.type === 'barber:updated') {
              addNotification(`👤 Informações do barbeiro ${payload.data.name} foram atualizadas!`, 'info');
            } else if (payload.type === 'appointment:status_updated') {
              const statusName = payload.data.status.toUpperCase();
              addNotification(`📅 O administrador atualizou o status de um agendamento para [${statusName}]`, 'success');
            } else if (payload.type === 'appointment:created') {
              addNotification('📅 Um novo horário foi reservado na barbearia!', 'info');
            }

            return nextState;
          });
        } catch (err) {
          console.error('Erro ao processar mensagem do WebSocket:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };

      ws.onerror = () => {
        // Safe error handling to avoid duplicate close exceptions
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (err) {
      console.error('Falha ao abrir WebSocket:', err);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    }
  }, [addNotification]);

  useEffect(() => {
    // Initial fetch fallback in case WebSocket takes time
    async function fetchInitialData() {
      try {
        const [configRes, barbersRes, servicesRes, appointmentsRes, noticeRes] = await Promise.all([
          fetch('/api/config').then((r) => r.json()).catch(() => null),
          fetch('/api/barbers').then((r) => r.json()).catch(() => null),
          fetch('/api/services').then((r) => r.json()).catch(() => null),
          fetch('/api/appointments').then((r) => r.json()).catch(() => null),
          fetch('/api/notice').then((r) => r.json()).catch(() => null),
        ]);

        setState((prev) => ({
          config: configRes || prev.config,
          barbers: barbersRes || prev.barbers,
          services: servicesRes || prev.services,
          appointments: appointmentsRes || prev.appointments,
          lastAdminNotice: noticeRes !== undefined ? noticeRes : prev.lastAdminNotice,
        }));
      } catch (err) {
        console.error('Erro na carga REST inicial:', err);
      }
    }

    fetchInitialData();
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        // Only close if it's not already closing or closed
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
      }
    };
  }, [connectWebSocket]);

  // Mutation actions (they hit the server, and the server broadcasts to all connected clients)
  const updateConfig = async (newConfig: BarbershopConfig) => {
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const updated = await res.json();
        setState((prev) => ({ ...prev, config: updated }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveBarber = async (barberData: Partial<Barber> & { id?: string }) => {
    try {
      if (barberData.id) {
        const res = await fetch(`/api/barbers/${barberData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(barberData),
        });
        if (res.ok) {
          const updated = await res.json();
          setState((prev) => ({
            ...prev,
            barbers: prev.barbers.map((b) => (b.id === updated.id ? updated : b)),
          }));
        }
      } else {
        const res = await fetch('/api/barbers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(barberData),
        });
        if (res.ok) {
          const created = await res.json();
          setState((prev) => ({
            ...prev,
            barbers: [...prev.barbers, created],
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteBarber = async (id: string) => {
    try {
      const res = await fetch(`/api/barbers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          barbers: prev.barbers.filter((b) => b.id !== id),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveService = async (serviceData: Partial<Service> & { id?: string }) => {
    try {
      if (serviceData.id) {
        const res = await fetch(`/api/services/${serviceData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData),
        });
        if (res.ok) {
          const updated = await res.json();
          setState((prev) => ({
            ...prev,
            services: prev.services.map((s) => (s.id === updated.id ? updated : s)),
          }));
        }
      } else {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData),
        });
        if (res.ok) {
          const created = await res.json();
          setState((prev) => ({
            ...prev,
            services: [...prev.services, created],
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteService = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          services: prev.services.filter((s) => s.id !== id),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateAppointmentStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) =>
            a.id === id ? { ...a, status: newStatus } : a
          ),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          appointments: prev.appointments.filter((a) => a.id !== id),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addAppointmentLocally = (newApp: Appointment) => {
    setState((prev) => {
      if (prev.appointments.some((a) => a.id === newApp.id)) return prev;
      return {
        ...prev,
        appointments: [newApp, ...prev.appointments],
      };
    });
  };

  return {
    config: state.config,
    barbers: state.barbers,
    services: state.services,
    appointments: state.appointments,
    lastAdminNotice: state.lastAdminNotice,
    isConnected,
    notifications,
    updateConfig,
    saveBarber,
    deleteBarber,
    saveService,
    deleteService,
    updateAppointmentStatus,
    deleteAppointment,
    addAppointmentLocally,
  };
}

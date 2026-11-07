import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Set Server Timezone to Barbershop's Timezone (Brazil/Sao Paulo)
process.env.TZ = 'America/Sao_Paulo';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'server-admin',
      email: 'rockdelas8@gmail.com',
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively converts Firestore Timestamp objects to ISO strings
 * so they can be safely sent to the client via JSON.
 */
function serializeData(data: any): any {
  if (data === null || data === undefined) return data;

  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeData(item));
  }

  if (typeof data === 'object' && data.constructor === Object) {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeData(data[key]);
      }
    }
    return serialized;
  }

  return data;
}
// @ts-ignore
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Barber, Service, Appointment, BarbershopConfig, RealtimeEvent, AdminUpdateNotice } from './src/types/barbershop';
import {
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_WHATSAPP_CLIENT_REQUEST_TEMPLATE,
  DEFAULT_WHATSAPP_BARBERSHOP_CONFIRM_TEMPLATE,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
} from './src/utils/barbershop-logic';

dotenv.config();

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(event: RealtimeEvent) {
  const payload = JSON.stringify(serializeData(event));
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  // Send full authoritative state on connection, including lastAdminNotice
  const initEvent: RealtimeEvent = {
    type: 'init',
    data: {
      config: shopConfig as BarbershopConfig,
      barbers,
      services,
      appointments,
      lastAdminNotice,
    },
  };
  ws.send(JSON.stringify(serializeData(initEvent)));
});

app.use(express.json({ limit: '10mb' }));

// Local state cache for performance (synced with Firestore)
let lastAdminNotice: AdminUpdateNotice | null = null;
let shopConfig: BarbershopConfig | null = null;
let barbers: Barber[] = [];
let services: Service[] = [];
let appointments: Appointment[] = [];

// Helper to log admin actions to Firestore
async function logAdminAction(
  action: string,
  details: string,
  category: string,
  previousData?: any,
  newData?: any
) {
  try {
    const change: any = {
      adminName: 'Administrador Geral', // In a real app, this would come from auth context
      action,
      details,
      category,
      timestamp: serverTimestamp(),
      previousData: previousData || null,
      newData: newData || null,
    };
    await addDoc(collection(db, 'adminChanges'), change);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'adminChanges');
  }
}

// Initial Seed Data for fallback or first run
const SEED_CONFIG: BarbershopConfig = {
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
  whatsappReminderTemplate: DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
};

const SEED_BARBERS: Barber[] = [
  {
    id: 'barber-afonso',
    name: 'Afonso Cortes',
    role: 'Mestre Barbeiro & Visagista',
    email: 'rockdelas8@gmail.com',
    hasAdminAccess: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    active: true,
    bio: 'Mais de 12 anos de experiência especializado em cortes clássicos, fade milimétrico e desenho de barba.',
    specialties: ['Degradê Navalhado', 'Visagismo Facial', 'Barba Terapia Tradicional'],
    rating: 4.9,
  },
  {
    id: 'barber-lucas',
    name: 'Lucas "Blade" Andrade',
    role: 'Barbeiro Sênior',
    email: 'lucas.blade@barbearia.com.br',
    hasAdminAccess: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    active: true,
    bio: 'Especialista em freestyle, cortes modernos, taper fade e técnicas de pigmentação capilar.',
    specialties: ['Cortes Contemporâneos', 'Freestyle Hair Design', 'Pigmentação'],
    rating: 4.8,
  },
];

const SEED_SERVICES: Service[] = [
  {
    id: 'corte-cabelo',
    name: 'Corte de Cabelo Tradicional & Moderno',
    category: 'cabelo',
    price: 45,
    durationMinutes: 40,
    description: 'Lavagem especial, corte com tesoura e máquina de alta precisão, finalização com pomada premium.',
    icon: '✂️',
  },
  {
    id: 'barba-terapia',
    name: 'Barboterapia & Toalha Quente',
    category: 'barba',
    price: 40,
    durationMinutes: 35,
    description: 'Design de barba com navalhete descartável, toalha quente com óleos essenciais, massagem facial e hidratação.',
    icon: '🪒',
  },
];

async function initializeData() {
  console.log('Sincronizando dados com o Firestore...');
  try {
    // 1. Config
    const configSnap = await getDoc(doc(db, 'config', 'main')).catch(err => handleFirestoreError(err, OperationType.GET, 'config/main'));
    if (configSnap && configSnap.exists()) {
      shopConfig = serializeData(configSnap.data()) as BarbershopConfig;
      // Also extract last notice if saved there
      if ((shopConfig as any).lastAdminNotice) {
        lastAdminNotice = (shopConfig as any).lastAdminNotice;
      }
    } else {
      console.log('Inicializando configuração padrão no Firestore...');
      shopConfig = SEED_CONFIG;
      await setDoc(doc(db, 'config', 'main'), shopConfig);
    }

    // 2. Barbers
    const barbersSnap = await getDocs(collection(db, 'barbers')).catch(err => handleFirestoreError(err, OperationType.LIST, 'barbers'));
    if (barbersSnap && barbersSnap.empty) {
      console.log('Populando barbeiros iniciais...');
      for (const b of SEED_BARBERS) {
        await setDoc(doc(db, 'barbers', b.id), b).catch(err => handleFirestoreError(err, OperationType.WRITE, `barbers/${b.id}`));
      }
      barbers = SEED_BARBERS;
    } else if (barbersSnap) {
      barbers = serializeData(barbersSnap.docs.map(d => d.data() as Barber));
    }

    // 3. Services
    const servicesSnap = await getDocs(collection(db, 'services')).catch(err => handleFirestoreError(err, OperationType.LIST, 'services'));
    if (servicesSnap && servicesSnap.empty) {
      console.log('Populando serviços iniciais...');
      for (const s of SEED_SERVICES) {
        await setDoc(doc(db, 'services', s.id), s).catch(err => handleFirestoreError(err, OperationType.WRITE, `services/${s.id}`));
      }
      services = SEED_SERVICES;
    } else if (servicesSnap) {
      services = serializeData(servicesSnap.docs.map(d => d.data() as Service));
    }

    // 4. Appointments (no seed needed)
    const appointmentsSnap = await getDocs(query(collection(db, 'appointments'), orderBy('createdAt', 'desc'))).catch(err => handleFirestoreError(err, OperationType.LIST, 'appointments'));
    if (appointmentsSnap) {
      appointments = serializeData(appointmentsSnap.docs.map(d => d.data() as Appointment));
    }

    if (!lastAdminNotice) {
      lastAdminNotice = {
        id: 'notice-initial',
        category: 'informacoes',
        title: 'Bem-vindo à Barbearia Afonso Cortes',
        summary: 'Horários de atendimento, equipe de barbeiros e serviços atualizados em tempo real.',
        detail: 'Todas as modificações feitas pelo administrador são notificadas instantaneamente aos clientes.',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Administrador Geral',
      };
    }
    console.log('Sincronização concluída com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar dados do Firestore:', error);
    // Fallback values
    shopConfig = SEED_CONFIG;
    barbers = SEED_BARBERS;
    services = SEED_SERVICES;
  }
}

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Uses Gemini AI to synthesize admin modifications into a polished,
 * customer-friendly update notice that stays permanently visible in the client panel
 * until the administrator makes another update.
 */
async function generateAdminAiNotice(
  action: string,
  details: string,
  category: AdminUpdateNotice['category'] = 'geral'
): Promise<AdminUpdateNotice> {
  const fallbackTitles: Record<string, string> = {
    servicos: 'Tabela de Serviços e Preços Atualizada',
    horarios: 'Dias e Horários de Atendimento Atualizados',
    equipe: 'Equipe de Barbeiros Atualizada',
    informacoes: 'Informações da Barbearia Atualizadas',
    agendamentos: 'Atualização de Agendamento',
    geral: 'Atualização Recente da Barbearia',
  };

  const notice: AdminUpdateNotice = {
    id: `notice-${Date.now()}`,
    category,
    title: fallbackTitles[category] || 'Atualização da Barbearia',
    summary: details,
    detail: `Alteração realizada pelo administrador da Barbearia Afonso Cortes.`,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Administrador Geral',
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 10) {
    try {
      const prompt = `Você é o sistema inteligente da Barbearia Afonso Cortes.
O administrador acabou de fazer a seguinte alteração no painel de administração:
Ação: "${action}"
Detalhes da alteração: "${details}"

Crie um aviso curto, elegante e claro para os CLIENTES da barbearia. Esse aviso ficará em destaque no painel do cliente informando sobre a novidade até que o administrador faça uma nova alteração.
Responda EXATAMENTE em formato JSON com as seguintes chaves (sem blocos markdown adicionais):
{
  "title": "título curto e chamativo de até 6 palavras",
  "summary": "resumo de 1 frase explicando ao cliente o que mudou",
  "detail": "detalhe amigável para o cliente de até 2 frases"
}`;

      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = res.text?.trim() || '';
      const cleanJson = responseText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.title) notice.title = parsed.title;
      if (parsed.summary) notice.summary = parsed.summary;
      if (parsed.detail) notice.detail = parsed.detail;
    } catch (err) {
      console.warn('Fallback para aviso padrão após erro na IA:', err);
    }
  }

  lastAdminNotice = notice;
  
  // Persist notice to config
  if (shopConfig) {
    try {
      await updateDoc(doc(db, 'config', 'main'), { lastAdminNotice: notice });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/main');
    }
  }

  broadcast({ type: 'notice:updated', data: notice });
  return notice;
}

// REST API Endpoints
app.get('/api/notice', (_req: Request, res: Response) => {
  res.json(serializeData(lastAdminNotice));
});

app.get('/api/config', (_req: Request, res: Response) => {
  res.json(serializeData(shopConfig));
});

app.put('/api/config', async (req: Request, res: Response) => {
  const previous = { ...shopConfig };
  
  try {
    await updateDoc(doc(db, 'config', 'main'), req.body);
    shopConfig = { ...shopConfig, ...req.body } as BarbershopConfig;
    broadcast({ type: 'config:updated', data: shopConfig });

    // Generate AI notice for the client panel
    const isScheduleUpdate = JSON.stringify(previous.schedule) !== JSON.stringify(shopConfig.schedule);
    const isTemplateUpdate =
      previous.whatsappClientRequestTemplate !== shopConfig.whatsappClientRequestTemplate ||
      previous.whatsappBarbershopConfirmTemplate !== shopConfig.whatsappBarbershopConfirmTemplate;

    let desc = `Informações gerais e dados da barbearia foram atualizados.`;
    let cat: AdminUpdateNotice['category'] = 'informacoes';

    if (isScheduleUpdate) {
      cat = 'horarios';
      desc = `Novos dias e horários de funcionamento disponíveis para agendamento foram definidos pelo administrador.`;
    } else if (isTemplateUpdate) {
      cat = 'informacoes';
      desc = `Modelos de mensagens do WhatsApp de confirmação e pedido foram personalizados.`;
    }

    generateAdminAiNotice('Atualização das Configurações', desc, cat).catch(console.error);
    logAdminAction('Configuração Atualizada', desc, 'config', previous, shopConfig).catch(console.error);

    res.json(serializeData(shopConfig));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'config/main');
  }
});

app.get('/api/services', (_req: Request, res: Response) => {
  res.json(serializeData(services));
});

app.post('/api/services', async (req: Request, res: Response) => {
  const newService: Service = {
    id: `serv-${Date.now()}`,
    name: req.body.name || 'Novo Serviço',
    category: req.body.category || 'cabelo',
    price: Number(req.body.price) || 0,
    durationMinutes: Number(req.body.durationMinutes) || 30,
    description: req.body.description || '',
    icon: req.body.icon || '✂️',
  };
  
  try {
    await setDoc(doc(db, 'services', newService.id), newService);
    services.push(newService);
    broadcast({ type: 'service:created', data: newService });

    generateAdminAiNotice(
      'Novo serviço adicionado',
      `O administrador adicionou "${newService.name}" com valor de R$ ${newService.price.toFixed(2).replace('.', ',')} ao catálogo.`,
      'servicos'
    ).catch(console.error);

    logAdminAction('Serviço Criado', `Criou o serviço "${newService.name}"`, 'servicos', null, newService).catch(console.error);
    res.status(201).json(serializeData(newService));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `services/${newService.id}`);
  }
});

app.put('/api/services/:id', async (req: Request, res: Response) => {
  const index = services.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Serviço não encontrado' });
    return;
  }
  
  const previous = { ...services[index] };
  const updated = { ...services[index], ...req.body };
  
  try {
    await setDoc(doc(db, 'services', req.params.id), updated);
    services[index] = updated;
    broadcast({ type: 'service:updated', data: updated });

    generateAdminAiNotice(
      'Serviço atualizado',
      `O administrador atualizou "${updated.name}" (R$ ${updated.price.toFixed(2).replace('.', ',')}) com novos detalhes e valores.`,
      'servicos'
    ).catch(console.error);

    logAdminAction('Serviço Atualizado', `Atualizou o serviço "${updated.name}"`, 'servicos', previous, updated).catch(console.error);
    res.json(serializeData(updated));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `services/${req.params.id}`);
  }
});

app.delete('/api/services/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const target = services.find((s) => s.id === id);
  if (!target) {
    res.status(404).json({ error: 'Serviço não encontrado' });
    return;
  }

  try {
    await deleteDoc(doc(db, 'services', id));
    services = services.filter((s) => s.id !== id);
    broadcast({ type: 'service:deleted', data: { id } });

    generateAdminAiNotice(
      'Serviço removido',
      `A tabela de serviços da barbearia foi reestruturada pelo administrador.`,
      'servicos'
    ).catch(console.error);

    logAdminAction('Serviço Removido', `Removeu o serviço "${target.name}"`, 'servicos', target, null);
    res.json({ success: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `services/${id}`);
  }
});

app.get('/api/barbers', (_req: Request, res: Response) => {
  res.json(serializeData(barbers));
});

app.post('/api/barbers', async (req: Request, res: Response) => {
  const newBarber: Barber = {
    id: `barber-${Date.now()}`,
    name: req.body.name || 'Novo Barbeiro',
    role: req.body.role || 'Barbeiro Profissional',
    avatar: req.body.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    active: req.body.active !== undefined ? req.body.active : true,
    bio: req.body.bio || '',
    email: req.body.email || '',
    hasAdminAccess: Boolean(req.body.hasAdminAccess),
    specialties: Array.isArray(req.body.specialties) ? req.body.specialties : ['Corte Clássico', 'Barba'],
    rating: req.body.rating !== undefined ? Number(req.body.rating) : 5.0,
  };
  
  try {
    await setDoc(doc(db, 'barbers', newBarber.id), newBarber);
    barbers.push(newBarber);
    broadcast({ type: 'barber:created', data: newBarber });

    generateAdminAiNotice(
      'Novo barbeiro contratado',
      `O administrador contratou ${newBarber.name} (${newBarber.role}) para a equipe de atendimento.`,
      'equipe'
    ).catch(console.error);

    logAdminAction('Barbeiro Adicionado', `Adicionou o barbeiro "${newBarber.name}"`, 'equipe', null, newBarber).catch(console.error);
    res.status(201).json(serializeData(newBarber));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `barbers/${newBarber.id}`);
  }
});

app.put('/api/barbers/:id', async (req: Request, res: Response) => {
  const index = barbers.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Barbeiro não encontrado' });
    return;
  }
  
  const previous = { ...barbers[index] };
  const updated = { 
    ...barbers[index], 
    ...req.body,
    rating: req.body.rating !== undefined ? Number(req.body.rating) : (barbers[index].rating ?? 5.0),
  };
  
  try {
    await setDoc(doc(db, 'barbers', req.params.id), updated);
    barbers[index] = updated;
    broadcast({ type: 'barber:updated', data: updated });

    generateAdminAiNotice(
      'Equipe de barbeiros atualizada',
      `Os dados e escala do barbeiro ${updated.name} foram atualizados pelo administrador.`,
      'equipe'
    ).catch(console.error);

    logAdminAction('Barbeiro Atualizado', `Atualizou os dados de "${updated.name}"`, 'equipe', previous, updated).catch(console.error);
    res.json(serializeData(updated));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `barbers/${req.params.id}`);
  }
});

app.delete('/api/barbers/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const target = barbers.find((b) => b.id === id);
  if (!target) {
    res.status(404).json({ error: 'Barbeiro não encontrado' });
    return;
  }

  try {
    await deleteDoc(doc(db, 'barbers', id));
    barbers = barbers.filter((b) => b.id !== id);
    broadcast({ type: 'barber:deleted', data: { id } });

    generateAdminAiNotice(
      'Atualização da equipe',
      `A equipe de atendimento foi atualizada pelo administrador.`,
      'equipe'
    ).catch(console.error);

    logAdminAction('Barbeiro Removido', `Removeu o barbeiro "${target.name}"`, 'equipe', target, null);
    res.json({ success: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `barbers/${id}`);
  }
});

app.get('/api/appointments', (req: Request, res: Response) => {
  const phone = req.query.phone as string;
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const clientAppointments = appointments.filter(
      (a) => a.clientPhone.replace(/\D/g, '').includes(cleanPhone)
    );
    res.json(serializeData(clientAppointments));
    return;
  }
  res.json(serializeData(appointments));
});

app.post('/api/appointments', async (req: Request, res: Response) => {
  const { clientName, clientPhone, barberId, serviceId, date, time, notes } = req.body;

  if (!clientName || !clientPhone || !barberId || !serviceId || !date || !time) {
    res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
    return;
  }

  // Validate that the time has not passed if the date is today
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in America/Sao_Paulo
  
  if (date === todayStr) {
    const [h, m] = time.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (slotMinutes <= currentMinutes) {
      res.status(400).json({ error: 'Este horário já passou. Por favor, escolha um horário futuro.' });
      return;
    }
  }

  const service = services.find((s) => s.id === serviceId);
  const newAppointment: Appointment = {
    id: `app-${Date.now()}`,
    clientName,
    clientPhone,
    barberId,
    serviceId,
    date,
    time,
    notes: notes || '',
    status: 'pendente',
    createdAt: serverTimestamp() as any,
    price: service ? service.price : 45,
    serviceDurationMinutes: service ? service.durationMinutes : 45,
  };

  try {
    await setDoc(doc(db, 'appointments', newAppointment.id), newAppointment);
    
    // For local state and broadcast, we need a serializable version
    const serializableAppointment = { 
      ...newAppointment, 
      createdAt: new Date().toISOString() 
    };
    
    appointments.unshift(serializableAppointment as any);
    broadcast({ type: 'appointment:created', data: serializableAppointment as any });
    res.status(201).json(serializeData(serializableAppointment));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `appointments/${newAppointment.id}`);
  }
});

app.patch('/api/appointments/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  const index = appointments.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Agendamento não encontrado' });
    return;
  }
  
  const previous = { ...appointments[index] };
  const updated = { ...appointments[index], status };

  try {
    await updateDoc(doc(db, 'appointments', req.params.id), { status });
    appointments[index].status = status;
    broadcast({ type: 'appointment:status_updated', data: { id: req.params.id, status } });
    
    logAdminAction('Status de Agendamento Alterado', `Alterou status do agendamento de "${updated.clientName}" para "${status}"`, 'agendamentos', previous, updated);
    res.json(appointments[index]);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `appointments/${req.params.id}`);
  }
});

app.delete('/api/appointments/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const target = appointments.find((a) => a.id === id);
  if (!target) {
    res.status(404).json({ error: 'Agendamento não encontrado' });
    return;
  }

  try {
    await deleteDoc(doc(db, 'appointments', id));
    appointments = appointments.filter((a) => a.id !== id);
    broadcast({ type: 'appointment:deleted', data: { id } });
    
    logAdminAction('Agendamento Removido', `Removeu o agendamento de "${target.clientName}"`, 'agendamentos', target, null);
    res.json({ success: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `appointments/${id}`);
  }
});

// Gemini Chat Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, mode = 'general' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Mensagens inválidas.' });
      return;
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    const servicesListText = services
      .map((s) => `- ${s.name} (R$ ${s.price}, duração ~${s.durationMinutes}min): ${s.description}`)
      .join('\n');

    const barbersListText = barbers
      .filter((b) => b.active)
      .map((b) => `- ${b.name} (${b.role}): especialidades em ${b.specialties.join(', ')}`)
      .join('\n');

    const systemInstruction = `
Você é "Afonso AI", o Consultor de Estilo & Visagismo Master e Assistente Virtual oficial da "Barbearia Afonso Cortes".
Seu tom é cordial, profissional, sofisticado, acolhedor e com a elegância de uma barbearia premium e tradicional.

Informações da Barbearia Afonso Cortes:
- Endereço: ${shopConfig?.address}
- Horário: ${shopConfig?.openingHours}
- WhatsApp: ${shopConfig?.phone}
- Instagram: ${shopConfig?.instagram}

Serviços Disponíveis e Preços:
${servicesListText}

Equipe de Barbeiros em Atendimento:
${barbersListText}

Suas Habilidades & Diretrizes:
1. Auxiliar clientes na escolha do corte ou formato de barba ideal com base no formato do rosto (visagismo: rosto oval, quadrado, redondo, triangular, diamante, etc.), tipo de fio (liso, ondulado, cacheado, crespo) e estilo pessoal.
2. Tirar dúvidas sobre os serviços, produtos (óleos, pomadas, tônicos), cuidados pós-corte e tempo de manutenção.
3. Se o cliente perguntar como agendar, explique com entusiasmo que ele pode agendar diretamente no formulário da página ou escolher um horário agora mesmo.
4. Responda sempre em português do Brasil com clareza, formatação amigável (tópicos quando apropriado) e sem inventar preços diferentes da tabela oficial.
`;

    let modelName = 'gemini-3.8-flash';
    let config: any = { systemInstruction };

    if (mode === 'fast') {
      modelName = 'gemini-3.1-flash-lite';
    } else if (mode === 'thinking') {
      modelName = 'gemini-4-argon';
      config = {
        systemInstruction: `${systemInstruction}
Modo de Análise Visagista Profunda Ativado (High Thinking):
Analise detalhadamente a solicitação do cliente considerando:
- Geometria e proporções faciais (terço superior, médio e inferior)
- Linhas de força da barba e contorno do maxilar
- Direção de crescimento e volume capilar
- Rotina diária de cuidados e manutenção necessária
- O serviço e barbeiro mais indicado da nossa barbearia.
Forneça uma resposta estruturada e rica em consultoria de estilo.`,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      };
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // If API key is present and looks valid, attempt Gemini call with a 6-second timeout race
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 10;

    let replyText = '';

    if (hasValidKey) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 6000)
        );

        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        if (response && response.text) {
          replyText = response.text;
        }
      } catch (geminiErr) {
        console.warn('Gemini API call timed out or failed, falling back to local style intelligence:', geminiErr);
      }
    }

    // Contextual intelligent fallback if API not reachable or timed out
    if (!replyText) {
      replyText = generateBarberAdvice(lastUserMessage, mode, services, barbers);
    }

    res.json({
      role: 'model',
      text: replyText,
      modelUsed: modelName,
      mode,
    });
  } catch (error: any) {
    console.error('Erro na chamada Gemini:', error);
    res.status(500).json({
      error: error?.message || 'Falha ao processar mensagem com a IA.',
    });
  }
});

function generateBarberAdvice(
  query: string,
  mode: string,
  servicesList: Service[],
  barbersList: Barber[]
): string {
  const q = query.toLowerCase();

  if (mode === 'thinking') {
    return `### 🧠 Análise Visagista Profunda (Afonso Cortes AI)

**1. Proporção & Geometria Facial:**
Para equilibrar traços angulares e arredondados, buscamos criar linhas verticais que alonguem a face. Se o seu rosto for redondo ou oval, o foco é reduzir o volume lateral e dar estrutura no topo. Para mandíbulas menos marcadas, uma barba desenhada com linhas retas confere poder e sobriedade.

**2. Recomendação de Corte:**
- **Estilo:** *Mid Fade* ou *Taper Fade Navalhado* com topo texturizado.
- **Acabamento:** Penteado lateral suave (*side part*) ou *quiff* com pomada de efeito fosco (matte).

**3. Geometria da Barba:**
- Manter o comprimento maior na região do queixo (15mm a 20mm) e as laterais mais baixas e degradadas no encontro com o cabelo.
- Linha da bochecha bem delimitada para criar efeito ótico de emagrecimento facial.

**4. Procedimento Recomendado na Barbearia:**
- **Serviço Ideal:** **Combo Completo: Cabelo + Barba** (R$ 75,00) com **Barboterapia e Toalha Quente**.
- **Profissional Indicado:** **Afonso Cortes** (Mestre Visagista) ou **Lucas "Blade"**.

Deseja que eu reserve esse horário para você agora? Basta escolher a data e o horário no formulário abaixo!`;
  }

  if (q.includes('redondo') || q.includes('rosto')) {
    return `Para **rostos redondos**, a regra de ouro do visagismo é **criar linhas retas e adicionar altura**:

1. **Nas laterais:** Degradê alto ou médio (*High/Mid Fade*) bem rente, evitando volume ao redor das orelhas.
2. **No topo:** Mantenha um bom volume com textura (*Pompadour*, *Quiff* ou topo desfiado) para alongar visualmente o rosto.
3. **Na barba:** Estilo lenhador curto ou bico no queixo (*Ducktail*), mantendo as maçãs do rosto bem limpas e alinhadas.

👉 **Recomendação:** Nosso serviço de **Combo Completo (Cabelo + Barba)** por R$ 75,00 é perfeito para esculpir esse desenho. Quer agendar com nosso mestre Afonso?`;
  }

  if (q.includes('barboterapia') || q.includes('toalha') || q.includes('sensível') || q.includes('foliculite')) {
    return `A **Barboterapia com Toalha Quente** da Barbearia Afonso Cortes é uma experiência revigorante e terapêutica:

- **Abertura dos Poros:** O vapor da toalha aquecida com óleo de eucalipto amolece os pelos e reduz o atrito da lâmina em até 80%.
- **Zero Irritação:** O navalhete descartável desliza suavemente, prevenindo foliculite e cortes em peles sensíveis.
- **Massagem & Hidratação:** Finalizamos com bálsamo pós-barba refrescante e óleo nutritivo de argan.

⏱ Duração média de 35 minutos por **R$ 40,00**. Vale muito a pena experimentar!`;
  }

  if (q.includes('preço') || q.includes('valor') || q.includes('quanto') || q.includes('serviço')) {
    const list = servicesList.map((s) => `• **${s.name}:** R$ ${s.price.toFixed(2).replace('.', ',')}`).join('\n');
    return `Confira nossa tabela oficial de serviços na Barbearia Afonso Cortes:\n\n${list}\n\nVocê pode selecionar qualquer um desses serviços no formulário para agendar seu horário com comodidade!`;
  }

  if (q.includes('horário') || q.includes('funciona') || q.includes('aberto') || q.includes('endereço')) {
    return `Estamos abertos de **Segunda a Sábado, das 09:00 às 20:00**.\n\n📍 Nosso endereço é **Rua Augusta, 1420 - Consolação, São Paulo - SP** (com estacionamento conveniado).\n\nPara garantir sua cadeira sem fila de espera, escolha seu horário no nosso agendador online!`;
  }

  return `Excelente pergunta! Na **Barbearia Afonso Cortes**, combinamos a precisão do corte clássico com técnicas modernas de visagismo masculino.

Para valorizar ainda mais o seu estilo, nossos profissionais **Afonso**, **Lucas** e **Mateus** estão prontos para avaliar sua textura de cabelo e formato de rosto pessoalmente.

💡 Você pode selecionar o serviço desejado logo abaixo no formulário e agendar seu horário em menos de 1 minuto! Posso te ajudar com mais alguma dúvida sobre estilos ou cuidados?`;
}

// Setup Vite in Dev or Static in Production
async function startServer() {
  await initializeData();
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
      logLevel: 'error',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Barbearia Afonso Cortes server running with WebSockets on http://localhost:${PORT}`);
  });
}

startServer();

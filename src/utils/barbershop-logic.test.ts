import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDayTimeSlots,
  getAvailableSlots,
  filterAppointments,
  calculateMetrics,
  formatWhatsAppBookingMessage,
  formatClientBookingRequestMessage,
  formatBarbershopConfirmMessage,
  renderWhatsAppTemplate,
  validateBookingForm,
  applyRealtimeEvent,
  authenticateAdmin,
  isUserAuthorizedAdmin,
} from './barbershop-logic';
import { Appointment, BarbershopConfig, Barber } from '../types/barbershop';

test('generateDayTimeSlots generates correct intervals between 9 and 12', () => {
  const slots = generateDayTimeSlots({ startHour: 9, endHour: 12, intervalMinutes: 60 });
  assert.deepEqual(slots, ['09:00', '10:00', '11:00']);
});

test('getAvailableSlots filters out booked slots for specified barber and date', () => {
  const mockAppointments: Appointment[] = [
    {
      id: '1',
      clientName: 'Carlos',
      clientPhone: '11999998888',
      barberId: 'barber-1',
      serviceId: 'serv-1',
      date: '2026-10-30',
      time: '10:00',
      status: 'confirmado',
      createdAt: '2026-10-26',
      price: 45,
      serviceDurationMinutes: 45,
    },
    {
      id: '2',
      clientName: 'Roberto',
      clientPhone: '11988887777',
      barberId: 'barber-1',
      serviceId: 'serv-2',
      date: '2026-10-30',
      time: '11:00',
      status: 'cancelado', // Cancelled shouldn't block slot
      createdAt: '2026-10-26',
      price: 35,
      serviceDurationMinutes: 30,
    },
    {
      id: '3',
      clientName: 'Marcos',
      clientPhone: '11977776666',
      barberId: 'barber-2', // Different barber
      serviceId: 'serv-1',
      date: '2026-10-30',
      time: '12:00',
      status: 'confirmado',
      createdAt: '2026-10-26',
      price: 45,
      serviceDurationMinutes: 45,
    },
  ];

  const customHours = { 
    intervalMinutes: 60,
    days: [
      { dayOfWeek: 0, dayName: 'Domingo', isOpen: true, openTime: '09:00', closeTime: '13:00' },
      { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime: '09:00', closeTime: '13:00' },
      { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '13:00' },
      { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '13:00' },
      { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '13:00' },
      { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '13:00' },
      { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '09:00', closeTime: '13:00' },
    ]
  };
  const availableSlots = getAvailableSlots('2026-10-30', 'barber-1', mockAppointments, customHours);

  // '10:00' is booked for barber-1
  // '11:00' was cancelled, so it IS available
  // '12:00' was booked for barber-2, so it IS available for barber-1
  assert.equal(availableSlots.includes('10:00'), false);
  assert.equal(availableSlots.includes('09:00'), true);
  assert.equal(availableSlots.includes('11:00'), true);
  assert.equal(availableSlots.includes('12:00'), true);
});

test('filterAppointments filters correctly by status and search keyword', () => {
  const appointments: Appointment[] = [
    {
      id: '1',
      clientName: 'Rodrigo Silva',
      clientPhone: '11988881111',
      barberId: 'b1',
      serviceId: 's1',
      date: '2026-11-01',
      time: '14:00',
      status: 'pendente',
      createdAt: '2026-10-26',
      price: 50,
      serviceDurationMinutes: 45,
    },
    {
      id: '2',
      clientName: 'Lucas Lima',
      clientPhone: '11977772222',
      barberId: 'b1',
      serviceId: 's2',
      date: '2026-11-01',
      time: '15:00',
      status: 'confirmado',
      createdAt: '2026-10-26',
      price: 40,
      serviceDurationMinutes: 30,
    },
  ];

  const pending = filterAppointments(appointments, { status: 'pendente' });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].clientName, 'Rodrigo Silva');

  const searchLucas = filterAppointments(appointments, { search: 'lucas' });
  assert.equal(searchLucas.length, 1);
  assert.equal(searchLucas[0].id, '2');
});

test('calculateMetrics tallies revenues and counts accurately', () => {
  const appointments: Appointment[] = [
    {
      id: '1',
      clientName: 'Ana',
      clientPhone: '11999990000',
      barberId: 'b1',
      serviceId: 's1',
      date: '2026-10-28',
      time: '10:00',
      status: 'concluido',
      createdAt: '2026-10-26',
      price: 60,
      serviceDurationMinutes: 45,
    },
    {
      id: '2',
      clientName: 'Bruno',
      clientPhone: '11999990001',
      barberId: 'b1',
      serviceId: 's1',
      date: '2026-10-28',
      time: '11:00',
      status: 'confirmado',
      createdAt: '2026-10-26',
      price: 45,
      serviceDurationMinutes: 45,
    },
    {
      id: '3',
      clientName: 'Caio',
      clientPhone: '11999990002',
      barberId: 'b1',
      serviceId: 's1',
      date: '2026-10-28',
      time: '12:00',
      status: 'pendente',
      createdAt: '2026-10-26',
      price: 35,
      serviceDurationMinutes: 45,
    },
    {
      id: '4',
      clientName: 'Diego',
      clientPhone: '11999990003',
      barberId: 'b1',
      serviceId: 's1',
      date: '2026-10-28',
      time: '13:00',
      status: 'cancelado',
      createdAt: '2026-10-26',
      price: 45,
      serviceDurationMinutes: 45,
    },
  ];

  const metrics = calculateMetrics(appointments);
  assert.equal(metrics.total, 4);
  assert.equal(metrics.completed, 1);
  assert.equal(metrics.confirmed, 1);
  assert.equal(metrics.pending, 1);
  assert.equal(metrics.cancelled, 1);
  assert.equal(metrics.totalRevenue, 60); // Only completed
  assert.equal(metrics.projectedRevenue, 140); // 60 + 45 + 35
});

test('formatWhatsAppBookingMessage builds valid text and whatsapp URL', () => {
  const msg = formatWhatsAppBookingMessage({
    clientName: 'Gabriel Soares',
    clientPhone: '(11) 98765-4321',
    date: '2026-11-05',
    time: '16:00',
    serviceName: 'Corte + Barba Premium',
    barberName: 'Afonso',
    price: 85,
  });

  assert.match(msg.text, /Gabriel Soares/);
  assert.match(msg.text, /Corte \+ Barba Premium/);
  assert.match(msg.text, /05\/11\/2026/);
  assert.match(msg.link, /wa\.me\/11987654321/);
});

test('validateBookingForm validates required fields correctly', () => {
  const invalid = validateBookingForm({
    clientName: 'Al',
    clientPhone: '123',
    barberId: '',
    serviceId: '',
    date: '',
    time: '',
  });

  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.clientName);
  assert.ok(invalid.errors.clientPhone);
  assert.ok(invalid.errors.barberId);
  assert.ok(invalid.errors.serviceId);
  assert.ok(invalid.errors.date);
  assert.ok(invalid.errors.time);

  const valid = validateBookingForm({
    clientName: 'Marcelo Santos',
    clientPhone: '11999887766',
    barberId: 'barber-afonso',
    serviceId: 'corte-cabelo',
    date: '2026-12-01',
    time: '14:00',
  });

  assert.equal(valid.valid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('applyRealtimeEvent updates config and services idempotently in real-time', () => {
  const initialState = {
    config: {
      name: 'AFONSO CORTES',
      subtitle: 'BARBEARIA',
      eyebrow: 'Estilo • Precisão',
      heroTitleMain: 'Seu estilo,',
      heroTitleAccent: 'nosso trabalho.',
      description: 'Desc antiga',
      phone: '11999990000',
      address: 'Rua Augusta',
      instagram: '@afonso',
      photoUrl: '',
      openingHours: '09:00 - 20:00',
    },
    barbers: [
      { id: 'b1', name: 'Afonso', role: 'Mestre', active: true, bio: '', specialties: [], rating: 5 },
    ],
    services: [
      { id: 's1', name: 'Corte', category: 'cabelo' as const, price: 40, durationMinutes: 30, description: '', icon: '✂️' },
    ],
    appointments: [
      { id: 'a1', clientName: 'João', clientPhone: '11999991111', barberId: 'b1', serviceId: 's1', date: '2026-10-27', time: '10:00', status: 'pendente' as const, createdAt: '2026-10-26', price: 40, serviceDurationMinutes: 30 },
    ],
  };

  // 1. Admin updates shop config
  const stateAfterConfig = applyRealtimeEvent(initialState, {
    type: 'config:updated',
    data: { ...initialState.config, name: 'AFONSO CORTES PRIME', phone: '11988887777' },
  });
  assert.equal(stateAfterConfig.config.name, 'AFONSO CORTES PRIME');
  assert.equal(stateAfterConfig.config.phone, '11988887777');

  // 2. Admin updates service price
  const stateAfterServiceUpdate = applyRealtimeEvent(stateAfterConfig, {
    type: 'service:updated',
    data: { id: 's1', name: 'Corte Tradicional', price: 50 } as any,
  });
  assert.equal(stateAfterServiceUpdate.services[0].price, 50);
  assert.equal(stateAfterServiceUpdate.services[0].name, 'Corte Tradicional');

  // 3. Admin confirms appointment
  const stateAfterAppointmentConfirm = applyRealtimeEvent(stateAfterServiceUpdate, {
    type: 'appointment:status_updated',
    data: { id: 'a1', status: 'confirmado' },
  });
  assert.equal(stateAfterAppointmentConfirm.appointments[0].status, 'confirmado');

  // 4. Client creates new appointment
  const newApp = {
    id: 'a2',
    clientName: 'Pedro',
    clientPhone: '11977776666',
    barberId: 'b1',
    serviceId: 's1',
    date: '2026-10-27',
    time: '11:00',
    status: 'pendente' as const,
    createdAt: '2026-10-26',
    price: 50,
    serviceDurationMinutes: 30,
  };
  const stateAfterNewApp = applyRealtimeEvent(stateAfterAppointmentConfirm, {
    type: 'appointment:created',
    data: newApp as any,
  });
  assert.equal(stateAfterNewApp.appointments.length, 2);
  assert.equal(stateAfterNewApp.appointments[0].id, 'a2');

  // Idempotency check: sending duplicate appointment:created does not duplicate
  const duplicateState = applyRealtimeEvent(stateAfterNewApp, {
    type: 'appointment:created',
    data: newApp as any,
  });
  assert.equal(duplicateState.appointments.length, 2);

  // Test notice:updated sets lastAdminNotice
  const noticeState = applyRealtimeEvent(duplicateState, {
    type: 'notice:updated',
    data: {
      id: 'n1',
      category: 'servicos',
      title: 'Tabela de Serviços Atualizada',
      summary: 'Novos valores disponíveis',
      updatedAt: '2026-11-06T12:00:00Z',
      updatedBy: 'Administrador Geral',
    },
  });
  assert.equal(noticeState.lastAdminNotice?.title, 'Tabela de Serviços Atualizada');
  assert.equal(noticeState.lastAdminNotice?.category, 'servicos');
});

test('schedule logic generates slots according to custom days and hours', () => {
  const customSchedule = {
    intervalMinutes: 30,
    days: [
      { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '14:00' },
      { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime: '10:00', closeTime: '12:00' },
      { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    ],
  };

  // 2026-10-26 was a Monday
  const mondaySlots = getAvailableSlots('2026-10-26', 'barber-1', [], customSchedule);
  assert.deepEqual(mondaySlots, ['10:00', '10:30', '11:00', '11:30']);

  // 2026-10-25 was a Sunday (closed)
  const sundaySlots = getAvailableSlots('2026-10-25', 'barber-1', [], customSchedule);
  assert.equal(sundaySlots.length, 0);

  // Validate booking form on a future closed day (find next Sunday)
  const d = new Date();
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
  const nextSunday = new Date(d.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
  const nextSundayStr = nextSunday.toISOString().split('T')[0];

  const validation = validateBookingForm({
    clientName: 'Roberto Silva',
    clientPhone: '11988887777',
    barberId: 'barber-1',
    serviceId: 'serv-1',
    date: nextSundayStr,
    time: '10:00',
  }, customSchedule);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.date?.includes('fechada'));
});

test('custom WhatsApp templates format correctly for client and barbershop', () => {
  const customConfig: BarbershopConfig = {
    name: 'BARBEARIA AFONSO VIP',
    subtitle: 'PREMIUM',
    eyebrow: 'ESTILO',
    heroTitleMain: 'Visual',
    heroTitleAccent: 'Marcante',
    description: 'Desc',
    phone: '(11) 98765-4321',
    address: 'Rua Augusta, 1420',
    instagram: '@afonso',
    photoUrl: '',
    openingHours: '09h às 20h',
    whatsappClientRequestTemplate: 'Olá {barbearia}! Quero agendar {servico} com {barbeiro} no dia {data} às {horario}. Sou {cliente}.',
    whatsappBarbershopConfirmTemplate: 'Agendamento Confirmado na {barbearia} para {cliente} no serviço {servico} ({valor}) dia {data} às {horario} no endereço {endereco}.',
  };

  const appData = {
    clientName: 'Lucas Lima',
    clientPhone: '11988880000',
    serviceName: 'Barboterapia',
    barberName: 'Afonso',
    date: '2026-11-10',
    time: '15:00',
    price: 40,
    notes: 'Pele sensível',
  };

  // Client to Barbershop message: directed to shop's phone
  const clientReq = formatClientBookingRequestMessage(appData, customConfig);
  assert.equal(
    clientReq.text,
    'Olá BARBEARIA AFONSO VIP! Quero agendar Barboterapia com Afonso no dia 10/11/2026 às 15:00. Sou Lucas Lima.'
  );
  assert.match(clientReq.link, /wa\.me\/11987654321/);

  // Barbershop to Client message: directed to client's phone
  const shopConfirm = formatBarbershopConfirmMessage(appData, customConfig);
  assert.equal(
    shopConfirm.text,
    'Agendamento Confirmado na BARBEARIA AFONSO VIP para Lucas Lima no serviço Barboterapia (R$ 40,00) dia 10/11/2026 às 15:00 no endereço Rua Augusta, 1420.'
  );
  assert.match(shopConfirm.link, /wa\.me\/11988880000/);
});

test('authenticateAdmin manages master login and barber email access with permissions', () => {
  const mockBarbers: Barber[] = [
    {
      id: 'barber-lucas',
      name: 'Lucas Blade',
      role: 'Barbeiro Sênior',
      email: 'lucas.blade@barbearia.com.br',
      hasAdminAccess: true,
      active: true,
      bio: '',
      specialties: ['Fade'],
      rating: 4.8,
    },
    {
      id: 'barber-mateus',
      name: 'Mateus Rocha',
      role: 'Barbeiro',
      email: 'mateus.rocha@barbearia.com.br',
      hasAdminAccess: false, // Access not granted!
      active: true,
      bio: '',
      specialties: ['Barba'],
      rating: 4.9,
    },
  ];

  // 1. Master admin correct password (afonso123)
  const masterSuccess = authenticateAdmin({ type: 'master', password: 'afonso123' }, mockBarbers);
  assert.equal(masterSuccess.success, true);
  assert.equal(masterSuccess.user?.type, 'master');

  // 2. Old password admin123 is rejected
  const oldPasswordFail = authenticateAdmin({ type: 'master', password: 'admin123' }, mockBarbers);
  assert.equal(oldPasswordFail.success, false);

  // 3. Master admin wrong password
  const masterFail = authenticateAdmin({ type: 'master', password: 'wrong' }, mockBarbers);
  assert.equal(masterFail.success, false);
  assert.match(masterFail.error || '', /Senha/);

  // 3. Barber with registered email and hasAdminAccess: true
  const barberSuccess = authenticateAdmin(
    { type: 'barber', email: 'lucas.blade@barbearia.com.br' },
    mockBarbers
  );
  assert.equal(barberSuccess.success, true);
  assert.equal(barberSuccess.user?.type, 'barber');
  assert.equal(barberSuccess.user?.name, 'Lucas Blade');
  assert.equal(barberSuccess.user?.barberId, 'barber-lucas');

  // 4. Barber with registered email BUT hasAdminAccess: false
  const barberAccessDenied = authenticateAdmin(
    { type: 'barber', email: 'mateus.rocha@barbearia.com.br' },
    mockBarbers
  );
  assert.equal(barberAccessDenied.success, false);
  assert.match(barberAccessDenied.error || '', /opção de dar acesso/);

  // 5. Unregistered email
  const barberNotFound = authenticateAdmin(
    { type: 'barber', email: 'desconhecido@email.com' },
    mockBarbers
  );
  assert.equal(barberNotFound.success, false);
  assert.match(barberNotFound.error || '', /aba de contratar barbeiro/);
});

test('isUserAuthorizedAdmin verifies visibility for master and authorized barbers only', () => {
  const mockBarbers: Barber[] = [
    {
      id: 'barber-lucas',
      name: 'Lucas Blade',
      role: 'Barbeiro Sênior',
      email: 'lucas.blade@barbearia.com.br',
      hasAdminAccess: true,
      active: true,
      bio: '',
      specialties: ['Fade'],
      rating: 4.8,
    },
    {
      id: 'barber-mateus',
      name: 'Mateus Rocha',
      role: 'Barbeiro',
      email: 'mateus.rocha@barbearia.com.br',
      hasAdminAccess: false,
      active: true,
      bio: '',
      specialties: ['Barba'],
      rating: 4.9,
    },
  ];

  // Null/undefined user: not authorized (regular client view)
  assert.equal(isUserAuthorizedAdmin(null, mockBarbers), false);
  assert.equal(isUserAuthorizedAdmin(undefined, mockBarbers), false);

  // Master admin: always authorized
  assert.equal(
    isUserAuthorizedAdmin({ type: 'master', name: 'Administrador Geral' }, mockBarbers),
    true
  );

  // Barber with hasAdminAccess: true: authorized
  assert.equal(
    isUserAuthorizedAdmin(
      { type: 'barber', name: 'Lucas Blade', barberId: 'barber-lucas' },
      mockBarbers
    ),
    true
  );

  // Barber with hasAdminAccess: false: NOT authorized
  assert.equal(
    isUserAuthorizedAdmin(
      { type: 'barber', name: 'Mateus Rocha', barberId: 'barber-mateus' },
      mockBarbers
    ),
    false
  );

  // Unknown barberId: NOT authorized
  assert.equal(
    isUserAuthorizedAdmin(
      { type: 'barber', name: 'Desconhecido', barberId: 'barber-outro' },
      mockBarbers
    ),
    false
  );
});


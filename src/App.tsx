import React, { useState } from 'react';
import { MessageCircle, Sparkles, Scissors } from 'lucide-react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ServicesSection } from './components/ServicesSection';
import { BarbersSection } from './components/BarbersSection';
import { BookingSection } from './components/BookingSection';
import { Footer } from './components/Footer';
import { AfonsoAiChatModal } from './components/AfonsoAiChatModal';
import { ClientAreaModal } from './components/ClientAreaModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Barber, Service, Appointment, AdminUser } from './types/barbershop';
import { useRealtimeBarbershop } from './hooks/useRealtimeBarbershop';
import { isUserAuthorizedAdmin } from './utils/barbershop-logic';
import { AutoReminderManager } from './components/AutoReminderManager';

export default function App() {
  const {
    config,
    barbers,
    services,
    appointments,
    updateConfig,
    saveBarber,
    deleteBarber,
    saveService,
    deleteService,
    updateAppointmentStatus,
    deleteAppointment,
    addAppointmentLocally,
  } = useRealtimeBarbershop();

  // Modal open states
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isClientAreaOpen, setIsClientAreaOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('afonso_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Keep stored user validated against actual barbers list (e.g. if access was revoked)
  const isAuthorizedAdmin = React.useMemo(() => {
    return isUserAuthorizedAdmin(currentAdminUser, barbers);
  }, [currentAdminUser, barbers]);

  const handleOpenAdmin = () => {
    if (isAuthorizedAdmin) {
      setIsAdminOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentAdminUser(user);
    try {
      localStorage.setItem('afonso_admin_user', JSON.stringify(user));
    } catch {}
    setIsAdminLoginOpen(false);
    setIsAdminOpen(true);
  };

  const handleLogoutAdmin = () => {
    setCurrentAdminUser(null);
    try {
      localStorage.removeItem('afonso_admin_user');
    } catch {}
    setIsAdminOpen(false);
  };

  // Pre-selected item for smooth form jumps
  const [preSelectedService, setPreSelectedService] = useState<Service | null>(null);

  const scrollToBooking = () => {
    const el = document.getElementById('agendamento');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectService = (service: Service) => {
    setPreSelectedService(service);
    scrollToBooking();
  };

  const handleSelectBarber = (_barber: Barber) => {
    scrollToBooking();
  };

  const handleAppointmentCreated = (newApp: Appointment) => {
    addAppointmentLocally(newApp);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col font-['Figtree',sans-serif] relative">
      {/* Header */}
      <Header
        config={config}
        currentUser={currentAdminUser}
        barbers={barbers}
        onOpenBooking={scrollToBooking}
        onOpenClientArea={() => setIsClientAreaOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onOpenLoginModal={() => setIsAdminLoginOpen(true)}
        onOpenAiChat={() => setIsAiChatOpen(true)}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <Hero
          config={config}
          onBookNow={scrollToBooking}
          onConsultAi={() => setIsAiChatOpen(true)}
          onOpenClientArea={() => setIsClientAreaOpen(true)}
        />

        {/* Services Section */}
        <ServicesSection
          services={services}
          onSelectService={handleSelectService}
        />

        {/* Barbers Roster Section */}
        <BarbersSection
          barbers={barbers}
          onSelectBarber={handleSelectBarber}
        />

        {/* Booking Form Section */}
        <BookingSection
          barbers={barbers}
          services={services}
          appointments={appointments}
          config={config}
          preSelectedService={preSelectedService}
          onAppointmentCreated={handleAppointmentCreated}
        />
      </main>

      {/* Footer */}
      <Footer
        config={config}
        currentUser={currentAdminUser}
        barbers={barbers}
        onOpenStaffLogin={() => setIsAdminLoginOpen(true)}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {/* Floating Gemini AI Chatbot Button */}
        <button
          type="button"
          onClick={() => setIsAiChatOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#201d17] via-[#2a241b] to-[#201d17] hover:from-[#c99a35] hover:to-[#f0cf7b] text-[#f0cf7b] hover:text-[#141009] border border-[#c99a35]/60 hover:border-transparent shadow-xl shadow-black/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Abrir consultor Afonso AI"
        >
          <Sparkles className="w-5 h-5 text-[#f0cf7b] group-hover:text-[#141009] animate-pulse" />
          <span className="text-xs font-black tracking-wide">
            Afonso AI <span className="hidden sm:inline font-normal opacity-80">• Consultor Visagista</span>
          </span>
        </button>

        {/* Floating WhatsApp Contact Button */}
        <a
          href={`https://wa.me/${config.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
            'Olá! Gostaria de informações sobre agendamento na Barbearia Afonso Cortes.'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-13 h-13 rounded-full bg-[#25d366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
          aria-label="Contato direto no WhatsApp"
          title="Fale conosco no WhatsApp"
        >
          <MessageCircle className="w-7 h-7 fill-white text-[#25d366]" />
        </a>
      </div>

      {/* Gemini AI Chat Modal */}
      <AfonsoAiChatModal
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        barbers={barbers}
        services={services}
        onSelectServiceAndBook={(serviceId) => {
          if (serviceId) {
            const found = services.find((s) => s.id === serviceId);
            if (found) setPreSelectedService(found);
          }
          scrollToBooking();
        }}
      />

      {/* Client Area Modal */}
      <ClientAreaModal
        isOpen={isClientAreaOpen}
        onClose={() => setIsClientAreaOpen(false)}
        barbers={barbers}
        services={services}
        allAppointments={appointments}
        shopPhone={config.phone}
      />

      {/* Admin Login Modal (Master Password or Staff Barber Email) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        barbers={barbers}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Admin Dashboard Modal */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentUser={currentAdminUser}
        onLogout={handleLogoutAdmin}
        appointments={appointments}
        barbers={barbers}
        services={services}
        config={config}
        onUpdateStatus={updateAppointmentStatus}
        onDeleteAppointment={deleteAppointment}
        onUpdateConfig={updateConfig}
        onSaveBarber={saveBarber}
        onDeleteBarber={deleteBarber}
        onSaveService={saveService}
        onDeleteService={deleteService}
      />

      {/* Automated 10-Minute Reminder Manager */}
      <AutoReminderManager
        appointments={appointments}
        barbers={barbers}
        services={services}
        config={config}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed banner in this session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    if (dismissed) {
      setIsBannerDismissed(true);
    }

    // Detect standalone mode (already running as installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices (Safari does not fire beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic browser mini-infobar on mobile Chrome
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsBannerDismissed(true);
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setIsBannerDismissed(true);
        sessionStorage.setItem('pwa_banner_dismissed', 'true');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA prompt execution error:', err);
      return false;
    }
  };

  const dismissBanner = () => {
    setIsBannerDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const showBannerAgain = () => {
    setIsBannerDismissed(false);
    sessionStorage.removeItem('pwa_banner_dismissed');
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isBannerDismissed,
    install,
    dismissBanner,
    showBannerAgain,
  };
}

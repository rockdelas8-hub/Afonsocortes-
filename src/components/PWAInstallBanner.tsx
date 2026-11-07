import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  shopName?: string;
  forceShowForPreview?: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  shopName = 'Barbearia Afonso Cortes',
  forceShowForPreview = false,
}) => {
  const { isInstallable, isInstalled, isIOS, isBannerDismissed, install, dismissBanner } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccessToast, setInstallSuccessToast] = useState(false);

  // If already installed in standalone mode, do not show
  if (isInstalled && !forceShowForPreview) {
    return null;
  }

  // If dismissed and not forced for preview, hide
  if (isBannerDismissed && !forceShowForPreview) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccessToast(true);
        setTimeout(() => setInstallSuccessToast(false), 4000);
      }
    } else {
      // In desktop browsers or inside an iframe where beforeinstallprompt isn't fired yet
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Install App Banner */}
      <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-[#181818]/95 backdrop-blur-md border border-[#c99a35]/40 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-start gap-3.5 relative overflow-hidden">
          {/* Subtle gold accent corner glow */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#c99a35]/15 rounded-full blur-2xl pointer-events-none" />

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a2215] to-[#14120e] border border-[#c99a35]/50 flex items-center justify-center shrink-0 shadow-inner">
            <Smartphone className="w-6 h-6 text-[#f0cf7b]" />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#c99a35] flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Aplicativo PWA
              </span>
            </div>
            <h4 className="font-extrabold text-white text-sm leading-snug">
              Instalar {shopName}
            </h4>
            <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
              Adicione à tela inicial do seu celular para agendar horários com rapidez e praticidade.
            </p>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Instalar App</span>
              </button>

              <button
                type="button"
                onClick={dismissBanner}
                className="text-zinc-400 hover:text-white text-xs font-semibold px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                Agora não
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Fechar aviso de instalação"
            className="absolute top-2.5 right-2.5 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS & Browser Fallback Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-[#3e3e3e] rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-3.5 right-3.5 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#c99a35]/20 border border-[#c99a35]/40 flex items-center justify-center text-[#f0cf7b]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base leading-tight">
                  Instalar no seu Celular
                </h3>
                <p className="text-xs text-zinc-400">
                  {isIOS ? 'Passo a passo para iOS / Safari' : 'Instruções de Instalação'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 bg-[#121212] p-3.5 rounded-xl border border-[#2b2b2b]">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#c99a35]/20 text-[#f0cf7b] flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      1
                    </div>
                    <div>
                      Toque no botão <strong className="text-white">Compartilhar</strong> (ícone{' '}
                      <Share2 className="w-3.5 h-3.5 inline text-[#f0cf7b] -mt-0.5" /> no menu inferior do Safari).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#c99a35]/20 text-[#f0cf7b] flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      2
                    </div>
                    <div>
                      Role a lista de opções e clique em{' '}
                      <strong className="text-white flex items-center gap-1 mt-0.5">
                        <PlusSquare className="w-3.5 h-3.5 text-[#f0cf7b]" /> Adicionar à Tela de Início
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#c99a35]/20 text-[#f0cf7b] flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      3
                    </div>
                    <div>
                      Confirme clicando em <strong className="text-[#f0cf7b]">Adicionar</strong> no canto superior direito.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#c99a35]/20 text-[#f0cf7b] flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      1
                    </div>
                    <div>
                      No navegador (Chrome/Edge), clique nos <strong className="text-white">3 pontinhos ⋮</strong> do menu superior direito.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#c99a35]/20 text-[#f0cf7b] flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      2
                    </div>
                    <div>
                      Selecione <strong className="text-[#f0cf7b]">Instalar Aplicativo</strong> ou <strong className="text-[#f0cf7b]">Adicionar à tela inicial</strong>.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 bg-[#c99a35] hover:bg-[#d8a83d] text-[#141009] font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer text-center"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {installSuccessToast && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-[#14291d] border border-emerald-500 rounded-xl text-emerald-200 text-xs shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Aplicativo adicionado à sua tela de início com sucesso!</span>
        </div>
      )}
    </>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Brain, Zap, MessageSquare, Bot, User, Scissors, RefreshCw, AlertCircle } from 'lucide-react';
import { ChatMessage, ChatMode, Barber, Service } from '../types/barbershop';

interface AfonsoAiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  services: Service[];
  onSelectServiceAndBook: (serviceId?: string) => void;
}

export const AfonsoAiChatModal: React.FC<AfonsoAiChatModalProps> = ({
  isOpen,
  onClose,
  barbers,
  services,
  onSelectServiceAndBook,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Olá! Sou o **Afonso AI**, seu Consultor de Estilo, Visagismo e Assistente da Barbearia Afonso Cortes.\n\nPosso te ajudar a encontrar o corte e formato de barba perfeitos para a geometria do seu rosto, tirar dúvidas sobre nossos serviços ou agendar seu horário. Como posso te ajudar hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'general',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [activeMode, setActiveMode] = useState<ChatMode>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: '📐 Qual corte combina com rosto redondo?', text: 'Qual tipo de corte de cabelo e desenho de barba mais valorizam um formato de rosto redondo?' },
    { label: '🪒 Benefícios da Barboterapia', text: 'Quais os benefícios da Barboterapia com toalha quente na Barbearia Afonso Cortes para quem tem pele sensível ou foliculite?' },
    { label: '👑 Qual combo recomendam?', text: 'Qual o melhor combo de serviços para quem quer transformar o visual por completo?' },
    { label: '🧠 Consultoria Visagista Completa', text: 'Gostaria de uma consultoria visagista avançada: como alinhar barba, corte degradê e formato do maxilar?', mode: 'thinking' as ChatMode },
  ];

  const handleSendMessage = async (textToSend?: string, overrideMode?: ChatMode) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const mode = overrideMode || activeMode;
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    try {
      // Format payloads for backend Gemini API
      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro na comunicação com Afonso AI.');
      }

      const modelMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: data.mode,
        isThinking: mode === 'thinking',
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Falha ao obter resposta. Tente novamente.');
      // Add friendly assistant fallback message
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          text: 'Tivemos uma pequena oscilação na rede, mas estou aqui! Você pode perguntar novamente ou agendar diretamente pelo formulário de agendamento.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderFormattedText = (text: string) => {
    // Basic Markdown parser for bolding, bullet points, and headers
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-sm sm:text-base text-[#f0cf7b] mt-3 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-extrabold text-base text-[#f0cf7b] mt-3 mb-1">
            {line.replace('## ', '')}
          </h3>
        );
      }
      // Bullets
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletContent = line.trim().replace(/^[-*]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-xs sm:text-sm my-0.5 text-zinc-300">
            <span dangerouslySetInnerHTML={{ __html: formatBold(bulletContent) }} />
          </li>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-xs sm:text-sm text-zinc-200 leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: formatBold(line) }} />
      );
    });
  };

  const formatBold = (str: string) => {
    return str.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#181818] border border-[#383838] rounded-2xl w-full max-w-2xl h-[88vh] max-h-[720px] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#141414] border-b border-[#303030] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c99a35] to-[#f0cf7b] flex items-center justify-center text-[#141009] shadow-md shadow-[#c99a35]/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg leading-tight">
                  Afonso AI
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#c99a35]/20 text-[#f0cf7b] border border-[#c99a35]/40">
                  Visagista & Estilo
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Assistente Virtual da Barbearia Afonso Cortes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMessages([
                  {
                    id: 'welcome-reset',
                    role: 'model',
                    text: 'Conversa reiniciada! Como posso te ajudar a renovar seu visual hoje?',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    mode: activeMode,
                  },
                ]);
              }}
              title="Limpar conversa"
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar chat"
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Modes Selector Bar */}
        <div className="px-4 py-2.5 bg-[#161616] border-b border-[#2c2c2c] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-zinc-400 shrink-0 uppercase tracking-wider">
            Modo da IA:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Fast Mode (gemini-3.1-flash-lite) */}
            <button
              type="button"
              onClick={() => setActiveMode('fast')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'fast'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'bg-[#1f1f1f] text-zinc-400 hover:text-zinc-200 border border-white/5'
              }`}
              title="gemini-3.1-flash-lite: Respostas instantâneas e leves"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Rápido (Lite)</span>
            </button>

            {/* General Mode (gemini-3.8-flash) */}
            <button
              type="button"
              onClick={() => setActiveMode('general')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'general'
                  ? 'bg-[#c99a35]/25 text-[#f0cf7b] border border-[#c99a35] shadow-sm'
                  : 'bg-[#1f1f1f] text-zinc-400 hover:text-zinc-200 border border-white/5'
              }`}
              title="gemini-3.8-flash: Conversas gerais e agendamento"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#f0cf7b]" />
              <span>Geral (Flash)</span>
            </button>

            {/* Thinking Mode (gemini-4-argon with High Thinking) */}
            <button
              type="button"
              onClick={() => setActiveMode('thinking')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'thinking'
                  ? 'bg-purple-950/70 text-purple-200 border border-purple-500 shadow-sm shadow-purple-900/30 ring-1 ring-purple-500/50'
                  : 'bg-[#1f1f1f] text-zinc-400 hover:text-zinc-200 border border-white/5'
              }`}
              title="gemini-4-argon: Modo de Raciocínio Profundo (ThinkingLevel.HIGH) para análise visagista minuciosa"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Visagismo Profundo (Argon High)</span>
            </button>
          </div>
        </div>

        {/* Chat Thread Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c99a35] to-[#f0cf7b] text-[#141009] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm ${
                    isUser
                      ? 'bg-[#c99a35] text-[#141009] font-medium rounded-br-none shadow-md'
                      : 'bg-[#212121] text-zinc-200 border border-[#333333] rounded-bl-none shadow-sm'
                  }`}
                >
                  {/* Thinking badge for deep reasoning model */}
                  {!isUser && message.isThinking && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-[10px] font-bold text-purple-200 mb-2">
                      <Brain className="w-3 h-3 text-purple-400" />
                      <span>Raciocínio Visagista Avançado</span>
                    </div>
                  )}

                  {isUser ? (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  ) : (
                    <div>{renderFormattedText(message.text)}</div>
                  )}

                  <div
                    className={`text-[9px] mt-2 font-mono ${
                      isUser ? 'text-[#141009]/70 text-right' : 'text-zinc-500 text-left'
                    }`}
                  >
                    {message.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[#2b2b2b] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c99a35] to-[#f0cf7b] text-[#141009] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#212121] border border-[#333] rounded-2xl p-4 text-xs text-zinc-300 flex items-center gap-2.5">
                {activeMode === 'thinking' ? (
                  <>
                    <Brain className="w-4 h-4 text-purple-400 animate-spin" />
                    <span>Afonso AI está pensando profundamente na consultoria visagista...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#c99a35] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[#c99a35] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-[#c99a35] animate-bounce [animation-delay:0.4s]" />
                    <span className="text-zinc-400 ml-1">Digitando resposta...</span>
                  </>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-[#141414] border-t border-[#2a2a2a] overflow-x-auto no-scrollbar flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            Sugestões:
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt.text, prompt.mode)}
              className="px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-[#2c2c2c] text-zinc-300 hover:text-white border border-white/5 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-[#141414] border-t border-[#2e2e2e]">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeMode === 'thinking'
                  ? 'Descreva seu tipo de rosto ou dúvida para análise visagista profunda...'
                  : 'Pergunte sobre cortes, barbas, horários ou preços...'
              }
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-[#0d0d0d] border border-[#3e3e3e] focus:border-[#c99a35] rounded-xl text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#c99a35]"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="px-4 py-3 bg-[#c99a35] hover:bg-[#d8a83d] disabled:bg-zinc-800 disabled:text-zinc-600 text-[#141009] font-bold rounded-xl transition-all shadow-md cursor-pointer shrink-0"
              aria-label="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2.5 text-[10px] text-zinc-500">
            <span>Powered by Gemini • Afonso Cortes Barbearia Oficial</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectServiceAndBook();
              }}
              className="text-[#f0cf7b] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Scissors className="w-3 h-3" />
              <span>Ir para o Formulário de Agendamento</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

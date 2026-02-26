import { useState } from 'react';
import { MessageCircle, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: '📍 Onde fica o estúdio?',
    answer: 'O estúdio fica localizado na Quinta do Conde. Após a reserva, a morada exata ficará disponível na tab Projetos.',
  },
  {
    question: '🕐 Horário de funcionamento?',
    answer: 'Aberto todos os dias, das 10h às 22h.',
  },
  {
    question: '💰 Quais são os preços?',
    answer: 'Os preços variam consoante o serviço. Consulta a página de reservas para ver todos os valores atualizados.',
  },
  {
    question: '❌ Posso cancelar uma sessão?',
    answer: 'Sim, podes cancelar até 72h antes da sessão sem qualquer custo. Após as 72h ou No-Show cancelamentos implicam a retenção do sinal (15€).',
  },
  {
    question: '🎧 Como funciona o Mix & Master?',
    answer: 'Envia os teus ficheiros através da plataforma e envia mensagem ao Ghost no chat da app para mais informações.',
  },
];

const FaqChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);

  const handleBack = () => setSelectedFaq(null);
  const handleClose = () => {
    setIsOpen(false);
    setSelectedFaq(null);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-[70] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60dvh]">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
              {selectedFaq && (
                <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {selectedFaq ? 'Resposta' : 'Perguntas Frequentes'}
                </h3>
                <p className="text-xs text-muted-foreground">7T7 Studios</p>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {selectedFaq ? (
                <div className="space-y-3">
                  {/* User question bubble */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm">{selectedFaq.question}</p>
                    </div>
                  </div>
                  {/* Bot answer bubble */}
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm leading-relaxed">{selectedFaq.answer}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-start mb-3">
                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm">Yoooo, como posso ajudar?🦇 Escolhe uma pergunta:</p>
                    </div>
                  </div>
                  {faqs.map((faq, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedFaq(faq)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-sm text-foreground"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => isOpen ? handleClose() : setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 z-[70] h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </>
  );
};

export default FaqChatBubble;

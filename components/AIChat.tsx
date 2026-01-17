
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Transaction, Category } from '../types';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[]; // Já virá filtrada do App.tsx
  categories: Category[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  currentBalance: number;
  currentMonthName: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  detectedTransaction?: Omit<Transaction, 'id'>;
}

const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose, transactions, categories, addTransaction, currentBalance, currentMonthName }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Olá! Sou o assistente do Flux. Estou pronto para analisar suas finanças de ${currentMonthName} ou registrar gastos. Como posso ajudar?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const financialSummary = useMemo(() => {
    const monthTransactions = transactions.map(t => `${t.date}: ${t.description || 'Sem desc'} - R$ ${t.amount} (${t.type})`).join('\n');
    const catSummary = categories.map(c => {
        const total = transactions.filter(t => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0);
        return total > 0 ? `${c.name}: R$ ${total.toFixed(2)}` : null;
    }).filter(Boolean).join(', ');
    
    return `MÊS SENDO VISUALIZADO: ${currentMonthName}. 
    Saldo REALIZADO deste mês específico: R$ ${currentBalance.toFixed(2)}. 
    Resumo de gastos por categoria neste mês: ${catSummary || 'Nenhum gasto registrado ainda'}. 
    Lista completa de transações enviadas para você deste mês:\n${monthTransactions || 'Sem transações este mês.'}`;
  }, [transactions, categories, currentBalance, currentMonthName]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `
        Você é o "Flux AI", um assistente financeiro de elite integrado ao app Flux.
        
        Sua principal missão é analisar os dados que o usuário está vendo na tela agora. 
        O usuário está visualizando o Dashboard de: ${currentMonthName}.
        
        DADOS EXCLUSIVOS DO MÊS ATUAL (${currentMonthName}):
        ${financialSummary}

        INSTRUÇÕES CRÍTICAS:
        1. Toda e qualquer análise deve ser feita APENAS com base nos dados fornecidos acima. Não invente gastos passados ou futuros.
        2. Se o saldo estiver negativo ou o usuário estiver gastando muito em uma categoria, seja direto mas encorajador.
        3. Se o usuário disser algo como "paguei 30 de uber", você deve sugerir o lançamento.
        4. Quando sugerir um lançamento, você DEVE incluir no FINAL da sua resposta a tag: [TRANSACTION:{"amount":30,"type":"expense","description":"Uber","categoryName":"Transporte"}]
        5. Certifique-se de que o "categoryName" na tag combine com uma das categorias reais do app: ${categories.map(c => c.name).join(', ')}.
        6. Responda de forma humanizada, amigável e use emojis. Idioma: Português Brasileiro.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });

      const aiText = response.text || "Desculpe, tive um problema ao processar sua mensagem.";
      
      let detected: Omit<Transaction, 'id'> | undefined = undefined;
      const txMatch = aiText.match(/\[TRANSACTION:(.*?)\]/);
      let cleanText = aiText.replace(/\[TRANSACTION:.*?\]/g, '').trim();

      if (txMatch) {
        try {
          const raw = JSON.parse(txMatch[1]);
          const cat = categories.find(c => c.name.toLowerCase() === raw.categoryName.toLowerCase()) || categories[0];
          detected = {
            amount: raw.amount,
            type: raw.type,
            description: raw.description,
            categoryId: cat.id,
            date: new Date().toISOString().split('T')[0]
          };
        } catch (e) {
          console.error("Erro ao parsear transação da IA", e);
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: cleanText, detectedTransaction: detected }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Houve um erro ao conectar com minha inteligência. Tente novamente mais tarde." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTransaction = async (tx: Omit<Transaction, 'id'>, index: number) => {
    await addTransaction(tx);
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, detectedTransaction: undefined, text: m.text + "\n\n✅ Lançamento realizado com sucesso!" } : m));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-slate-700 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-primary-600 text-white">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            </div>
            <h2 className="font-bold">Assistente Flux ({currentMonthName})</h2>
        </div>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 shadow-sm rounded-tl-none border border-gray-100 dark:border-slate-600'}`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              
              {m.detectedTransaction && (
                <div className="mt-3 p-3 bg-primary-50 dark:bg-slate-800 rounded-lg border border-primary-100 dark:border-primary-900/50 space-y-2">
                    <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">Transação Detectada</p>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800 dark:text-gray-100">{m.detectedTransaction.description}</span>
                        <span className={`font-bold ${m.detectedTransaction.type === 'income' ? 'text-income' : 'text-expense'}`}>
                            {m.detectedTransaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">Categoria: {categories.find(c => c.id === m.detectedTransaction?.categoryId)?.name}</p>
                    <button 
                        onClick={() => handleConfirmTransaction(m.detectedTransaction!, i)}
                        className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-bold text-xs transition-colors mt-1"
                    >
                        Confirmar Lançamento
                    </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start">
                <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl shadow-sm rounded-tl-none flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
            </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700 space-y-3">
        {messages.length === 1 && (
            <button 
                onClick={() => sendMessage(`Analise minhas finanças de ${currentMonthName} por favor`)}
                className="w-full py-2 px-4 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-200 transition-colors flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                Analisar {currentMonthName}
            </button>
        )}
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Paguei 15 reais de café hoje..."
            className="flex-1 p-3 bg-gray-100 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;

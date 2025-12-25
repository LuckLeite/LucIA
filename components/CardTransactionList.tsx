
import React, { useMemo, useState } from 'react';
import type { CardTransaction } from '../types';

interface CardTransactionListProps {
  transactions: CardTransaction[];
  onEdit: (transaction: CardTransaction) => void;
  onDelete: (id: string) => void;
}

const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const CardDrawer: React.FC<{ 
    cardName: string; 
    items: CardTransaction[]; 
    onEdit: (t: CardTransaction) => void; 
    onDelete: (id: string) => void;
}> = ({ cardName, items, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(true);
    const totalImpact = items.reduce((acc, curr) => acc + curr.totalAmount, 0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/40 hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                        <CardIcon />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{cardName}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{items.length} {items.length === 1 ? 'compra' : 'compras'} ativa(s)</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Acumulado</p>
                        <p className="font-bold text-expense">{totalImpact.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                    </div>
                </div>
            </button>
            {isOpen && (
                <ul className="divide-y divide-gray-100 dark:divide-slate-700 border-t dark:border-slate-700">
                    {items.map(t => {
                        const monthlyAmount = t.totalAmount / t.installments;
                        return (
                            <li key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{t.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Compra: {parseDateAsUTC(t.purchaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                         <p className="font-bold text-gray-800 dark:text-gray-100">{t.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                         <p className="text-xs text-expense font-medium">{t.installments}x de {monthlyAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <button onClick={() => onEdit(t)} title="Editar" className="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                        </button>
                                        <button onClick={() => onDelete(t.id)} title="Apagar" className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

const CardTransactionList: React.FC<CardTransactionListProps> = ({ transactions, onEdit, onDelete }) => {
  const groupedCards = useMemo(() => {
    const groups: Record<string, CardTransaction[]> = {};
    transactions.forEach(t => {
        const cardName = t.card.trim() || 'Sem Cartão';
        if (!groups[cardName]) groups[cardName] = [];
        groups[cardName].push(t);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [transactions]);

  if (transactions.length === 0) {
    return (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-4"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhuma compra parcelada</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Registre suas compras para visualizar os débitos futuros.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gaveta de Cartões</h2>
       </div>
       <div className="space-y-4">
        {groupedCards.map(([cardName, items]) => (
          <CardDrawer key={cardName} cardName={cardName} items={items} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

export default CardTransactionList;

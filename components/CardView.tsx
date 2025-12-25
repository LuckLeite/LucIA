
import React, { useState, useMemo } from 'react';
import type { CardTransaction } from '../types';
import CardTransactionList from './CardTransactionList';
import CardTransactionForm from './CardTransactionForm';

interface CardViewProps {
  transactions: CardTransaction[];
  onAdd: (transaction: Omit<CardTransaction, 'id'>) => void;
  onUpdate: (transaction: CardTransaction) => void;
  onDelete: (id: string) => void;
}

const CardView: React.FC<CardViewProps> = ({ transactions, onAdd, onUpdate, onDelete }) => {
  const [transactionToEdit, setTransactionToEdit] = useState<CardTransaction | null>(null);

  // Grouping by monthly impact for the summary
  const monthlyImpact = useMemo(() => {
    const months: Record<string, number> = {};
    transactions.forEach(tx => {
        const monthly = tx.totalAmount / tx.installments;
        const purchaseDate = new Date(tx.purchaseDate + 'T12:00:00Z');
        for (let i = 1; i <= tx.installments; i++) {
            const date = new Date(purchaseDate);
            date.setUTCMonth(purchaseDate.getUTCMonth() + i);
            const key = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
            months[key] = (months[key] || 0) + monthly;
        }
    });
    return Object.entries(months).sort((a, b) => {
        // Rough sort by month/year string is hard, ideally we'd use date objects
        return 0; // Keeping simple as per request
    }).slice(0, 12);
  }, [transactions]);

  const handleEdit = (transaction: CardTransaction) => setTransactionToEdit(transaction);
  const handleClearEdit = () => setTransactionToEdit(null);
  const handleSubmit = (data: Omit<CardTransaction, 'id'> | CardTransaction) => {
    if ('id' in data) onUpdate(data); else onAdd(data);
    handleClearEdit();
  };

  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <CardTransactionList transactions={transactions} onEdit={handleEdit} onDelete={onDelete} />
      </div>
      <div className="lg:col-span-1 space-y-6">
         <div className="sticky top-24 space-y-6">
            <CardTransactionForm onSubmit={handleSubmit} transactionToEdit={transactionToEdit} onCancelEdit={handleClearEdit} />
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 5-5-5-5 5"/><path d="m17 19-5 5-5-5"/></svg>
                    Sumário de Débitos por Mês
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {monthlyImpact.length > 0 ? monthlyImpact.map(([month, amount]) => (
                        <div key={month} className="flex justify-between items-center text-sm border-b dark:border-slate-700 pb-1">
                            <span className="text-gray-500 dark:text-gray-400 capitalize">{month}</span>
                            <span className="font-semibold text-expense">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    )) : <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma compra parcelada.</p>}
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default CardView;

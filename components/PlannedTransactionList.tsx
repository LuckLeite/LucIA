import React from 'react';
import type { PlannedTransaction, Category } from '../types';

interface PlannedTransactionListProps {
  plannedTransactions: PlannedTransaction[];
  categories: Category[];
  onAdd: () => void;
  onEdit: (transaction: PlannedTransaction) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (transaction: PlannedTransaction) => void;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const PlannedTransactionListItem: React.FC<{
  transaction: PlannedTransaction;
  category?: Category;
  onEdit: () => void;
  onDelete: () => void;
  onMarkAsPaid: () => void;
}> = ({ transaction, category, onEdit, onDelete, onMarkAsPaid }) => {
  const Icon = category?.icon;
  const isIncome = transaction.type === 'income';
  const isPaid = transaction.status === 'paid';
  const isGenerated = transaction.isGenerated;

  return (
    <li className={`flex items-center justify-between p-4 rounded-lg shadow-sm transition-all ${isPaid ? 'bg-gray-100 dark:bg-slate-800 opacity-60' : 'bg-white dark:bg-slate-800'}`}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="p-2 rounded-full" style={{ backgroundColor: `${category?.color}20` }}>
            <Icon className="w-6 h-6" style={{ color: category?.color }} />
          </div>
        )}
        <div>
          <p className={`font-semibold text-gray-800 dark:text-gray-100 ${isPaid && 'line-through'}`}>{transaction.description || category?.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vencimento: {parseDateAsUTC(transaction.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
             {isGenerated && <span className="ml-2 text-xs font-semibold text-blue-500 dark:text-blue-400">(Automático)</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <span className={`font-bold ${isIncome ? 'text-income' : 'text-expense'}`}>
          {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        {!isPaid && (
            <button onClick={onMarkAsPaid} className="px-3 py-1 text-sm font-semibold text-white bg-green-500 rounded-md hover:bg-green-600">
                Dar Baixa
            </button>
        )}
        {!isGenerated && (
          <>
            <button onClick={onEdit} className="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </>
        )}
      </div>
    </li>
  );
};

const PlannedTransactionList: React.FC<PlannedTransactionListProps> = ({ plannedTransactions, categories, onAdd, onEdit, onDelete, onMarkAsPaid }) => {
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  if (plannedTransactions.length === 0) {
    return (
      <div className="p-4 sm:p-6 text-center">
         <div className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-lg mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum item planejado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Adicione suas contas fixas, salários ou gastos futuros aqui.</p>
            <button onClick={onAdd} className="mt-4 bg-primary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-700">
                Adicionar Planejamento
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
       <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Planejamento do Mês</h2>
       <ul className="space-y-3">
        {plannedTransactions.map(pt => (
          <PlannedTransactionListItem
            key={pt.id}
            transaction={pt}
            category={categoryMap.get(pt.categoryId)}
            onEdit={() => onEdit(pt)}
            onDelete={() => onDelete(pt.id)}
            onMarkAsPaid={() => onMarkAsPaid(pt)}
          />
        ))}
      </ul>
    </div>
  );
};

export default PlannedTransactionList;
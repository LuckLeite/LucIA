
import React from 'react';
import type { PlannedTransaction, Category } from '../types';
import { getIconComponent } from '../constants';

interface PlannedTransactionListProps {
  plannedTransactions: PlannedTransaction[];
  categories: Category[];
  onAdd: () => void;
  onEdit: (transaction: PlannedTransaction) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (transaction: PlannedTransaction) => void;
  onUnmarkAsPaid: (transaction: PlannedTransaction) => void;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const PlannedTransactionListItem: React.FC<{
  transaction: PlannedTransaction;
  category?: Category;
  onEdit: () => void;
  onDelete: () => void;
  onMarkAsPaid: () => void;
  onUnmarkAsPaid: () => void;
}> = ({ transaction, category, onEdit, onDelete, onMarkAsPaid, onUnmarkAsPaid }) => {
  const Icon = category ? getIconComponent(category.iconName) : null;
  const isIncome = transaction.type === 'income';
  const isPaid = transaction.status === 'paid';
  const isGenerated = transaction.isGenerated;

  return (
    <li className={`flex items-center justify-between p-3 sm:p-4 rounded-lg shadow-sm transition-all gap-2 sm:gap-4 ${isPaid ? 'bg-gray-100 dark:bg-slate-800 opacity-80' : 'bg-white dark:bg-slate-800'}`}>
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {Icon && (
          <div className="p-1.5 sm:p-2 rounded-full flex-shrink-0" style={{ backgroundColor: `${category?.color}20` }}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: category?.color }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-gray-800 dark:text-gray-100 truncate text-[13px] sm:text-base ${isPaid && 'line-through decoration-gray-400'}`}>
            {transaction.description || category?.name}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {parseDateAsUTC(transaction.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
             {isGenerated && <span className="ml-1 sm:ml-2 text-[9px] sm:text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-tighter sm:tracking-normal">Automático</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0 ml-1">
        <span className={`font-bold text-xs sm:text-base whitespace-nowrap ${isIncome ? 'text-income' : 'text-expense'}`}>
          {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        
        {!isPaid ? (
            <button onClick={onMarkAsPaid} className="px-2 sm:px-3 py-1 text-[10px] sm:text-sm font-bold text-white bg-green-500 rounded-md hover:bg-green-600 uppercase transition-colors">
                <span className="hidden sm:inline">Dar Baixa</span>
                <span className="sm:hidden">Baixa</span>
            </button>
        ) : (
            <button onClick={onUnmarkAsPaid} className="px-2 sm:px-3 py-1 text-[10px] sm:text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 uppercase transition-colors border border-gray-300 dark:border-slate-600">
                <span className="hidden sm:inline">Tirar a baixa</span>
                <span className="sm:hidden">Tirar baixa</span>
            </button>
        )}

        {!isPaid && (
            <button onClick={onEdit} title="Editar" className="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
        )}
        
        {!isGenerated && (
            <button onClick={onDelete} title="Apagar" className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
        )}
      </div>
    </li>
  );
};

const PlannedTransactionList: React.FC<PlannedTransactionListProps> = ({ plannedTransactions, categories, onAdd, onEdit, onDelete, onMarkAsPaid, onUnmarkAsPaid }) => {
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
       <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Planejamento do Mês</h2>
       <ul className="space-y-2 sm:space-y-3">
        {plannedTransactions.map(pt => (
          <PlannedTransactionListItem
            key={pt.id}
            transaction={pt}
            category={categoryMap.get(pt.categoryId)}
            onEdit={() => onEdit(pt)}
            onDelete={() => onDelete(pt.id)}
            onMarkAsPaid={() => onMarkAsPaid(pt)}
            onUnmarkAsPaid={() => onUnmarkAsPaid(pt)}
          />
        ))}
      </ul>
    </div>
  );
};

export default PlannedTransactionList;

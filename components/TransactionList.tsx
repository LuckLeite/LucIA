
import React from 'react';
import type { Transaction, Category } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onViewAll: () => void;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

export const TransactionListItem: React.FC<{ 
    transaction: Transaction; 
    category?: Category; 
    onEdit: () => void; 
    onDelete: () => void;
    showCheckbox?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
}> = ({ transaction, category, onEdit, onDelete, showCheckbox, isSelected, onSelect }) => {
  const Icon = category?.icon;
  const isIncome = transaction.type === 'income';

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Prevent row click from toggling selection when clicking on buttons or the checkbox itself
    if (target.closest('button') || target.tagName.toLowerCase() === 'input') {
      return;
    }
    onSelect?.(transaction.id);
  };

  return (
    <li 
        className={`flex items-center justify-between p-4 rounded-lg shadow-sm transition-shadow ${isSelected ? 'bg-primary-50 dark:bg-slate-700/50' : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}
        onClick={showCheckbox ? handleRowClick : undefined}
        style={{ cursor: showCheckbox ? 'pointer' : 'default' }}
    >
      <div className="flex items-center gap-4">
        {showCheckbox && (
            <input
                type="checkbox"
                checked={!!isSelected}
                onChange={() => onSelect?.(transaction.id)}
                className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-primary-600 focus:ring-primary-500 dark:bg-slate-900"
                aria-label={`Select transaction ${transaction.description || category?.name}`}
            />
        )}
        {Icon && (
          <div className="p-2 rounded-full" style={{ backgroundColor: `${category?.color}20` }}>
            <Icon className="w-6 h-6" style={{ color: category?.color }} />
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{transaction.description || category?.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {parseDateAsUTC(transaction.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-bold ${isIncome ? 'text-income' : 'text-expense'}`}>
          {isIncome ? '+' : '-'} {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        <button onClick={onEdit} className="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    </li>
  );
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, onEdit, onDelete, onViewAll }) => {
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  if (transactions.length === 0) {
    return (
        <div className="bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Transações do Mês</h2>
            <div className="text-center py-10 px-4 bg-white dark:bg-slate-800 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1-.9-2-2-2Z"/></svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Nenhuma transação encontrada</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comece adicionando uma nova receita ou despesa.</p>
            </div>
        </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
       <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Últimas Transações</h2>
            <button onClick={onViewAll} className="text-sm font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">
                Ver Todas
            </button>
       </div>
       <ul className="space-y-3">
        {transactions.map(tx => (
          <TransactionListItem 
            key={tx.id} 
            transaction={tx} 
            category={categoryMap.get(tx.categoryId)}
            onEdit={() => onEdit(tx)}
            onDelete={() => onDelete(tx.id)}
          />
        ))}
      </ul>
    </div>
  );
};

export default TransactionList;
import React from 'react';
import type { CardTransaction } from '../types';

interface CardTransactionListProps {
  transactions: CardTransaction[];
  onEdit: (transaction: CardTransaction) => void;
  onDelete: (id: string) => void;
}

const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;

const CardTransactionListItem: React.FC<{
  transaction: CardTransaction;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ transaction, onEdit, onDelete }) => {

  const monthlyAmount = transaction.totalAmount / transaction.installments;

  return (
    <li className="flex items-center justify-between p-4 rounded-lg shadow-sm bg-white dark:bg-slate-800">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
            <CardIcon />
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{transaction.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {transaction.card} &bull; {new Date(transaction.purchaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="text-right">
             <span className="font-bold text-expense">
                {transaction.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.installments}x de {monthlyAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <button onClick={onEdit} className="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    </li>
  );
};

const CardTransactionList: React.FC<CardTransactionListProps> = ({ transactions, onEdit, onDelete }) => {

  if (transactions.length === 0) {
    return (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Nenhuma compra parcelada</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Adicione suas compras no cartão de crédito aqui para melhor controle.</p>
        </div>
    );
  }

  return (
    <div>
       <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Compras Parceladas</h2>
       <ul className="space-y-3">
        {transactions.map(t => (
          <CardTransactionListItem
            key={t.id}
            transaction={t}
            onEdit={() => onEdit(t)}
            onDelete={() => onDelete(t.id)}
          />
        ))}
      </ul>
    </div>
  );
};

export default CardTransactionList;

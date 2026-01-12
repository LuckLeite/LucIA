
import React, { useMemo, useState } from 'react';
import type { PlannedTransaction, Category } from '../types';
import { getIconComponent } from '../constants';

interface PlannedTransactionListProps {
  plannedTransactions: PlannedTransaction[];
  categories: Category[];
  onAdd: () => void;
  onEdit: (transaction: PlannedTransaction) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMarkAsPaid: (transaction: PlannedTransaction) => void;
  onUnmarkAsPaid: (transaction: PlannedTransaction) => void;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const PlannedTransactionListItem: React.FC<{
  transaction: PlannedTransaction;
  category?: Category;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMarkAsPaid: () => void;
  onUnmarkAsPaid: () => void;
}> = ({ transaction, category, onEdit, onDelete, onDuplicate, onMarkAsPaid, onUnmarkAsPaid }) => {
  const Icon = category ? getIconComponent(category.iconName) : null;
  const isIncome = transaction.type === 'income';
  const isPaid = transaction.status === 'paid';
  const isGenerated = transaction.isGenerated;

  return (
    <li className={`flex items-center justify-between p-3 sm:p-4 rounded-lg shadow-sm transition-all gap-2 sm:gap-4 ${isPaid ? 'bg-gray-50 dark:bg-slate-800/40 opacity-60 grayscale-[0.3]' : 'bg-white dark:bg-slate-800'}`}>
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {Icon && (
          <div className="p-1.5 sm:p-2 rounded-full flex-shrink-0" style={{ backgroundColor: `${category?.color}20` }}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: category?.color }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-gray-800 dark:text-gray-100 truncate text-[13px] sm:text-base ${isPaid && 'line-through decoration-gray-500 decoration-2'}`}>
            {transaction.description || category?.name}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {parseDateAsUTC(transaction.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
             {isGenerated && <span className="ml-1 sm:ml-2 text-[9px] sm:text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-tighter sm:tracking-normal">Automático</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0 ml-1">
        <span className={`font-bold text-xs sm:text-base whitespace-nowrap ${isIncome ? 'text-income' : 'text-expense'} ${isPaid && 'opacity-70'}`}>
          {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        
        {!isPaid ? (
            <button onClick={onMarkAsPaid} className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-md shadow-sm flex items-center gap-1 uppercase transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Baixar</span>
            </button>
        ) : (
            <button onClick={onUnmarkAsPaid} className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-md shadow-sm border border-gray-300 dark:border-slate-600 flex items-center gap-1 uppercase transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                <span>Desfazer</span>
            </button>
        )}

        <div className="flex items-center">
            {!isPaid && (
                <>
                    <button onClick={onDuplicate} title="Duplicar" className="text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                    <button onClick={onEdit} title="Editar" className="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                </>
            )}
            
            {!isGenerated && (
                <button onClick={onDelete} title="Apagar" className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            )}
        </div>
      </div>
    </li>
  );
};

const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

const PlannedGroupDrawer: React.FC<{
    groupName: string;
    items: PlannedTransaction[];
    categories: Category[];
    onEdit: (t: PlannedTransaction) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onMarkAsPaid: (t: PlannedTransaction) => void;
    onUnmarkAsPaid: (t: PlannedTransaction) => void;
}> = ({ groupName, items, categories, onEdit, onDelete, onDuplicate, onMarkAsPaid, onUnmarkAsPaid }) => {
    // Agora inicia em false para que as bandejas fiquem fechadas ao abrir a tela
    const [isOpen, setIsOpen] = useState(false);
    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

    const stats = useMemo(() => {
        return items.reduce((acc, curr) => {
            const isExp = curr.type === 'expense';
            const val = curr.amount;
            if (curr.status === 'paid') {
                acc.paid += isExp ? val : -val;
            } else {
                acc.pending += isExp ? val : -val;
            }
            return acc;
        }, { paid: 0, pending: 0 });
    }, [items]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/40 hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="text-left">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase text-xs tracking-wider">{groupName}</h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{items.length} itens</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="flex gap-4">
                            <div>
                                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Baixado</p>
                                <p className="text-sm font-bold text-green-600 dark:text-green-500">{stats.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Pendente</p>
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-500">{stats.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        </div>
                    </div>
                    <div className={`transition-transform duration-200 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                    </div>
                </div>
            </button>
            {isOpen && (
                <ul className="divide-y divide-gray-100 dark:divide-slate-700 border-t dark:border-slate-700">
                    {items.map(pt => (
                        <PlannedTransactionListItem
                            key={pt.id}
                            transaction={pt}
                            category={categoryMap.get(pt.categoryId)}
                            onEdit={() => onEdit(pt)}
                            onDelete={() => onDelete(pt.id)}
                            onDuplicate={() => onDuplicate(pt.id)}
                            onMarkAsPaid={() => onMarkAsPaid(pt)}
                            onUnmarkAsPaid={() => onUnmarkAsPaid(pt)}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
};

const PlannedTransactionList: React.FC<PlannedTransactionListProps> = ({ plannedTransactions, categories, onAdd, onEdit, onDelete, onDuplicate, onMarkAsPaid, onUnmarkAsPaid }) => {
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, PlannedTransaction[]> = {};
    plannedTransactions.forEach(pt => {
        const groupName = pt.group || 'Geral';
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(pt);
    });
    return Object.entries(groups).sort((a, b) => {
        if (a[0] === 'Geral') return -1;
        if (b[0] === 'Geral') return 1;
        return a[0].localeCompare(b[0]);
    });
  }, [plannedTransactions]);

  if (plannedTransactions.length === 0) {
    return (
      <div className="p-4 sm:p-6 text-center">
         <div className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-lg mt-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum item planejado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Adicione suas contas fixas, salários ou gastos futuros aqui.</p>
            <button onClick={onAdd} className="mt-4 bg-primary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-700 transition-colors shadow-lg">
                Adicionar Planejamento
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
       <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Planejamento do Mês</h2>
       <div className="space-y-4">
        {groupedTransactions.map(([groupName, items]) => (
            <PlannedGroupDrawer 
                key={groupName} 
                groupName={groupName} 
                items={items} 
                categories={categories}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMarkAsPaid={onMarkAsPaid}
                onUnmarkAsPaid={onUnmarkAsPaid}
            />
        ))}
       </div>
    </div>
  );
};

export default PlannedTransactionList;

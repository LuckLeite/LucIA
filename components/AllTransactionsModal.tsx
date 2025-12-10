import React, { useState, useMemo, useEffect } from 'react';
import type { Transaction, Category } from '../types';
import Modal from './ui/Modal';
import { TransactionListItem } from './TransactionList';

interface AllTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onUpdateCategoryMultiple: (ids: string[], categoryId: string) => void;
}

type SortKey = 'date' | 'amount' | 'type' | 'description';
type SortDirection = 'asc' | 'desc';

const SortIcon = ({ direction }: { direction: SortDirection }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ml-1 transition-transform ${direction === 'desc' ? 'rotate-180' : ''}`}>
        <path d="m6 9 6 6 6-6"/>
    </svg>
);

const AllTransactionsModal: React.FC<AllTransactionsModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions, 
  categories, 
  onEdit, 
  onDelete,
  onDeleteMultiple,
  onUpdateCategoryMultiple
}) => {
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ 
      key: 'date', 
      direction: 'desc' 
  });

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    // Keep selection in sync if underlying transactions change
    const transactionIds = new Set(transactions.map(t => t.id));
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        let changed = false;
        for (const id of newSet) {
            if (!transactionIds.has(id)) {
                newSet.delete(id);
                changed = true;
            }
        }
        return changed ? newSet : prev;
    });
  }, [transactions]);

  // Sorting Handler
  const requestSort = (key: SortKey) => {
      let direction: SortDirection = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
          // Flip logic for better UX: if already desc, go asc. 
          // Default start for Date/Amount usually Descending is better, but consistency matters.
          // Let's stick to standard toggle: Asc -> Desc -> Asc
           direction = 'asc';
      } else {
          // Default direction when switching keys
          // Date and Amount usually wanted Descending first (newest/highest)
          if (key === 'date' || key === 'amount') direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];
    sorted.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];

        // Special handling for computed fields
        if (sortConfig.key === 'description') {
            aValue = (a.description || categoryMap.get(a.categoryId)?.name || '').toLowerCase();
            bValue = (b.description || categoryMap.get(b.categoryId)?.name || '').toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
  }, [transactions, sortConfig, categoryMap]);


  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };
  
  const selectedTransactionsList = useMemo(() => 
    transactions.filter(t => selectedIds.has(t.id)),
    [transactions, selectedIds]
  );

  const canChangeCategory = useMemo(() => {
    if (selectedTransactionsList.length === 0) return false;
    const firstType = selectedTransactionsList[0].type;
    return selectedTransactionsList.every(t => t.type === firstType);
  }, [selectedTransactionsList]);

  const availableCategories = useMemo(() => {
    if (!canChangeCategory) return [];
    const type = selectedTransactionsList[0].type;
    return categories.filter(c => c.type === type);
  }, [categories, canChangeCategory, selectedTransactionsList]);
  
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.find(c => c.id === newCategoryId)) {
      setNewCategoryId(availableCategories[0].id);
    } else if (availableCategories.length === 0) {
      setNewCategoryId('');
    }
  }, [availableCategories, newCategoryId]);

  const handleDeleteSelected = () => {
    if (selectedIds.size > 0) {
      onDeleteMultiple(Array.from(selectedIds));
    }
  };

  const handleUpdateCategorySelected = () => {
    if (selectedIds.size > 0 && newCategoryId && canChangeCategory) {
      onUpdateCategoryMultiple(Array.from(selectedIds), newCategoryId);
      setSelectedIds(new Set());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Todas as Transações do Mês" size="4xl">
      <div className="max-h-[70vh] flex flex-col">
        {/* Header / Sort Bar */}
        {transactions.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-3 bg-gray-100 dark:bg-slate-700/50 border-b dark:border-slate-600 rounded-t-lg text-sm font-semibold text-gray-600 dark:text-gray-300">
                <div className="w-4 text-center">
                     <input
                        type="checkbox"
                        checked={transactions.length > 0 && selectedIds.size === transactions.length}
                        onChange={handleToggleAll}
                        className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-primary-600 focus:ring-primary-500 dark:bg-slate-900"
                        aria-label="Select all transactions"
                    />
                </div>
                
                <div className="flex-1 flex justify-between items-center pl-2">
                    {/* Left Side Headers (Date, Desc) */}
                    <div className="flex gap-4 sm:gap-8">
                        <button 
                            onClick={() => requestSort('date')} 
                            className={`flex items-center hover:text-primary-600 dark:hover:text-primary-400 ${sortConfig.key === 'date' ? 'text-primary-600 dark:text-primary-400' : ''}`}
                        >
                            Data
                            {sortConfig.key === 'date' && <SortIcon direction={sortConfig.direction} />}
                        </button>
                        <button 
                            onClick={() => requestSort('description')} 
                            className={`flex items-center hover:text-primary-600 dark:hover:text-primary-400 ${sortConfig.key === 'description' ? 'text-primary-600 dark:text-primary-400' : ''}`}
                        >
                            Descrição
                            {sortConfig.key === 'description' && <SortIcon direction={sortConfig.direction} />}
                        </button>
                    </div>

                    {/* Right Side Headers (Amount, Type) */}
                    <div className="flex gap-4 sm:gap-8 justify-end mr-20 sm:mr-24">
                         <button 
                            onClick={() => requestSort('amount')} 
                            className={`flex items-center hover:text-primary-600 dark:hover:text-primary-400 ${sortConfig.key === 'amount' ? 'text-primary-600 dark:text-primary-400' : ''}`}
                        >
                            Valor
                            {sortConfig.key === 'amount' && <SortIcon direction={sortConfig.direction} />}
                        </button>
                        <button 
                            onClick={() => requestSort('type')} 
                            className={`flex items-center hover:text-primary-600 dark:hover:text-primary-400 ${sortConfig.key === 'type' ? 'text-primary-600 dark:text-primary-400' : ''}`}
                        >
                            Tipo
                            {sortConfig.key === 'type' && <SortIcon direction={sortConfig.direction} />}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-grow overflow-y-auto pr-2">
          {transactions.length > 0 ? (
            <ul className="space-y-3 pt-2">
              {sortedTransactions.map(tx => (
                <TransactionListItem
                  key={tx.id}
                  transaction={tx}
                  category={categoryMap.get(tx.categoryId)}
                  onEdit={() => {
                    onEdit(tx);
                    onClose();
                  }}
                  onDelete={() => onDelete(tx.id)}
                  showCheckbox={true}
                  isSelected={selectedIds.has(tx.id)}
                  onSelect={handleToggleSelection}
                />
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma transação neste mês.</p>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="mt-4 p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
             <p className="font-semibold">{selectedIds.size} item(s) selecionado(s)</p>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <select 
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    disabled={!canChangeCategory}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                    aria-label="New category"
                  >
                    {canChangeCategory ? (
                      availableCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)
                    ) : (
                      <option>Selecione itens do mesmo tipo</option>
                    )}
                  </select>
                  <button 
                    onClick={handleUpdateCategorySelected}
                    disabled={!canChangeCategory || !newCategoryId}
                    className="py-2 px-4 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Alterar Categoria
                  </button>
                </div>

                <button 
                  onClick={handleDeleteSelected}
                  className="py-2 px-4 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm"
                >
                  Apagar Selecionados
                </button>
             </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AllTransactionsModal;
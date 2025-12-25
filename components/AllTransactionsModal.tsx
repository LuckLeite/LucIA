
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
  onDuplicate: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onUpdateCategoryMultiple: (ids: string[], categoryId: string) => void;
}

type SortKey = 'date' | 'amount' | 'type' | 'description' | 'categoryId';
type SortDirection = 'asc' | 'desc';

const SortIcon = ({ direction }: { direction: SortDirection }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ml-1 transition-transform ${direction === 'desc' ? 'rotate-180' : ''}`}>
        <path d="m6 9 6 6 6-6"/>
    </svg>
);

const AllTransactionsModal: React.FC<AllTransactionsModalProps> = ({ 
  isOpen, onClose, transactions, categories, onEdit, onDelete, onDuplicate, onDeleteMultiple, onUpdateCategoryMultiple
}) => {
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' });

  useEffect(() => { if (!isOpen) setSelectedIds(new Set()); }, [isOpen]);
  useEffect(() => {
    const transactionIds = new Set(transactions.map(t => t.id));
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        let changed = false;
        for (const id of newSet) { if (!transactionIds.has(id)) { newSet.delete(id); changed = true; } }
        return changed ? newSet : prev;
    });
  }, [transactions]);

  const requestSort = (key: SortKey) => {
      let direction: SortDirection = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
      else if (key === 'date' || key === 'amount') direction = 'desc';
      setSortConfig({ key, direction });
  };

  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];
    sorted.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];
        if (sortConfig.key === 'description') {
            aValue = (a.description || categoryMap.get(a.categoryId)?.name || '').toLowerCase();
            bValue = (b.description || categoryMap.get(b.categoryId)?.name || '').toLowerCase();
        } else if (sortConfig.key === 'categoryId') {
            aValue = categoryMap.get(a.categoryId)?.name.toLowerCase() || '';
            bValue = categoryMap.get(b.categoryId)?.name.toLowerCase() || '';
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
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === transactions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(transactions.map(t => t.id)));
  };
  
  const selectedTransactionsList = useMemo(() => transactions.filter(t => selectedIds.has(t.id)), [transactions, selectedIds]);
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
    if (availableCategories.length > 0 && !availableCategories.find(c => c.id === newCategoryId)) setNewCategoryId(availableCategories[0].id);
    else if (availableCategories.length === 0) setNewCategoryId('');
  }, [availableCategories, newCategoryId]);

  const handleDeleteSelected = () => { if (selectedIds.size > 0) onDeleteMultiple(Array.from(selectedIds)); };
  const handleUpdateCategorySelected = () => {
    if (selectedIds.size > 0 && newCategoryId && canChangeCategory) {
      onUpdateCategoryMultiple(Array.from(selectedIds), newCategoryId);
      setSelectedIds(new Set());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transações do Mês" size="6xl">
      <div className="max-h-[75vh] flex flex-col">
        {transactions.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-3 bg-gray-100 dark:bg-slate-700/50 border-b dark:border-slate-600 rounded-t-lg text-sm font-semibold text-gray-600 dark:text-gray-300">
                <div className="w-8 flex justify-center">
                     <input type="checkbox" checked={transactions.length > 0 && selectedIds.size === transactions.length} onChange={handleToggleAll} className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-primary-600 focus:ring-primary-500 dark:bg-slate-900" />
                </div>
                <div className="flex-1 grid grid-cols-12 gap-4 items-center pl-2">
                    <button onClick={() => requestSort('date')} className={`col-span-2 flex items-center hover:text-primary-600 dark:hover:text-primary-400 ${sortConfig.key === 'date' ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                        Data {sortConfig.key === 'date' && <SortIcon direction={sortConfig.direction} />}
                    </button>
                    <button onClick={() => requestSort('categoryId')} className={`col-span-2 flex items-center hover:text-primary-600 dark:hover:text-primary-400 ${sortConfig.key === 'categoryId' ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                        Categoria {sortConfig.key === 'categoryId' && <SortIcon direction={sortConfig.direction} />}
                    </button>
                    <button onClick={() => requestSort('description')} className={`col-span-4 flex items-center hover:text-primary-600 dark:hover:text-primary-400 ${sortConfig.key === 'description' ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                        Descrição {sortConfig.key === 'description' && <SortIcon direction={sortConfig.direction} />}
                    </button>
                    <button onClick={() => requestSort('amount')} className={`col-span-2 text-right flex items-center justify-end hover:text-primary-600 dark:hover:text-primary-400 ${sortConfig.key === 'amount' ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                        Valor {sortConfig.key === 'amount' && <SortIcon direction={sortConfig.direction} />}
                    </button>
                    <div className="col-span-2 text-right">Ações</div>
                </div>
            </div>
        )}
        <div className="flex-grow overflow-y-auto">
          {transactions.length > 0 ? (
            <ul className="space-y-1 pt-1">
              {sortedTransactions.map(tx => (
                <TransactionListItem key={tx.id} transaction={tx} category={categoryMap.get(tx.categoryId)} onEdit={() => { onEdit(tx); onClose(); }} onDelete={() => onDelete(tx.id)} onDuplicate={() => onDuplicate(tx.id)} showCheckbox={true} isSelected={selectedIds.has(tx.id)} onSelect={handleToggleSelection} />
              ))}
            </ul>
          ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma transação neste mês.</p>}
        </div>
        {selectedIds.size > 0 && (
          <div className="mt-4 p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
             <p className="font-semibold text-sm">{selectedIds.size} selecionado(s)</p>
             <div className="flex items-center gap-2">
                <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} disabled={!canChangeCategory} className="block px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-xs">
                    {canChangeCategory ? availableCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>) : <option>Tipos mistos</option>}
                </select>
                <button onClick={handleUpdateCategorySelected} disabled={!canChangeCategory || !newCategoryId} className="py-1.5 px-3 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 text-xs">Mudar Categoria</button>
                <button onClick={handleDeleteSelected} className="py-1.5 px-3 rounded-md bg-red-600 text-white hover:bg-red-700 text-xs">Apagar</button>
             </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AllTransactionsModal;

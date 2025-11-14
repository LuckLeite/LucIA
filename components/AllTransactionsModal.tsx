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
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newCategoryId, setNewCategoryId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
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
  
  const selectedTransactions = useMemo(() => 
    transactions.filter(t => selectedIds.has(t.id)),
    [transactions, selectedIds]
  );

  const canChangeCategory = useMemo(() => {
    if (selectedTransactions.length === 0) return false;
    const firstType = selectedTransactions[0].type;
    return selectedTransactions.every(t => t.type === firstType);
  }, [selectedTransactions]);

  const availableCategories = useMemo(() => {
    if (!canChangeCategory) return [];
    const type = selectedTransactions[0].type;
    return categories.filter(c => c.type === type);
  }, [categories, canChangeCategory, selectedTransactions]);
  
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
        <div className="flex-grow overflow-y-auto pr-2">
          {transactions.length > 0 ? (
            <ul className="space-y-3">
              <li className="flex items-center gap-4 px-4 py-2 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <input
                  type="checkbox"
                  checked={transactions.length > 0 && selectedIds.size === transactions.length}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-primary-600 focus:ring-primary-500 dark:bg-slate-900"
                  aria-label="Select all transactions"
                />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Selecionar Tudo</span>
              </li>
              {transactions.map(tx => (
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
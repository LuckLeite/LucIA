
import React, { useState, useMemo } from 'react';
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

type SortKey = 'date' | 'amount' | 'description' | 'categoryId';
type SortDirection = 'asc' | 'desc';

const AllTransactionsModal: React.FC<AllTransactionsModalProps> = ({ 
  isOpen, onClose, transactions, categories, onEdit, onDelete, onDuplicate, onDeleteMultiple, onUpdateCategoryMultiple
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const filteredAndSorted = useMemo(() => {
    return transactions
      .filter(tx => {
        const desc = (tx.description || '').toLowerCase();
        const catName = categoryMap.get(tx.categoryId)?.name.toLowerCase() || '';
        return desc.includes(searchTerm.toLowerCase()) || catName.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        let aV = a[sortConfig.key];
        let bV = b[sortConfig.key];
        if (sortConfig.key === 'categoryId') {
          aV = categoryMap.get(a.categoryId)?.name || '';
          bV = categoryMap.get(b.categoryId)?.name || '';
        }
        if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [transactions, searchTerm, sortConfig, categoryMap]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSorted.map(t => t.id)));
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Histórico de Transações" size="6xl">
      <div className="flex flex-col h-[80vh]">
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <input 
              type="text" 
              placeholder="Buscar por descrição ou categoria..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <button 
                onClick={handleSelectAll}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md transition-colors"
             >
                {selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0 ? 'Desmarcar Todos' : 'Selecionar Filtrados'}
             </button>
             {selectedIds.size > 0 && (
                <button 
                    onClick={() => onDeleteMultiple(Array.from(selectedIds))}
                    className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors"
                >
                    Apagar ({selectedIds.size})
                </button>
             )}
          </div>
        </div>

        <div className="flex gap-4 mb-4 overflow-x-auto pb-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 border-b dark:border-slate-700">
            <button onClick={() => handleSort('date')} className={`flex items-center gap-1 hover:text-primary-500 whitespace-nowrap ${sortConfig.key === 'date' ? 'text-primary-600' : ''}`}>
                Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button onClick={() => handleSort('description')} className={`flex items-center gap-1 hover:text-primary-500 whitespace-nowrap ${sortConfig.key === 'description' ? 'text-primary-600' : ''}`}>
                Descrição {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button onClick={() => handleSort('categoryId')} className={`flex items-center gap-1 hover:text-primary-500 whitespace-nowrap ${sortConfig.key === 'categoryId' ? 'text-primary-600' : ''}`}>
                Categoria {sortConfig.key === 'categoryId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button onClick={() => handleSort('amount')} className={`flex items-center gap-1 hover:text-primary-500 whitespace-nowrap ${sortConfig.key === 'amount' ? 'text-primary-600' : ''}`}>
                Valor {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Nenhuma transação encontrada.</div>
          ) : (
            <ul className="space-y-2">
              {filteredAndSorted.map(tx => (
                <TransactionListItem 
                  key={tx.id} 
                  transaction={tx} 
                  category={categoryMap.get(tx.categoryId)} 
                  onEdit={() => onEdit(tx)} 
                  onDelete={() => onDelete(tx.id)} 
                  onDuplicate={() => onDuplicate(tx.id)}
                  showCheckbox={true}
                  isSelected={selectedIds.has(tx.id)}
                  onSelect={handleToggleSelect}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AllTransactionsModal;

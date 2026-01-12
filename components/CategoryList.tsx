
import React, { useMemo } from 'react';
import type { Category } from '../types';
import { getIconComponent } from '../constants';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAdd: (type: 'income' | 'expense') => void;
  onReorder: (newOrder: Category[]) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onEdit, onDelete, onAdd, onReorder }) => {

  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);

  const moveItem = (id: string, direction: 'up' | 'down') => {
      const type = categories.find(c => c.id === id)?.type;
      const sameTypeList = categories.filter(c => c.type === type);
      const index = sameTypeList.findIndex(c => c.id === id);
      
      if (direction === 'up' && index > 0) {
          const newSameTypeList = [...sameTypeList];
          [newSameTypeList[index], newSameTypeList[index - 1]] = [newSameTypeList[index - 1], newSameTypeList[index]];
          
          const otherTypeList = categories.filter(c => c.type !== type);
          onReorder([...otherTypeList, ...newSameTypeList]);
      } else if (direction === 'down' && index < sameTypeList.length - 1) {
          const newSameTypeList = [...sameTypeList];
          [newSameTypeList[index], newSameTypeList[index + 1]] = [newSameTypeList[index + 1], newSameTypeList[index]];
          
          const otherTypeList = categories.filter(c => c.type !== type);
          onReorder([...otherTypeList, ...newSameTypeList]);
      }
  };

  const applyAlphaSort = () => {
      const incomeSorted = [...incomeCategories].sort((a, b) => a.name.localeCompare(b.name));
      const expenseSorted = [...expenseCategories].sort((a, b) => a.name.localeCompare(b.name));
      onReorder([...incomeSorted, ...expenseSorted]);
  };

  const renderList = (title: string, items: Category[], type: 'income' | 'expense') => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4 border-b dark:border-slate-700 pb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            <button 
                onClick={() => onAdd(type)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nova Categoria
            </button>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((cat, idx) => {
                const Icon = getIconComponent(cat.iconName);
                return (
                    <li key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3 min-w-0">
                             {/* Reorder controls */}
                             <div className="flex flex-col gap-0.5">
                                <button 
                                    disabled={idx === 0}
                                    onClick={() => moveItem(cat.id, 'up')}
                                    className="text-gray-400 hover:text-primary-500 disabled:opacity-0 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                </button>
                                <button 
                                    disabled={idx === items.length - 1}
                                    onClick={() => moveItem(cat.id, 'down')}
                                    className="text-gray-400 hover:text-primary-500 disabled:opacity-0 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                             </div>

                             <div className="p-2 rounded-full flex-shrink-0" style={{ backgroundColor: `${cat.color}20` }}>
                                <Icon className="w-5 h-5" style={{ color: cat.color }} />
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                             <button onClick={() => onEdit(cat)} title="Editar" className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                             </button>
                             <button onClick={() => onDelete(cat.id)} title="Excluir" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                             </button>
                        </div>
                    </li>
                );
            })}
        </ul>
        <p className="mt-2 text-[10px] text-gray-400 text-right">{items.length} / 30 categorias</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Categorias</h2>
            <button 
                onClick={applyAlphaSort}
                title="Organizar todas de A a Z permanentemente"
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md text-sm font-semibold transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                Classificar A-Z
            </button>
        </div>
        {renderList("Receitas", incomeCategories, 'income')}
        {renderList("Despesas", expenseCategories, 'expense')}
    </div>
  );
};

export default CategoryList;


import React from 'react';
import type { Category } from '../types';
import { getIconComponent } from '../constants';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAdd: (type: 'income' | 'expense') => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onEdit, onDelete, onAdd }) => {
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const renderList = (title: string, items: Category[], type: 'income' | 'expense') => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4 border-b dark:border-slate-700 pb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            <button 
                onClick={() => onAdd(type)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nova Categoria
            </button>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(cat => {
                const Icon = getIconComponent(cat.iconName);
                return (
                    <li key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                             <div className="p-2 rounded-full" style={{ backgroundColor: `${cat.color}20` }}>
                                <Icon className="w-5 h-5" style={{ color: cat.color }} />
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <button onClick={() => onEdit(cat)} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                             </button>
                             <button onClick={() => onDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                             </button>
                        </div>
                    </li>
                );
            })}
        </ul>
        <p className="mt-2 text-[10px] text-gray-400 text-right">{items.length} / 20 categorias</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Categorias</h2>
        {renderList("Receitas", incomeCategories, 'income')}
        {renderList("Despesas", expenseCategories, 'expense')}
    </div>
  );
};

export default CategoryList;

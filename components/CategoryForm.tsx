import React, { useState, useEffect } from 'react';
import type { Category, TransactionType } from '../types';
import { ICON_MAP, getIconComponent } from '../constants';

interface CategoryFormProps {
  onSubmit: (category: Omit<Category, 'id'> | Category) => void;
  categoryToEdit?: Category | null;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ onSubmit, categoryToEdit }) => {
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Tag');
  const [color, setColor] = useState('#3b82f6');
  const [type, setType] = useState<TransactionType>('expense');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setIconName(categoryToEdit.iconName);
      setColor(categoryToEdit.color);
      setType(categoryToEdit.type);
    } else {
      setName('');
      setIconName('Tag');
      setColor('#3b82f6');
      setType('expense');
    }
  }, [categoryToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
        alert("Preencha o nome da categoria");
        return;
    }

    const data = { name, iconName, color, type };
    if (categoryToEdit) {
        onSubmit({ ...data, id: categoryToEdit.id });
    } else {
        onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg cursor-pointer text-center font-semibold ${type === 'expense' ? 'bg-expense text-white' : 'bg-gray-100 dark:bg-slate-700'}`}
                onClick={() => setType('expense')}>
                Despesa
            </div>
            <div className={`p-4 rounded-lg cursor-pointer text-center font-semibold ${type === 'income' ? 'bg-income text-white' : 'bg-gray-100 dark:bg-slate-700'}`}
                 onClick={() => setType('income')}>
                Receita
            </div>
        </div>
        
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Categoria</label>
            <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cor</label>
            <div className="mt-1 flex gap-2">
                <input 
                    type="color" 
                    value={color} 
                    onChange={e => setColor(e.target.value)} 
                    className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-slate-600"
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ícone</label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 dark:border-slate-700 rounded-md">
                {Object.keys(ICON_MAP).map((key) => {
                    const Icon = getIconComponent(key);
                    return (
                        <div 
                            key={key} 
                            onClick={() => setIconName(key)}
                            className={`p-2 rounded-md cursor-pointer flex justify-center items-center ${iconName === key ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 border border-primary-500' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500'}`}
                        >
                            <Icon className="w-6 h-6" />
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="flex justify-end pt-2">
            <button type="submit" className="w-full bg-primary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                {categoryToEdit ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
        </div>
    </form>
  );
};

export default CategoryForm;
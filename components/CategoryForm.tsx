import React, { useState, useEffect } from 'react';
import type { Category, TransactionType, Bank } from '../types';
import { ICON_MAP, getIconComponent } from '../constants';

interface CategoryFormProps {
  onSubmit: (category: Omit<Category, 'id'> | Category) => void;
  categoryToEdit?: Category | null;
  banks: Bank[];
}

const CategoryForm: React.FC<CategoryFormProps> = ({ onSubmit, categoryToEdit, banks }) => {
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Tag');
  const [color, setColor] = useState('#3b82f6');
  const [type, setType] = useState<TransactionType>('expense');
  const [includeInTithing, setIncludeInTithing] = useState(true);
  const [isMovement, setIsMovement] = useState(false);
  const [movementBankId, setMovementBankId] = useState('');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setIconName(categoryToEdit.iconName);
      setColor(categoryToEdit.color);
      setType(categoryToEdit.type);
      setIncludeInTithing(categoryToEdit.includeInTithing !== undefined ? categoryToEdit.includeInTithing : true);
      setIsMovement(categoryToEdit.is_movement || false);
      setMovementBankId(categoryToEdit.movement_bank_id || '');
    } else {
      setName('');
      setIconName('Tag');
      setColor('#3b82f6');
      setType('expense');
      setIncludeInTithing(true);
      setIsMovement(false);
      setMovementBankId('');
    }
  }, [categoryToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
        alert("Preencha o nome da categoria");
        return;
    }

    const data = { 
        name, 
        iconName, 
        color, 
        type,
        includeInTithing: type === 'income' ? includeInTithing : undefined,
        is_movement: isMovement,
        movement_bank_id: isMovement ? movementBankId : undefined
    };

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

         {type === 'income' && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-slate-800 rounded-md border border-blue-100 dark:border-slate-700">
                 <input 
                     type="checkbox" 
                     id="includeInTithing"
                     checked={includeInTithing}
                     onChange={(e) => setIncludeInTithing(e.target.checked)}
                     className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                 />
                 <label htmlFor="includeInTithing" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                     Incluir no cálculo do dízimo?
                 </label>
              </div>
         )}

         <div className="space-y-3 p-3 bg-primary-50 dark:bg-slate-800 rounded-md border border-primary-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="isMovement"
                    checked={isMovement}
                    onChange={(e) => setIsMovement(e.target.checked)}
                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="isMovement" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    Movimento - Mostrar saldo em outro banco?
                </label>
            </div>
            
            {isMovement && (
                <div className="pl-6 space-y-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Banco de Destino</label>
                    <select 
                        value={movementBankId} 
                        onChange={e => setMovementBankId(e.target.value)}
                        required={isMovement}
                        className="w-full p-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">Selecione o banco de destino</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <p className="text-[10px] text-primary-600 dark:text-primary-400 italic">
                        As saídas nesta categoria aparecerão como entradas planejadas no banco selecionado.
                    </p>
                </div>
            )}
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

import React, { useState, useEffect } from 'react';
import type { PlannedTransaction, Category, TransactionType } from '../types';

interface PlannedTransactionFormProps {
  onSubmit: (data: { transaction: Omit<PlannedTransaction, 'id' | 'status'> | PlannedTransaction, recurrenceCount: number }) => void;
  transactionToEdit?: PlannedTransaction | null;
  categories: Category[];
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const PlannedTransactionForm: React.FC<PlannedTransactionFormProps> = ({ onSubmit, transactionToEdit, categories }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState('');

  const filteredCategories = React.useMemo(() => categories.filter(c => c.type === type), [categories, type]);

  useEffect(() => {
    if (transactionToEdit) {
      setAmount(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
      setCategoryId(transactionToEdit.categoryId);
      setDueDate(parseDateAsUTC(transactionToEdit.dueDate).toISOString().split('T')[0]);
      setDescription(transactionToEdit.description);
    } else {
      setAmount('');
      setType('expense');
      setCategoryId(categories.find(c => c.type === 'expense')?.id || '');
      setDueDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setRecurrenceCount('');
    }
  }, [transactionToEdit, categories]);

  useEffect(() => {
    if (!transactionToEdit) {
      const firstCategoryForType = filteredCategories[0];
      setCategoryId(firstCategoryForType?.id || '');
    }
  }, [type, filteredCategories, transactionToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !dueDate) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    const transactionData = {
      amount: parseFloat(amount),
      type,
      categoryId,
      dueDate,
      description,
    };

    if (transactionToEdit) {
      onSubmit({ transaction: { ...transactionData, id: transactionToEdit.id, status: transactionToEdit.status }, recurrenceCount: 0 });
    } else {
      const count = parseInt(recurrenceCount, 10) || 0;
      onSubmit({ transaction: transactionData, recurrenceCount: count });
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
        <input id="description" value={description} onChange={e => setDescription(e.target.value)}
               className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor</label>
        <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required
               className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
          <option value="">Selecione a categoria</option>
          {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Vencimento</label>
        <input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} required
               className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
      </div>
      
      {!transactionToEdit && (
        <div className="pt-2">
           <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Repetir para os próximos meses
          </label>
          <input 
            type="number"
            id="recurrence"
            value={recurrenceCount}
            onChange={e => setRecurrenceCount(e.target.value)}
            min="0"
            placeholder="0"
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" className="w-full bg-primary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          {transactionToEdit ? 'Salvar Alterações' : 'Adicionar Planejamento'}
        </button>
      </div>
    </form>
  );
};

export default PlannedTransactionForm;
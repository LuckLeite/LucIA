
import React, { useState, useEffect } from 'react';
import type { Transaction, Category, TransactionType, Bank } from '../types';

interface TransactionFormProps {
  onSubmit: (transaction: Omit<Transaction, 'id'> | Transaction) => void;
  transactionToEdit?: Transaction | null;
  categories: Category[];
  banks: Bank[];
  defaultBankId?: string;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, transactionToEdit, categories, banks, defaultBankId }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [bankId, setBankId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const filteredCategories = React.useMemo(() => categories.filter(c => c.type === type), [categories, type]);

  useEffect(() => {
    if (transactionToEdit) {
      setAmount(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
      setCategoryId(transactionToEdit.categoryId);
      setBankId(transactionToEdit.bankId || '');
      setDate(parseDateAsUTC(transactionToEdit.date).toISOString().split('T')[0]);
      setDescription(transactionToEdit.description);
    } else {
        // Reset form
        setAmount('');
        setType('expense');
        setCategoryId(categories.find(c => c.type === 'expense')?.id || '');
        setBankId(defaultBankId || banks[0]?.id || '');
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
    }
  }, [transactionToEdit, categories, banks, defaultBankId]);

  // Effect to update category when type changes for a new transaction
  useEffect(() => {
    if (!transactionToEdit) {
        const firstCategoryForType = filteredCategories[0];
        setCategoryId(firstCategoryForType?.id || '');
    }
  }, [type, filteredCategories, transactionToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !date) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    const transactionData = {
      amount: parseFloat(amount),
      type,
      categoryId,
      bankId: bankId || undefined,
      date,
      description,
    };

    if (transactionToEdit) {
      onSubmit({ ...transactionData, id: transactionToEdit.id });
    } else {
      onSubmit(transactionData);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor</label>
                <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required 
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
            </div>
            <div>
                <label htmlFor="bank" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Banco / Conta</label>
                <select id="bank" value={bankId} onChange={e => setBankId(e.target.value)} required
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                <option value="">Selecione o banco</option>
                {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
                </select>
            </div>
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
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required
               className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="w-full bg-primary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          {transactionToEdit ? 'Salvar Alterações' : 'Adicionar Transação'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
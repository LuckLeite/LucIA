
import React, { useState, useEffect } from 'react';
import type { CardTransaction } from '../types';

interface CardTransactionFormProps {
  onSubmit: (data: Omit<CardTransaction, 'id'> | CardTransaction) => void;
  transactionToEdit?: CardTransaction | null;
  onCancelEdit: () => void;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const CardTransactionForm: React.FC<CardTransactionFormProps> = ({ onSubmit, transactionToEdit, onCancelEdit }) => {
  const [name, setName] = useState('');
  const [card, setCard] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const resetForm = () => {
    setName('');
    setCard('');
    setTotalAmount('');
    setInstallments('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
  }

  useEffect(() => {
    if (transactionToEdit) {
      setName(transactionToEdit.name);
      setCard(transactionToEdit.card);
      setTotalAmount(String(transactionToEdit.totalAmount));
      setInstallments(String(transactionToEdit.installments));
      setPurchaseDate(parseDateAsUTC(transactionToEdit.purchaseDate).toISOString().split('T')[0]);
    } else {
      resetForm();
    }
  }, [transactionToEdit]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !card || !totalAmount || !installments || !purchaseDate) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
    
    const transactionData = {
      name,
      card,
      totalAmount: parseFloat(totalAmount),
      installments: parseInt(installments, 10),
      purchaseDate,
    };

    if (transactionToEdit) {
      onSubmit({ ...transactionData, id: transactionToEdit.id });
    } else {
      onSubmit(transactionData);
      resetForm();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {transactionToEdit ? 'Editar Compra' : 'Nova Compra Parcelada'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="card-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome / Descrição</label>
                <input id="card-name" value={name} onChange={e => setName(e.target.value)} required
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
             <div>
                <label htmlFor="card-card" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cartão (ex: Itau, Inter)</label>
                <input id="card-card" value={card} onChange={e => setCard(e.target.value)} required
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="card-totalAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor Total</label>
                    <input type="number" step="0.01" id="card-totalAmount" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required 
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                </div>
                 <div>
                    <label htmlFor="card-installments" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Parcelas</label>
                    <input type="number" id="card-installments" value={installments} onChange={e => setInstallments(e.target.value)} required min="1"
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                </div>
            </div>
            <div>
                <label htmlFor="card-purchaseDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data da Compra</label>
                <input type="date" id="card-purchaseDate" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                {transactionToEdit && (
                     <button type="button" onClick={onCancelEdit} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500">
                        Cancelar
                    </button>
                )}
                <button type="submit" className="flex-grow bg-primary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    {transactionToEdit ? 'Salvar' : 'Adicionar'}
                </button>
            </div>
        </form>
    </div>
  );
};

export default CardTransactionForm;
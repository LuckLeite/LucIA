import React, { useState } from 'react';
import type { CardTransaction } from '../types';
import CardTransactionList from './CardTransactionList';
import CardTransactionForm from './CardTransactionForm';

interface CardViewProps {
  transactions: CardTransaction[];
  onAdd: (transaction: Omit<CardTransaction, 'id'>) => void;
  onUpdate: (transaction: CardTransaction) => void;
  onDelete: (id: string) => void;
}

const CardView: React.FC<CardViewProps> = ({ transactions, onAdd, onUpdate, onDelete }) => {
  const [transactionToEdit, setTransactionToEdit] = useState<CardTransaction | null>(null);

  const handleEdit = (transaction: CardTransaction) => {
    setTransactionToEdit(transaction);
  };

  const handleClearEdit = () => {
    setTransactionToEdit(null);
  };

  const handleSubmit = (data: Omit<CardTransaction, 'id'> | CardTransaction) => {
    if ('id' in data) {
      onUpdate(data);
    } else {
      onAdd(data);
    }
    handleClearEdit();
  };


  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <CardTransactionList
          transactions={transactions}
          onEdit={handleEdit}
          onDelete={onDelete}
        />
      </div>
      <div className="lg:col-span-1">
         <div className="sticky top-24">
            <CardTransactionForm
                onSubmit={handleSubmit}
                transactionToEdit={transactionToEdit}
                onCancelEdit={handleClearEdit}
            />
         </div>
      </div>
    </div>
  );
};

export default CardView;

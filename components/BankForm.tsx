
import React, { useState } from 'react';
import type { Bank } from '../types';

interface BankFormProps {
  onSubmit: (bank: Omit<Bank, 'id'>) => void;
  bankToEdit?: Bank | null;
  onCancel?: () => void;
}

const COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Laranja', value: '#f59e0b' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Indigo', value: '#6366f1' },
];

const BankForm: React.FC<BankFormProps> = ({ onSubmit, bankToEdit, onCancel }) => {
  const [name, setName] = useState(bankToEdit?.name || '');
  const [color, setColor] = useState(bankToEdit?.color || COLORS[0].value);
  const [initialBalance, setInitialBalance] = useState(bankToEdit?.initial_balance || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSubmit({ name, color, initial_balance: initialBalance });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Nome do Banco / Conta
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Nubank, Carteira, Itaú..."
          className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Saldo Inicial
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
          <input
            type="number"
            step="0.01"
            value={initialBalance}
            onChange={(e) => setInitialBalance(parseFloat(e.target.value))}
            className="w-full p-3 pl-10 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
        <p className="mt-1 text-[10px] text-gray-400 italic">Este valor será somado ao saldo total das transações.</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Cor de Identificação
        </label>
        <div className="grid grid-cols-4 gap-3">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`h-10 rounded-lg border-2 transition-all flex items-center justify-center ${
                color === c.value ? 'border-primary-500 scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.value }}
            >
              {color === c.value && (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="flex-1 py-3 px-4 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
        >
          {bankToEdit ? 'Salvar Alterações' : 'Cadastrar Banco'}
        </button>
      </div>
    </form>
  );
};

export default BankForm;

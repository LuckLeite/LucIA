
import React from 'react';
import type { Bank } from '../types';
import Modal from './ui/Modal';

interface BankManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  banks: Bank[];
  onEdit: (bank: Bank) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onAdd: () => void;
}

const BankManagementModal: React.FC<BankManagementModalProps> = ({
  isOpen, onClose, banks, onEdit, onDelete, onSetPrimary, onAdd
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Bancos e Contas">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie suas contas e defina qual receberá os lançamentos automáticos (faturas, dízimo, etc).
          </p>
          <button 
            onClick={onAdd}
            className="px-3 py-1.5 bg-primary-600 text-white text-sm font-bold rounded-md hover:bg-primary-700 transition-colors shadow-sm whitespace-nowrap"
          >
            + Novo Banco
          </button>
        </div>

        <div className="grid gap-3">
          {banks.map(bank => (
            <div 
              key={bank.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${bank.is_primary ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/10' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                  style={{ backgroundColor: bank.color }}
                >
                  {bank.name.substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{bank.name}</h3>
                    {bank.is_primary && (
                      <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold rounded uppercase tracking-wider border border-primary-200 dark:border-primary-800">
                        Primário
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Saldo Inicial: {bank.initial_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!bank.is_primary && (
                  <button 
                    onClick={() => onSetPrimary(bank.id)}
                    className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                    title="Definir como Primário"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </button>
                )}
                <button 
                  onClick={() => onEdit(bank)}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Editar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm(`Deseja realmente apagar o banco ${bank.name}?`)) {
                      onDelete(bank.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Excluir"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default BankManagementModal;

import React, { useState, useMemo } from 'react';
import type { CardTransaction, CardRegistry } from '../types';
import CardTransactionList from './CardTransactionList';
import CardTransactionForm from './CardTransactionForm';
import Modal from './ui/Modal';

interface CardViewProps {
  transactions: CardTransaction[];
  registries: CardRegistry[];
  displayDate: Date;
  onAdd: (transaction: Omit<CardTransaction, 'id'>) => void;
  onUpdate: (transaction: CardTransaction) => void;
  onDelete: (id: string) => void;
  onAddRegistry: (reg: Omit<CardRegistry, 'id'>) => void;
  onUpdateRegistry: (reg: CardRegistry) => void;
  onDeleteRegistry: (id: string) => void;
}

const CardView: React.FC<CardViewProps> = ({ 
  transactions, registries, displayDate, 
  onAdd, onUpdate, onDelete, 
  onAddRegistry, onUpdateRegistry, onDeleteRegistry 
}) => {
  const [transactionToEdit, setTransactionToEdit] = useState<CardTransaction | null>(null);
  const [isRegistryModalOpen, setRegistryModalOpen] = useState(false);
  
  // Registry Form State
  const [newRegName, setNewRegName] = useState('');
  const [newRegDueDay, setNewRegDueDay] = useState(10);
  const [editingRegId, setEditingRegId] = useState<string | null>(null);

  // Filtra compras que têm parcelas incidindo no mês selecionado
  const filteredTransactions = useMemo(() => {
    const targetMonth = displayDate.getMonth();
    const targetYear = displayDate.getFullYear();

    return transactions.filter(tx => {
        const purchaseDate = new Date(tx.purchaseDate + 'T12:00:00Z');
        
        for (let i = 1; i <= tx.installments; i++) {
            const installmentDate = new Date(purchaseDate);
            installmentDate.setUTCMonth(purchaseDate.getUTCMonth() + i);
            
            if (installmentDate.getMonth() === targetMonth && installmentDate.getFullYear() === targetYear) {
                return true;
            }
        }
        return false;
    });
  }, [transactions, displayDate]);

  const handleEdit = (transaction: CardTransaction) => setTransactionToEdit(transaction);
  const handleClearEdit = () => setTransactionToEdit(null);
  
  const handleRegistrySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRegName) return;
      if (editingRegId) {
          onUpdateRegistry({ id: editingRegId, name: newRegName, due_day: newRegDueDay });
          setEditingRegId(null);
      } else {
          onAddRegistry({ name: newRegName, due_day: newRegDueDay });
      }
      setNewRegName('');
      setNewRegDueDay(10);
  };

  const startEditRegistry = (reg: CardRegistry) => {
      setEditingRegId(reg.id);
      setNewRegName(reg.name);
      setNewRegDueDay(reg.due_day);
  };

  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compras no Cartão</h2>
            <button 
                onClick={() => setRegistryModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 rounded-md text-sm font-bold hover:bg-primary-200 dark:hover:bg-primary-900/60 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                Gerenciar Meus Cartões
            </button>
        </div>
        <CardTransactionList transactions={filteredTransactions} onEdit={handleEdit} onDelete={onDelete} />
      </div>
      
      <div className="lg:col-span-1 space-y-6">
         <div className="sticky top-24 space-y-6">
            <CardTransactionForm 
                onSubmit={(data) => ('id' in data ? onUpdate(data) : onAdd(data))} 
                transactionToEdit={transactionToEdit} 
                onCancelEdit={handleClearEdit} 
                registries={registries}
            />
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 5-5-5-5 5"/><path d="m17 19-5 5-5-5"/></svg>
                    Resumo do Mês ({displayDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })})
                </h3>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Total de Parcelas</p>
                    <p className="text-2xl font-bold text-expense">
                        {filteredTransactions.reduce((acc, tx) => acc + (tx.totalAmount / tx.installments), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </div>
         </div>
      </div>

      <Modal isOpen={isRegistryModalOpen} onClose={() => setRegistryModalOpen(false)} title="Meus Cartões" size="lg">
          <div className="space-y-6">
              <form onSubmit={handleRegistrySubmit} className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Cartão</label>
                          <input 
                            value={newRegName} 
                            onChange={e => setNewRegName(e.target.value)} 
                            placeholder="Ex: Nubank, Inter, Visa" 
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded outline-none focus:ring-1 focus:ring-primary-500" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia de Vencimento</label>
                          <input 
                            type="number" 
                            min="1" max="31" 
                            value={newRegDueDay} 
                            onChange={e => setNewRegDueDay(parseInt(e.target.value, 10))} 
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded outline-none focus:ring-1 focus:ring-primary-500" 
                          />
                      </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                      {editingRegId && (
                          <button type="button" onClick={() => {setEditingRegId(null); setNewRegName('');}} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-200 rounded">Cancelar</button>
                      )}
                      <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded hover:bg-primary-700">
                          {editingRegId ? 'Salvar Alteração' : 'Adicionar Cartão'}
                      </button>
                  </div>
              </form>

              <div className="max-h-64 overflow-y-auto">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 px-1">Cartões Ativos</h4>
                  {registries.length === 0 ? (
                      <p className="text-center py-8 text-gray-400 italic">Nenhum cartão cadastrado.</p>
                  ) : (
                      <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                          {registries.map(reg => (
                              <li key={reg.id} className="py-3 px-1 flex justify-between items-center group">
                                  <div>
                                      <p className="font-bold text-gray-800 dark:text-gray-100">{reg.name}</p>
                                      <p className="text-xs text-gray-500">Vence todo dia {reg.due_day}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <button onClick={() => startEditRegistry(reg)} className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                      </button>
                                      <button onClick={() => onDeleteRegistry(reg.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                      </button>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  )}
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default CardView;
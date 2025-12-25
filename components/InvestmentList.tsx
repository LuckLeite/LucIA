import React, { useMemo, useState, useEffect } from 'react';
import type { Investment } from '../types';

interface InvestmentListProps {
  investments: Investment[];
  onEdit: (inv: Investment) => void;
  onDelete: (id: string) => void;
  onBulkUpdate: (updates: { id: string; currentBalance: number }[]) => void;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const InvestmentList: React.FC<InvestmentListProps> = ({ investments, onEdit, onDelete, onBulkUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBalances, setEditedBalances] = useState<Record<string, string>>({});

  // Reset edited balances when entering edit mode
  useEffect(() => {
    if (isEditing) {
        const initialBalances: Record<string, string> = {};
        investments.forEach(inv => {
            initialBalances[inv.id] = String(inv.currentBalance);
        });
        setEditedBalances(initialBalances);
    }
  }, [isEditing, investments]);

  // Group investments by 'group' property
  const groupedInvestments = useMemo(() => {
    const groups: Record<string, Investment[]> = {};
    investments.forEach(inv => {
        const groupName = inv.group || 'Geral';
        if (!groups[groupName]) {
            groups[groupName] = [];
        }
        groups[groupName].push(inv);
    });
    return groups;
  }, [investments]);

  const groupKeys = Object.keys(groupedInvestments).sort();

  const handleSaveBulk = () => {
      const updates = Object.entries(editedBalances).map(([id, val]) => ({
          id,
          currentBalance: parseFloat(val as string) || 0
      }));
      onBulkUpdate(updates);
      setIsEditing(false);
  };

  const handleInputChange = (id: string, val: string) => {
      setEditedBalances(prev => ({ ...prev, [id]: val }));
  };

  if (investments.length === 0) {
    return (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum investimento cadastrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cadastre seus ativos para acompanhar o saldo e rentabilidade.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
       {/* Global Actions */}
       <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
           <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Gerenciar Carteira</h3>
           <div className="flex gap-2">
               {!isEditing ? (
                   <button 
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-md shadow-sm text-gray-700 dark:text-gray-200 font-medium transition-colors flex items-center gap-2"
                   >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                       Atualizar Saldos
                   </button>
               ) : (
                   <>
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-md text-gray-700 dark:text-gray-200 font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSaveBulk}
                            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm font-medium flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            Salvar Tudo
                        </button>
                   </>
               )}
           </div>
       </div>

       <div className="space-y-8">
            {groupKeys.map(groupName => {
                const groupItems = groupedInvestments[groupName];
                const totalInvested = groupItems.reduce((acc, curr) => acc + curr.amount, 0);
                const totalBalance = groupItems.reduce((acc, curr) => acc + curr.currentBalance, 0);
                const totalProfit = totalBalance - totalInvested;
                const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

                return (
                    <div key={groupName} className="rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-slate-700">
                        {/* Black Header for Group Summary */}
                        <div className="bg-black dark:bg-slate-950 text-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="text-lg font-bold">{groupName}</h3>
                            <div className="flex gap-4 sm:gap-8 text-sm sm:text-base flex-wrap">
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Aportado</p>
                                    <p className="font-semibold">{totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Saldo</p>
                                    <p className="font-bold">{totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Rendimento</p>
                                    <p className={`font-semibold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                                <div className="text-right border-l border-gray-700 pl-4 ml-2">
                                    <p className="text-xs text-gray-400">Rentabilidade</p>
                                    <p className={`font-semibold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {totalProfitPercent.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="bg-white dark:bg-slate-800 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">
                                    <tr>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3">Nome</th>
                                        <th className="px-4 py-3 text-right">Aportado</th>
                                        <th className="px-4 py-3 text-right" style={{ minWidth: isEditing ? '140px' : 'auto' }}>Saldo</th>
                                        <th className="px-4 py-3 text-right">Rent.</th>
                                        <th className="px-4 py-3 text-center">Data</th>
                                        <th className="px-4 py-3 text-center">Liquidez</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {groupItems.map(inv => {
                                        const profit = inv.currentBalance - inv.amount;
                                        const profitPercent = inv.amount > 0 ? (profit / inv.amount) * 100 : 0;
                                        
                                        return (
                                            <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                        <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${inv.type === 'fixed' ? 'bg-green-500' : inv.type === 'stock' ? 'bg-purple-500' : inv.type === 'fund' ? 'bg-blue-500' : 'bg-gray-500'}`}></span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                        <div>
                                                            <p className="text-sm font-semibold">{inv.name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                                                {inv.rateType === 'CDI' ? `${inv.rateValue}% CDI` : inv.rateType === 'IPCA' ? `IPCA + ${inv.rateValue}%` : `${inv.rateValue}% a.a.`}
                                                            </p>
                                                        </div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                                    {inv.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">
                                                    {isEditing ? (
                                                        <input 
                                                            type="number"
                                                            step="0.01"
                                                            value={editedBalances[inv.id] || ''}
                                                            onChange={(e) => handleInputChange(inv.id, e.target.value)}
                                                            className="w-full text-right px-2 py-1 border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                                        />
                                                    ) : (
                                                        inv.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                    )}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                                                    {parseDateAsUTC(inv.startDate).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                                                    {inv.liquidity || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => onEdit(inv)} className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-full transition-all">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                                        </button>
                                                        <button onClick={() => onDelete(inv.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-all">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
       </div>
    </div>
  );
};

export default InvestmentList;
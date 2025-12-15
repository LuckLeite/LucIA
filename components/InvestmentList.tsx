import React from 'react';
import type { Investment } from '../types';

interface InvestmentListProps {
  investments: Investment[];
  onEdit: (inv: Investment) => void;
  onDelete: (id: string) => void;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const InvestmentList: React.FC<InvestmentListProps> = ({ investments, onEdit, onDelete }) => {
  
  const totalInvested = investments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalBalance = investments.reduce((acc, curr) => acc + curr.currentBalance, 0);
  const totalProfit = totalBalance - totalInvested;
  const totalPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

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
    <div className="space-y-6">
       {/* Cards de Resumo */}
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Aportado</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Atual</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Rentabilidade Geral</p>
                <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {totalProfit >= 0 ? '+' : ''}{totalPercentage.toFixed(2)}%
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                </p>
           </div>
       </div>

       {/* Tabela de Investimentos */}
       <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
           <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">
                       <tr>
                           <th className="px-4 py-4">Nome</th>
                           <th className="px-4 py-4 text-right">Aportado</th>
                           <th className="px-4 py-4 text-right">Saldo</th>
                           <th className="px-4 py-4 text-right">Rentabilidade</th>
                           <th className="px-4 py-4 text-center">Data Aplicação</th>
                           <th className="px-4 py-4 text-center">Resgate</th>
                           <th className="px-4 py-4 text-right">Ações</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                       {investments.map(inv => {
                           const profit = inv.currentBalance - inv.amount;
                           const profitPercent = inv.amount > 0 ? (profit / inv.amount) * 100 : 0;
                           
                           return (
                               <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                   <td className="px-4 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                       <div className="flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${inv.type === 'fixed' ? 'bg-green-500' : inv.type === 'stock' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                            <div>
                                                <p className="text-base">{inv.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                                    {inv.rateType === 'CDI' ? `${inv.rateValue}% CDI` : inv.rateType === 'IPCA' ? `IPCA + ${inv.rateValue}%` : `${inv.rateValue}% a.a.`}
                                                </p>
                                            </div>
                                       </div>
                                   </td>
                                   <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                                       {inv.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                   </td>
                                   <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-gray-100 text-base">
                                       {inv.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                   </td>
                                   <td className={`px-4 py-4 text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                       <div className="flex flex-col items-end">
                                            <span>{profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%</span>
                                            <span className="text-xs font-normal opacity-80">{profit >= 0 ? '+' : ''}{profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                       </div>
                                   </td>
                                   <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                                       {parseDateAsUTC(inv.startDate).toLocaleDateString('pt-BR')}
                                   </td>
                                   <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                                       <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-xs font-medium">
                                        {inv.liquidity || 'N/A'}
                                       </span>
                                   </td>
                                   <td className="px-4 py-4 text-right">
                                       <div className="flex justify-end gap-1">
                                            <button onClick={() => onEdit(inv)} className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-all">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                            </button>
                                            <button onClick={() => onDelete(inv.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
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
    </div>
  );
};

export default InvestmentList;
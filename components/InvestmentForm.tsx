import React, { useState, useEffect, useMemo } from 'react';
import type { Investment, InvestmentType, IndexerType } from '../types';

interface InvestmentFormProps {
  onSubmit: (data: Omit<Investment, 'id'> | Investment) => void;
  investmentToEdit?: Investment | null;
  onCancelEdit: () => void;
}

const parseDateAsUTC = (dateString: string) => new Date(dateString + 'T00:00:00Z');

const InvestmentForm: React.FC<InvestmentFormProps> = ({ onSubmit, investmentToEdit, onCancelEdit }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [type, setType] = useState<InvestmentType>('fixed');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [liquidity, setLiquidity] = useState('');
  const [rateType, setRateType] = useState<IndexerType>('CDI');
  const [rateValue, setRateValue] = useState('');
  
  // Market Premises for Simulation
  const [marketCDI, setMarketCDI] = useState(12.15); // Default CDI Annual
  const [marketIPCA, setMarketIPCA] = useState(4.50); // Default IPCA Annual

  const resetForm = () => {
    setName('');
    setAmount('');
    setCurrentBalance('');
    setType('fixed');
    setStartDate(new Date().toISOString().split('T')[0]);
    setLiquidity('');
    setRateType('CDI');
    setRateValue('100'); // Default 100% CDI
  }

  useEffect(() => {
    if (investmentToEdit) {
      setName(investmentToEdit.name);
      setAmount(String(investmentToEdit.amount));
      setCurrentBalance(String(investmentToEdit.currentBalance));
      setType(investmentToEdit.type);
      setStartDate(parseDateAsUTC(investmentToEdit.startDate).toISOString().split('T')[0]);
      setLiquidity(investmentToEdit.liquidity || '');
      setRateType(investmentToEdit.rateType);
      setRateValue(String(investmentToEdit.rateValue));
    } else {
      resetForm();
    }
  }, [investmentToEdit]);

  // Simulation Logic
  const projectedReturn = useMemo(() => {
      const val = parseFloat(amount);
      const rate = parseFloat(rateValue);
      
      if (isNaN(val) || isNaN(rate) || val <= 0) return null;

      let annualRateDecimal = 0;

      if (rateType === 'PRE') {
          annualRateDecimal = rate / 100;
      } else if (rateType === 'CDI') {
          annualRateDecimal = (rate / 100) * (marketCDI / 100);
      } else if (rateType === 'IPCA') {
          // Approximate: (1 + IPCA) * (1 + Fixed) - 1
          annualRateDecimal = ((1 + marketIPCA/100) * (1 + rate/100)) - 1;
      }

      // Monthly effective rate: (1 + Annual)^(1/12) - 1
      const monthlyRateDecimal = Math.pow(1 + annualRateDecimal, 1/12) - 1;
      const monthlyReturn = val * monthlyRateDecimal;
      const annualReturn = val * annualRateDecimal;

      return {
          monthly: monthlyReturn,
          annual: annualReturn,
          effectiveRate: annualRateDecimal * 100
      };
  }, [amount, rateValue, rateType, marketCDI, marketIPCA]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !startDate || !rateValue) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    
    const finalBalance = currentBalance ? parseFloat(currentBalance) : parseFloat(amount);

    const investmentData = {
      name,
      amount: parseFloat(amount),
      currentBalance: finalBalance,
      type,
      startDate,
      liquidity: liquidity || 'No Vencimento',
      rateType,
      rateValue: parseFloat(rateValue),
      categoryId: 'cat_expense_investment' 
    };

    if (investmentToEdit) {
      onSubmit({ ...investmentData, id: investmentToEdit.id });
    } else {
      onSubmit(investmentData);
      resetForm();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="inv-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome / Título</label>
            <input id="inv-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: CDB Banco X 110%"
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                    <label htmlFor="inv-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor Aportado</label>
                <input type="number" step="0.01" id="inv-amount" value={amount} onChange={e => setAmount(e.target.value)} required 
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
            </div>
                <div>
                    <label htmlFor="inv-balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Saldo Atual (Opcional)</label>
                <input type="number" step="0.01" id="inv-balance" value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} placeholder={amount || "0.00"}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
                {['fixed', 'stock', 'fund'].map(t => (
                    <button 
                        key={t}
                        type="button"
                        onClick={() => setType(t as InvestmentType)}
                        className={`px-3 py-2 text-sm rounded-md border ${type === t ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-slate-700 dark:text-primary-300' : 'bg-white border-gray-300 text-gray-700 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300'}`}
                    >
                        {t === 'fixed' ? 'Renda Fixa' : t === 'stock' ? 'Ações/FIIs' : 'Fundos'}
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-blue-50 dark:bg-slate-900/50 p-4 rounded-md border border-blue-100 dark:border-slate-700 space-y-3">
             <div className="flex items-center justify-between">
                 <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Rentabilidade</p>
                 {/* Market Premises Toggles */}
                 <div className="flex gap-2 text-xs">
                     <div className="flex items-center gap-1">
                         <span className="text-gray-500">CDI Hoje:</span>
                         <input 
                            type="number" 
                            step="0.01" 
                            value={marketCDI} 
                            onChange={e => setMarketCDI(parseFloat(e.target.value))} 
                            className="w-12 p-0.5 text-right bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded"
                         />%
                     </div>
                     <div className="flex items-center gap-1">
                         <span className="text-gray-500">IPCA:</span>
                         <input 
                            type="number" 
                            step="0.01" 
                            value={marketIPCA} 
                            onChange={e => setMarketIPCA(parseFloat(e.target.value))} 
                            className="w-10 p-0.5 text-right bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded"
                         />%
                     </div>
                 </div>
             </div>

             <div className="flex gap-2">
                 <select 
                    value={rateType} 
                    onChange={e => setRateType(e.target.value as IndexerType)}
                    className="w-1/3 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-primary-500"
                 >
                     <option value="CDI">% do CDI</option>
                     <option value="IPCA">IPCA + %</option>
                     <option value="PRE">Pré-fixado %</option>
                 </select>
                 <div className="relative flex-1">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={rateValue} 
                        onChange={e => setRateValue(e.target.value)}
                        placeholder="Taxa"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-primary-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500 dark:text-gray-400 text-sm">%</span>
                 </div>
             </div>

             {/* Dynamic Projection */}
             {projectedReturn && (
                 <div className="mt-2 pt-2 border-t border-blue-100 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">
                     <p>
                         <span className="font-semibold text-primary-600 dark:text-primary-400">Simulação:</span> Com essa taxa, o rendimento estimado é de 
                         <span className="font-bold text-green-600 dark:text-green-400"> +{projectedReturn.monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês</span>.
                     </p>
                     <p className="text-xs text-gray-500 mt-1">
                         Isso equivale a aprox. <strong>{projectedReturn.effectiveRate.toFixed(2)}% ao ano</strong>.
                     </p>
                 </div>
             )}
        </div>

        <div className="grid grid-cols-2 gap-4">
                <div>
                <label htmlFor="inv-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Aplicação</label>
                <input type="date" id="inv-date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
            </div>
            <div>
                <label htmlFor="inv-liquidity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Resgate / Liquidez</label>
                <input type="text" id="inv-liquidity" value={liquidity} onChange={e => setLiquidity(e.target.value)} placeholder="Ex: D+1"
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
            {investmentToEdit && (
                    <button type="button" onClick={onCancelEdit} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500">
                    Cancelar
                </button>
            )}
            <button type="submit" className="flex-grow bg-primary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                {investmentToEdit ? 'Salvar' : 'Adicionar'}
            </button>
        </div>
    </form>
  );
};

export default InvestmentForm;
import React, { useState, useEffect } from 'react';
import type { Investment } from '../types';
import InvestmentList from './InvestmentList';
import InvestmentTypeChart from './charts/InvestmentTypeChart';

interface InvestmentViewProps {
  investments: Investment[];
  onEdit: (inv: Investment) => void;
  onDelete: (id: string) => void;
}

type LayoutMode = 'split' | 'stacked';

const InvestmentView: React.FC<InvestmentViewProps> = ({ investments, onEdit, onDelete }) => {
  const totalBalance = investments.reduce((acc, curr) => acc + curr.currentBalance, 0);
  
  // State for Layout Preferences
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
      const saved = localStorage.getItem('flux_investment_layout');
      return (saved as LayoutMode) || 'split';
  });
  const [showChart, setShowChart] = useState(() => {
      const saved = localStorage.getItem('flux_investment_show_chart');
      return saved !== 'false';
  });
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  // Persist preferences
  useEffect(() => {
      localStorage.setItem('flux_investment_layout', layoutMode);
      localStorage.setItem('flux_investment_show_chart', String(showChart));
  }, [layoutMode, showChart]);

  const toggleLayoutEdit = () => setIsEditingLayout(!isEditingLayout);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      
      {/* Header with Edit Layout Button */}
      <div className="flex justify-end items-center">
          <button 
            onClick={toggleLayoutEdit}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isEditingLayout ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              Editar Layout
          </button>
      </div>

      {/* Layout Editor Controls */}
      {isEditingLayout && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-primary-100 dark:border-slate-600 animate-in slide-in-from-top-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Configuração de Visualização</h4>
              <div className="flex flex-wrap gap-6">
                  {/* Mode Selection */}
                  <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase">Estilo da Grid</p>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => setLayoutMode('split')}
                            className={`px-3 py-2 rounded border text-sm flex items-center gap-2 ${layoutMode === 'split' ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-slate-700 dark:text-primary-300' : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                          >
                              <div className="w-4 h-4 border border-current rounded-sm flex"><div className="w-1/3 border-r border-current bg-current opacity-30"></div></div>
                              Lado a Lado
                          </button>
                          <button 
                            onClick={() => setLayoutMode('stacked')}
                            className={`px-3 py-2 rounded border text-sm flex items-center gap-2 ${layoutMode === 'stacked' ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-slate-700 dark:text-primary-300' : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                          >
                              <div className="w-4 h-4 border border-current rounded-sm flex flex-col"><div className="h-1/3 border-b border-current bg-current opacity-30"></div></div>
                              Expandido
                          </button>
                      </div>
                  </div>

                  {/* Chart Visibility */}
                  <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase">Elementos</p>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                          <input type="checkbox" checked={showChart} onChange={(e) => setShowChart(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
                          Exibir Gráfico
                      </label>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content Grid */}
      <div className={`grid gap-6 ${layoutMode === 'split' && showChart ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
        
        {/* Chart Section (Conditionally Rendered/Positioned) */}
        {showChart && (
            <div className={`${layoutMode === 'split' ? 'lg:col-span-1 lg:order-2' : 'lg:col-span-1 lg:order-1'}`}>
                 <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 ${layoutMode === 'split' ? 'sticky top-24' : ''}`}>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Alocação</h3>
                    <div className="flex justify-between items-end mb-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Investido</p>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <InvestmentTypeChart investments={investments} />
                 </div>
            </div>
        )}

        {/* List Section */}
        <div className={`${layoutMode === 'split' && showChart ? 'lg:col-span-2 lg:order-1' : 'col-span-1 lg:order-2'}`}>
           <InvestmentList 
              investments={investments}
              onEdit={onEdit}
              onDelete={onDelete}
           />
        </div>
      </div>
    </div>
  );
};

export default InvestmentView;
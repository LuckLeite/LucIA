import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Modal from './components/ui/Modal';
import { useFinanceData } from './hooks/useFinanceData';
import type { Theme, Transaction, View, PlannedTransaction, Category, CardTransaction } from './types';
import AllTransactionsModal from './components/AllTransactionsModal';
import PlannedTransactionList from './components/PlannedTransactionList';
import PlannedTransactionForm from './components/PlannedTransactionForm';
import CategoryPieChart from './components/charts/CategoryPieChart';
import ImportModal from './components/ImportCSVModal';
import CardView from './components/CardView';
import SettingsModal from './components/SettingsModal';

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const ImportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 13V3"/><path d="m8 9 4-4 4 4"/><path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0 2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

// Helper function to create a UTC date from a YYYY-MM-DD string
const parseDateAsUTC = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('theme') as Theme) || 'dark');
  const [view, setView] = useState<View>('dashboard');
  const [displayDate, setDisplayDate] = useState(new Date());

  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isAllTransactionsModalOpen, setAllTransactionsModalOpen] = useState(false);
  const [isPlannedFormModalOpen, setPlannedFormModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isBulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | null>(null);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [plannedToEdit, setPlannedToEdit] = useState<PlannedTransaction | null>(null);
  
  const {
    transactions, categories, addTransaction, addMultipleTransactions, updateTransaction, deleteTransaction, 
    getMonthlySummary, deleteMultipleTransactions, updateMultipleTransactionsCategory,
    plannedTransactions, addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction, markPlannedTransactionAsPaid,
    cardTransactions, addCardTransaction, updateCardTransaction, deleteCardTransaction,
    loading, error,
    exportData, importData, clearAllData
  } = useFinanceData();

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const handlePrevMonth = () => setDisplayDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () => setDisplayDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  
  const handleAddTransactionClick = () => { setTransactionToEdit(null); setFormModalOpen(true); };
  const handleEditTransactionClick = (t: Transaction) => { setTransactionToEdit(t); setFormModalOpen(true); };
  const handleDeleteTransactionClick = (id: string) => { setTransactionToDeleteId(id); setConfirmModalOpen(true); };
  
  const handleConfirmDelete = async () => {
    if (transactionToDeleteId) {
      try {
        await deleteTransaction(transactionToDeleteId);
      } catch(e) { console.error(e) }
      setTransactionToDeleteId(null);
      setConfirmModalOpen(false);
    }
  };

  const handleFormSubmit = async (data: Omit<Transaction, 'id'> | Transaction) => {
    try {
      'id' in data ? await updateTransaction(data) : await addTransaction(data);
      setFormModalOpen(false);
    } catch(e) { console.error(e) }
  };
  
  const handleImportSubmit = async (importedTransactions: Omit<Transaction, 'id'>[]) => {
    try {
      await addMultipleTransactions(importedTransactions);
      setImportModalOpen(false);
    } catch(e) { console.error(e) }
  };

  const handleDeleteMultipleClick = (ids: string[]) => {
      setIdsToDelete(ids);
      setBulkConfirmOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
      if (idsToDelete.length > 0) {
        try {
          await deleteMultipleTransactions(idsToDelete);
        } catch(e) { console.error(e) }
      }
      setIdsToDelete([]);
      setBulkConfirmOpen(false);
  };

  const handleUpdateCategoryMultiple = async (ids: string[], categoryId: string) => {
    try {
      await updateMultipleTransactionsCategory(ids, categoryId);
    } catch(e) { console.error(e) }
  };

  const handleAddPlannedClick = () => { setPlannedToEdit(null); setPlannedFormModalOpen(true); };
  const handleEditPlannedClick = (pt: PlannedTransaction) => { setPlannedToEdit(pt); setPlannedFormModalOpen(true); };
  
  const handlePlannedFormSubmit = async (data: { transaction: Omit<PlannedTransaction, 'id' | 'status'> | PlannedTransaction, recurrenceCount: number }) => {
    const { transaction, recurrenceCount } = data;
    try {
      if ('id' in transaction) {
          await updatePlannedTransaction(transaction as PlannedTransaction);
      } else {
          await addPlannedTransaction(transaction as Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount);
      }
      setPlannedFormModalOpen(false);
    } catch(e) { console.error(e) }
  };

  const monthlySummary = useMemo(() => getMonthlySummary(displayDate), [getMonthlySummary, displayDate]);
  
  const monthPrefix = useMemo(() => displayDate.toISOString().slice(0, 7), [displayDate]); // "YYYY-MM"

  const filteredTransactions = useMemo(() => transactions.filter(tx => tx.date.startsWith(monthPrefix)), [transactions, monthPrefix]);

  const filteredPlannedTransactions = useMemo(() => plannedTransactions.filter(pt => pt.dueDate.startsWith(monthPrefix)), [plannedTransactions, monthPrefix]);

   const cardInvoiceTransactions = useMemo<PlannedTransaction[]>(() => {
    const invoicesByCard = new Map<string, number>();
    const currentYear = displayDate.getFullYear();
    const currentMonth = displayDate.getMonth();

    cardTransactions.forEach(cardTx => {
      const monthlyPayment = cardTx.totalAmount / cardTx.installments;
      const purchaseDate = parseDateAsUTC(cardTx.purchaseDate);

      for (let i = 1; i <= cardTx.installments; i++) {
        const dueDate = new Date(purchaseDate);
        dueDate.setUTCMonth(purchaseDate.getUTCMonth() + i);
        if (dueDate.getUTCFullYear() === currentYear && dueDate.getUTCMonth() === currentMonth) {
          invoicesByCard.set(cardTx.card, (invoicesByCard.get(cardTx.card) || 0) + monthlyPayment);
        }
      }
    });

    const invoiceDueDate = new Date(Date.UTC(currentYear, currentMonth, 10)).toISOString().split('T')[0];

    return Array.from(invoicesByCard.entries()).map(([cardName, totalAmount]) => ({
      id: `card_invoice_${cardName}_${currentYear}_${currentMonth}`,
      amount: totalAmount,
      type: 'expense',
      categoryId: 'cat_expense_card',
      description: `Fatura Cartão ${cardName}`,
      dueDate: invoiceDueDate,
      status: 'pending',
      isGenerated: true,
    }));
  }, [cardTransactions, displayDate]);

  const combinedPlannedTransactions = useMemo(() => 
    [...filteredPlannedTransactions, ...cardInvoiceTransactions]
    .sort((a,b) => a.dueDate.localeCompare(b.dueDate)),
  [filteredPlannedTransactions, cardInvoiceTransactions]);

  const balanceChartData = useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(displayDate.getFullYear(), displayDate.getMonth(), 1));
    
    const balanceAtStartOfMonth = transactions
        .filter(tx => parseDateAsUTC(tx.date) < firstDayOfMonth)
        .reduce((acc, tx) => tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0);
        
    const dailyChanges = new Map<number, number>();

    filteredTransactions.forEach(tx => {
        const day = parseDateAsUTC(tx.date).getUTCDate();
        const change = tx.type === 'income' ? tx.amount : -tx.amount;
        dailyChanges.set(day, (dailyChanges.get(day) || 0) + change);
    });
    
    combinedPlannedTransactions.filter(pt => pt.status === 'pending').forEach(pt => {
        const day = parseDateAsUTC(pt.dueDate).getUTCDate();
        const change = pt.type === 'income' ? pt.amount : -pt.amount;
        dailyChanges.set(day, (dailyChanges.get(day) || 0) + change);
    });

    const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();
    const fullChartData: { date: string; balance: number }[] = [];
    let runningBalance = balanceAtStartOfMonth;

    for (let day = 1; day <= daysInMonth; day++) {
        runningBalance += dailyChanges.get(day) || 0;
        fullChartData.push({ date: `${String(day).padStart(2, '0')}`, balance: runningBalance });
    }

    if (fullChartData.length <= 12) return fullChartData;

    const displayData: { date: string; balance: number }[] = [fullChartData[0]];
    const step = Math.floor((fullChartData.length - 2) / 10);
    for (let i = 1 + step; i < fullChartData.length - 1; i += step) {
        displayData.push(fullChartData[i]);
    }
    displayData.push(fullChartData[fullChartData.length - 1]);
    
    return displayData;
  }, [transactions, filteredTransactions, combinedPlannedTransactions, displayDate]);

  const pieChartData = useMemo(() => {
    const expenseByCategory = new Map<string, { name: string; value: number; color: string }>();
    const categoryMap = new Map(categories.map((c: Category) => [c.id, c]));
    filteredTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            const category = categoryMap.get(t.categoryId);
            if (category) {
                const existing = expenseByCategory.get(category.id) || { name: category.name, value: 0, color: category.color };
                existing.value += t.amount;
                expenseByCategory.set(category.id, existing);
            }
        });
    return Array.from(expenseByCategory.values());
  }, [filteredTransactions, categories]);

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
            <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 transition-colors duration-300 flex flex-col">
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">LucIA - Finance tracker</h1>
            <nav className="hidden sm:flex items-center gap-4">
                <button onClick={() => setView('dashboard')} className={`font-semibold px-3 py-1 rounded-md ${view === 'dashboard' ? 'text-primary-600 bg-primary-100 dark:text-primary-300 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>Dashboard</button>
                <button onClick={() => setView('planned')} className={`font-semibold px-3 py-1 rounded-md ${view === 'planned' ? 'text-primary-600 bg-primary-100 dark:text-primary-300 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>Planejados</button>
                <button onClick={() => setView('cards')} className={`font-semibold px-3 py-1 rounded-md ${view === 'cards' ? 'text-primary-600 bg-primary-100 dark:text-primary-300 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>Cartões</button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
             {view !== 'cards' && (
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Mês anterior"><ChevronLeftIcon /></button>
                    <span className="w-36 text-center capitalize">{displayDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Próximo mês"><ChevronRightIcon /></button>
                </div>
             )}
             <button onClick={() => setImportModalOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Importar Extrato"><ImportIcon /></button>
             <button onClick={() => setSettingsModalOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Configurações"><SettingsIcon /></button>
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Mudar tema">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</button>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto pb-10 w-full flex-grow">
        {error && (
            <div className="m-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="font-bold">Aviso:</p>
                <p className="text-sm break-words">{error}</p>
            </div>
        )}
        {view === 'dashboard' && (
            <>
                <Dashboard 
                    categories={categories}
                    monthlyIncome={monthlySummary.income}
                    monthlyExpense={monthlySummary.expense}
                    monthlyPlannedExpense={monthlySummary.plannedExpense}
                    monthlyPlannedIncome={monthlySummary.plannedIncome}
                    balanceChartData={balanceChartData}
                />
                <TransactionList 
                  transactions={filteredTransactions.slice(0, 5)} 
                  categories={categories}
                  onEdit={handleEditTransactionClick}
                  onDelete={handleDeleteTransactionClick}
                  onViewAll={() => setAllTransactionsModalOpen(true)}
                />
                <div className="p-4 sm:p-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Despesas por Categoria</h3>
                        <CategoryPieChart data={pieChartData} />
                    </div>
                </div>
            </>
        )}
        {view === 'planned' && (
            <PlannedTransactionList
                plannedTransactions={combinedPlannedTransactions}
                categories={categories}
                onAdd={handleAddPlannedClick}
                onEdit={handleEditPlannedClick}
                onDelete={deletePlannedTransaction}
                onMarkAsPaid={markPlannedTransactionAsPaid}
            />
        )}
        {view === 'cards' && (
            <CardView 
                transactions={cardTransactions}
                onAdd={addCardTransaction}
                onUpdate={updateCardTransaction}
                onDelete={deleteCardTransaction}
            />
        )}
      </main>

      <footer className="w-full text-center p-4 text-sm text-gray-500 dark:text-gray-400">
          Developed By Lucas Leite 🥛
      </footer>
        
      {view !== 'cards' && (
        <div className="fixed bottom-6 right-6 z-30">
            <button onClick={view === 'dashboard' ? handleAddTransactionClick : handleAddPlannedClick} className="bg-primary-600 text-white font-semibold py-3 px-4 rounded-full shadow-lg hover:bg-primary-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span className="hidden sm:inline">{view === 'dashboard' ? 'Nova Transação' : 'Novo Planejado'}</span>
            </button>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)}
        exportData={exportData}
        importData={importData}
        clearAllData={clearAllData}
      />

      <Modal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} title={transactionToEdit ? 'Editar Transação' : 'Nova Transação'}>
        <TransactionForm onSubmit={handleFormSubmit} transactionToEdit={transactionToEdit} categories={categories} />
      </Modal>

      <Modal isOpen={isPlannedFormModalOpen} onClose={() => setPlannedFormModalOpen(false)} title={plannedToEdit ? 'Editar Planejamento' : 'Novo Planejamento'}>
        <PlannedTransactionForm onSubmit={handlePlannedFormSubmit} transactionToEdit={plannedToEdit} categories={categories} />
      </Modal>

      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSubmit={handleImportSubmit}
      />

      <AllTransactionsModal
        isOpen={isAllTransactionsModalOpen}
        onClose={() => setAllTransactionsModalOpen(false)}
        transactions={filteredTransactions}
        categories={categories}
        onEdit={handleEditTransactionClick}
        onDelete={handleDeleteTransactionClick}
        onDeleteMultiple={handleDeleteMultipleClick}
        onUpdateCategoryMultiple={handleUpdateCategoryMultiple}
      />

      <Modal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="Confirmar Exclusão">
        <div className="text-gray-700 dark:text-gray-300">
          <p>Deseja realmente apagar esta transação? Esta ação não poderá ser desfeita.</p>
          <div className="flex justify-end gap-4 mt-6">
            <button onClick={() => setConfirmModalOpen(false)} className="py-2 px-4 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600">Cancelar</button>
            <button onClick={handleConfirmDelete} className="py-2 px-4 rounded-md bg-red-600 text-white hover:bg-red-700">Apagar</button>
          </div>
        </div>
      </Modal>

       <Modal isOpen={isBulkConfirmOpen} onClose={() => setBulkConfirmOpen(false)} title="Confirmar Exclusão Múltipla">
            <div className="text-gray-700 dark:text-gray-300">
                <p>Deseja realmente apagar as {idsToDelete.length} transações selecionadas? Esta ação não poderá ser desfeita.</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setBulkConfirmOpen(false)} className="py-2 px-4 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600">Cancelar</button>
                    <button onClick={handleConfirmBulkDelete} className="py-2 px-4 rounded-md bg-red-600 text-white hover:bg-red-700">Apagar</button>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default App;
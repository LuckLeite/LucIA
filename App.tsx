
import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Modal from './components/ui/Modal';
import { useFinanceData } from './hooks/useFinanceData';
import { supabase } from './lib/supabaseClient';
import Auth from './components/Auth';
import type { Theme, Transaction, View, PlannedTransaction, Category, CardTransaction, Investment } from './types';
import AllTransactionsModal from './components/AllTransactionsModal';
import PlannedTransactionList from './components/PlannedTransactionList';
import PlannedTransactionForm from './components/PlannedTransactionForm';
import CategoryPieChart from './components/charts/CategoryPieChart';
import ImportModal from './components/ImportCSVModal';
import CardView from './components/CardView';
import SettingsModal from './components/SettingsModal';
import CategoryList from './components/CategoryList';
import CategoryForm from './components/CategoryForm';
import InvestmentView from './components/InvestmentView';
import InvestmentForm from './components/InvestmentForm';
import FloatingCalculator from './components/FloatingCalculator';
import AIChat from './components/AIChat';

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const ImportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 13V3"/><path d="m8 9 4-4 4 4"/><path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1-2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('theme') as Theme) || 'dark');
  const [view, setView] = useState<View>('dashboard');
  const [displayDate, setDisplayDate] = useState(new Date());

  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isAllTransactionsModalOpen, setAllTransactionsModalOpen] = useState(false);
  const [isPlannedFormModalOpen, setPlannedFormModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isCategoryFormOpen, setCategoryFormOpen] = useState(false);
  const [isInvestmentFormOpen, setInvestmentFormOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | null>(null);
  const [plannedToEdit, setPlannedToEdit] = useState<PlannedTransaction | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [investmentToEdit, setInvestmentToEdit] = useState<Investment | null>(null);
  
  const [isPlannedDeleteModalOpen, setPlannedDeleteModalOpen] = useState(false);
  const [isPlannedEditCascadeModalOpen, setPlannedEditCascadeModalOpen] = useState(false);
  const [plannedDeletionTarget, setPlannedDeletionTarget] = useState<PlannedTransaction | null>(null);
  const [plannedEditTarget, setPlannedEditTarget] = useState<PlannedTransaction | null>(null);
  const [hasFutureMatches, setHasFutureMatches] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const {
    transactions, categories, addTransaction, duplicateTransaction, addMultipleTransactions, updateTransaction, deleteTransaction, 
    getMonthlySummary, deleteMultipleTransactions, updateMultipleTransactionsCategory, getGeneratedMovementForMonth,
    plannedTransactions, generatedCardInvoices, generatedTithing, addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction, duplicatePlannedTransaction, markPlannedTransactionAsPaid, unmarkPlannedTransactionAsPaid,
    cardTransactions, cardRegistries, addCardTransaction, updateCardTransaction, deleteCardTransaction, addCardRegistry, updateCardRegistry, deleteCardRegistry,
    investments, addInvestment, updateInvestment, deleteInvestment,
    addCategory, updateCategory, deleteCategory, updateCategoryOrder,
    loading, error, totalBalance,
    exportData, importData, clearAllData, settings, updateSettings
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
      try { await deleteTransaction(transactionToDeleteId); } catch(e) { console.error(e) }
      setTransactionToDeleteId(null); setConfirmModalOpen(false);
    }
  };

  const handleFormSubmit = async (data: Omit<Transaction, 'id'> | Transaction) => {
    try { 'id' in data ? await updateTransaction(data as Transaction) : await addTransaction(data); setFormModalOpen(false); } catch(e) { console.error(e) }
  };
  
  const handleImportSubmit = async (importedTransactions: Omit<Transaction, 'id'>[]) => {
    try { await addMultipleTransactions(importedTransactions); setImportModalOpen(false); } catch(e) { console.error(e) }
  };

  const handleUpdateCategoryMultiple = async (ids: string[], categoryId: string) => {
    try { await updateMultipleTransactionsCategory(ids, categoryId); } catch(e) { console.error(e) }
  };

  const handleAddPlannedClick = () => { setPlannedToEdit(null); setPlannedFormModalOpen(true); };
  const handleEditPlannedClick = (pt: PlannedTransaction) => { setPlannedToEdit(pt); setPlannedFormModalOpen(true); };
  
  const handleRequestDeletePlanned = (id: string) => {
    const target = plannedTransactions.find(t => t.id === id);
    if (!target) { deletePlannedTransaction(id); return; }
    setPlannedDeletionTarget(target);
    
    const futures = plannedTransactions.filter(t => {
        const isMatch = target.recurrence_id 
            ? t.recurrence_id === target.recurrence_id 
            : (t.description === target.description && t.categoryId === target.categoryId);

        return t.id !== target.id && isMatch && t.dueDate > target.dueDate;
    });

    setHasFutureMatches(futures.length > 0); 
    setPlannedDeleteModalOpen(true);
  };

  const handleConfirmDeletePlanned = async (deleteFuture: boolean) => {
      if (plannedDeletionTarget) {
          try { await deletePlannedTransaction(plannedDeletionTarget.id, deleteFuture); } catch(e) { console.error(e) }
          setPlannedDeleteModalOpen(false); setPlannedDeletionTarget(null);
      }
  };

  const handlePlannedFormSubmit = async (data: { transaction: Omit<PlannedTransaction, 'id' | 'status'> | PlannedTransaction, recurrenceCount: number }) => {
    const { transaction, recurrenceCount } = data;
    try {
      if ('id' in transaction) { 
        await updatePlannedTransaction(transaction as PlannedTransaction, false);
        setPlannedFormModalOpen(false);
      } 
      else { 
        await addPlannedTransaction(transaction as Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount); 
        setPlannedFormModalOpen(false);
      }
    } catch(e) { console.error(e) }
  };

  const handleConfirmEditPlanned = async (updateFuture: boolean) => {
      if (plannedEditTarget) {
          await updatePlannedTransaction(plannedEditTarget, updateFuture);
          setPlannedEditCascadeModalOpen(false);
          setPlannedEditTarget(null);
          setPlannedFormModalOpen(false);
      }
  };

  const handleAddCategoryClick = (type: 'income' | 'expense') => {
      setCategoryToEdit(null); setCategoryFormOpen(true);
  };

  const handleEditCategoryClick = (c: Category) => { setCategoryToEdit(c); setCategoryFormOpen(true); };
  const handleCategorySubmit = (data: Omit<Category, 'id'> | Category) => {
    if ('id' in data) updateCategory(data as Category); else addCategory(data);
    setCategoryFormOpen(false);
  };

  const handleAddInvestmentClick = () => { setInvestmentToEdit(null); setInvestmentFormOpen(true); };
  const handleEditInvestmentClick = (inv: Investment) => { setInvestmentToEdit(inv); setInvestmentFormOpen(true); };
  const handleInvestmentSubmit = (data: Omit<Investment, 'id'> | Investment) => {
      if ('id' in data) updateInvestment(data as Investment); else addInvestment(data);
      setInvestmentFormOpen(false);
  };
  
  const handleBulkInvestmentUpdate = async (updates: { id: string, currentBalance: number }[]) => {
     try {
         for (const update of updates) {
             const original = investments.find(i => i.id === update.id);
             if (original) await updateInvestment({ ...original, currentBalance: update.currentBalance });
         }
     } catch(e) { console.error(e); }
  };

  const handleInvestmentDelete = (id: string) => { if (window.confirm("Deseja apagar este investimento?")) deleteInvestment(id); };

  const monthPrefix = useMemo(() => {
    return `${displayDate.getFullYear()}-${String(displayDate.getMonth() + 1).padStart(2, '0')}`;
  }, [displayDate]);

  const filteredTransactions = useMemo(() => transactions.filter(tx => tx.date.startsWith(monthPrefix)), [transactions, monthPrefix]);
  
  const filteredPlannedTransactions = useMemo(() => 
    plannedTransactions.filter(pt => 
        pt.dueDate.startsWith(monthPrefix) && 
        !pt.isGenerated && 
        !pt.group_name?.startsWith('AUTO_')
    ), 
  [plannedTransactions, monthPrefix]);

  const filteredCardInvoices = useMemo(() => generatedCardInvoices.filter(pt => pt.dueDate.startsWith(monthPrefix)), [generatedCardInvoices, monthPrefix]);
  const filteredTithing = useMemo(() => generatedTithing.filter(pt => pt.dueDate.startsWith(monthPrefix)), [generatedTithing, monthPrefix]);
  const filteredMovement = useMemo(() => getGeneratedMovementForMonth(monthPrefix), [getGeneratedMovementForMonth, monthPrefix]);

  const combinedPlannedTransactions = useMemo(() => {
      const todayISO = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().split('T')[0];

      const baseList = [...filteredPlannedTransactions, ...filteredCardInvoices, ...filteredTithing, ...filteredMovement];
      
      return baseList.map(pt => {
          let finalPt = { ...pt } as PlannedTransaction;
          if (finalPt.status === 'pending' && finalPt.dueDate < todayISO) {
              finalPt.dueDate = tomorrowISO;
          }
          if (finalPt.is_budget_goal && finalPt.status === 'pending') {
              const spentInCategory = filteredTransactions
                  .filter(t => t.categoryId === finalPt.categoryId && t.type === finalPt.type)
                  .reduce((acc, curr) => acc + curr.amount, 0);
              const remaining = Math.max(0, finalPt.amount - spentInCategory);
              finalPt.amount = remaining;
          }
          return finalPt;
      }).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  }, [filteredPlannedTransactions, filteredCardInvoices, filteredTithing, filteredMovement, filteredTransactions]);

  const currentMonthRealizedBalance = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    return transactions
        .filter(tx => tx.date <= todayISO)
        .reduce((sum, tx) => (tx.type === 'income' ? sum + tx.amount : sum - tx.amount), 0);
  }, [transactions]);

  const balanceChartData = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const firstDayOfMonthISO = `${monthPrefix}-01`;
    
    const startBalance = transactions
        .filter(tx => tx.date < firstDayOfMonthISO)
        .reduce((acc, tx) => tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0);

    const dailyRealChanges = new Map<number, number>();
    filteredTransactions.forEach(tx => {
        const day = parseInt(tx.date.split('-')[2], 10);
        const change = tx.type === 'income' ? tx.amount : -tx.amount;
        dailyRealChanges.set(day, (dailyRealChanges.get(day) || 0) + change);
    });

    const dailyProjectedChanges = new Map<number, number>();
    combinedPlannedTransactions
        .filter(pt => pt.status === 'pending')
        .forEach(pt => {
            const day = parseInt(pt.dueDate.split('-')[2], 10);
            const change = pt.type === 'income' ? pt.amount : -pt.amount;
            dailyProjectedChanges.set(day, (dailyProjectedChanges.get(day) || 0) + change);
        });

    const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();
    const fullChartData = [];
    let runningBalance = startBalance;

    for (let day = 1; day <= daysInMonth; day++) {
        const dayISO = `${monthPrefix}-${String(day).padStart(2, '0')}`;
        
        if (dayISO <= todayISO) {
            runningBalance += dailyRealChanges.get(day) || 0;
        } else {
            runningBalance += dailyProjectedChanges.get(day) || 0;
        }
        
        fullChartData.push({ date: `${String(day).padStart(2, '0')}`, balance: runningBalance });
    }

    return fullChartData;
  }, [transactions, filteredTransactions, combinedPlannedTransactions, monthPrefix, displayDate]);

  const pieChartData = useMemo(() => {
    const expenseByCategory = new Map<string, { name: string; value: number; color: string }>();
    const categoryMap = new Map<string, Category>(categories.map((c: Category) => [c.id, c]));
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
            const category = categoryMap.get(t.categoryId);
            if (category) {
                const existing = expenseByCategory.get(category.id) || { name: category.name, value: 0, color: category.color };
                existing.value += t.amount; expenseByCategory.set(category.id, existing);
            }
        });
    return Array.from(expenseByCategory.values());
  }, [filteredTransactions, categories]);

  const uniquePlannedGroups = useMemo(() => {
    const groups = new Set<string>();
    plannedTransactions.forEach(t => {
        const name = t.group_name || 'Geral';
        if (!name.startsWith('AUTO_')) groups.add(name);
    });
    return Array.from(groups).sort();
  }, [plannedTransactions]);

  if (!supabase || !session) return <Auth />;
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900"><div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  const handleLogout = async () => { if (supabase) await supabase.auth.signOut(); setSession(null); window.location.reload(); };

  const plannedIncomeSum = combinedPlannedTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
  const plannedExpenseSum = combinedPlannedTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 transition-colors duration-300 flex flex-col">
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">Flux</h1>
            <nav className="hidden md:flex items-center gap-2">
                <button onClick={() => setView('dashboard')} className={`font-semibold px-3 py-1 rounded-md text-sm transition-colors ${view === 'dashboard' ? 'text-primary-600 bg-primary-100 dark:text-primary-300 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>Dashboard</button>
                <button onClick={() => setView('planned')} className={`font-semibold px-3 py-1 rounded-md text-sm transition-colors ${view === 'planned' ? 'text-primary-600 bg-primary-100 dark:text-primary-300 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>Planejados</button>
                <button onClick={() => setView('cards')} className={`font-semibold px-3 py-1 rounded-md text-sm transition-colors ${view === 'cards' ? 'text-primary-600 bg-primary-100 dark:text-primary-300 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>Cartões</button>
                <button onClick={() => setView('investments')} className={`font-semibold px-3 py-1 rounded-md text-sm transition-colors ${view === 'investments' ? 'text-primary-600 bg-primary-100 dark:text-primary-300 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>Investimentos</button>
                <button onClick={() => setView('categories')} className={`font-semibold px-3 py-1 rounded-md text-sm transition-colors ${view === 'categories' ? 'text-primary-600 bg-primary-100 dark:text-primary-300 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>Categorias</button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
             {view !== 'categories' && view !== 'investments' && (
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronLeftIcon /></button>
                    <span className="w-32 text-center capitalize text-sm sm:text-base">{displayDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronRightIcon /></button>
                </div>
             )}
             <button onClick={() => setImportModalOpen(true)} title="Importar Extrato" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"><ImportIcon /></button>
             <button onClick={() => setSettingsModalOpen(true)} title="Configurações" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"><SettingsIcon /></button>
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</button>
             <button onClick={handleLogout} className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><LogoutIcon /></button>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto pb-20 w-full flex-grow">
        {error && <div className="m-4 p-4 bg-red-100 text-red-700 border rounded-lg">{error}</div>}
        {view === 'dashboard' && (
            <>
                <Dashboard 
                    categories={categories}
                    monthlyIncome={getMonthlySummary(displayDate).income}
                    monthlyExpense={getMonthlySummary(displayDate).expense}
                    monthlyPlannedExpense={plannedExpenseSum}
                    monthlyPlannedIncome={plannedIncomeSum}
                    balanceChartData={balanceChartData}
                    currentBalance={currentMonthRealizedBalance}
                />
                <TransactionList transactions={filteredTransactions.slice(0, 5)} categories={categories} onEdit={handleEditTransactionClick} onDelete={handleDeleteTransactionClick} onDuplicate={duplicateTransaction} onViewAll={() => setAllTransactionsModalOpen(true)} />
                <div className="p-4 sm:p-6"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md"><h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Despesas por Categoria</h3><CategoryPieChart data={pieChartData} /></div></div>
            </>
        )}
        {view === 'planned' && <PlannedTransactionList plannedTransactions={combinedPlannedTransactions} categories={categories} onAdd={handleAddPlannedClick} onEdit={handleEditPlannedClick} onDelete={handleRequestDeletePlanned} onDuplicate={duplicatePlannedTransaction} onMarkAsPaid={markPlannedTransactionAsPaid} onUnmarkAsPaid={unmarkPlannedTransactionAsPaid} drawersOpenDefault={settings.plannedDrawersOpenDefault} />}
        {view === 'cards' && (
            <CardView 
                transactions={cardTransactions} 
                registries={cardRegistries}
                displayDate={displayDate}
                onAdd={addCardTransaction} 
                onUpdate={updateCardTransaction} 
                onDelete={deleteCardTransaction} 
                onAddRegistry={addCardRegistry}
                onUpdateRegistry={updateCardRegistry}
                onDeleteRegistry={deleteCardRegistry}
            />
        )}
        {view === 'investments' && <InvestmentView investments={investments} onEdit={handleEditInvestmentClick} onDelete={handleInvestmentDelete} onBulkUpdate={handleBulkInvestmentUpdate} />}
        {view === 'categories' && <CategoryList categories={categories} onEdit={handleEditCategoryClick} onDelete={deleteCategory} onAdd={handleAddCategoryClick} onReorder={updateCategoryOrder} />}
      </main>
      <footer className="w-full text-center p-4 text-sm text-gray-500 dark:text-gray-400">Developed By Lucas Leite 🥛</footer>
      
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3">
        {/* IA Chat Button */}
        <button 
            onClick={() => setIsAIChatOpen(!isAIChatOpen)} 
            className={`p-3 rounded-full shadow-lg transition-all flex items-center justify-center hover:scale-110 active:scale-95 bg-gradient-to-br from-primary-500 to-primary-700 text-white`}
            title="Assistente Flux IA"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
        </button>

        {/* Action Button */}
        <button onClick={() => {
            if (view === 'dashboard') handleAddTransactionClick();
            else if (view === 'planned') handleAddPlannedClick();
            else if (view === 'investments') handleAddInvestmentClick();
        }} className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 font-semibold py-3 px-4 rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-100 flex items-center gap-2 transition-transform hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>

      <FloatingCalculator />
      <AIChat 
        isOpen={isAIChatOpen} 
        onClose={() => setIsAIChatOpen(false)} 
        transactions={filteredTransactions} 
        categories={categories} 
        addTransaction={addTransaction}
        currentBalance={currentMonthRealizedBalance}
        currentMonthName={displayDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      />

      <AllTransactionsModal isOpen={isAllTransactionsModalOpen} onClose={() => setAllTransactionsModalOpen(false)} transactions={filteredTransactions} categories={categories} onEdit={handleEditTransactionClick} onDelete={handleDeleteTransactionClick} onDuplicate={duplicateTransaction} onDeleteMultiple={deleteMultipleTransactions} onUpdateCategoryMultiple={handleUpdateCategoryMultiple} />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} onSubmit={handleImportSubmit} categories={categories} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} exportData={exportData} importData={importData} clearAllData={clearAllData} settings={settings} updateSettings={updateSettings} />
      <Modal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} title={transactionToEdit ? 'Editar Transação' : 'Nova Transação'}><TransactionForm onSubmit={handleFormSubmit} transactionToEdit={transactionToEdit} categories={categories} /></Modal>
      <Modal isOpen={isPlannedFormModalOpen} onClose={() => setPlannedFormModalOpen(false)} title={plannedToEdit ? 'Editar Planejamento' : 'Novo Planejamento'}><PlannedTransactionForm onSubmit={handlePlannedFormSubmit} transactionToEdit={plannedToEdit} categories={categories} existingGroups={uniquePlannedGroups} /></Modal>
      <Modal isOpen={isCategoryFormOpen} onClose={() => setCategoryFormOpen(false)} title={categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}><CategoryForm onSubmit={handleCategorySubmit} categoryToEdit={categoryToEdit} /></Modal>
      <Modal isOpen={isInvestmentFormOpen} onClose={() => setInvestmentFormOpen(false)} title={investmentToEdit ? 'Editar Investimento' : 'Novo Investimento'}><InvestmentForm onSubmit={handleInvestmentSubmit} investmentToEdit={investmentToEdit} onCancelEdit={() => setInvestmentFormOpen(false)} /></Modal>
      
      <Modal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="Confirmar Exclusão">
          <div className="text-center p-4">
              <p className="mb-6 text-gray-700 dark:text-gray-300">Deseja realmente apagar esta transação?</p>
              <div className="flex justify-center gap-4">
                  <button onClick={() => setConfirmModalOpen(false)} className="py-2 px-6 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 font-semibold transition-colors">Não</button>
                  <button onClick={handleConfirmDelete} className="py-2 px-6 rounded-md bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors">Sim</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isPlannedDeleteModalOpen} onClose={() => setPlannedDeleteModalOpen(false)} title="Excluir Planejamento">
          <div className="text-center p-4">
              <p className="mb-6 text-gray-700 dark:text-gray-300">Como deseja excluir este item planejado?</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button onClick={() => setPlannedDeleteModalOpen(false)} className="py-2 px-6 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-md font-semibold transition-colors order-last sm:order-first">Voltar</button>
                  <button onClick={() => handleConfirmDeletePlanned(false)} className="py-2 px-6 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md font-semibold transition-colors">Apenas este</button>
                  {hasFutureMatches && <button onClick={() => handleConfirmDeletePlanned(true)} className="py-2 px-6 bg-red-600 text-white hover:bg-red-700 rounded-md font-semibold transition-colors">Este e futuros</button>}
              </div>
          </div>
      </Modal>

      <Modal isOpen={isPlannedEditCascadeModalOpen} onClose={() => setPlannedEditCascadeModalOpen(false)} title="Editar Planejamento">
          <div className="text-center p-4">
              <p className="mb-6 text-gray-700 dark:text-gray-300">Este planejamento possui repetições nos meses seguintes. Deseja aplicar as alterações neles também?</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button onClick={() => setPlannedEditCascadeModalOpen(false)} className="py-2 px-6 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-md font-semibold transition-colors order-last sm:order-first">Voltar</button>
                  <button onClick={() => handleConfirmEditPlanned(false)} className="py-2 px-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-md font-semibold transition-colors">Apenas este</button>
                  <button onClick={() => handleConfirmEditPlanned(true)} className="py-2 px-6 bg-primary-600 text-white hover:bg-primary-700 rounded-md font-semibold transition-colors">Este e futuros</button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default App;

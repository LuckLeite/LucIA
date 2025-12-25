
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Transaction, PlannedTransaction, CardTransaction, Category, AppSettings, Investment } from '../types';
import { INITIAL_CATEGORIES } from '../constants';

// Helper to generate IDs
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Helper for UTC dates
const parseDateAsUTC = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const STORAGE_KEYS = {
    TRANSACTIONS: 'lucia_transactions',
    PLANNED: 'lucia_planned_transactions',
    CARDS: 'lucia_card_transactions',
    CATEGORIES: 'lucia_categories',
    SETTINGS: 'lucia_settings',
    INVESTMENTS: 'lucia_investments'
};

const DEFAULT_SETTINGS: AppSettings = {
    calculateTithing: true,
};

const MOVEMENT_BALANCE_DESC = 'Saldo Acumulado Movimento';

export const useFinanceData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load data from LocalStorage
    useEffect(() => {
        try {
            const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
            const storedPlanned = localStorage.getItem(STORAGE_KEYS.PLANNED);
            const storedCards = localStorage.getItem(STORAGE_KEYS.CARDS);
            const storedInvestments = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
            const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
            const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

            if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
            if (storedPlanned) setPlannedTransactions(JSON.parse(storedPlanned));
            if (storedCards) setCardTransactions(JSON.parse(storedCards));
            if (storedInvestments) setInvestments(JSON.parse(storedInvestments));
            
            if (storedCategories) {
                const loadedCategories = JSON.parse(storedCategories) as Category[];
                const migratedCategories = loadedCategories.map(cat => {
                    if (cat.includeInTithing !== undefined) return cat;
                    const defaultCat = INITIAL_CATEGORIES.find(d => d.id === cat.id);
                    return { ...cat, includeInTithing: defaultCat ? defaultCat.includeInTithing : true };
                });
                setCategories(migratedCategories);
            } else {
                setCategories(INITIAL_CATEGORIES);
            }

            if (storedSettings) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
            }
        } catch (err) {
            console.error("Failed to load data from local storage", err);
            setError("Falha ao carregar dados locais.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Persistence Helpers
    const saveTransactions = (data: Transaction[]) => {
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sorted);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(sorted));
    };

    const savePlanned = (data: PlannedTransaction[]) => {
        const sorted = [...data].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setPlannedTransactions(sorted);
        localStorage.setItem(STORAGE_KEYS.PLANNED, JSON.stringify(sorted));
    };

    const saveCards = (data: CardTransaction[]) => {
        const sorted = [...data].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        setCardTransactions(sorted);
        localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(sorted));
    };

    const saveInvestments = (data: Investment[]) => {
        const sorted = [...data].sort((a, b) => b.amount - a.amount);
        setInvestments(sorted);
        localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(sorted));
    };

    const saveCategories = (data: Category[]) => {
        setCategories(data);
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data));
    };

    const updateSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    };

    // --- Dynamic Card Invoices Generation ---
    const generatedCardInvoices = useMemo(() => {
        const invoices: PlannedTransaction[] = [];
        const invoicesByCardAndMonth = new Map<string, number>();
        
        cardTransactions.forEach(cardTx => {
            const monthlyPayment = cardTx.totalAmount / cardTx.installments;
            const purchaseDate = parseDateAsUTC(cardTx.purchaseDate);

            for (let i = 1; i <= cardTx.installments; i++) {
                const dueDate = new Date(purchaseDate);
                dueDate.setUTCMonth(purchaseDate.getUTCMonth() + i);
                dueDate.setUTCDate(10);
                
                const key = `${cardTx.card}_${dueDate.getUTCFullYear()}_${dueDate.getUTCMonth()}`;
                const current = invoicesByCardAndMonth.get(key) || 0;
                invoicesByCardAndMonth.set(key, current + monthlyPayment);
            }
        });

        invoicesByCardAndMonth.forEach((amount, key) => {
            const [cardName, yearStr, monthStr] = key.split('_');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            const id = `card_invoice_${key}`;
            const overridden = plannedTransactions.some(pt => pt.id === id);
            if (overridden) return;

            const dueDateObj = new Date(Date.UTC(year, month, 10));
            const dueDateString = dueDateObj.toISOString().split('T')[0];
            const description = `Fatura Cartão ${cardName}`;

            const isPaid = transactions.some(tx => {
                const txDate = parseDateAsUTC(tx.date);
                return tx.categoryId === 'cat_expense_card' &&
                       tx.description.includes(cardName) &&
                       txDate.getUTCFullYear() === year &&
                       txDate.getUTCMonth() === month;
            });

            invoices.push({
                id: id,
                amount: amount,
                type: 'expense',
                categoryId: 'cat_expense_card',
                description: description,
                dueDate: dueDateString,
                status: isPaid ? 'paid' : 'pending',
                isGenerated: true,
            });
        });

        return invoices;
    }, [cardTransactions, transactions, plannedTransactions]);

    const expectedTithingMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!settings.calculateTithing) return map;
        const monthsSet = new Set<string>();
        transactions.forEach(tx => monthsSet.add(tx.date.slice(0, 7)));
        plannedTransactions.forEach(pt => {
             if (pt.type === 'income' && pt.status === 'pending') monthsSet.add(pt.dueDate.slice(0, 7));
        });
        monthsSet.add(new Date().toISOString().slice(0, 7));
        monthsSet.forEach(monthKey => {
            let totalValidIncome = 0;
            transactions.filter(tx => tx.date.startsWith(monthKey) && tx.type === 'income').forEach(tx => {
                const category = categories.find(c => c.id === tx.categoryId);
                if (category && category.includeInTithing) totalValidIncome += tx.amount;
            });
            plannedTransactions.filter(pt => pt.dueDate.startsWith(monthKey) && pt.type === 'income' && pt.status === 'pending').forEach(pt => {
                 const category = categories.find(c => c.id === pt.categoryId);
                 if (category && category.includeInTithing) totalValidIncome += pt.amount;
            });
            if (totalValidIncome > 0) map.set(monthKey, totalValidIncome * 0.10);
        });
        return map;
    }, [transactions, plannedTransactions, categories, settings.calculateTithing]);

    useEffect(() => {
        if (!settings.calculateTithing) return;
        let hasUpdates = false;
        const updatedPlanned = plannedTransactions.map(pt => {
            if (pt.categoryId === 'cat_expense_tithing' && pt.id.startsWith('tithing_')) {
                const parts = pt.id.split('_');
                if (parts.length === 3) {
                    const year = parts[1];
                    const monthIndex = parseInt(parts[2]);
                    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                    const expectedAmount = expectedTithingMap.get(monthKey);
                    if (expectedAmount !== undefined && Math.abs(pt.amount - expectedAmount) > 0.01) {
                        hasUpdates = true;
                        return { ...pt, amount: expectedAmount };
                    }
                }
            }
            return pt;
        });
        if (hasUpdates) savePlanned(updatedPlanned);
    }, [expectedTithingMap, plannedTransactions, settings.calculateTithing]);

    const generatedTithing = useMemo(() => {
        if (!settings.calculateTithing) return [];
        const tithingItems: PlannedTransaction[] = [];
        expectedTithingMap.forEach((amount, monthKey) => {
            const [year, month] = monthKey.split('-').map(Number);
            const id = `tithing_${year}_${month - 1}`;
            const exists = plannedTransactions.some(pt => pt.id === id);
            if (!exists) {
                 const isPaid = transactions.some(tx => tx.categoryId === 'cat_expense_tithing' && tx.date.startsWith(monthKey));
                 tithingItems.push({
                    id, amount, type: 'expense', categoryId: 'cat_expense_tithing',
                    description: `Dízimo Calculado (${monthKey})`, dueDate: `${monthKey}-10`,
                    status: isPaid ? 'paid' : 'pending', isGenerated: true
                 });
            }
        });
        return tithingItems;
    }, [expectedTithingMap, plannedTransactions, transactions, settings.calculateTithing]);

    const updateMovementBalance = (currentPlanned: PlannedTransaction[], amountDelta: number, dateReference: string) => {
        let updated = [...currentPlanned];
        let balanceItem = updated.find(p => p.categoryId === 'cat_income_movement' && p.status === 'pending' && p.description === MOVEMENT_BALANCE_DESC);
        if (balanceItem) {
            const newAmount = balanceItem.amount + amountDelta;
            if (newAmount <= 0.01) updated = updated.filter(p => p.id !== balanceItem!.id);
            else updated = updated.map(p => p.id === balanceItem!.id ? { ...p, amount: newAmount } : p);
        } else if (amountDelta > 0) {
            updated.push({
                id: generateUUID(), categoryId: 'cat_income_movement', type: 'income', amount: amountDelta,
                description: MOVEMENT_BALANCE_DESC, dueDate: dateReference, status: 'pending', isGenerated: true
            });
        }
        return updated;
    };

    const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
        const newTx: Transaction = { ...transaction, id: generateUUID() };
        let updatedPlanned = plannedTransactions;
        if (newTx.categoryId === 'cat_expense_movement') updatedPlanned = updateMovementBalance(updatedPlanned, newTx.amount, newTx.date);
        else if (newTx.categoryId === 'cat_income_movement') updatedPlanned = updateMovementBalance(updatedPlanned, -newTx.amount, newTx.date);
        saveTransactions([newTx, ...transactions]);
        if (updatedPlanned !== plannedTransactions) savePlanned(updatedPlanned);
    }, [transactions, plannedTransactions]);

    const duplicateTransaction = useCallback(async (id: string) => {
        const original = transactions.find(t => t.id === id);
        if (!original) return;
        const copy: Transaction = { ...original, id: generateUUID() };
        saveTransactions([copy, ...transactions]);
    }, [transactions]);

    const addMultipleTransactions = useCallback(async (newTransactions: Omit<Transaction, 'id'>[]) => {
        const formatted = newTransactions.map(t => ({ ...t, id: generateUUID() }));
        let movementNetChange = 0;
        let refDate = new Date().toISOString().split('T')[0];
        formatted.forEach(tx => {
            if (tx.categoryId === 'cat_expense_movement') { movementNetChange += tx.amount; refDate = tx.date; }
            else if (tx.categoryId === 'cat_income_movement') { movementNetChange -= tx.amount; refDate = tx.date; }
        });
        let updatedPlanned = plannedTransactions;
        if (movementNetChange !== 0) updatedPlanned = updateMovementBalance(updatedPlanned, movementNetChange, refDate);
        saveTransactions([...transactions, ...formatted]);
        if (updatedPlanned !== plannedTransactions) savePlanned(updatedPlanned);
    }, [transactions, plannedTransactions]);

    const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
        saveTransactions(transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    }, [transactions]);

    const deleteTransaction = useCallback(async (id: string) => {
        saveTransactions(transactions.filter(t => t.id !== id));
    }, [transactions]);
    
    const deleteMultipleTransactions = useCallback(async (ids: string[]) => {
        saveTransactions(transactions.filter(t => !ids.includes(t.id)));
    }, [transactions]);
    
    const updateMultipleTransactionsCategory = useCallback(async (ids: string[], categoryId: string) => {
        saveTransactions(transactions.map(t => ids.includes(t.id) ? { ...t, categoryId } : t));
    }, [transactions]);

    const addPlannedTransaction = useCallback(async (transaction: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const transactionsToAdd: PlannedTransaction[] = [];
        transactionsToAdd.push({ ...transaction, id: generateUUID(), status: 'pending' });
        if (recurrenceCount > 0) {
            let lastDueDate = new Date(transaction.dueDate + 'T12:00:00Z');
            for (let i = 0; i < recurrenceCount; i++) {
                const nextDueDate = new Date(lastDueDate);
                nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
                if (nextDueDate.getUTCMonth() !== (lastDueDate.getUTCMonth() + 1) % 12) nextDueDate.setUTCDate(0);
                transactionsToAdd.push({ ...transaction, id: generateUUID(), dueDate: nextDueDate.toISOString().split('T')[0], status: 'pending' });
                lastDueDate = nextDueDate;
            }
        }
        savePlanned([...plannedTransactions, ...transactionsToAdd]);
    }, [plannedTransactions]);

    const updatePlannedTransaction = useCallback(async (updated: PlannedTransaction) => {
        const exists = plannedTransactions.some(t => t.id === updated.id);
        if (exists) savePlanned(plannedTransactions.map(t => t.id === updated.id ? updated : t));
        else savePlanned([...plannedTransactions, { ...updated, isGenerated: false }]);
    }, [plannedTransactions]);

    const deletePlannedTransaction = useCallback(async (id: string, deleteFuture: boolean = false) => {
        if (!deleteFuture) savePlanned(plannedTransactions.filter(t => t.id !== id));
        else {
            const target = plannedTransactions.find(t => t.id === id);
            if (!target) { savePlanned(plannedTransactions.filter(t => t.id !== id)); return; }
            savePlanned(plannedTransactions.filter(t => {
                if (t.id === id) return false;
                return !(t.description === target.description && t.categoryId === target.categoryId && t.amount === target.amount && t.type === target.type && t.dueDate > target.dueDate);
            }));
        }
    }, [plannedTransactions]);

    const markPlannedTransactionAsPaid = useCallback(async (planned: PlannedTransaction) => {
        const newTransaction: Transaction = { id: generateUUID(), amount: planned.amount, categoryId: planned.categoryId, date: planned.dueDate, description: planned.description, type: planned.type };
        let updatedPlanned = plannedTransactions;
        if (planned.categoryId === 'cat_income_movement') updatedPlanned = updatedPlanned.filter(p => p.id !== planned.id);
        else if (!planned.isGenerated) updatedPlanned = updatedPlanned.map(t => t.id === planned.id ? { ...planned, status: 'paid' } : t);
        saveTransactions([newTransaction, ...transactions]);
        if(updatedPlanned !== plannedTransactions) savePlanned(updatedPlanned);
    }, [plannedTransactions, transactions]);

    const addInvestment = useCallback(async (investment: Omit<Investment, 'id'>) => {
        saveInvestments([{ ...investment, id: generateUUID() }, ...investments]);
    }, [investments]);

    const updateInvestment = useCallback(async (updated: Investment) => {
        saveInvestments(investments.map(i => i.id === updated.id ? updated : i));
    }, [investments]);

    const deleteInvestment = useCallback(async (id: string) => {
        saveInvestments(investments.filter(i => i.id !== id));
    }, [investments]);

    const addCategory = useCallback((category: Omit<Category, 'id'>) => {
        saveCategories([...categories, { ...category, id: generateUUID() }]);
    }, [categories]);

    const updateCategory = useCallback((updated: Category) => {
        saveCategories(categories.map(c => c.id === updated.id ? updated : c));
    }, [categories]);

    const deleteCategory = useCallback((id: string) => {
        saveCategories(categories.filter(c => c.id !== id));
    }, [categories]);

    const addCardTransaction = useCallback(async (transaction: Omit<CardTransaction, 'id'>) => {
        saveCards([{ ...transaction, id: generateUUID() }, ...cardTransactions]);
    }, [cardTransactions]);

    const updateCardTransaction = useCallback(async (updated: CardTransaction) => {
        saveCards(cardTransactions.map(t => t.id === updated.id ? updated : t));
    }, [cardTransactions]);

    const deleteCardTransaction = useCallback(async (id: string) => {
        saveCards(cardTransactions.filter(t => t.id !== id));
    }, [cardTransactions]);

    const totalBalance = useMemo(() => transactions.reduce((sum, tx) => (tx.type === 'income' ? sum + tx.amount : sum - tx.amount), 0), [transactions]);

    const getMonthlySummary = useCallback((date: Date) => {
        const monthPrefix = date.toISOString().slice(0, 7);
        let income = 0;
        let expense = 0;
        transactions.filter(tx => tx.date.startsWith(monthPrefix)).forEach(tx => {
            if (tx.type === 'income') income += tx.amount; else expense += tx.amount;
        });
        const allPending = [...plannedTransactions, ...generatedCardInvoices, ...generatedTithing].filter(pt => pt.dueDate.startsWith(monthPrefix) && pt.status === 'pending');
        const plannedExpense = allPending.filter(pt => pt.type === 'expense').reduce((sum, pt) => sum + pt.amount, 0);
        const plannedIncome = allPending.filter(pt => pt.type === 'income').reduce((sum, pt) => sum + pt.amount, 0);
        return { income, expense, plannedExpense, plannedIncome };
    }, [transactions, plannedTransactions, generatedCardInvoices, generatedTithing]);

    const exportData = () => {
        const data = { transactions, plannedTransactions, cardTransactions, investments, categories, settings, uiPreferences: { theme: localStorage.getItem('theme'), investmentLayout: localStorage.getItem('flux_investment_layout'), investmentShowChart: localStorage.getItem('flux_investment_show_chart') }, exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `lucia_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const importData = (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);
            if(data.transactions) saveTransactions(data.transactions);
            if(data.plannedTransactions) savePlanned(data.plannedTransactions);
            if(data.cardTransactions) saveCards(data.cardTransactions);
            if(data.investments) saveInvestments(data.investments);
            if(data.categories) saveCategories(data.categories);
            if(data.settings) updateSettings(data.settings);
            if (data.uiPreferences) {
                if (data.uiPreferences.theme) localStorage.setItem('theme', data.uiPreferences.theme);
                if (data.uiPreferences.investmentLayout) localStorage.setItem('flux_investment_layout', data.uiPreferences.investmentLayout);
                if (data.uiPreferences.investmentShowChart) localStorage.setItem('flux_investment_show_chart', data.uiPreferences.investmentShowChart);
            }
            return true;
        } catch(e) { return false; }
    };

    return {
        transactions, categories, settings, updateSettings, addTransaction, duplicateTransaction, addMultipleTransactions, updateTransaction, deleteTransaction, deleteMultipleTransactions, updateMultipleTransactionsCategory,
        totalBalance, getMonthlySummary, plannedTransactions, generatedCardInvoices, generatedTithing, addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction, markPlannedTransactionAsPaid,
        cardTransactions, addCardTransaction, updateCardTransaction, deleteCardTransaction,
        investments, addInvestment, updateInvestment, deleteInvestment,
        addCategory, updateCategory, deleteCategory, loading, error, exportData, importData, clearAllData: () => { localStorage.clear(); window.location.reload(); }
    };
};

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Transaction, PlannedTransaction, CardTransaction } from '../types';
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

const STORAGE_KEYS = {
    TRANSACTIONS: 'lucia_transactions',
    PLANNED: 'lucia_planned_transactions',
    CARDS: 'lucia_card_transactions'
};

export const useFinanceData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load data from LocalStorage
    useEffect(() => {
        try {
            const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
            const storedPlanned = localStorage.getItem(STORAGE_KEYS.PLANNED);
            const storedCards = localStorage.getItem(STORAGE_KEYS.CARDS);

            if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
            if (storedPlanned) setPlannedTransactions(JSON.parse(storedPlanned));
            if (storedCards) setCardTransactions(JSON.parse(storedCards));
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

    // --- Transactions ---

    const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
        const newTx: Transaction = { ...transaction, id: generateUUID() };
        saveTransactions([newTx, ...transactions]);
    }, [transactions]);

    const addMultipleTransactions = useCallback(async (newTransactions: Omit<Transaction, 'id'>[]) => {
        const formatted = newTransactions.map(t => ({ ...t, id: generateUUID() }));
        saveTransactions([...transactions, ...formatted]);
    }, [transactions]);

    const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
        const updatedList = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
        saveTransactions(updatedList);
    }, [transactions]);

    const deleteTransaction = useCallback(async (id: string) => {
        const filtered = transactions.filter(t => t.id !== id);
        saveTransactions(filtered);
    }, [transactions]);
    
    const deleteMultipleTransactions = useCallback(async (ids: string[]) => {
        const filtered = transactions.filter(t => !ids.includes(t.id));
        saveTransactions(filtered);
    }, [transactions]);
    
    const updateMultipleTransactionsCategory = useCallback(async (ids: string[], categoryId: string) => {
        const updatedList = transactions.map(t => ids.includes(t.id) ? { ...t, categoryId } : t);
        saveTransactions(updatedList);
    }, [transactions]);

    // --- Planned Transactions ---

    const addPlannedTransaction = useCallback(async (transaction: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const transactionsToAdd: PlannedTransaction[] = [];
        transactionsToAdd.push({ ...transaction, id: generateUUID(), status: 'pending' });

        if (recurrenceCount > 0) {
            let lastDueDate = new Date(transaction.dueDate + 'T12:00:00Z');
            for (let i = 0; i < recurrenceCount; i++) {
                const nextDueDate = new Date(lastDueDate);
                nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
                // Adjust for end of month (e.g. Jan 31 -> Feb 28)
                if (nextDueDate.getUTCMonth() !== (lastDueDate.getUTCMonth() + 1) % 12) nextDueDate.setUTCDate(0);
                
                transactionsToAdd.push({ 
                    ...transaction, 
                    id: generateUUID(),
                    dueDate: nextDueDate.toISOString().split('T')[0], 
                    status: 'pending' 
                });
                lastDueDate = nextDueDate;
            }
        }
        savePlanned([...plannedTransactions, ...transactionsToAdd]);
    }, [plannedTransactions]);

    const updatePlannedTransaction = useCallback(async (updated: PlannedTransaction) => {
        const updatedList = plannedTransactions.map(t => t.id === updated.id ? updated : t);
        savePlanned(updatedList);
    }, [plannedTransactions]);

    const deletePlannedTransaction = useCallback(async (id: string) => {
        const filtered = plannedTransactions.filter(t => t.id !== id);
        savePlanned(filtered);
    }, [plannedTransactions]);

    const markPlannedTransactionAsPaid = useCallback(async (planned: PlannedTransaction) => {
        const newTransaction: Transaction = {
            id: generateUUID(),
            amount: planned.amount,
            categoryId: planned.categoryId,
            date: planned.dueDate,
            description: planned.description,
            type: planned.type,
        };
        const updatedPlannedTx: PlannedTransaction = { ...planned, status: 'paid' };
    
        // Update both lists
        saveTransactions([newTransaction, ...transactions]);
        const updatedPlannedList = plannedTransactions.map(t => t.id === planned.id ? updatedPlannedTx : t);
        savePlanned(updatedPlannedList);

    }, [plannedTransactions, transactions]);

    // --- Card Transactions ---

    const addCardTransaction = useCallback(async (transaction: Omit<CardTransaction, 'id'>) => {
        const newCardTx: CardTransaction = { ...transaction, id: generateUUID() };
        saveCards([...cardTransactions, newCardTx]);
    }, [cardTransactions]);

    const updateCardTransaction = useCallback(async (updated: CardTransaction) => {
        const updatedList = cardTransactions.map(t => t.id === updated.id ? updated : t);
        saveCards(updatedList);
    }, [cardTransactions]);

    const deleteCardTransaction = useCallback(async (id: string) => {
        const filtered = cardTransactions.filter(t => t.id !== id);
        saveCards(filtered);
    }, [cardTransactions]);

    // --- Calculations ---

    const totalBalance = useMemo(() => transactions.reduce((sum, tx) => (tx.type === 'income' ? sum + tx.amount : sum - tx.amount), 0), [transactions]);

    const getMonthlySummary = useCallback((date: Date) => {
        const monthPrefix = date.toISOString().slice(0, 7); // "YYYY-MM"
        let income = 0;
        let expense = 0;

        transactions.filter(tx => tx.date.startsWith(monthPrefix)).forEach(tx => {
            if (tx.type === 'income') income += tx.amount; else expense += tx.amount;
        });

        const pendingPlanned = plannedTransactions.filter(pt => pt.dueDate.startsWith(monthPrefix) && pt.status === 'pending');

        const plannedExpense = pendingPlanned.filter(pt => pt.type === 'expense').reduce((sum, pt) => sum + pt.amount, 0);
        const plannedIncome = pendingPlanned.filter(pt => pt.type === 'income').reduce((sum, pt) => sum + pt.amount, 0);

        return { income, expense, plannedExpense, plannedIncome };
    }, [transactions, plannedTransactions]);

    // --- Backup & Restore ---
    
    const exportData = () => {
        const data = {
            transactions,
            plannedTransactions,
            cardTransactions,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lucia_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importData = (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);
            if(data.transactions) saveTransactions(data.transactions);
            if(data.plannedTransactions) savePlanned(data.plannedTransactions);
            if(data.cardTransactions) saveCards(data.cardTransactions);
            return true;
        } catch(e) {
            console.error(e);
            return false;
        }
    };

    const clearAllData = () => {
        localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
        localStorage.removeItem(STORAGE_KEYS.PLANNED);
        localStorage.removeItem(STORAGE_KEYS.CARDS);
        setTransactions([]);
        setPlannedTransactions([]);
        setCardTransactions([]);
    };

    return {
        transactions,
        categories: INITIAL_CATEGORIES,
        budgets: [],
        addTransaction,
        addMultipleTransactions,
        updateTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        updateMultipleTransactionsCategory,
        totalBalance,
        getMonthlySummary,
        plannedTransactions,
        addPlannedTransaction,
        updatePlannedTransaction,
        deletePlannedTransaction,
        markPlannedTransactionAsPaid,
        cardTransactions,
        addCardTransaction,
        updateCardTransaction,
        deleteCardTransaction,
        loading,
        error,
        exportData,
        importData,
        clearAllData
    };
};
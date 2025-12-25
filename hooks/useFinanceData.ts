
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, PlannedTransaction, CardTransaction, Category, AppSettings, Investment } from '../types';
import { INITIAL_CATEGORIES_TEMPLATE } from '../constants';

const generateUUID = () => crypto.randomUUID();

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

export const useFinanceData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        if (!supabase) return;
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);

    const persist = useCallback(async (table: string, key: string, data: any[]) => {
        if (!supabase || !session) return;
        localStorage.setItem(key, JSON.stringify(data));
        
        try {
            const cleanData = data.map(({ isGenerated, ...item }) => item);
            const { error: supabaseError } = await supabase.from(table).upsert(cleanData);
            if (supabaseError) console.error(`Erro ao sincronizar ${table}:`, supabaseError.message);
        } catch (e) {
            console.error(`Erro ao persistir ${table}:`, e);
        }
    }, [session]);

    useEffect(() => {
        let isMounted = true;

        const loadFromSupabase = async () => {
            if (!supabase || !session) {
                if (isMounted) {
                    // RESET DOS DADOS AO SAIR
                    setTransactions([]);
                    setPlannedTransactions([]);
                    setCardTransactions([]);
                    setInvestments([]);
                    setCategories([]);
                    setLoading(false);
                }
                return;
            }

            if (isMounted) setLoading(true);

            try {
                // 1. Carregar Categorias Restritas (RLS fará o filtro automático)
                const { data: catData } = await supabase.from('categories').select('*');
                
                let userCategories: Category[] = catData || [];

                if (userCategories.length === 0) {
                    // Novo usuário: Gerar conjunto de categorias único para ele
                    const newCats = INITIAL_CATEGORIES_TEMPLATE.map(tpl => ({
                        ...tpl,
                        id: generateUUID() // IDs novos para este usuário específico
                    }));
                    await supabase.from('categories').insert(newCats);
                    userCategories = newCats;
                }

                if (isMounted) setCategories(userCategories);

                // 2. Carregar demais dados (Sempre filtrados pelo RLS do Banco)
                const [txs, pln, crd, inv] = await Promise.all([
                    supabase.from('transactions').select('*').order('date', { ascending: false }),
                    supabase.from('planned_transactions').select('*').order('dueDate', { ascending: true }),
                    supabase.from('card_transactions').select('*'),
                    supabase.from('investments').select('*')
                ]);

                if (isMounted) {
                    if (txs.data) setTransactions(txs.data);
                    if (pln.data) setPlannedTransactions(pln.data);
                    if (crd.data) setCardTransactions(crd.data);
                    if (inv.data) setInvestments(inv.data);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Falha ao carregar dados do Supabase:", err);
                if (isMounted) setLoading(false);
            }
        };

        loadFromSupabase();
        return () => { isMounted = false; };
    }, [session]);

    const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
        const newTx: Transaction = { ...transaction, id: generateUUID() };
        const updated = [newTx, ...transactions];
        setTransactions(updated);
        await persist('transactions', STORAGE_KEYS.TRANSACTIONS, updated);
    }, [transactions, persist]);

    const addMultipleTransactions = useCallback(async (newTransactions: Omit<Transaction, 'id'>[]) => {
        const withIds = newTransactions.map(t => ({ ...t, id: generateUUID() }));
        const updated = [...withIds, ...transactions];
        setTransactions(updated);
        await persist('transactions', STORAGE_KEYS.TRANSACTIONS, updated);
    }, [transactions, persist]);

    const duplicateTransaction = useCallback(async (id: string) => {
        const original = transactions.find(t => t.id === id);
        if (!original) return;
        const copy: Transaction = { ...original, id: generateUUID() };
        const updated = [copy, ...transactions];
        setTransactions(updated);
        await persist('transactions', STORAGE_KEYS.TRANSACTIONS, updated);
    }, [transactions, persist]);

    const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
        const updated = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
        setTransactions(updated);
        await persist('transactions', STORAGE_KEYS.TRANSACTIONS, updated);
    }, [transactions, persist]);

    const deleteTransaction = useCallback(async (id: string) => {
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
        if (supabase) await supabase.from('transactions').delete().eq('id', id);
    }, [transactions]);

    const deleteMultipleTransactions = useCallback(async (ids: string[]) => {
        const updated = transactions.filter(t => !ids.includes(t.id));
        setTransactions(updated);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
        if (supabase) await supabase.from('transactions').delete().in('id', ids);
    }, [transactions]);

    const updateMultipleTransactionsCategory = useCallback(async (ids: string[], categoryId: string) => {
        const updated = transactions.map(t => ids.includes(t.id) ? { ...t, categoryId } : t);
        setTransactions(updated);
        await persist('transactions', STORAGE_KEYS.TRANSACTIONS, updated);
    }, [transactions, persist]);

    const addPlannedTransaction = useCallback(async (transaction: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const toAdd: PlannedTransaction[] = [{ ...transaction, id: generateUUID(), status: 'pending' as 'pending' }];
        if (recurrenceCount > 0) {
            let lastDate = new Date(transaction.dueDate + 'T12:00:00Z');
            for (let i = 0; i < recurrenceCount; i++) {
                const nextDate = new Date(lastDate);
                nextDate.setUTCMonth(nextDate.getUTCMonth() + i + 1);
                toAdd.push({ ...transaction, id: generateUUID(), dueDate: nextDate.toISOString().split('T')[0], status: 'pending' as 'pending' });
            }
        }
        const updated = [...plannedTransactions, ...toAdd];
        setPlannedTransactions(updated);
        await persist('planned_transactions', STORAGE_KEYS.PLANNED, updated);
    }, [plannedTransactions, persist]);

    const updatePlannedTransaction = useCallback(async (updated: PlannedTransaction) => {
        const updatedList = plannedTransactions.map(t => t.id === updated.id ? updated : t);
        setPlannedTransactions(updatedList);
        await persist('planned_transactions', STORAGE_KEYS.PLANNED, updatedList);
    }, [plannedTransactions, persist]);

    const deletePlannedTransaction = useCallback(async (id: string, deleteFuture: boolean = false) => {
        const target = plannedTransactions.find(t => t.id === id);
        if (!target || !supabase) return;
        let updated: PlannedTransaction[];
        if (deleteFuture) {
            updated = plannedTransactions.filter(t => 
                !(t.description === target.description && t.categoryId === target.categoryId && t.amount === target.amount && t.dueDate >= target.dueDate)
            );
        } else {
            updated = plannedTransactions.filter(t => t.id !== id);
        }
        setPlannedTransactions(updated);
        localStorage.setItem(STORAGE_KEYS.PLANNED, JSON.stringify(updated));
        if (deleteFuture) {
            await supabase.from('planned_transactions').delete()
                .eq('description', target.description)
                .eq('amount', target.amount)
                .gte('dueDate', target.dueDate);
        } else {
            await supabase.from('planned_transactions').delete().eq('id', id);
        }
    }, [plannedTransactions]);

    const markPlannedTransactionAsPaid = useCallback(async (planned: PlannedTransaction) => {
        const newTx: Transaction = { id: generateUUID(), amount: planned.amount, categoryId: planned.categoryId, date: planned.dueDate, description: planned.description, type: planned.type };
        const updatedTx = [newTx, ...transactions];
        setTransactions(updatedTx);
        await persist('transactions', STORAGE_KEYS.TRANSACTIONS, updatedTx);

        if (!planned.isGenerated) {
            const updatedPlanned = plannedTransactions.map(t => t.id === planned.id ? { ...planned, status: 'paid' as 'paid' } : t);
            setPlannedTransactions(updatedPlanned);
            await persist('planned_transactions', STORAGE_KEYS.PLANNED, updatedPlanned);
        }
    }, [transactions, plannedTransactions, persist]);

    const addCardTransaction = useCallback(async (transaction: Omit<CardTransaction, 'id'>) => {
        const newCardTx = { ...transaction, id: generateUUID() };
        const updated = [newCardTx, ...cardTransactions];
        setCardTransactions(updated);
        await persist('card_transactions', STORAGE_KEYS.CARDS, updated);
    }, [cardTransactions, persist]);

    const updateCardTransaction = useCallback(async (updated: CardTransaction) => {
        const updatedList = cardTransactions.map(t => t.id === updated.id ? updated : t);
        setCardTransactions(updatedList);
        await persist('card_transactions', STORAGE_KEYS.CARDS, updatedList);
    }, [cardTransactions, persist]);

    const deleteCardTransaction = useCallback(async (id: string) => {
        const updated = cardTransactions.filter(t => t.id !== id);
        setCardTransactions(updated);
        localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(updated));
        if (supabase) await supabase.from('card_transactions').delete().eq('id', id);
    }, [cardTransactions]);

    const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
        const newCat = { ...category, id: generateUUID() };
        const updated = [...categories, newCat];
        setCategories(updated);
        await persist('categories', STORAGE_KEYS.CATEGORIES, updated);
    }, [categories, persist]);

    const updateCategory = useCallback(async (updated: Category) => {
        const updatedList = categories.map(c => c.id === updated.id ? updated : c);
        setCategories(updatedList);
        await persist('categories', STORAGE_KEYS.CATEGORIES, updatedList);
    }, [categories, persist]);

    const deleteCategory = useCallback(async (id: string) => {
        const updated = categories.filter(c => c.id !== id);
        setCategories(updated);
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
        if (supabase) await supabase.from('categories').delete().eq('id', id);
    }, [categories]);

    const addInvestment = useCallback(async (investment: Omit<Investment, 'id'>) => {
        const newInv = { ...investment, id: generateUUID() };
        const updated = [newInv, ...investments];
        setInvestments(updated);
        await persist('investments', STORAGE_KEYS.INVESTMENTS, updated);
    }, [investments, persist]);

    const updateInvestment = useCallback(async (updated: Investment) => {
        const updatedList = investments.map(i => i.id === updated.id ? updated : i);
        setInvestments(updatedList);
        await persist('investments', STORAGE_KEYS.INVESTMENTS, updatedList);
    }, [investments, persist]);

    const deleteInvestment = useCallback(async (id: string) => {
        const updated = investments.filter(i => i.id !== id);
        setInvestments(updated);
        localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(updated));
        if (supabase) await supabase.from('investments').delete().eq('id', id);
    }, [investments]);

    const getMonthlySummary = useCallback((date: Date) => {
        const monthPrefix = date.toISOString().slice(0, 7);
        let income = 0; let expense = 0;
        transactions.filter(tx => tx.date.startsWith(monthPrefix)).forEach(tx => {
            if (tx.type === 'income') income += tx.amount; else expense += tx.amount;
        });
        return { income, expense, plannedExpense: 0, plannedIncome: 0 };
    }, [transactions]);

    const generatedCardInvoices = useMemo(() => {
        const invoices: PlannedTransaction[] = [];
        // Localizar categoria de cartão pelo nome, já que o ID mudou
        const cardCat = categories.find(c => c.name === 'Cartão' && c.type === 'expense');
        if (!cardCat) return [];

        cardTransactions.forEach(cardTx => {
            const monthlyPayment = cardTx.totalAmount / cardTx.installments;
            const purchaseDate = parseDateAsUTC(cardTx.purchaseDate);
            for (let i = 1; i <= cardTx.installments; i++) {
                const dueDate = new Date(purchaseDate);
                dueDate.setUTCMonth(purchaseDate.getUTCMonth() + i);
                dueDate.setUTCDate(10);
                invoices.push({
                    id: `card_invoice_${cardTx.id}_${i}`,
                    amount: monthlyPayment,
                    type: 'expense',
                    categoryId: cardCat.id,
                    description: `Fatura: ${cardTx.name} (${i}/${cardTx.installments})`,
                    dueDate: dueDate.toISOString().split('T')[0],
                    status: 'pending' as 'pending',
                    isGenerated: true,
                });
            }
        });
        return invoices;
    }, [cardTransactions, categories]);

    const generatedTithing = useMemo(() => {
        if (!settings.calculateTithing) return [];
        // Localizar categoria de dízimo pelo nome
        const tithingCat = categories.find(c => c.name === 'Dizimo' && c.type === 'expense');
        if (!tithingCat) return [];

        const monthlyIncomes = new Map<string, number>();
        transactions.forEach(tx => {
            if (tx.type === 'income') {
                const category = categories.find(c => c.id === tx.categoryId);
                if (category?.includeInTithing !== false) {
                    const month = tx.date.slice(0, 7);
                    monthlyIncomes.set(month, (monthlyIncomes.get(month) || 0) + tx.amount);
                }
            }
        });
        const tithingItems: PlannedTransaction[] = [];
        monthlyIncomes.forEach((total, month) => {
            const tithingAmount = total * 0.1;
            if (tithingAmount > 0) {
                tithingItems.push({
                    id: `tithing_${month}`,
                    amount: tithingAmount,
                    type: 'expense',
                    categoryId: tithingCat.id,
                    description: `Dízimo - ${month}`,
                    dueDate: `${month}-10`,
                    status: 'pending' as 'pending',
                    isGenerated: true
                });
            }
        });
        return tithingItems;
    }, [transactions, categories, settings.calculateTithing]);

    const updateSettings = useCallback(async (newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
        if (supabase) await supabase.from('settings').upsert({ id: 'app_settings', ...newSettings });
    }, []);

    const exportData = useCallback(() => {
        const data = { transactions, plannedTransactions, cardTransactions, categories, settings, investments };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flux_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [transactions, plannedTransactions, cardTransactions, categories, settings, investments]);

    const importData = useCallback(async (json: string) => {
        try {
            const data = JSON.parse(json);
            if(!session) return false;
            if (data.categories) { setCategories(data.categories); await persist('categories', STORAGE_KEYS.CATEGORIES, data.categories); }
            if (data.transactions) { setTransactions(data.transactions); await persist('transactions', STORAGE_KEYS.TRANSACTIONS, data.transactions); }
            if (data.plannedTransactions) { setPlannedTransactions(data.plannedTransactions); await persist('planned_transactions', STORAGE_KEYS.PLANNED, data.plannedTransactions); }
            if (data.cardTransactions) { setCardTransactions(data.cardTransactions); await persist('card_transactions', STORAGE_KEYS.CARDS, data.cardTransactions); }
            if (data.settings) setSettings(data.settings);
            if (data.investments) { setInvestments(data.investments); await persist('investments', STORAGE_KEYS.INVESTMENTS, data.investments); }
            return true;
        } catch (e) {
            console.error("Erro ao importar e sincronizar dados:", e);
            return false;
        }
    }, [persist, session]);

    return {
        transactions, categories, settings, addTransaction, duplicateTransaction, updateTransaction, deleteTransaction,
        addMultipleTransactions, deleteMultipleTransactions, updateMultipleTransactionsCategory,
        getMonthlySummary, plannedTransactions, generatedCardInvoices, generatedTithing, 
        addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction, markPlannedTransactionAsPaid,
        cardTransactions, addCardTransaction, updateCardTransaction, deleteCardTransaction,
        investments, addInvestment, updateInvestment, deleteInvestment,
        addCategory, updateCategory, deleteCategory,
        exportData, importData, updateSettings,
        loading, error, totalBalance: transactions.reduce((acc, tx) => tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0), 
        clearAllData: () => { localStorage.clear(); window.location.reload(); }
    };
};

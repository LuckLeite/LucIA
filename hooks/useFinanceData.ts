
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, PlannedTransaction, CardTransaction, Category, AppSettings, Investment, Budget } from '../types';
import { INITIAL_CATEGORIES_TEMPLATE } from '../constants';

const generateUUID = () => crypto.randomUUID();

const DEFAULT_SETTINGS: AppSettings = {
    calculateTithing: false,
};

const addMonthsWithEndOfMonthCheck = (startDate: Date, monthsToAdd: number) => {
    const d = new Date(startDate);
    const day = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + monthsToAdd);
    if (d.getUTCDate() < day) {
        d.setUTCDate(0);
    }
    return d;
};

export const useFinanceData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
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

    const syncItem = async (table: string, item: any, operation: 'upsert' | 'delete' = 'upsert') => {
        if (!supabase || !session) return;
        if (operation === 'upsert' && String(item.id).startsWith('gen_')) return;

        try {
            if (operation === 'delete') {
                await supabase.from(table).delete().eq('id', item.id);
            } else {
                const { ...dataToSync } = item;
                await supabase.from(table).upsert({ ...dataToSync, user_id: session.user.id });
            }
        } catch (e: any) {
            console.error(`Erro ao sincronizar ${table}:`, e.message);
        }
    };

    const loadData = useCallback(async () => {
        if (!supabase || !session) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [txs, pln, crd, inv, cat, bud, set] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('planned_transactions').select('*'),
                supabase.from('card_transactions').select('*'),
                supabase.from('investments').select('*'),
                supabase.from('categories').select('*'),
                supabase.from('budgets').select('*'),
                supabase.from('settings').select('*').single()
            ]);

            if (cat.data && cat.data.length === 0) {
                const seedCategories = INITIAL_CATEGORIES_TEMPLATE.map(c => ({
                    ...c,
                    id: generateUUID(),
                    user_id: session.user.id
                }));
                const { data: insertedCats } = await supabase.from('categories').insert(seedCategories).select();
                if (insertedCats) setCategories(insertedCats);
            } else if (cat.data) {
                setCategories(cat.data);
            }

            if (txs.data) setTransactions(txs.data);
            if (pln.data) setPlannedTransactions(pln.data || []);
            if (crd.data) setCardTransactions(crd.data);
            if (inv.data) setInvestments(inv.data);
            if (bud.data) setBudgets(bud.data);
            if (set.data) setSettings(set.data || DEFAULT_SETTINGS);
        } catch (err: any) {
            console.error("Erro ao carregar dados:", err);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => { loadData(); }, [loadData]);

    const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
        const newTx = { ...tx, id: generateUUID() };
        setTransactions(prev => [newTx, ...prev]);
        await syncItem('transactions', newTx);
    };

    const updateTransaction = async (tx: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
        await syncItem('transactions', tx);
    };

    const deleteTransaction = async (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        await syncItem('transactions', { id }, 'delete');
    };

    const addPlannedTransaction = async (tx: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const items: PlannedTransaction[] = [];
        const start = new Date(tx.dueDate + 'T12:00:00Z');
        for (let i = 0; i <= recurrenceCount; i++) {
            const d = addMonthsWithEndOfMonthCheck(start, i);
            const newItem: PlannedTransaction = {
                ...tx,
                id: generateUUID(),
                dueDate: d.toISOString().split('T')[0],
                status: 'pending',
                isBudgetGoal: tx.isBudgetGoal || false
            };
            items.push(newItem);
        }
        setPlannedTransactions(prev => [...prev, ...items]);
        if (supabase && session) {
            const dataToSync = items.map(it => ({ ...it, user_id: session.user.id }));
            await supabase.from('planned_transactions').upsert(dataToSync);
        }
    };

    const updatePlannedTransaction = async (tx: PlannedTransaction, updateFuture: boolean = false) => {
        if (!updateFuture) {
            let finalTx = { ...tx };
            if (String(tx.id).startsWith('gen_')) {
                finalTx.id = generateUUID();
                finalTx.isGenerated = true;
                setPlannedTransactions(prev => [...prev, finalTx]);
            } else {
                setPlannedTransactions(prev => prev.map(t => t.id === tx.id ? finalTx : t));
            }
            await syncItem('planned_transactions', finalTx);
        } else {
            const target = plannedTransactions.find(t => t.id === tx.id);
            if (!target) return;
            const toUpdate = plannedTransactions.filter(t => t.description === target.description && t.categoryId === target.categoryId && t.dueDate >= target.dueDate && !String(t.id).startsWith('gen_'));
            const updatedList = plannedTransactions.map(t => {
                const match = toUpdate.find(u => u.id === t.id);
                if (match) return { ...t, amount: tx.amount, categoryId: tx.categoryId, description: tx.description, isBudgetGoal: tx.isBudgetGoal };
                return t;
            });
            setPlannedTransactions(updatedList);
            if (supabase && session) {
                const dataToSync = toUpdate.map(t => ({ ...t, amount: tx.amount, categoryId: tx.categoryId, description: tx.description, isBudgetGoal: tx.isBudgetGoal, user_id: session.user.id }));
                await supabase.from('planned_transactions').upsert(dataToSync);
            }
        }
    };

    const deletePlannedTransaction = async (id: string, deleteFuture: boolean = false) => {
        if (String(id).startsWith('gen_')) return;
        if (!deleteFuture) {
            setPlannedTransactions(prev => prev.filter(t => t.id !== id));
            await syncItem('planned_transactions', { id }, 'delete');
        } else {
            const target = plannedTransactions.find(t => t.id === id);
            if (!target) return;
            const toDelete = plannedTransactions.filter(t => t.description === target.description && t.categoryId === target.categoryId && t.dueDate >= target.dueDate);
            const ids = toDelete.map(t => t.id);
            setPlannedTransactions(prev => prev.filter(t => !ids.includes(t.id)));
            if (supabase) await supabase.from('planned_transactions').delete().in('id', ids);
        }
    };

    const getMonthlySummary = useCallback((date: Date) => {
        const monthPrefix = date.toISOString().slice(0, 7);
        const monthTxs = transactions.filter(t => t.date.startsWith(monthPrefix));
        const income = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { income, expense };
    }, [transactions]);

    const getGeneratedMovementForMonth = useCallback((monthPrefix: string) => {
        if (categories.length === 0) return [];
        const normalizeStr = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const movCategoryIds = categories.filter(c => normalizeStr(c.name) === 'movimento').map(c => c.id);
        if (movCategoryIds.length === 0) return [];

        const firstDay = `${monthPrefix}-01`;
        const [year, month] = monthPrefix.split('-').map(Number);
        const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
        
        const monthTxs = transactions.filter(t => t.date >= firstDay && t.date <= lastDay && movCategoryIds.includes(t.categoryId));
        const totalExpenses = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const totalIncomes = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        
        if (totalExpenses === 0 && totalIncomes === 0) return [];

        const remainingBalance = totalExpenses - totalIncomes;
        const isPaid = remainingBalance <= 0.01;

        const persisted = plannedTransactions.find(p => p.dueDate.startsWith(monthPrefix) && movCategoryIds.includes(p.categoryId) && p.isGenerated === true && p.type === 'income');
        const movIncomeCat = categories.find(c => normalizeStr(c.name) === 'movimento' && c.type === 'income');
        if (!movIncomeCat) return [];

        return [{
            id: persisted ? persisted.id : `gen_mov_acc_${monthPrefix}`,
            amount: isPaid ? totalIncomes : remainingBalance,
            type: 'income' as const,
            categoryId: movIncomeCat.id,
            description: persisted ? persisted.description : isPaid ? `Saldo Movimento Concluído` : `Saldo Restante Movimento`,
            dueDate: persisted ? persisted.dueDate : firstDay,
            status: isPaid ? 'paid' : (persisted ? persisted.status : 'pending'),
            isGenerated: true,
            isBudgetGoal: false
        }];
    }, [transactions, categories, plannedTransactions]);

    const generatedTithing = useMemo(() => {
        if (!settings.calculateTithing || categories.length === 0) return [];
        const tithingCat = categories.find(c => (c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('dizimo')) && c.type === 'expense');
        if (!tithingCat) return [];
        
        const items: PlannedTransaction[] = [];
        const incomeMonths = new Set<string>(transactions.filter(t => t.type === 'income').map(t => t.date.slice(0, 7)));

        incomeMonths.forEach(month => {
            const firstDay = `${month}-01`;
            const [y, m] = month.split('-').map(Number);
            const lastDay = new Date(y, m, 0).toISOString().split('T')[0];
            const totalIncomeForTithing = transactions.filter(t => t.date.startsWith(month) && t.type === 'income').reduce((acc, t) => {
                const cat = categories.find(c => c.id === t.categoryId);
                return cat?.includeInTithing ? acc + t.amount : acc;
            }, 0);
            
            if (totalIncomeForTithing <= 0) return;
            const expectedTithing = totalIncomeForTithing * 0.1;
            const alreadyPaidReal = transactions.filter(t => t.date >= firstDay && t.date <= lastDay && t.categoryId === tithingCat.id).reduce((acc, t) => acc + t.amount, 0);
            const remainingTithing = expectedTithing - alreadyPaidReal;
            const isPaid = remainingTithing <= 0.01;

            const persisted = plannedTransactions.find(p => p.dueDate.startsWith(month) && p.categoryId === tithingCat.id && p.isGenerated === true);
            
            items.push({ 
                id: persisted ? persisted.id : `gen_tithing_${month}`, 
                amount: isPaid ? alreadyPaidReal : remainingTithing, 
                type: 'expense', 
                categoryId: tithingCat.id, 
                description: persisted ? persisted.description : isPaid ? `Dízimo Pago - ${month}` : `Dízimo Restante - ${month}`, 
                dueDate: persisted ? persisted.dueDate : `${month}-10`, 
                status: isPaid ? 'paid' : (persisted ? persisted.status : 'pending'), 
                isGenerated: true,
                isBudgetGoal: false
            });
        });
        return items;
    }, [transactions, categories, settings.calculateTithing, plannedTransactions]);

    const generatedCardInvoices = useMemo(() => {
        if (categories.length === 0) return [];
        const cardCat = categories.find(c => (c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('cartao')) && c.type === 'expense');
        if (!cardCat) return [];
        const invoices: PlannedTransaction[] = [];
        const cardMonths = new Map<string, number>();
        cardTransactions.forEach(tx => {
            const monthly = tx.totalAmount / tx.installments;
            const start = new Date(tx.purchaseDate + 'T12:00:00Z');
            for (let i = 1; i <= tx.installments; i++) {
                const d = addMonthsWithEndOfMonthCheck(start, i);
                const mKey = d.toISOString().slice(0, 7);
                cardMonths.set(mKey, (cardMonths.get(mKey) || 0) + monthly);
            }
        });
        cardMonths.forEach((val, month) => {
            const alreadyPaidReal = transactions.filter(t => t.date.startsWith(month) && t.categoryId === cardCat.id).reduce((acc, t) => acc + t.amount, 0);
            const isPaid = alreadyPaidReal >= (val - 0.01);
            const persisted = plannedTransactions.find(p => p.dueDate.startsWith(month) && p.categoryId === cardCat.id && p.isGenerated === true);
            invoices.push({ 
                id: persisted ? persisted.id : `gen_card_${month}`, 
                amount: val, 
                type: 'expense', 
                categoryId: cardCat.id, 
                description: persisted ? persisted.description : `Faturas de Cartão - ${month}`, 
                dueDate: persisted ? persisted.dueDate : `${month}-10`, 
                status: isPaid ? 'paid' : (persisted ? persisted.status : 'pending'), 
                isGenerated: true,
                isBudgetGoal: false
            });
        });
        return invoices;
    }, [cardTransactions, categories, plannedTransactions, transactions]);

    const addCategory = async (cat: Omit<Category, 'id'>) => {
        const newCat = { ...cat, id: generateUUID() };
        setCategories(prev => [...prev, newCat]);
        await syncItem('categories', newCat);
    };

    const updateCategory = async (cat: Category) => {
        setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
        await syncItem('categories', cat);
    };

    const deleteCategory = async (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
        await syncItem('categories', { id }, 'delete');
    };

    return {
        transactions, categories, budgets, plannedTransactions, cardTransactions, investments, settings, loading, error,
        getMonthlySummary, getGeneratedMovementForMonth,
        addTransaction, updateTransaction, deleteTransaction, 
        addPlannedTransaction, updatePlannedTransaction, deletePlannedTransaction,
        markPlannedTransactionAsPaid: async (planned: PlannedTransaction) => {
            // USAR DATA DE HOJE NA BAIXA
            const todayISO = new Date().toISOString().split('T')[0];
            await addTransaction({ 
                amount: planned.amount, 
                categoryId: planned.categoryId, 
                date: todayISO, 
                description: planned.description, 
                type: planned.type 
            });
            
            if (!String(planned.id).startsWith('gen_')) {
                const paidPlanned = { ...planned, status: 'paid' as const };
                setPlannedTransactions(prev => prev.map(t => t.id === planned.id ? paidPlanned : t));
                await syncItem('planned_transactions', paidPlanned);
            }
        },
        unmarkPlannedTransactionAsPaid: async (planned: PlannedTransaction) => {
            if (String(planned.id).startsWith('gen_')) return;
            
            const matchingTx = transactions.find(t => 
                t.amount === planned.amount && 
                t.categoryId === planned.categoryId && 
                t.description === planned.description
            );
            
            if (matchingTx) {
                await deleteTransaction(matchingTx.id);
            }

            const pendingItem: PlannedTransaction = { ...planned, status: 'pending' as const };
            setPlannedTransactions(prev => prev.map(t => t.id === planned.id ? pendingItem : t));
            await syncItem('planned_transactions', pendingItem);
        },
        addCategory, updateCategory, deleteCategory,
        generatedCardInvoices, generatedTithing,
        totalBalance: transactions.reduce((acc, tx) => tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0),
        updateSettings: async (s: AppSettings) => {
            setSettings(s);
            if (supabase && session) await supabase.from('settings').upsert({ ...s, id: 'global', user_id: session.user.id });
        },
        addMultipleTransactions: async (txs: Omit<Transaction, 'id'>[]) => {
            const newTxs = txs.map(t => ({ ...t, id: generateUUID() }));
            setTransactions(prev => [...newTxs, ...prev]);
            if (supabase && session) await supabase.from('transactions').upsert(newTxs.map(t => ({ ...t, user_id: session.user.id })));
        },
        deleteMultipleTransactions: async (ids: string[]) => {
            setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
            if (supabase) await supabase.from('transactions').delete().in('id', ids);
        },
        updateMultipleTransactionsCategory: async (ids: string[], categoryId: string) => {
            setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, categoryId } : t));
            if (supabase) await supabase.from('transactions').update({ categoryId }).in('id', ids);
        },
        duplicateTransaction: async (id: string) => {
            const original = transactions.find(t => t.id === id);
            if (original) { const { id: _, ...data } = original; await addTransaction(data); }
        },
        addCardTransaction: async (tx: Omit<CardTransaction, 'id'>) => {
            const newTx = { ...tx, id: generateUUID() };
            setCardTransactions(prev => [...prev, newTx]);
            await syncItem('card_transactions', newTx);
        },
        updateCardTransaction: async (tx: CardTransaction) => {
            setCardTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
            await syncItem('card_transactions', tx);
        },
        deleteCardTransaction: async (id: string) => {
            setCardTransactions(prev => prev.filter(t => t.id !== id));
            await syncItem('card_transactions', { id }, 'delete');
        },
        addInvestment: async (inv: Omit<Investment, 'id'>) => {
            const newInv = { ...inv, id: generateUUID() };
            setInvestments(prev => [...prev, newInv]);
            await syncItem('investments', newInv);
        },
        updateInvestment: async (inv: Investment) => {
            setInvestments(prev => prev.map(i => i.id === inv.id ? inv : i));
            await syncItem('investments', inv);
        },
        deleteInvestment: async (id: string) => {
            setInvestments(prev => prev.filter(i => i.id !== id));
            await syncItem('investments', { id }, 'delete');
        },
        exportData: () => {
            const data = { transactions, plannedTransactions, cardTransactions, investments, categories, settings };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `flux_backup.json`; a.click();
        },
        importData: async (json: string) => {
            try {
                const data = JSON.parse(json);
                if (data.transactions) setTransactions(data.transactions);
                if (data.categories) setCategories(data.categories);
                if (data.cardTransactions) setCardTransactions(data.cardTransactions);
                if (data.plannedTransactions) setPlannedTransactions(data.plannedTransactions);
                if (data.investments) setInvestments(data.investments);
                return true;
            } catch (e) { return false; }
        },
        clearAllData: async () => {
            if (!supabase || !session) return;
            try {
                setLoading(true);
                await Promise.all([
                    supabase.from('transactions').delete().eq('user_id', session.user.id),
                    supabase.from('planned_transactions').delete().eq('user_id', session.user.id),
                    supabase.from('card_transactions').delete().eq('user_id', session.user.id),
                    supabase.from('investments').delete().eq('user_id', session.user.id),
                    supabase.from('categories').delete().eq('user_id', session.user.id),
                    supabase.from('settings').delete().eq('user_id', session.user.id),
                ]);
                setTransactions([]); setPlannedTransactions([]); setCardTransactions([]); setInvestments([]); setCategories([]); setSettings(DEFAULT_SETTINGS);
                await loadData();
            } catch (e) { console.error("Erro ao resetar dados:", e); } finally { setLoading(false); }
        }
    };
};


import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, PlannedTransaction, CardTransaction, CardRegistry, Category, AppSettings, Investment, Budget } from '../types';
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

// Function used for internal date calculations
// @ts-ignore
const getMonthDiff = (date1: string, date2: string) => {
    const d1 = new Date(date1 + 'T12:00:00Z');
    const d2 = new Date(date2 + 'T12:00:00Z');
    return (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 + (d2.getUTCMonth() - d1.getUTCMonth());
};

export const useFinanceData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedTransactions, setPlannedTransactions] = useState<PlannedTransaction[]>([]);
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [cardRegistries, setCardRegistries] = useState<CardRegistry[]>([]);
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
                const { error } = await supabase.from(table).delete().eq('id', item.id);
                if (error) throw error;
            } else {
                let dataToSync = { ...item, user_id: session.user.id };
                if (table === 'categories') {
                    (dataToSync as any).include_in_tithing = item.includeInTithing;
                }
                const { error } = await supabase.from(table).upsert(dataToSync);
                if (error) throw error;
            }
        } catch (e: any) {
            console.error(`Erro crítico ao sincronizar ${table}:`, JSON.stringify(e, null, 2));
            setError(`Falha ao salvar no banco: ${e.message || 'Erro desconhecido'}`);
        }
    };

    const loadData = useCallback(async () => {
        if (!supabase || !session) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [txs, pln, crd, creg, inv, cat, bud, set] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('planned_transactions').select('*'),
                supabase.from('card_transactions').select('*'),
                supabase.from('card_registries').select('*'),
                supabase.from('investments').select('*'),
                supabase.from('categories').select('*').order('sort_order', { ascending: true }),
                supabase.from('budgets').select('*'),
                supabase.from('settings').select('*').single()
            ]);

            if (cat.data) {
                if (cat.data.length === 0) {
                    const seedCategories = INITIAL_CATEGORIES_TEMPLATE.map((c, idx) => ({
                        ...c,
                        id: generateUUID(),
                        user_id: session.user.id,
                        sort_order: idx
                    }));
                    const { data: insertedCats } = await supabase.from('categories').insert(seedCategories).select();
                    if (insertedCats) setCategories(insertedCats);
                } else {
                    const normalizedCategories = cat.data.map((c: any) => ({
                        ...c,
                        includeInTithing: c.includeInTithing ?? c.include_in_tithing ?? c.includeintithing ?? (c.type === 'income'),
                        sort_order: c.sort_order ?? c.sortorder
                    }));
                    setCategories(normalizedCategories);
                }
            }

            if (txs.data) setTransactions(txs.data);
            if (pln.data) setPlannedTransactions(pln.data);
            if (crd.data) setCardTransactions(crd.data);
            if (creg.data) setCardRegistries(creg.data || []);
            if (inv.data) setInvestments(inv.data);
            if (bud.data) setBudgets(bud.data);
            if (set.data) setSettings(set.data || DEFAULT_SETTINGS);
            else setSettings(DEFAULT_SETTINGS);
        } catch (err: any) {
            console.error("Erro ao carregar dados:", err);
            setError("Erro ao carregar dados do servidor.");
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

    const addMultipleTransactions = async (txs: Omit<Transaction, 'id'>[]) => {
        const newTxs = txs.map(tx => ({ ...tx, id: generateUUID() }));
        setTransactions(prev => [...newTxs, ...prev]);
        if (supabase && session) {
            await supabase.from('transactions').insert(newTxs.map(t => ({ ...t, user_id: session.user.id })));
        }
    };

    const updateTransaction = async (tx: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
        await syncItem('transactions', tx);
    };

    const deleteTransaction = async (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        await syncItem('transactions', { id }, 'delete');
    };

    const deleteMultipleTransactions = async (ids: string[]) => {
        setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
        if (supabase && session) {
            await supabase.from('transactions').delete().in('id', ids);
        }
    };

    const updateMultipleTransactionsCategory = async (ids: string[], categoryId: string) => {
        setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, categoryId } : t));
        if (supabase && session) {
            await supabase.from('transactions').update({ categoryId }).in('id', ids);
        }
    };

    const duplicateTransaction = async (id: string) => {
        const original = transactions.find(t => t.id === id);
        if (original) {
            const { id: _, ...data } = original;
            await addTransaction(data);
        }
    };

    const addPlannedTransaction = async (tx: Omit<PlannedTransaction, 'id' | 'status'>, recurrenceCount: number = 0) => {
        const items: PlannedTransaction[] = [];
        const start = new Date(tx.dueDate + 'T12:00:00Z');
        const rId = generateUUID();
        
        for (let i = 0; i <= recurrenceCount; i++) {
            const d = addMonthsWithEndOfMonthCheck(start, i);
            const newItem: PlannedTransaction = {
                ...tx,
                id: generateUUID(),
                dueDate: d.toISOString().split('T')[0],
                status: 'pending',
                // Fix: Corrected property name from is_budget to is_budget_goal on line 163
                is_budget_goal: tx.is_budget_goal,
                recurrence_id: rId
            };
            items.push(newItem);
        }
        setPlannedTransactions(prev => [...prev, ...items]);
        if (supabase && session) {
            await supabase.from('planned_transactions').insert(items.map(t => ({ ...t, user_id: session.user.id })));
        }
    };

    const updatePlannedTransaction = async (tx: PlannedTransaction, updateFuture: boolean = false) => {
        if (updateFuture) {
            const original = plannedTransactions.find(p => p.id === tx.id);
            if (original && original.recurrence_id) {
                const updates = plannedTransactions.filter(p => p.recurrence_id === original.recurrence_id && p.dueDate >= original.dueDate);
                const updatedItems = plannedTransactions.map(p => {
                    const match = updates.find(u => u.id === p.id);
                    if (match) {
                        return { ...p, amount: tx.amount, categoryId: tx.categoryId, description: tx.description };
                    }
                    return p;
                });
                setPlannedTransactions(updatedItems);
                if (supabase && session) {
                    await supabase.from('planned_transactions').update({ 
                        amount: tx.amount, 
                        categoryId: tx.categoryId, 
                        description: tx.description 
                    }).eq('recurrence_id', original.recurrence_id).gte('dueDate', original.dueDate);
                }
                return;
            }
        }
        setPlannedTransactions(prev => prev.map(p => p.id === tx.id ? tx : p));
        await syncItem('planned_transactions', tx);
    };

    const deletePlannedTransaction = async (id: string, deleteFuture: boolean = false) => {
        if (deleteFuture) {
            const original = plannedTransactions.find(p => p.id === id);
            if (original && original.recurrence_id) {
                setPlannedTransactions(prev => prev.filter(p => !(p.recurrence_id === original.recurrence_id && p.dueDate >= original.dueDate)));
                if (supabase && session) {
                    await supabase.from('planned_transactions').delete().eq('recurrence_id', original.recurrence_id).gte('dueDate', original.dueDate);
                }
                return;
            }
        }
        setPlannedTransactions(prev => prev.filter(p => p.id !== id));
        await syncItem('planned_transactions', { id }, 'delete');
    };

    const duplicatePlannedTransaction = async (id: string) => {
        const original = plannedTransactions.find(p => p.id === id);
        if (original) {
            const { id: _, status: __, ...data } = original;
            await addPlannedTransaction(data);
        }
    };

    const markPlannedTransactionAsPaid = async (pt: PlannedTransaction) => {
        const newPt = { ...pt, status: 'paid' as const };
        setPlannedTransactions(prev => prev.map(p => p.id === pt.id ? newPt : p));
        await syncItem('planned_transactions', newPt);
        
        await addTransaction({
            amount: pt.amount,
            type: pt.type,
            categoryId: pt.categoryId,
            date: new Date().toISOString().split('T')[0],
            description: pt.description || 'Pagamento planejado'
        });
    };

    const unmarkPlannedTransactionAsPaid = async (pt: PlannedTransaction) => {
        const newPt = { ...pt, status: 'pending' as const };
        setPlannedTransactions(prev => prev.map(p => p.id === pt.id ? newPt : p));
        await syncItem('planned_transactions', newPt);
    };

    const addCardTransaction = async (tx: Omit<CardTransaction, 'id'>) => {
        const newTx = { ...tx, id: generateUUID() };
        setCardTransactions(prev => [...prev, newTx]);
        await syncItem('card_transactions', newTx);
    };

    const updateCardTransaction = async (tx: CardTransaction) => {
        setCardTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
        await syncItem('card_transactions', tx);
    };

    const deleteCardTransaction = async (id: string) => {
        setCardTransactions(prev => prev.filter(t => t.id !== id));
        await syncItem('card_transactions', { id }, 'delete');
    };

    const addCardRegistry = async (reg: Omit<CardRegistry, 'id'>) => {
        const newReg = { ...reg, id: generateUUID() };
        setCardRegistries(prev => [...prev, newReg]);
        await syncItem('card_registries', newReg);
    };

    const updateCardRegistry = async (reg: CardRegistry) => {
        setCardRegistries(prev => prev.map(r => r.id === reg.id ? reg : r));
        await syncItem('card_registries', reg);
    };

    const deleteCardRegistry = async (id: string) => {
        setCardRegistries(prev => prev.filter(r => r.id !== id));
        await syncItem('card_registries', { id }, 'delete');
    };

    const addInvestment = async (inv: Omit<Investment, 'id'>) => {
        const newInv = { ...inv, id: generateUUID() };
        setInvestments(prev => [...prev, newInv]);
        await syncItem('investments', newInv);
    };

    const updateInvestment = async (inv: Investment) => {
        setInvestments(prev => prev.map(i => i.id === inv.id ? inv : i));
        await syncItem('investments', inv);
    };

    const deleteInvestment = async (id: string) => {
        setInvestments(prev => prev.filter(i => i.id !== id));
        await syncItem('investments', { id }, 'delete');
    };

    const addCategory = async (cat: Omit<Category, 'id'>) => {
        const newCat = { ...cat, id: generateUUID(), sort_order: categories.length };
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

    const updateCategoryOrder = async (newOrder: Category[]) => {
        const ordered = newOrder.map((c, i) => ({ ...c, sort_order: i }));
        setCategories(ordered);
        if (supabase && session) {
            for (const cat of ordered) {
                await supabase.from('categories').update({ sort_order: cat.sort_order }).eq('id', cat.id);
            }
        }
    };

    const updateSettings = async (newSettings: AppSettings) => {
        setSettings(newSettings);
        if (supabase && session) {
            await supabase.from('settings').upsert({ ...newSettings, user_id: session.user.id });
        }
    };

    const clearAllData = async () => {
        if (!supabase || !session) return;
        await Promise.all([
            supabase.from('transactions').delete().eq('user_id', session.user.id),
            supabase.from('planned_transactions').delete().eq('user_id', session.user.id),
            supabase.from('card_transactions').delete().eq('user_id', session.user.id),
            supabase.from('card_registries').delete().eq('user_id', session.user.id),
            supabase.from('investments').delete().eq('user_id', session.user.id),
            supabase.from('budgets').delete().eq('user_id', session.user.id),
        ]);
        window.location.reload();
    };

    const exportData = () => {
        const data = { transactions, plannedTransactions, cardTransactions, cardRegistries, investments, categories, budgets, settings };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flux_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const importData = async (json: string) => {
        try {
            const data = JSON.parse(json);
            if (supabase && session) {
                // Simplified import
                if (data.transactions) await supabase.from('transactions').upsert(data.transactions.map((t: any) => ({ ...t, user_id: session.user.id })));
                // In a full app, other tables would be imported similarly
            }
            window.location.reload();
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const getMonthlySummary = useCallback((date: Date) => {
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthTxs = transactions.filter(t => {
            const d = new Date(t.date + 'T12:00:00Z');
            return d.getUTCMonth() === month && d.getUTCFullYear() === year;
        });
        const income = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { income, expense };
    }, [transactions]);

    const getGeneratedMovementForMonth = useCallback((monthPrefix: string) => {
        return []; // Placeholder for movement generation logic
    }, []);

    const generatedCardInvoices = useMemo(() => {
        const invoices: PlannedTransaction[] = [];
        cardTransactions.forEach(tx => {
            const registry = cardRegistries.find(r => r.name === tx.card);
            const purchaseDate = new Date(tx.purchaseDate + 'T12:00:00Z');
            const monthlyAmount = tx.totalAmount / tx.installments;
            
            for (let i = 1; i <= tx.installments; i++) {
                const dueDate = new Date(purchaseDate);
                dueDate.setUTCMonth(purchaseDate.getUTCMonth() + i);
                if (registry) {
                    dueDate.setUTCDate(registry.due_day);
                }
                
                invoices.push({
                    id: `gen_card_${tx.id}_${i}`,
                    amount: monthlyAmount,
                    type: 'expense',
                    categoryId: 'cat_expense_card',
                    description: `${tx.name} (${i}/${tx.installments})`,
                    dueDate: dueDate.toISOString().split('T')[0],
                    status: 'pending',
                    isGenerated: true,
                    group: 'Cartão'
                });
            }
        });
        return invoices;
    }, [cardTransactions, cardRegistries]);

    const generatedTithing = useMemo(() => {
        if (!settings.calculateTithing) return [];
        
        const monthlyIncomes = new Map<string, number>();
        transactions.filter(t => t.type === 'income').forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            if (cat && cat.includeInTithing) {
                const monthKey = t.date.substring(0, 7);
                monthlyIncomes.set(monthKey, (monthlyIncomes.get(monthKey) || 0) + t.amount);
            }
        });

        const tithings: PlannedTransaction[] = [];
        monthlyIncomes.forEach((amount, monthKey) => {
            tithings.push({
                id: `gen_tithing_${monthKey}`,
                amount: amount * 0.1,
                type: 'expense',
                categoryId: categories.find(c => c.name === 'Dizimo')?.id || 'cat_expense_tithing',
                description: `Dízimo Automático - ${monthKey}`,
                dueDate: `${monthKey}-10`,
                status: 'pending',
                isGenerated: true,
                group: 'Dizimo'
            });
        });
        return tithings;
    }, [transactions, settings.calculateTithing, categories]);

    const totalBalance = useMemo(() => {
        return transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
    }, [transactions]);

    return {
        transactions,
        categories,
        addTransaction,
        duplicateTransaction,
        addMultipleTransactions,
        updateTransaction,
        deleteTransaction,
        getMonthlySummary,
        deleteMultipleTransactions,
        updateMultipleTransactionsCategory,
        getGeneratedMovementForMonth,
        plannedTransactions,
        generatedCardInvoices,
        generatedTithing,
        addPlannedTransaction,
        updatePlannedTransaction,
        deletePlannedTransaction,
        duplicatePlannedTransaction,
        markPlannedTransactionAsPaid,
        unmarkPlannedTransactionAsPaid,
        cardTransactions,
        cardRegistries,
        addCardTransaction,
        updateCardTransaction,
        deleteCardTransaction,
        addCardRegistry,
        updateCardRegistry,
        deleteCardRegistry,
        investments,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        addCategory,
        updateCategory,
        deleteCategory,
        updateCategoryOrder,
        loading,
        error,
        totalBalance,
        exportData,
        importData,
        clearAllData,
        settings,
        updateSettings
    };
};

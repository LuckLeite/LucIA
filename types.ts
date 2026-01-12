
import type { FC, SVGProps } from 'react';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string; // ISO string format
  description: string;
}

export interface PlannedTransaction {
  id:string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  description: string;
  dueDate: string; // ISO string format for the due date
  status: 'pending' | 'paid';
  isGenerated?: boolean;
  is_budget_goal?: boolean; 
  group?: string; 
  group_name?: string; // Adicionado para suportar a propriedade usada na UI
  recurrence_id?: string; // Novo campo para desvincular séries duplicadas
}

export interface CardTransaction {
  id: string;
  name: string;
  card: string;
  totalAmount: number;
  installments: number;
  purchaseDate: string; // ISO string format
}

export interface CardRegistry {
  id: string;
  name: string;
  due_day: number;
}

export type InvestmentType = 'fixed' | 'stock' | 'fund' | 'crypto' | 'other';
export type IndexerType = 'CDI' | 'IPCA' | 'PRE';

export interface Investment {
    id: string;
    name: string;
    type: InvestmentType;
    amount: number; // Valor Aportado
    currentBalance: number; // Saldo Atual
    startDate: string;
    liquidity: string; // Ex: D+0, 20/12/2025
    rateType: IndexerType;
    rateValue: number; // e.g., 100 (% of CDI), 6 (IPCA + 6%), 12 (12% PRE)
    categoryId: string; // Optional linkage to category for color/icon
    group?: string; 
}

export interface Category {
  id: string;
  name: string;
  iconName: string; 
  color: string;
  type: TransactionType;
  includeInTithing?: boolean;
  sort_order?: number; // Campo para ordenação manual
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  period: 'monthly';
}

export interface AppSettings {
  calculateTithing: boolean;
}

export type Theme = 'light' | 'dark';

export type View = 'dashboard' | 'planned' | 'cards' | 'categories' | 'investments' | 'budgets';

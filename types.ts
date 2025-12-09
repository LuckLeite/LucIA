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
}

export interface CardTransaction {
  id: string;
  name: string;
  card: string;
  totalAmount: number;
  installments: number;
  purchaseDate: string; // ISO string format
}


export interface Category {
  id: string;
  name: string;
  iconName: string; // Changed from Component to string for JSON storage
  color: string;
  type: TransactionType;
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  period: 'monthly';
}

export type Theme = 'light' | 'dark';

export type View = 'dashboard' | 'planned' | 'cards' | 'categories';
import React from 'react';
import type { Category } from './types';

// SVG Icon Components
const UtensilsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement('path', { d: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" }),
    React.createElement('path', { d: "M7 2v20" }),
    React.createElement('path', { d: "M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" })
  )
);
const BusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement('path', { d: "M8 6v6" }),
    React.createElement('path', { d: "M16 6v6" }),
    React.createElement('path', { d: "M2 12h19.6" }),
    React.createElement('path', { d: "M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.4 6.8 19.8 6 19 6H5c-.8 0-1.4.8-1.6 1.8L2 12v8h2" }),
    React.createElement('circle', { cx: "7", cy: "18", r: "2" }),
    React.createElement('path', { d: "M9 18h5" }),
    React.createElement('circle', { cx: "17", cy: "18", r: "2" })
  )
);
const ClapperboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
      React.createElement('path', { d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" }),
      React.createElement('path', { d: "m6.2 5.3 3.1 3.9" }),
      React.createElement('path', { d: "m12.4 3.7 3.1 3.9" }),
      React.createElement('path', { d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" })
    )
);
const PiggyBankIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
      React.createElement('path', { d: "M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2-1-.5-2-1-3-1-1 0-2 0-3 1 .5-1 1-2 1-3 0-2-2-4-4-4Z" }),
      React.createElement('path', { d: "M2 9v1c0 1.1.9 2 2 2h1" }),
      React.createElement('path', { d: "M16 5h0" })
    )
);
const DollarSignIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement('line', { x1: "12", x2: "12", y1: "2", y2: "22" }),
    React.createElement('path', { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" })
  )
);
const ReceiptIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }), React.createElement('path', { d: "M16 8h-6a2 2 0 1 0 0 4h6" }), React.createElement('path', { d: "M12 18.5A2.5 2.5 0 0 0 9.5 16v0" }));
const Undo2Icon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M9 14 4 9l5-5" }), React.createElement('path', { d: "M4 9h10.5a8.5 8.5 0 1 1-4.18 15.37" }));
const MoreHorizontalIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('circle', { cx: "12", cy: "12", r: "1" }), React.createElement('circle', { cx: "19", cy: "12", r: "1" }), React.createElement('circle', { cx: "5", cy: "12", r: "1" }));
const WalletIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3v1a2 2 0 0 1-2 2H3s-1-1-1-4 1-4 1-4h3" }), React.createElement('path', { d: "M12 12h.01" }));
const TrendingUpIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('polyline', { points: "22 7 13.5 15.5 8.5 10.5 2 17" }), React.createElement('polyline', { points: "16 7 22 7 22 13" }));
const TagIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.432 0l6.568-6.568a2.426 2.426 0 0 0 0-3.432L12.586 2.586z" }), React.createElement('circle', { cx: "8.5", cy: "8.5", r: ".5", fill: "currentColor" }));
const SproutIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M7 20h10" }), React.createElement('path', { d: "M10 20c5.5-2.5.8-6.4 3-10" }), React.createElement('path', { d: "M9.5 9.4c1.1.8 1.8 2.2 1.5 3.6-1.1.8-2.6 1-3.6.5s-1.8-2.2-1.5-3.6c1-1.1 2.5-1.1 3.6-.5z" }), React.createElement('path', { d: "M14.1 6.3c.9.9 1.5 2.2 1.3 3.5-.7.9-2 1.2-3.1.9s-1.8-1.8-1.5-2.9c.8-1.1 2.1-1.1 3.3-.5z" }));
const RepeatIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "m17 2 4 4-4 4" }), React.createElement('path', { d: "M3 11v-1a4 4 0 0 1 4-4h14" }), React.createElement('path', { d: "m7 22-4-4 4-4" }), React.createElement('path', { d: "M21 13v1a4 4 0 0 1-4 4H3" }));
const CandyIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M21 10a3.5 3.5 0 0 1-4 4L10 21a3.5 3.5 0 0 1-4-4l7-7a3.5 3.5 0 0 1 4 4Z" }), React.createElement('path', { d: "m15 7 2.5-2.5" }), React.createElement('path', { d: "m13.5 15.5 7-7" }), React.createElement('path', { d: "m8.5 8.5-1-1" }), React.createElement('path', { d: "m3 14 2.5 2.5" }), React.createElement('path', { d: "m18 15.5-1-1" }), React.createElement('circle', { cx: "9", cy: "15", r: "1" }), React.createElement('circle', { cx: "15", cy: "9", r: "1" }));
const BookOpenIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" }), React.createElement('path', { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" }));
const ShirtIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" }));
const ChurchIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2" }), React.createElement('path', { d: "M14 22v-4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v4" }), React.createElement('path', { d: "M18 22V5l-6-3-6 3v17" }), React.createElement('path', { d: "M12 7v5" }), React.createElement('path', { d: "M10 9h4" }));
const PillIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" }), React.createElement('path', { d: "m8.5 8.5 7 7" }));
const CreditCardIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('rect', { width: "20", height: "14", x: "2", y: "5", rx: "2" }), React.createElement('line', { x1: "2", x2: "22", y1: "10", y2: "10" }));
const GiftIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('rect', { x: "3", y: "8", width: "18", height: "4", rx: "1" }), React.createElement('path', { d: "M12 8v13" }), React.createElement('path', { d: "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" }), React.createElement('path', { d: "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" }));
const HeartIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" }));
const HomeIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path', { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }), React.createElement('polyline', { points: "9 22 9 12 15 12 15 22" }));
const ImportFileIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement('path',{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),React.createElement('polyline',{points:"14 2 14 8 20 8"}),React.createElement('path',{d:"m12 18-3-3 3-3"}),React.createElement('path',{d:"M9 15h6"}));


export const INITIAL_CATEGORIES: Category[] = [
  // Receitas
  { id: 'cat_income_salary', name: 'Salário', icon: DollarSignIcon, color: '#16a34a', type: 'income' },
  { id: 'cat_income_accounting', name: 'Contabilidade', icon: ReceiptIcon, color: '#15803d', type: 'income' },
  { id: 'cat_income_reversal', name: 'Estorno', icon: Undo2Icon, color: '#059669', type: 'income' },
  { id: 'cat_income_others', name: 'Outros', icon: MoreHorizontalIcon, color: '#047857', type: 'income' },
  { id: 'cat_income_cashback', name: 'Cashback', icon: WalletIcon, color: '#06b6d4', type: 'income' },
  { id: 'cat_income_investment_return', name: 'Retorno de Investimento', icon: TrendingUpIcon, color: '#0891b2', type: 'income' },
  { id: 'cat_income_sales', name: 'Vendas', icon: TagIcon, color: '#0e7490', type: 'income' },
  { id: 'cat_income_dividends', name: 'Dividendos', icon: SproutIcon, color: '#155e75', type: 'income' },
  { id: 'cat_income_movement', name: 'Movimento', icon: RepeatIcon, color: '#164e63', type: 'income' },
  { id: 'cat_income_imported', name: 'Importado - Receita', icon: ImportFileIcon, color: '#0d9488', type: 'income' },

  // Despesas
  { id: 'cat_expense_food', name: 'Alimentação', icon: UtensilsIcon, color: '#ea580c', type: 'expense' },
  { id: 'cat_expense_sweets', name: 'Doces', icon: CandyIcon, color: '#d97706', type: 'expense' },
  { id: 'cat_expense_education', name: 'Educação', icon: BookOpenIcon, color: '#ca8a04', type: 'expense' },
  { id: 'cat_expense_fun', name: 'Diversão', icon: ClapperboardIcon, color: '#a16207', type: 'expense' },
  { id: 'cat_expense_clothing', name: 'Vestuário', icon: ShirtIcon, color: '#4d7c0f', type: 'expense' },
  { id: 'cat_expense_tithing', name: 'Dizimo', icon: ChurchIcon, color: '#65a30d', type: 'expense' },
  { id: 'cat_expense_others', name: 'Outros', icon: MoreHorizontalIcon, color: '#84cc16', type: 'expense' },
  { id: 'cat_expense_pharmacy', name: 'Farmácia', icon: PillIcon, color: '#be123c', type: 'expense' },
  { id: 'cat_expense_investment', name: 'Investimento', icon: PiggyBankIcon, color: '#db2777', type: 'expense' },
  { id: 'cat_expense_card', name: 'Cartão', icon: CreditCardIcon, color: '#9d174d', type: 'expense' },
  { id: 'cat_expense_gift', name: 'Presente', icon: GiftIcon, color: '#86198f', type: 'expense' },
  { id: 'cat_expense_transport', name: 'Transporte', icon: BusIcon, color: '#7e22ce', type: 'expense' },
  { id: 'cat_expense_necessities', name: 'Necessários', icon: HomeIcon, color: '#6d28d9', type: 'expense' },
  { id: 'cat_expense_wedding', name: 'Casamento', icon: HeartIcon, color: '#5b21b6', type: 'expense' },
  { id: 'cat_expense_movement', name: 'Movimento', icon: RepeatIcon, color: '#4c1d95', type: 'expense' },
  { id: 'cat_expense_imported', name: 'Importado - Despesa', icon: ImportFileIcon, color: '#7f1d1d', type: 'expense' },
];
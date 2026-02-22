
import React, { useState, useImperativeHandle, forwardRef } from 'react';

interface FloatingCalculatorProps {
  isOpen: boolean;
  onToggle: () => void;
}

export interface FloatingCalculatorRef {
  injectValue: (val: number) => void;
}

const FloatingCalculator = forwardRef<FloatingCalculatorRef, FloatingCalculatorProps>(({ isOpen, onToggle }, ref) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);

  useImperativeHandle(ref, () => ({
    injectValue: (val: number) => {
      const numStr = String(val);
      if (isNewNumber) {
        setDisplay(numStr);
        setIsNewNumber(false);
      } else {
        // Se não for um novo número, podemos decidir se substituímos ou se apenas ignoramos.
        // Para UX de "clicar para somar", se o usuário já digitou algo e clica num valor,
        // talvez ele queira que esse valor seja o novo número se ele acabou de clicar num operador.
        // O estado isNewNumber já rastreia isso (fica true após clicar num operador).
        setDisplay(numStr);
        setIsNewNumber(false);
      }
    }
  }));

  const handleNumber = (num: string) => {
    if (isNewNumber) {
        setDisplay(num);
        setIsNewNumber(false);
    } else {
        setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setIsNewNumber(true);
  };

  const calculate = () => {
    try {
        const fullEquation = equation + display;
        // eslint-disable-next-line no-eval
        const result = eval(fullEquation.replace('x', '*').replace('÷', '/'));
        setDisplay(String(result));
        setEquation('');
        setIsNewNumber(true);
    } catch (e) {
        setDisplay('Erro');
        setEquation('');
        setIsNewNumber(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
    setIsNewNumber(true);
  };

  return (
    <div className="fixed bottom-36 right-6 z-50 flex flex-col items-end">
        {isOpen && (
            <div className="mb-4 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-5">
                <div className="bg-gray-100 dark:bg-slate-900 p-4 text-right">
                    <div className="text-xs text-gray-500 h-4">{equation}</div>
                    <div className="text-2xl font-mono text-gray-800 dark:text-gray-100 truncate">{display}</div>
                </div>
                <div className="grid grid-cols-4 gap-1 p-2 bg-gray-50 dark:bg-slate-800">
                    <button onClick={clear} className="col-span-3 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-3 rounded font-bold">C</button>
                    <button onClick={() => handleOperator('/')} className="bg-primary-100 hover:bg-primary-200 text-primary-600 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-bold">÷</button>
                    
                    {[7, 8, 9].map(n => <button key={n} onClick={() => handleNumber(String(n))} className="bg-white hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-semibold dark:text-gray-200">{n}</button>)}
                    <button onClick={() => handleOperator('*')} className="bg-primary-100 hover:bg-primary-200 text-primary-600 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-bold">x</button>
                    
                    {[4, 5, 6].map(n => <button key={n} onClick={() => handleNumber(String(n))} className="bg-white hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-semibold dark:text-gray-200">{n}</button>)}
                    <button onClick={() => handleOperator('-')} className="bg-primary-100 hover:bg-primary-200 text-primary-600 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-bold">-</button>
                    
                    {[1, 2, 3].map(n => <button key={n} onClick={() => handleNumber(String(n))} className="bg-white hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-semibold dark:text-gray-200">{n}</button>)}
                    <button onClick={() => handleOperator('+')} className="bg-primary-100 hover:bg-primary-200 text-primary-600 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-bold">+</button>
                    
                    <button onClick={() => handleNumber('0')} className="col-span-2 bg-white hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-semibold dark:text-gray-200">0</button>
                    <button onClick={() => handleNumber('.')} className="bg-white hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 p-3 rounded font-bold dark:text-gray-200">.</button>
                    <button onClick={calculate} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded font-bold">=</button>
                </div>
            </div>
        )}
        <button 
            onClick={onToggle} 
            className={`p-3 rounded-full shadow-lg transition-colors flex items-center justify-center ${isOpen ? 'bg-red-500 text-white' : 'bg-gray-800 dark:bg-white text-white dark:text-gray-900'}`}
            title="Calculadora"
        >
            {isOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><line x1="8" x2="8" y1="14" y2="18"/><line x1="12" x2="12" y1="14" y2="18"/><line x1="8" x2="16" y1="10" y2="10"/></svg>
            )}
        </button>
    </div>
  );
});

FloatingCalculator.displayName = 'FloatingCalculator';

export default FloatingCalculator;

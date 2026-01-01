
import React, { useState, useRef } from 'react';
import Modal from './ui/Modal';
import type { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportData: () => void;
  importData: (json: string) => boolean | Promise<boolean>;
  clearAllData: () => void;
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, exportData, importData, clearAllData, settings, updateSettings }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const success = await importData(text);
            setImportStatus(success ? 'success' : 'error');
            if(success) {
                 setTimeout(() => {
                     onClose();
                     setImportStatus('idle');
                 }, 1500);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleClearClick = () => {
        if(window.confirm("Tem certeza que deseja apagar TODOS os seus dados salvos? Seus lançamentos, cartões e categorias personalizadas serão excluídos permanentemente. Seu usuário continuará existindo.")) {
            clearAllData();
            onClose();
        }
    };

    const toggleTithing = () => {
        updateSettings({
            ...settings,
            calculateTithing: !settings.calculateTithing
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gerenciamento e Configurações">
            <div className="space-y-6">
                
                {/* General Settings Section */}
                <div className="space-y-4">
                     <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-slate-700 pb-2">Geral</h3>
                     
                     <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">Calcular dízimo automaticamente</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Gera um lançamento de despesa planejado (10%) baseado nas receitas do mês.</p>
                        </div>
                        <button 
                            onClick={toggleTithing}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${settings.calculateTithing ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${settings.calculateTithing ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                     </div>
                </div>


                {/* Data Management Section */}
                <div className="space-y-4 pt-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-slate-700 pb-2">Dados</h3>
                    
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-3 mt-2">
                            <button 
                                onClick={exportData}
                                className="flex-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded shadow-sm flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Exportar Dados
                            </button>
                            
                            <button 
                                onClick={handleImportClick}
                                className="flex-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded shadow-sm flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                Importar Backup
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept=".json" 
                                className="hidden" 
                            />
                        </div>
                        {importStatus === 'success' && <p className="text-green-600 text-sm mt-1">Dados importados com sucesso!</p>}
                        {importStatus === 'error' && <p className="text-red-600 text-sm mt-1">Erro ao importar arquivo. Verifique o formato.</p>}
                    </div>

                    <div className="pt-4 border-t dark:border-slate-700">
                         <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">Zona de Perigo</h3>
                         <button 
                            onClick={handleClearClick}
                            className="w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 font-semibold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            Apagar Tudo (Resetar Conta)
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button onClick={onClose} className="py-2 px-4 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 transition-colors">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;

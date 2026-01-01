
import React, { useState } from 'react';
import Modal from './ui/Modal';
import type { Transaction, Category } from '../types';

declare const XLSX: any;

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transactions: Omit<Transaction, 'id'>[]) => void;
  categories: Category[];
}

type ParsedTransaction = Omit<Transaction, 'id'>;

const getTagValue = (text: string, tagName: string): string => {
    const startTag = `<${tagName}>`;
    const endTag = `</${tagName}>`;
    const startIndex = text.indexOf(startTag);
    if (startIndex === -1) return '';
    const endIndex = text.indexOf(endTag, startIndex);
    if (endIndex === -1) return '';
    return text.substring(startIndex + startTag.length, endIndex).trim();
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSubmit, categories }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (fileToParse: File) => {
    const fileExtension = fileToParse.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parseExcel(fileToParse);
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) {
            setError("Não foi possível ler o arquivo.");
            return;
        }
        try {
            let transactions: ParsedTransaction[] = [];
            if (fileExtension === 'ofx') {
                transactions = parseOfx(text);
            } else {
                transactions = parseCsv(text);
            }
            handleParsedData(transactions, fileExtension);
        } catch (err: any) {
            handleError(err);
        }
    };
    reader.onerror = () => setError("Erro ao ler o arquivo.");
    reader.readAsText(fileToParse, 'ISO-8859-1');
  };

  const handleParsedData = (transactions: ParsedTransaction[], fileType: string | undefined) => {
      if (transactions.length === 0) {
        setError(`Nenhuma transação válida foi encontrada no arquivo. Verifique o formato do arquivo ${fileType?.toUpperCase()}.`);
        setParsedTransactions([]);
        setSelectedIndices(new Set());
      } else {
        setError(null);
        setParsedTransactions(transactions);
        setSelectedIndices(new Set(transactions.map((_, i) => i)));
      }
  };

  const handleError = (err: any) => {
    setError(err.message || "Ocorreu um erro ao processar o arquivo.");
    setParsedTransactions([]);
    setSelectedIndices(new Set());
    console.error(err);
  };

  const findCategoryIdByName = (name: string, type: 'income' | 'expense'): string => {
      if (!name) return type === 'income' ? 'cat_income_imported' : 'cat_expense_imported';
      const normalizedName = name.trim().toLowerCase();
      const match = categories.find(c => c.type === type && c.name.toLowerCase() === normalizedName);
      if (match) return match.id;
      return type === 'income' ? 'cat_income_imported' : 'cat_expense_imported';
  };

  const parseExcel = async (fileToParse: File) => {
      try {
          const arrayBuffer = await fileToParse.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          if (jsonData.length === 0) throw new Error("Arquivo Excel vazio.");
          const transactions: ParsedTransaction[] = [];
          const findKey = (row: any, keyword: string) => Object.keys(row).find(k => k.toLowerCase().includes(keyword.toLowerCase()));
          for (const row of jsonData as any[]) {
             const dateKey = findKey(row, 'data');
             const descKey = findKey(row, 'descrição') || findKey(row, 'descricao');
             const valKey = findKey(row, 'valor');
             const entryKey = findKey(row, 'identificação entrada') || findKey(row, 'identificacao entrada');
             const exitKey = findKey(row, 'identificação saída') || findKey(row, 'identificacao saida');
             if (!dateKey || !valKey) continue;
             if (!row[dateKey] || row[valKey] === undefined || row[valKey] === "") continue;
             let dateISO = new Date().toISOString().split('T')[0];
             let dateStr = row[dateKey];
             if (typeof dateStr === 'number') {
                const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                dateISO = dateObj.toISOString().split('T')[0];
             } else if (typeof dateStr === 'string') {
                 const parts = dateStr.split('/');
                 if (parts.length === 3) dateISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                 else {
                    const parsed = new Date(dateStr);
                    if (!isNaN(parsed.getTime())) dateISO = parsed.toISOString().split('T')[0];
                 }
             }
             const description = descKey ? row[descKey] : 'Importado Excel';
             let amount = parseFloat(String(row[valKey]).replace(',', '.'));
             if (isNaN(amount)) continue;
             const entryValue = entryKey ? row[entryKey] : null;
             const exitValue = exitKey ? row[exitKey] : null;
             let type: 'income' | 'expense';
             let categoryId: string;
             if (entryValue) { type = 'income'; categoryId = findCategoryIdByName(String(entryValue), 'income'); } 
             else if (exitValue) { type = 'expense'; categoryId = findCategoryIdByName(String(exitValue), 'expense'); } 
             else { type = amount >= 0 ? 'income' : 'expense'; categoryId = type === 'income' ? 'cat_income_imported' : 'cat_expense_imported'; }
             transactions.push({ date: dateISO, description: String(description), amount: Math.abs(amount), type, categoryId });
          }
          handleParsedData(transactions, 'excel');
      } catch (err: any) { handleError(err); }
  };
  
  const parseOfx = (text: string): ParsedTransaction[] => {
      const transactions: ParsedTransaction[] = [];
      const transactionBlocks = text.split('<STMTTRN>');
      transactionBlocks.shift();
      for (const block of transactionBlocks) {
          const amountStr = getTagValue(block, 'TRNAMT');
          const dateStr = getTagValue(block, 'DTPOSTED');
          const description = getTagValue(block, 'MEMO');
          if (!amountStr || !dateStr || !description) continue;
          const amount = parseFloat(amountStr);
          if (isNaN(amount)) continue;
          const year = parseInt(dateStr.substring(0, 4), 10);
          const month = parseInt(dateStr.substring(4, 6), 10) - 1;
          const day = parseInt(dateStr.substring(6, 8), 10);
          const date = new Date(year, month, day).toISOString().split('T')[0];
          const type = amount >= 0 ? 'income' : 'expense';
          transactions.push({ date, description, amount: Math.abs(amount), type, categoryId: type === 'income' ? 'cat_income_imported' : 'cat_expense_imported' });
      }
      return transactions;
  };

  const parseCsv = (text: string): ParsedTransaction[] => {
    const lines = text.trim().replace(/\r\n/g, '\n').split('\n');
    const headerLine = lines.shift()?.trim();
    if (!headerLine) throw new Error("Arquivo CSV vazio.");
    let separator = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const dateIndex = headers.findIndex(h => h.includes('data'));
    const valorIndex = headers.findIndex(h => h.includes('valor'));
    if (dateIndex === -1 || valorIndex === -1) throw new Error("Cabeçalho CSV inválido.");
    return lines.map((line) => {
      const columns = line.split(separator).map(c => c.trim().replace(/"/g, ''));
      if (columns.length <= Math.max(dateIndex, valorIndex)) return null;
      const dateParts = columns[dateIndex].split('/');
      if (dateParts.length !== 3) return null;
      const date = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
      const amount = parseFloat(columns[valorIndex].replace(/\./g, '').replace(',', '.'));
      if (isNaN(amount)) return null;
      const type = amount >= 0 ? 'income' : 'expense';
      return { date, description: 'Importado CSV', amount: Math.abs(amount), type, categoryId: type === 'income' ? 'cat_income_imported' : 'cat_expense_imported' };
    }).filter((tx): tx is ParsedTransaction => tx !== null);
  }

  const handleDownloadTemplate = () => {
    // Definimos os dados com cabeçalhos claros e um exemplo com acentos
    const data = [
        ["Data", "Descrição", "Valor", "Identificação Entrada", "Identificação Saída"],
        ["01/01/2024", "Salário Mensal", 5000.00, "Salário", ""],
        ["02/01/2024", "Alimentação Mercado", 150.00, "", "Alimentação"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flux - Modelo de Importação");
    
    // Escrever o arquivo XLSX diretamente
    XLSX.writeFile(wb, "modelo_importacao_flux.xlsx");
  };

  const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIndices(new Set(parsedTransactions.map((_, i) => i)));
    else setSelectedIndices(new Set());
  };

  const handleToggleOne = (index: number) => {
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
      return newSet;
    });
  };

  const handleCategoryChange = (index: number, newCategoryId: string) => {
    setParsedTransactions(prev => prev.map((tx, i) => i === index ? { ...tx, categoryId: newCategoryId } : tx));
  };

  const handleSubmit = () => {
    const selectedTransactions = parsedTransactions.filter((_, index) => selectedIndices.has(index));
    if (selectedTransactions.length > 0) { onSubmit(selectedTransactions); handleClose(); }
  };
  
  const handleClose = () => {
    setParsedTransactions([]); setSelectedIndices(new Set()); setError(null); onClose();
    const fileInput = document.getElementById('import-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Extrato / Planilha" size="4xl">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full">
            <label htmlFor="import-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecione o arquivo</label>
            <input type="file" id="import-file" accept=".csv,.ofx,.xlsx,.xls" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-slate-700 dark:file:text-primary-300 dark:hover:file:bg-slate-600" />
          </div>
          <button onClick={handleDownloadTemplate} className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Baixar Modelo Excel (.xlsx)
          </button>
        </div>
        <div className="mt-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 border-l-2 border-primary-500 pl-3">
            <p><strong>Formatos aceitos:</strong> OFX, CSV e Excel (.xlsx, .xls).</p>
            <p className="mt-1">DICA: Use o modelo Excel (.xlsx) para evitar problemas com acentos (ç, ã, é).</p>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-3 rounded-md">{error}</p>}
        {parsedTransactions.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Pré-visualização ({selectedIndices.size} selecionadas)</h3>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2 w-10 text-center"><input type="checkbox" checked={parsedTransactions.length > 0 && selectedIndices.size === parsedTransactions.length} onChange={handleToggleAll} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /></th>
                    <th className="p-2">Data</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2">Valor</th>
                    <th className="p-2">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {parsedTransactions.map((tx, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                       <td className="p-2 text-center"><input type="checkbox" checked={selectedIndices.has(index)} onChange={() => handleToggleOne(index)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" /></td>
                      <td className="p-2 whitespace-nowrap">{new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="p-2 truncate max-w-xs">{tx.description}</td>
                      <td className={`p-2 font-mono ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                       <td className="p-2">
                           <select value={tx.categoryId} onChange={(e) => handleCategoryChange(index, e.target.value)} className="block w-full p-1 text-[11px] bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded">
                               {categories.filter(c => c.type === tx.type).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                           </select>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-4 pt-4">
            <button onClick={handleClose} className="py-2 px-4 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
            <button onClick={handleSubmit} disabled={selectedIndices.size === 0} className="py-2 px-4 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-slate-600 transition-colors">Importar Selecionadas</button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportModal;

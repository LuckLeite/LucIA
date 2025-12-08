import React, { useState } from 'react';
import Modal from './ui/Modal';
import type { Transaction, Category } from '../types';

// Declarando variável global do XLSX carregada via script no index.html
declare const XLSX: any;

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transactions: Omit<Transaction, 'id'>[]) => void;
  categories: Category[];
}

type ParsedTransaction = Omit<Transaction, 'id'>;

// Helper to extract value from a simple XML-like tag
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
    reader.readAsText(fileToParse, 'ISO-8859-1'); // Common encoding for bank files
  };

  const handleParsedData = (transactions: ParsedTransaction[], fileType: string | undefined) => {
      if (transactions.length === 0) {
        setError(`Nenhuma transação válida foi encontrada no arquivo. Verifique o formato do arquivo ${fileType?.toUpperCase()}.`);
        setParsedTransactions([]);
        setSelectedIndices(new Set());
      } else {
        setError(null);
        setParsedTransactions(transactions);
        setSelectedIndices(new Set(transactions.map((_, i) => i))); // Select all by default
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
          
          // Convert to JSON with raw values to detect headers easier
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          if (jsonData.length === 0) throw new Error("Arquivo Excel vazio.");

          const transactions: ParsedTransaction[] = [];

          // Helper to find key case-insensitively
          const findKey = (row: any, keyword: string) => Object.keys(row).find(k => k.toLowerCase().includes(keyword.toLowerCase()));

          for (const row of jsonData as any[]) {
             // Look for specific columns requested by user
             const dateKey = findKey(row, 'data');
             const descKey = findKey(row, 'descrição') || findKey(row, 'descricao');
             const valKey = findKey(row, 'valor');
             const entryKey = findKey(row, 'identificação entrada') || findKey(row, 'identificacao entrada');
             const exitKey = findKey(row, 'identificação saída') || findKey(row, 'identificacao saida');

             // Require Date and Value as minimum
             if (!dateKey || !valKey) continue;
             if (!row[dateKey] || row[valKey] === undefined || row[valKey] === "") continue;

             // Date Parsing (Handle Excel Serial Date or String)
             let dateStr = row[dateKey];
             let dateISO = new Date().toISOString().split('T')[0];
             
             if (typeof dateStr === 'number') {
                // Excel serial date
                const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                dateISO = dateObj.toISOString().split('T')[0];
             } else if (typeof dateStr === 'string') {
                 // Try parsing PT-BR format DD/MM/YYYY
                 const parts = dateStr.split('/');
                 if (parts.length === 3) {
                     dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
                 } else {
                    // Try standard parsing
                    const parsed = new Date(dateStr);
                    if (!isNaN(parsed.getTime())) dateISO = parsed.toISOString().split('T')[0];
                 }
             }

             const description = descKey ? row[descKey] : 'Importado Excel';
             let amount = parseFloat(row[valKey]);
             if (isNaN(amount)) continue; // skip invalid amounts

             // Logic to determine Type and Category based on 'identificação' columns
             const entryValue = entryKey ? row[entryKey] : null;
             const exitValue = exitKey ? row[exitKey] : null;

             let type: 'income' | 'expense';
             let categoryId: string;

             if (entryValue) {
                 type = 'income';
                 categoryId = findCategoryIdByName(String(entryValue), 'income');
             } else if (exitValue) {
                 type = 'expense';
                 categoryId = findCategoryIdByName(String(exitValue), 'expense');
             } else {
                 // Fallback if neither identification column has data, infer by value sign
                 type = amount >= 0 ? 'income' : 'expense';
                 categoryId = type === 'income' ? 'cat_income_imported' : 'cat_expense_imported';
             }

             transactions.push({
                 date: dateISO,
                 description: String(description),
                 amount: Math.abs(amount),
                 type,
                 categoryId
             });
          }

          handleParsedData(transactions, 'excel');

      } catch (err: any) {
          handleError(err);
      }
  };
  
  const parseOfx = (text: string): ParsedTransaction[] => {
      const transactions: ParsedTransaction[] = [];
      const transactionBlocks = text.split('<STMTTRN>');
      transactionBlocks.shift(); // Remove header part

      if (transactionBlocks.length === 0) {
          throw new Error("Nenhuma transação encontrada no bloco <BANKTRANLIST> do arquivo OFX.");
      }

      for (const block of transactionBlocks) {
          const amountStr = getTagValue(block, 'TRNAMT');
          const dateStr = getTagValue(block, 'DTPOSTED');
          const description = getTagValue(block, 'MEMO');
          
          if (!amountStr || !dateStr || !description) continue;

          const amount = parseFloat(amountStr);
          if (isNaN(amount)) continue;

          // Date format is YYYYMMDD...
          const year = parseInt(dateStr.substring(0, 4), 10);
          const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
          const day = parseInt(dateStr.substring(6, 8), 10);
          const date = new Date(year, month, day).toISOString().split('T')[0];

          const type = amount >= 0 ? 'income' : 'expense';
          const categoryId = type === 'income' ? 'cat_income_imported' : 'cat_expense_imported';

          transactions.push({
              date,
              description,
              amount: Math.abs(amount),
              type,
              categoryId,
          });
      }
      return transactions;
  };

  const parseCsv = (text: string): ParsedTransaction[] => {
    const lines = text.trim().replace(/\r\n/g, '\n').split('\n');
    const headerLine = lines.shift()?.trim();
    if (!headerLine) {
        throw new Error("Arquivo CSV está vazio ou sem cabeçalho.");
    }

    let separator = '';
    if (headerLine.includes('\t')) separator = '\t';
    else if (headerLine.includes(';')) separator = ';';
    else if (headerLine.includes(',')) separator = ',';
    
    if (!separator) throw new Error("Não foi possível detectar o separador de colunas (esperado: tabulação, ponto e vírgula ou vírgula).");
    
    const headers = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const hasData = headers.some(h => h.includes('data'));
    const hasHist = headers.some(h => h.includes('hist'));
    const hasDesc = headers.some(h => h.includes('descri'));
    const hasValor = headers.some(h => h.includes('valor'));

    if (!hasData || !hasHist || !hasDesc || !hasValor) {
        throw new Error("O cabeçalho do arquivo não contém as colunas esperadas: 'Data', 'Histórico', 'Descrição' e 'Valor'.");
    }

    const dateIndex = headers.findIndex(h => h.includes('data'));
    const histIndex = headers.findIndex(h => h.includes('hist'));
    const descIndex = headers.findIndex(h => h.includes('descri'));
    const valorIndex = headers.findIndex(h => h.includes('valor'));

    return lines.map((line) => {
      const columns = line.split(separator).map(c => c.trim().replace(/"/g, ''));
      if (columns.length <= Math.max(dateIndex, histIndex, descIndex, valorIndex)) return null;

      const dateStr = columns[dateIndex];
      const history = columns[histIndex];
      const descriptionCol = columns[descIndex];
      const valueStr = columns[valorIndex];
      
      if (!dateStr || !valueStr || valueStr.trim() === '') return null;
      
      const dateParts = dateStr.trim().split('/');
      if (dateParts.length !== 3) return null;
      const [day, month, year] = dateParts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      const date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString().split('T')[0];

      const description = `${(history || '').trim()} / ${(descriptionCol || '').trim()}`;
      const cleanedValueStr = valueStr.trim().replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(cleanedValueStr);

      if (isNaN(amount)) return null;
      
      const type = amount >= 0 ? 'income' : 'expense';
      const categoryId = type === 'income' ? 'cat_income_imported' : 'cat_expense_imported';

      return { date, description, amount: Math.abs(amount), type, categoryId };
    }).filter((tx): tx is ParsedTransaction => tx !== null);
  }

  const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIndices(new Set(parsedTransactions.map((_, i) => i)));
    } else {
      setSelectedIndices(new Set());
    }
  };

  const handleToggleOne = (index: number) => {
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleCategoryChange = (index: number, newCategoryId: string) => {
    setParsedTransactions(prev => prev.map((tx, i) => 
        i === index ? { ...tx, categoryId: newCategoryId } : tx
    ));
  };

  const handleSubmit = () => {
    const selectedTransactions = parsedTransactions.filter((_, index) => selectedIndices.has(index));
    if (selectedTransactions.length > 0) {
      onSubmit(selectedTransactions);
      handleClose();
    }
  };
  
  const handleClose = () => {
    setFile(null);
    setParsedTransactions([]);
    setSelectedIndices(new Set());
    setError(null);
    onClose();
    const fileInput = document.getElementById('import-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Extrato / Planilha" size="4xl">
      <div className="space-y-4">
        <div>
          <label htmlFor="import-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selecione o arquivo
          </label>
          <input
            type="file"
            id="import-file"
            accept=".csv,.txt,.tsv,.ofx,.xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-slate-700 dark:file:text-primary-300 dark:hover:file:bg-slate-600"
          />
           <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
               <p><strong>Formatos aceitos:</strong> OFX (Bancos), CSV e Excel (.xlsx, .xls).</p>
               <p className="mt-1"><strong>Para Excel:</strong> As colunas devem conter "Data", "Descrição" e "Valor".</p>
               <p>Para categorização automática, use colunas "Identificação Entrada" (para receitas) e "Identificação Saída" (para despesas).</p>
           </div>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-3 rounded-md">{error}</p>}
        {parsedTransactions.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Pré-visualização ({selectedIndices.size} de {parsedTransactions.length} transações selecionadas)</h3>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2 w-10 text-center">
                       <input 
                        type="checkbox"
                        aria-label="Selecionar todas as transações"
                        checked={parsedTransactions.length > 0 && selectedIndices.size === parsedTransactions.length}
                        onChange={handleToggleAll}
                        className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-primary-600 focus:ring-primary-500 dark:bg-slate-900 dark:focus:ring-offset-slate-800"
                      />
                    </th>
                    <th className="p-2">Data</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2">Valor</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {parsedTransactions.map((tx, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                       <td className="p-2 text-center">
                         <input 
                            type="checkbox" 
                            aria-label={`Selecionar transação: ${tx.description}`}
                            checked={selectedIndices.has(index)} 
                            onChange={() => handleToggleOne(index)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-primary-600 focus:ring-primary-500 dark:bg-slate-900 dark:focus:ring-offset-slate-800"
                         />
                      </td>
                      <td className="p-2">{new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="p-2 truncate max-w-xs" title={tx.description}>{tx.description}</td>
                      <td className={`p-2 font-mono ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                        {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                       <td className="p-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                            {tx.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                       </td>
                       <td className="p-2">
                           <select 
                                value={tx.categoryId}
                                onChange={(e) => handleCategoryChange(index, e.target.value)}
                                className="block w-full p-1 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                           >
                               {categories.filter(c => c.type === tx.type).map(cat => (
                                   <option key={cat.id} value={cat.id}>{cat.name}</option>
                               ))}
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
            <button onClick={handleClose} className="py-2 px-4 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600">Cancelar</button>
            <button 
                onClick={handleSubmit} 
                disabled={selectedIndices.size === 0}
                className="py-2 px-4 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed dark:disabled:bg-slate-600 dark:disabled:text-slate-400">
                Importar {selectedIndices.size} Transações
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportModal;
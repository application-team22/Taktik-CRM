import { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, AlertCircle, X, Database } from 'lucide-react';
import { translations } from '../lib/translations';
import * as XLSX from 'xlsx';
import Toast from './Toast';

interface ImportClientsProps {
  language: 'EN' | 'AR';
}

interface ParsedClient {
  name: string;
  phone_number: string;
  destination: string;
  country: string;
  status: string;
  price: number;
}

type TabType = 'txt-to-excel' | 'excel-to-db';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ImportClients({ language }: ImportClientsProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<TabType>('txt-to-excel');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedClient[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File, expectedExtension: string): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setToast({ message: `File size exceeds 10MB limit`, type: 'error' });
      return false;
    }

    if (!file.name.endsWith(expectedExtension)) {
      setToast({ message: `Please upload a valid ${expectedExtension} file`, type: 'error' });
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (activeTab === 'txt-to-excel') {
      if (validateFile(droppedFile, '.txt')) {
        setFile(droppedFile);
        parseTextFile(droppedFile);
      }
    } else {
      if (validateFile(droppedFile, '.xlsx') || validateFile(droppedFile, '.xls')) {
        setFile(droppedFile);
        parseExcelFile(droppedFile);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (activeTab === 'txt-to-excel') {
      if (validateFile(selectedFile, '.txt')) {
        setFile(selectedFile);
        parseTextFile(selectedFile);
      }
    } else {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        if (selectedFile.size > MAX_FILE_SIZE) {
          setToast({ message: `File size exceeds 10MB limit`, type: 'error' });
          return;
        }
        setFile(selectedFile);
        parseExcelFile(selectedFile);
      } else {
        setToast({ message: `Please upload a valid Excel file`, type: 'error' });
      }
    }
  };

  const parseTextFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        setToast({ message: t.import.emptyFile, type: 'error' });
        setIsProcessing(false);
        return;
      }

      if (lines.length < 2) {
        setToast({ message: 'File must contain at least a header row and one data row', type: 'error' });
        setIsProcessing(false);
        return;
      }

      const detectDelimiter = (line: string): string => {
        if (line.includes('\t')) return '\t';
        if (line.includes(',')) return ',';
        return ' ';
      };

      const delimiter = detectDelimiter(lines[0]);

      const parseCSVLine = (line: string, delimiter: string): string[] => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      };

      const headers = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

      const parsedClients: ParsedClient[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line, delimiter);

        if (values.length < 4) continue;

        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        parsedClients.push({
          name: row.name || row.client_name || row.customer_name || 'Unknown',
          phone_number: row.phone_number || row.phone || row.mobile || row.contact || '',
          destination: row.destination || row.city || row.location || '',
          country: row.country || row.nation || '',
          status: row.status || row.lead_status || 'New Lead',
          price: parseFloat(row.price || row.amount || row.cost || '0') || 0,
        });
      }

      if (parsedClients.length === 0) {
        setToast({ message: t.import.parseError, type: 'error' });
      } else {
        setParsedData(parsedClients);
        setToast({ message: `Found ${parsedClients.length} clients`, type: 'success' });
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setToast({ message: t.import.parseError, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadExcel = () => {
    if (parsedData.length === 0) {
      setToast({ message: t.import.noDataToExport, type: 'error' });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(parsedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clients-import-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    setToast({ message: t.import.exportSuccess, type: 'success' });
  };

  const parseExcelFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        setToast({ message: t.import.emptyFile, type: 'error' });
        setIsProcessing(false);
        return;
      }

      const parsedClients: ParsedClient[] = [];

      for (const row of jsonData) {
        const record: any = row;
        parsedClients.push({
          name: record.name || record.Name || 'Unknown',
          phone_number: record.phone_number || record['Phone Number'] || record.phone || '',
          destination: record.destination || record.Destination || '',
          country: record.country || record.Country || '',
          status: record.status || record.Status || 'New Lead',
          price: parseFloat(record.price || record.Price || 0),
        });
      }

      if (parsedClients.length === 0) {
        setToast({ message: t.import.parseError, type: 'error' });
      } else {
        setParsedData(parsedClients);
        setToast({ message: `${t.import.parseSuccess} ${parsedClients.length} ${t.import.records}`, type: 'success' });
      }
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setToast({ message: t.import.parseError, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportToDatabase = async () => {
    if (parsedData.length === 0) {
      setToast({ message: 'No data to import', type: 'error' });
      return;
    }

    setIsImporting(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.from('clients').insert(parsedData);

      if (error) throw error;

      setToast({ message: `Successfully imported ${parsedData.length} clients to database!`, type: 'success' });
      setParsedData([]);
      setFile(null);
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing to database:', error);
      setToast({ message: 'Failed to import clients to database. Please try again.', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (excelInputRef.current) {
      excelInputRef.current.value = '';
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    handleReset();
  };

  return (
    <div className="space-y-6" dir={language === 'AR' ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t.import.title}</h1>
        <p className="text-sm md:text-base text-blue-100 font-medium">{t.import.subtitle}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-2 px-4">
            <button
              onClick={() => handleTabChange('txt-to-excel')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 ${
                activeTab === 'txt-to-excel'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              TXT to Excel Converter
            </button>
            <button
              onClick={() => handleTabChange('excel-to-db')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 ${
                activeTab === 'excel-to-db'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="w-5 h-5" />
              Import Excel to Database
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'txt-to-excel' ? (
            <>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Upload TXT File</h2>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />

                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-gray-900 mb-1">{t.import.dragDrop}</p>
                    <p className="text-sm text-gray-600">{t.import.or}</p>
                  </div>

                  <label
                    htmlFor="file-upload"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 cursor-pointer"
                  >
                    Choose File
                  </label>

                  <p className="text-xs text-gray-500 mt-2">Accepted format: .txt files only (max 10MB)</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Upload Excel File</h2>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-upload"
                />

                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Database className="w-8 h-8 text-green-600" />
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-gray-900 mb-1">Drag and drop your Excel file here</p>
                    <p className="text-sm text-gray-600">or</p>
                  </div>

                  <label
                    htmlFor="excel-upload"
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-200 hover:shadow-xl hover:scale-105 cursor-pointer"
                  >
                    Choose File
                  </label>

                  <p className="text-xs text-gray-500 mt-2">Accepted formats: .xlsx, .xls files (max 10MB)</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {file && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className={`flex items-center justify-between ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex items-center gap-3 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t.import.processing}</p>
          </div>
        </div>
      )}

      {parsedData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${language === 'AR' ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}>
            <div className={`flex items-center gap-3 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-lg md:text-xl font-bold text-gray-900">{t.import.previewTitle}</h2>
            </div>
            <div className={`flex flex-col sm:flex-row gap-3 ${language === 'AR' ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}>
              <button
                onClick={handleReset}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 hover:scale-105 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <X className="w-5 h-5" />
                Clear
              </button>
              {activeTab === 'txt-to-excel' && (
                <button
                  onClick={handleDownloadExcel}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-200 hover:shadow-xl hover:scale-105 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Download className="w-5 h-5" />
                  {t.import.downloadExcel}
                </button>
              )}
              {activeTab === 'excel-to-db' && (
                <button
                  onClick={handleImportToDatabase}
                  disabled={isImporting}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Database className="w-5 h-5" />
                  {isImporting ? 'Importing...' : 'Import to Database'}
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-semibold">
              Found {parsedData.length} clients
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t.fields.name}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t.fields.phoneNumber}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t.fields.destination}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t.fields.country}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t.fields.status}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t.fields.price}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedData.map((client, index) => (
                  <tr key={index} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{client.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{client.phone_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{client.destination}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{client.country}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{client.status}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">${client.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className={`flex items-start gap-3 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              {activeTab === 'txt-to-excel' ? 'File Format Guide' : 'Excel Format Guide'}
            </h3>
            {activeTab === 'txt-to-excel' ? (
              <>
                <p className="text-sm text-blue-800 mb-3">Your TXT file should contain client data with fields separated by commas, tabs, or spaces:</p>
                <div className="bg-white rounded-lg p-4 font-mono text-xs text-gray-800">
                  <p className="mb-1">Name, Phone Number, Destination, Country, Status, Price</p>
                  <p className="mb-1">John Doe, +1234567890, Paris, USA, Interested, 1500</p>
                  <p>Jane Smith, +0987654321, London, Canada, New Lead, 2000</p>
                </div>
                <p className="text-xs text-blue-700 mt-3">Fields: Name, Phone, Destination, Country, Status, Price</p>
              </>
            ) : (
              <>
                <p className="text-sm text-blue-800 mb-3">Your Excel file should contain the following columns:</p>
                <div className="bg-white rounded-lg p-4 text-xs text-gray-800">
                  <p className="font-semibold mb-2">Required columns:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>name or Name</li>
                    <li>phone_number or Phone Number or phone</li>
                    <li>destination or Destination</li>
                    <li>country or Country</li>
                    <li>status or Status</li>
                    <li>price or Price</li>
                  </ul>
                </div>
                <p className="text-xs text-blue-700 mt-3">The column names are case-insensitive and can use underscores or spaces</p>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          language={language}
        />
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, AlertCircle, X } from 'lucide-react';
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

export default function ImportClients({ language }: ImportClientsProps) {
  const t = translations[language];
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedClient[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.txt')) {
      setFile(droppedFile);
      parseTextFile(droppedFile);
    } else {
      setToast({ message: t.import.invalidFileType, type: 'error' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.txt')) {
      setFile(selectedFile);
      parseTextFile(selectedFile);
    } else {
      setToast({ message: t.import.invalidFileType, type: 'error' });
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

      const parsedClients: ParsedClient[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        let values: string[];
        if (line.includes('\t')) {
          values = line.split('\t');
        } else if (line.includes(',')) {
          values = line.split(',');
        } else {
          values = line.split(/\s+/);
        }

        values = values.map(v => v.trim()).filter(v => v);

        if (values.length >= 4) {
          parsedClients.push({
            name: values[0] || 'Unknown',
            phone_number: values[1] || '',
            destination: values[2] || '',
            country: values[3] || '',
            status: values[4] || 'New Lead',
            price: parseFloat(values[5]) || 0,
          });
        }
      }

      if (parsedClients.length === 0) {
        setToast({ message: t.import.parseError, type: 'error' });
      } else {
        setParsedData(parsedClients);
        setToast({ message: `${t.import.parseSuccess} ${parsedClients.length} ${t.import.records}`, type: 'success' });
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

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6" dir={language === 'AR' ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t.import.title}</h1>
        <p className="text-sm md:text-base text-blue-100 font-medium">{t.import.subtitle}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{t.import.uploadTitle}</h2>

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
              {t.import.browseFiles}
            </label>

            <p className="text-xs text-gray-500 mt-2">{t.import.acceptedFormat}</p>
          </div>
        </div>

        {file && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
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
        )}

        {isProcessing && (
          <div className="mt-6 text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t.import.processing}</p>
          </div>
        )}
      </div>

      {parsedData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className={`flex items-center justify-between mb-6 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex items-center gap-3 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-lg md:text-xl font-bold text-gray-900">{t.import.previewTitle}</h2>
            </div>
            <button
              onClick={handleDownloadExcel}
              className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-200 hover:shadow-xl hover:scale-105 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Download className="w-5 h-5" />
              {t.import.downloadExcel}
            </button>
          </div>

          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>{parsedData.length}</strong> {t.import.recordsParsed}
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
                {parsedData.slice(0, 10).map((client, index) => (
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

          {parsedData.length > 10 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              {t.import.showingFirst} 10 {t.import.of} {parsedData.length} {t.import.records}
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className={`flex items-start gap-3 ${language === 'AR' ? 'flex-row-reverse' : 'flex-row'}`}>
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">{t.import.formatGuideTitle}</h3>
            <p className="text-sm text-blue-800 mb-3">{t.import.formatGuideDesc}</p>
            <div className="bg-white rounded-lg p-4 font-mono text-xs text-gray-800">
              <p>John Doe, +1234567890, Paris, USA, Interested, 1500</p>
              <p>Jane Smith, +0987654321, London, Canada, New Lead, 2000</p>
            </div>
            <p className="text-xs text-blue-700 mt-3">{t.import.formatNote}</p>
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

import { useState } from 'react';
import { Upload, Sparkles, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';
import { intelligentFieldMapping, FieldMapping } from '../lib/openai';
import { detectCountryFromPhone, formatPhoneNumber } from '../lib/phoneCountryDetector';
import { supabase } from '../lib/supabase';

interface ImportClientsProps {
  language: 'EN' | 'AR';
  onNavigateToClients: () => void;
}

export default function ImportClients({ language, onNavigateToClients }: ImportClientsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const isRTL = language === 'AR';

  const requiredFields = [
    { key: 'name', label: language === 'EN' ? 'Name' : 'الاسم', required: true },
    { key: 'phone_number', label: language === 'EN' ? 'Phone Number' : 'رقم الهاتف', required: true },
    { key: 'destination', label: language === 'EN' ? 'Destination' : 'الوجهة', required: true },
    { key: 'status', label: language === 'EN' ? 'Status (Optional)' : 'الحالة (اختياري)', required: false },
    { key: 'price', label: language === 'EN' ? 'Price' : 'السعر', required: true },
    { key: 'country', label: language === 'EN' ? 'Country (Auto-detected)' : 'البلد (تلقائي)', required: false },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    try {
      const text = await uploadedFile.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));

      setParsedData({ headers, rows });

      // Use AI to map fields
      const aiMapping = await intelligentFieldMapping(headers, rows);
      setMapping(aiMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing file:', error);
      alert(language === 'EN' ? 'Error parsing file. Please check the format.' : 'خطأ في قراءة الملف. تحقق من التنسيق.');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field: keyof FieldMapping, value: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, [field]: value || null });
  };

  const handleImport = async () => {
    if (!parsedData || !mapping) return;

    setImporting(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      const mappedData = parsedData.rows.map(row => {
        const rowData: any = {};
        Object.entries(mapping).forEach(([key, headerName]) => {
          if (headerName) {
            const index = parsedData.headers.indexOf(headerName);
            if (index !== -1) {
              rowData[key] = row[index];
            }
          }
        });

        // Auto-detect country from phone number if country is missing
        if (rowData.phone_number && !rowData.country) {
          const detectedCountry = detectCountryFromPhone(rowData.phone_number);
          if (detectedCountry) {
            rowData.country = detectedCountry;
          }
        }

        // Format phone number
        if (rowData.phone_number) {
          rowData.phone_number = formatPhoneNumber(rowData.phone_number);
        }

        // Set status to "New Lead" if not provided or empty
        if (!rowData.status || rowData.status.trim() === '') {
          rowData.status = 'New Lead';
        }

        // Ensure required fields
        if (!rowData.name || !rowData.phone_number || !rowData.destination || !rowData.price) {
          return null;
        }

        return rowData;
      }).filter(row => row !== null);

      // Import to Supabase
      for (const clientData of mappedData) {
        try {
          const { error } = await supabase
            .from('clients')
            .insert([clientData]);

          if (error) {
            console.error('Error importing client:', error);
            failedCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error('Error:', err);
          failedCount++;
        }
      }

      setImportResult({ success: successCount, failed: failedCount });
      setStep('complete');
    } catch (error) {
      console.error('Import error:', error);
      alert(language === 'EN' ? 'Import failed. Please try again.' : 'فشل الاستيراد. حاول مرة أخرى.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setMapping(null);
    setImportResult(null);
  };

  const getMappingStatus = () => {
    if (!mapping) return { mapped: 0, total: 4 };
    const requiredMapped = [
      mapping.name,
      mapping.phone_number,
      mapping.destination,
      mapping.price
    ].filter(v => v !== null).length;
    return { mapped: requiredMapped, total: 4 };
  };

  const status = getMappingStatus();
  const isComplete = status.mapped === status.total;

  return (
    <div className="max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'EN' ? 'AI-Powered Import' : 'استيراد ذكي بالذكاء الاصطناعي'}
            </h2>
            <p className="text-sm text-gray-600">
              {language === 'EN' 
                ? 'Upload any CSV/TXT file - AI will map fields & detect countries automatically'
                : 'قم بتحميل أي ملف - سيقوم الذكاء الاصطناعي بتعيين الحقول واكتشاف البلدان تلقائيًا'}
            </p>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div>
            <label className="block border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50/50">
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {language === 'EN' ? 'Drop your file here or click to browse' : 'اسحب ملفك هنا أو انقر للتصفح'}
              </p>
              <p className="text-sm text-gray-500">
                {language === 'EN' ? 'Supports .txt and .csv files' : 'يدعم ملفات .txt و .csv'}
              </p>
            </label>

            {/* Sample Format */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {language === 'EN' ? 'Example File Format:' : 'مثال على تنسيق الملف:'}
              </p>
              <pre className="text-xs text-gray-600 overflow-x-auto">
{`Name,Phone,Destination,Status,Price
John Doe,+90 532 555 1234,Paris,Contacted,2500
Jane Smith,+1 555 123 4567,Dubai,,3000`}
              </pre>
              <p className="text-xs text-blue-600 mt-2">
                {language === 'EN' 
                  ? '✓ Empty Status → "New Lead" | ✓ Country auto-detected from phone'
                  : '✓ حالة فارغة ← "عميل جديد" | ✓ البلد يُكتشف من الهاتف'}
              </p>
            </div>

            {loading && (
              <div className="mt-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 text-gray-600">
                  {language === 'EN' ? 'AI is analyzing your file...' : 'الذكاء الاصطناعي يحلل ملفك...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && mapping && parsedData && (
          <div>
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-gray-800">
                  {language === 'EN' ? 'AI Field Mapping' : 'تعيين الحقول بالذكاء الاصطناعي'}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {language === 'EN' 
                  ? `AI has mapped ${status.mapped} out of ${status.total} required fields. Review and adjust if needed.`
                  : `قام الذكاء الاصطناعي بتعيين ${status.mapped} من ${status.total} حقول مطلوبة. راجع وعدل إذا لزم الأمر.`}
              </p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {language === 'EN' 
                  ? 'Country auto-detected from phone | Status defaults to "New Lead" if not provided'
                  : 'البلد يُكتشف من الهاتف | الحالة افتراضياً "عميل جديد" إذا لم تُحدد'}
              </p>
              <div className="mt-3 w-full bg-white rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${(status.mapped / status.total) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-4">
              {requiredFields.map(({ key, label, required }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={mapping[key as keyof FieldMapping] || ''}
                      onChange={(e) => handleMappingChange(key as keyof FieldMapping, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">
                        {language === 'EN' ? '-- Select Column --' : '-- اختر عمود --'}
                      </option>
                      {parsedData.headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  {mapping[key as keyof FieldMapping] ? (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : required ? (
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 flex-shrink-0"></div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                {language === 'EN' ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                onClick={handleImport}
                disabled={!isComplete || importing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>{language === 'EN' ? 'Importing...' : 'جاري الاستيراد...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>{language === 'EN' ? 'Import Data' : 'استيراد البيانات'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && importResult && (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'EN' ? 'Import Complete!' : 'اكتمل الاستيراد!'}
              </h3>
              <p className="text-gray-600">
                {language === 'EN' 
                  ? `Successfully imported ${importResult.success} clients`
                  : `تم استيراد ${importResult.success} عميل بنجاح`}
              </p>
              {importResult.failed > 0 && (
                <p className="text-red-600 text-sm mt-2">
                  {language === 'EN' 
                    ? `${importResult.failed} clients failed to import`
                    : `فشل استيراد ${importResult.failed} عميل`}
                </p>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                {language === 'EN' ? 'Import More' : 'استيراد المزيد'}
              </button>
              <button
                onClick={onNavigateToClients}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800"
              >
                {language === 'EN' ? 'View Clients' : 'عرض العملاء'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Upload, Sparkles, CheckCircle, AlertCircle, FileText, Download, Edit2, Trash2 } from 'lucide-react';
import { intelligentFieldMapping, FieldMapping, extractLeadsFromConversation, ExtractedLead } from '../lib/openai';
import { detectCountryFromPhone, formatPhoneNumber } from '../lib/phoneCountryDetector';
import { supabase } from '../lib/supabase';

interface ImportClientsProps {
  language: 'EN' | 'AR';
  onNavigateToClients: () => void;
}

type FileType = 'csv' | 'conversation';

export default function ImportClients({ language, onNavigateToClients }: ImportClientsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  
  // CSV mode states
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
  
  // Conversation mode states
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
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
      
      // Detect file type: CSV or WhatsApp conversation
      const isCSV = text.includes(',') && text.split('\n')[0].split(',').length > 1;
      
      if (isCSV) {
        // CSV MODE: Existing logic
        setFileType('csv');
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));

        setParsedData({ headers, rows });

        // Use AI to map fields
        const aiMapping = await intelligentFieldMapping(headers, rows);
        setMapping(aiMapping);
        setStep('mapping');
      } else {
        // CONVERSATION MODE: New AI extraction
        setFileType('conversation');
        
        // Call Netlify Function to extract leads
        const leads = await extractLeadsFromConversation(text);
        
        if (leads.length === 0) {
          alert(language === 'EN' 
            ? 'No leads with phone numbers found in the conversation.' 
            : 'لم يتم العثور على عملاء محتملين بأرقام هواتف في المحادثة.');
          handleReset();
          return;
        }

        // Auto-detect country from phone numbers
        const leadsWithCountry = leads.map(lead => ({
          ...lead,
          country: detectCountryFromPhone(lead.phone_number) || 'Unknown',
        }));

        setExtractedLeads(leadsWithCountry);
        setStep('preview');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(language === 'EN' 
        ? 'Error processing file. Please check the format or try again.' 
        : 'خطأ في معالجة الملف. تحقق من التنسيق أو حاول مرة أخرى.');
      handleReset();
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field: keyof FieldMapping, value: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, [field]: value || null });
  };

  const handleEditLead = (index: number, field: keyof ExtractedLead, value: string) => {
    const updatedLeads = [...extractedLeads];
    updatedLeads[index] = { ...updatedLeads[index], [field]: value };
    setExtractedLeads(updatedLeads);
  };

  const handleDeleteLead = (index: number) => {
    setExtractedLeads(extractedLeads.filter((_, i) => i !== index));
  };

  const handleImportCSV = async () => {
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

  const handleImportConversation = async () => {
    if (extractedLeads.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const lead of extractedLeads) {
        try {
          const { error } = await supabase
            .from('clients')
            .insert([{
              name: lead.name,
              phone_number: lead.phone_number,
              destination: lead.destination,
              status: lead.status || 'New Lead',
              price: lead.price,
              country: lead.country || null,
            }]);

          if (error) {
            console.error('Error importing lead:', error);
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
    setFileType(null);
    setParsedData(null);
    setMapping(null);
    setExtractedLeads([]);
    setEditingIndex(null);
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
    <div className="max-w-5xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
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
                ? 'Upload CSV or WhatsApp conversations - AI extracts leads automatically'
                : 'قم بتحميل ملف CSV أو محادثات واتساب - يستخرج الذكاء الاصطناعي العملاء تلقائيًا'}
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
                {language === 'EN' ? 'Supports .txt (WhatsApp) and .csv files' : 'يدعم ملفات .txt (واتساب) و .csv'}
              </p>
            </label>

            {/* Sample Format */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CSV Example */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {language === 'EN' ? 'CSV Format:' : 'تنسيق CSV:'}
                </p>
                <pre className="text-xs text-gray-600 overflow-x-auto">
{`Name,Phone,Destination,Price
John,+90 532 555 1234,Paris,2500`}
                </pre>
              </div>

              {/* WhatsApp Example */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {language === 'EN' ? 'WhatsApp Format:' : 'تنسيق واتساب:'}
                </p>
                <pre className="text-xs text-gray-600 overflow-x-auto">
{`[5/8/23] John: Hi, need trip to Paris
[5/8/23] Agent: Sure! +90 532 555...
Price: 2500€`}
                </pre>
              </div>
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

        {/* Step 2: CSV Mapping */}
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
                  ? `AI has mapped ${status.mapped} out of ${status.total} required fields.`
                  : `قام الذكاء الاصطناعي بتعيين ${status.mapped} من ${status.total} حقول مطلوبة.`}
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
                onClick={handleImportCSV}
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

        {/* Step 2b: Preview Extracted Leads (Conversation mode) */}
        {step === 'preview' && extractedLeads.length > 0 && (
          <div>
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-gray-800">
                  {language === 'EN' 
                    ? `AI Extracted ${extractedLeads.length} Leads`
                    : `استخرج الذكاء الاصطناعي ${extractedLeads.length} عميل محتمل`}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {language === 'EN' 
                  ? 'Review and edit the extracted information before importing'
                  : 'راجع وعدّل المعلومات المستخرجة قبل الاستيراد'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left text-sm font-semibold">{language === 'EN' ? 'Name' : 'الاسم'}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{language === 'EN' ? 'Phone' : 'الهاتف'}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{language === 'EN' ? 'Destination' : 'الوجهة'}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{language === 'EN' ? 'Price' : 'السعر'}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{language === 'EN' ? 'Country' : 'البلد'}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">{language === 'EN' ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedLeads.map((lead, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {editingIndex === index ? (
                          <input
                            type="text"
                            value={lead.name}
                            onChange={(e) => handleEditLead(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="text-sm">{lead.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingIndex === index ? (
                          <input
                            type="text"
                            value={lead.phone_number}
                            onChange={(e) => handleEditLead(index, 'phone_number', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="text-sm font-mono">{lead.phone_number}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingIndex === index ? (
                          <input
                            type="text"
                            value={lead.destination}
                            onChange={(e) => handleEditLead(index, 'destination', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="text-sm">{lead.destination}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingIndex === index ? (
                          <input
                            type="text"
                            value={lead.price}
                            onChange={(e) => handleEditLead(index, 'price', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="text-sm">{lead.price}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{lead.country}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {editingIndex === index ? (
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingIndex(index)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLead(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                {language === 'EN' ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                onClick={handleImportConversation}
                disabled={importing || extractedLeads.length === 0}
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
                    <span>{language === 'EN' ? `Import ${extractedLeads.length} Leads` : `استيراد ${extractedLeads.length} عميل`}</span>
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
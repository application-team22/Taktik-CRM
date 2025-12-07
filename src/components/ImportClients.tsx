import { useState, useEffect } from 'react';
import { Upload, Sparkles, CheckCircle, FileText, Loader2, Clock, AlertCircle, X } from 'lucide-react';
import { detectCountryFromPhone } from '../lib/phoneCountryDetector';
import { supabase } from '../lib/supabase';

interface ImportClientsProps {
  language: 'EN' | 'AR';
  onNavigateToClients: () => void;
}

interface ExtractedLead {
  name: string;
  phone_number: string;
  destination: string;
  status: string;
  price: string;
  country?: string;
}

interface BatchStatus {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  total_chunks: number;
  processed_chunks: number;
  total_leads: number;
  leads_data: any;
  error_message: string | null;
}

const N8N_WEBHOOK_URL = 'https://n8n.boticslab.com/webhook/extract-leads';

export default function ImportClients({ language, onNavigateToClients }: ImportClientsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRTL = language === 'AR';

  const texts = {
    EN: {
      title: 'Import Clients from Conversation',
      subtitle: 'Upload WhatsApp or CSV file to extract leads automatically',
      uploadBtn: 'Choose File',
      dragDrop: 'or drag and drop',
      fileTypes: 'TXT or CSV files',
      processing: 'Processing your file...',
      extracting: 'Extracting leads with AI',
      wait: 'This may take a moment',
      preview: 'Preview Extracted Leads',
      importBtn: 'Import All to Database',
      importing: 'Importing...',
      complete: 'Import Complete!',
      success: 'successfully imported',
      failed: 'failed',
      viewClients: 'View All Clients',
      importAnother: 'Import Another File',
      cancel: 'Cancel',
      noLeads: 'No leads with phone numbers found',
      fileTooLarge: 'File is too large. Please split into smaller files.',
      errorPrefix: 'Error: ',
      chunks: 'Chunks',
      leads: 'leads found',
      name: 'Name',
      phone: 'Phone',
      destination: 'Destination',
      status: 'Status',
      price: 'Price',
      country: 'Country'
    },
    AR: {
      title: 'استيراد العملاء من المحادثة',
      subtitle: 'قم بتحميل ملف واتساب أو CSV لاستخراج العملاء المحتملين تلقائيًا',
      uploadBtn: 'اختر ملف',
      dragDrop: 'أو اسحب وأفلت',
      fileTypes: 'ملفات TXT أو CSV',
      processing: 'جاري معالجة الملف...',
      extracting: 'استخراج العملاء المحتملين بالذكاء الاصطناعي',
      wait: 'قد يستغرق هذا لحظة',
      preview: 'معاينة العملاء المحتملين المستخرجين',
      importBtn: 'استيراد الكل إلى قاعدة البيانات',
      importing: 'جاري الاستيراد...',
      complete: 'اكتمل الاستيراد!',
      success: 'تم الاستيراد بنجاح',
      failed: 'فشل',
      viewClients: 'عرض جميع العملاء',
      importAnother: 'استيراد ملف آخر',
      cancel: 'إلغاء',
      noLeads: 'لم يتم العثور على عملاء محتملين بأرقام هواتف',
      fileTooLarge: 'الملف كبير جدًا. يرجى تقسيمه إلى ملفات أصغر.',
      errorPrefix: 'خطأ: ',
      chunks: 'أجزاء',
      leads: 'عملاء محتملين',
      name: 'الاسم',
      phone: 'الهاتف',
      destination: 'الوجهة',
      status: 'الحالة',
      price: 'السعر',
      country: 'البلد'
    }
  };

  const t = texts[language];

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const pollBatchStatus = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error polling batch status:', error);
        return;
      }

      console.log('Batch status:', data);
      setBatchStatus(data);

      if (data.status === 'completed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        let leads: ExtractedLead[] = [];

        if (data.leads_data) {
          // Handle both string and object formats
          leads = typeof data.leads_data === 'string' 
            ? JSON.parse(data.leads_data) 
            : data.leads_data;
        }

        console.log('Extracted leads:', leads);

        if (leads.length > 0) {
          const leadsWithCountry = leads.map((lead: ExtractedLead) => ({
            ...lead,
            country: detectCountryFromPhone(lead.phone_number) || 'Unknown',
          }));
          
          console.log('Leads with country:', leadsWithCountry);
          setExtractedLeads(leadsWithCountry);
          setStep('preview');
          setLoading(false);
        } else {
          setErrorMessage(t.noLeads);
          handleReset();
        }
      } else if (data.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        setErrorMessage(data.error_message || 'Unknown error');
        handleReset();
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setErrorMessage(null);

    try {
      const text = await uploadedFile.text();
      console.log('File loaded, length:', text.length);
      
      if (text.length > 400000) {
        setErrorMessage(t.fileTooLarge);
        handleReset();
        setLoading(false);
        return;
      }
      
      setStep('processing');

      console.log('Sending to n8n webhook...');

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          conversationText: text 
        })
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to start processing: ${response.status} - ${responseText}`);
      }

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from webhook. Please check n8n workflow has a "Respond to Webhook" node.');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      const newBatchId = result.id;
      
      if (!newBatchId) {
        throw new Error('No batch ID returned from n8n. Response: ' + JSON.stringify(result));
      }

      console.log('Batch ID received:', newBatchId);
      setBatchId(newBatchId);

      const interval = setInterval(() => {
        pollBatchStatus(newBatchId);
      }, 3000);
      
      setPollingInterval(interval);
      pollBatchStatus(newBatchId);

    } catch (error) {
      console.error('File upload error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(errorMsg);
      handleReset();
      setLoading(false);
    }
  };

  const handleImportConversation = async () => {
    if (extractedLeads.length === 0) {
      console.error('No leads to import!');
      setErrorMessage('No leads to import');
      return;
    }
    
    console.log('Starting import of', extractedLeads.length, 'leads');
    console.log('Leads data:', extractedLeads);
    
    setImporting(true);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < extractedLeads.length; i++) {
        const lead = extractedLeads[i];
        console.log(`Importing lead ${i + 1}/${extractedLeads.length}:`, lead);
        
        try {
          const insertData = {
            name: lead.name,
            phone_number: lead.phone_number,
            destination: lead.destination,
            status: lead.status || 'New Lead',
            price: lead.price,
            country: lead.country || null,
          };
          
          console.log('Insert data:', insertData);
          
          const { data, error } = await supabase
            .from('clients')
            .insert([insertData]);

          if (error) {
            console.error(`Error importing lead ${i + 1}:`, error);
            errors.push(`${lead.name}: ${error.message}`);
            failedCount++;
          } else {
            console.log(`Successfully imported lead ${i + 1}:`, data);
            successCount++;
          }
        } catch (err) {
          console.error(`Exception importing lead ${i + 1}:`, err);
          errors.push(`${lead.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          failedCount++;
        }
      }

      console.log(`Import complete: ${successCount} success, ${failedCount} failed`);
      
      if (errors.length > 0) {
        console.error('Import errors:', errors);
      }

      setImportResult({ success: successCount, failed: failedCount });
      setStep('complete');
      
      if (failedCount > 0 && errors.length > 0) {
        setErrorMessage(`Failed to import ${failedCount} leads: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      setErrorMessage('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setStep('upload');
    setFile(null);
    setExtractedLeads([]);
    setImportResult(null);
    setBatchId(null);
    setBatchStatus(null);
    setLoading(false);
    setImporting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 text-sm">{t.errorPrefix}{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h2>
              <p className="text-gray-600 mb-8">{t.subtitle}</p>
              
              <div className="max-w-md mx-auto border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{t.uploadBtn}</p>
                      <p className="text-sm text-gray-500">{t.dragDrop}</p>
                      <p className="text-xs text-gray-400 mt-1">{t.fileTypes}</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.processing}</h2>
              <p className="text-gray-600 mb-6">{t.extracting}</p>
              
              {batchStatus && (
                <div className="max-w-md mx-auto bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">{t.chunks}:</span>
                    <span className="text-2xl font-bold text-purple-600">{batchStatus.total_chunks || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">{t.leads}:</span>
                    <span className="text-2xl font-bold text-blue-600">{batchStatus.total_leads || 0}</span>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mt-6 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {t.wait}
              </p>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t.preview}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {extractedLeads.length} {t.leads}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Ready to import</span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.name}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.phone}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.destination}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.price}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.country}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {extractedLeads.map((lead, index) => (
                      <tr key={index} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.phone_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.destination}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.price}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.country}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleImportConversation}
                  disabled={importing || extractedLeads.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.importing}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {t.importBtn} ({extractedLeads.length})
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  disabled={importing}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && importResult && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.complete}</h2>
              
              <div className="max-w-md mx-auto bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 mb-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium text-lg">{t.success}:</span>
                  <span className="text-4xl font-bold text-green-600">{importResult.success}</span>
                </div>
                {importResult.failed > 0 && (
                  <div className="flex justify-between items-center pt-4 border-t border-green-200">
                    <span className="text-gray-700 font-medium text-lg">{t.failed}:</span>
                    <span className="text-4xl font-bold text-red-600">{importResult.failed}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={onNavigateToClients}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  {t.viewClients}
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  {t.importAnother}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
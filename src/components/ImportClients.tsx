import { useState, useEffect } from 'react';
import { Upload, Sparkles, CheckCircle, FileText, Download, Loader2, Clock } from 'lucide-react';
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

  const isRTL = language === 'AR';

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  // Poll Supabase for batch status
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

      setBatchStatus(data);

      // Stop polling if batch is done
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }

      if (data.status === 'completed') {
        const leads = typeof data.leads_data === 'string' ? JSON.parse(data.leads_data) : data.leads_data;

        if (leads?.length) {
          const leadsWithCountry = leads.map((lead: ExtractedLead) => ({
            ...lead,
            country: detectCountryFromPhone(lead.phone_number) || 'Unknown',
          }));
          setExtractedLeads(leadsWithCountry);
          setStep('preview');
        } else {
          alert(language === 'EN'
            ? 'No leads with phone numbers found in the file.'
            : 'لم يتم العثور على عملاء محتملين بأرقام هواتف في الملف.');
          handleReset();
        }
      } else if (data.status === 'failed') {
        alert(language === 'EN'
          ? `Processing failed: ${data.error_message || 'Unknown error'}`
          : `فشلت المعالجة: ${data.error_message || 'خطأ غير معروف'}`);
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

    try {
      const text = await uploadedFile.text();
      
      if (text.length > 400000) {
        alert(language === 'EN'
          ? 'This file is too large. Please split it into smaller files.'
          : 'هذا الملف كبير جدًا. يرجى تقسيمه إلى ملفات أصغر.');
        handleReset();
        setLoading(false);
        return;
      }

      setStep('processing');

      // Send file to n8n webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationText: text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('n8n response error:', errorText);
        throw new Error(`Failed to start processing: ${response.status}`);
      }

      const result = await response.json();
      const newBatchId = result.id;

      if (!newBatchId) throw new Error('No batch ID returned from n8n');

      setBatchId(newBatchId);

      // Start polling every 3 seconds
      const interval = setInterval(() => pollBatchStatus(newBatchId), 3000);
      setPollingInterval(interval);

      // Immediate first poll
      pollBatchStatus(newBatchId);

    } catch (error) {
      console.error('File upload error:', error);
      alert(language === 'EN'
        ? `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        : `خطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      handleReset();
    } finally {
      setLoading(false);
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
          const { error } = await supabase.from('clients').insert([{
            name: lead.name,
            phone_number: lead.phone_number,
            destination: lead.destination,
            status: lead.status || 'New Lead',
            price: lead.price,
            country: lead.country || null,
          }]);

          if (error) failedCount++;
          else successCount++;
        } catch {
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
    if (pollingInterval) clearInterval(pollingInterval);
    setStep('upload');
    setFile(null);
    setExtractedLeads([]);
    setImportResult(null);
    setBatchId(null);
    setBatchStatus(null);
  };

  return (
    <div className="max-w-5xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-xl shadow-lg p-8">
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
                ? 'Upload any file format - AI automatically detects and extracts leads'
                : 'قم بتحميل أي تنسيق ملف - يكتشف الذكاء الاصطناعي ويستخرج العملاء تلقائيًا'}
            </p>
          </div>
        </div>

        {step === 'upload' && (
          <div>
            <label className="block border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50/50">
              <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
              <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {language === 'EN' ? 'Drop your file here or click to browse' : 'اسحب ملفك هنا أو انقر للتصفح'}
              </p>
              <p className="text-sm text-gray-500">
                {language === 'EN' ? 'Supports files up to 400KB (.txt and .csv)' : 'يدعم ملفات حتى 400 كيلوبايت (.txt و .csv)'}
              </p>
            </label>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {language === 'EN' ? 'Supported Formats:' : 'التنسيقات المدعومة:'}
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✓ WhatsApp conversations</li>
                <li>✓ Comma-separated data: name, city, phone, hotel, price</li>
                <li>✓ Key-value pairs: Name: X | Phone: Y</li>
                <li>✓ Any structured text with names and phone numbers</li>
              </ul>
            </div>

            {loading && (
              <div className="mt-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 text-gray-600">
                  {language === 'EN' ? 'Starting processing...' : 'جاري بدء المعالجة...'}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12">
            <div className="max-w-md mx-auto text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'EN' ? 'Processing Your File...' : 'جاري معالجة الملف...'}
              </h3>

              {batchStatus && (
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
                    <Clock className="w-5 h-5" />
                    <span>
                      {language === 'EN'
                        ? `Processing chunk ${batchStatus.processed_chunks || 0}/${batchStatus.total_chunks || '...'}`
                        : `معالجة جزء ${batchStatus.processed_chunks || 0}/${batchStatus.total_chunks || '...'}`}
                    </span>
                  </div>

                  {batchStatus.total_chunks > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${((batchStatus.processed_chunks || 0) / batchStatus.total_chunks) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="text-gray-600 mb-2">
                {language === 'EN'
                  ? 'AI is extracting leads from your file.'
                  : 'الذكاء الاصطناعي يستخرج العملاء من ملفك.'}
              </p>
              <p className="text-sm text-gray-500">
                {language === 'EN'
                  ? 'Large files may take several minutes. You can wait here or come back later.'
                  : 'قد تستغرق الملفات الكبيرة عدة دقائق. يمكنك الانتظار هنا أو العودة لاحقًا.'}
              </p>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  {language === 'EN'
                    ? '⚡ Processing on powerful n8n server - no timeout limits!'
                    : '⚡ المعالجة على خادم n8n قوي - بدون حدود زمنية!'}
                </p>
              </div>

              <button
                onClick={handleReset}
                className="mt-6 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                {language === 'EN' ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && extractedLeads.length > 0 && (
          <div>
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 inline mr-2" />
              <span className="font-semibold">
                {language === 'EN' ? `Extracted ${extractedLeads.length} Leads` : `استخرج ${extractedLeads.length} عميل`}
              </span>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">{language === 'EN' ? 'Name' : 'الاسم'}</th>
                    <th className="px-4 py-2 text-left text-sm">{language === 'EN' ? 'Phone' : 'الهاتف'}</th>
                    <th className="px-4 py-2 text-left text-sm">{language === 'EN' ? 'Destination' : 'الوجهة'}</th>
                    <th className="px-4 py-2 text-left text-sm">{language === 'EN' ? 'Price' : 'السعر'}</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedLeads.map((lead, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{lead.name}</td>
                      <td className="px-4 py-2 text-sm font-mono">{lead.phone_number}</td>
                      <td className="px-4 py-2 text-sm">{lead.destination}</td>
                      <td className="px-4 py-2 text-sm">{lead.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex gap-4">
              <button onClick={handleReset} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
                {language === 'EN' ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                onClick={handleImportConversation}
                disabled={importing}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
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

        {step === 'complete' && importResult && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">
              {language === 'EN' ? 'Import Complete!' : 'اكتمل الاستيراد!'}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === 'EN' ? `Imported ${importResult.success} clients` : `تم استيراد ${importResult.success} عميل`}
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={handleReset} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
                {language === 'EN' ? 'Import More' : 'استيراد المزيد'}
              </button>
              <button onClick={onNavigateToClients} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {language === 'EN' ? 'View Clients' : 'عرض العملاء'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

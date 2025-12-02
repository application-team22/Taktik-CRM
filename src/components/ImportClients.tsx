import { useState, useEffect } from 'react';
import { Upload, Sparkles, CheckCircle, FileText, Download, Loader2 } from 'lucide-react';
import { intelligentFieldMapping, FieldMapping, startBackgroundExtraction, ExtractedLead } from '../lib/openai';
import { detectCountryFromPhone } from '../lib/phoneCountryDetector';
import { supabase } from '../lib/supabase';

interface ImportClientsProps {
  language: 'EN' | 'AR';
  onNavigateToClients: () => void;
}

type FileType = 'csv' | 'conversation';

interface BatchProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalChunks: number;
  processedChunks: number;
  totalLeads: number;
  errorMessage?: string;
}

export default function ImportClients({ language, onNavigateToClients }: ImportClientsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const isRTL = language === 'AR';

  useEffect(() => {
    if (!currentBatchId || step !== 'processing') return;

    console.log('Starting to poll for batch:', currentBatchId);

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('import_batches')
          .select('*')
          .eq('id', currentBatchId)
          .single();

        if (error) {
          console.error('Error polling batch:', error);
          return;
        }

        if (data) {
          console.log('Batch status:', data.status, 'Progress:', data.processed_chunks, '/', data.total_chunks);
          
          setBatchProgress({
            status: data.status,
            totalChunks: data.total_chunks || 0,
            processedChunks: data.processed_chunks || 0,
            totalLeads: data.total_leads || 0,
            errorMessage: data.error_message,
          });

          if (data.status === 'completed' && data.leads_data) {
            console.log('Processing completed! Total leads:', data.total_leads);
            const leads = data.leads_data as ExtractedLead[];
            
            const leadsWithCountry = leads.map(lead => ({
              ...lead,
              country: detectCountryFromPhone(lead.phone_number) || 'Unknown',
            }));

            setExtractedLeads(leadsWithCountry);
            setStep('preview');
            clearInterval(pollInterval);
          } else if (data.status === 'failed') {
            console.error('Processing failed:', data.error_message);
            alert(language === 'EN' 
              ? `Processing failed: ${data.error_message || 'Unknown error'}` 
              : `فشلت المعالجة: ${data.error_message || 'خطأ غير معروف'}`);
            handleReset();
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    return () => {
      console.log('Stopping polling');
      clearInterval(pollInterval);
    };
  }, [currentBatchId, step, language]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    try {
      const text = await uploadedFile.text();
      
      const lines = text.trim().split('\n').filter(l => l.trim());
      const firstLine = lines[0] || '';
      
      const hasCommonHeaders = /name|phone|destination|price|client|customer/i.test(firstLine);
      const hasConsistentCommas = lines.slice(0, 5).every(line => (line.match(/,/g) || []).length >= 2);
      const looksLikeWhatsApp = firstLine.match(/[\[【\[].*?\d{1,2}\/\d{1,2}\/\d{2,4}.*?[\]】\]]/);
      
      const isCSV = hasCommonHeaders && hasConsistentCommas && !looksLikeWhatsApp;
      
      if (isCSV) {
        setFileType('csv');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
        setParsedData({ headers, rows });
        const aiMapping = await intelligentFieldMapping(headers, rows);
        setMapping(aiMapping);
        setStep('upload');
        alert('CSV mode not fully implemented in this version. Please use .txt format.');
      } else {
        setFileType('conversation');
        
        console.log('Starting background extraction...');
        
        const { data: batch, error: batchError } = await supabase
          .from('import_batches')
          .insert([{ status: 'pending' }])
          .select()
          .single();

        if (batchError || !batch) {
          console.error('Failed to create batch:', batchError);
          throw new Error('Failed to create import batch');
        }

        console.log('Batch created:', batch.id);
        setCurrentBatchId(batch.id);
        setStep('processing');
        
        await startBackgroundExtraction(text, batch.id);
        console.log('Background extraction started');
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

      if (currentBatchId) {
        await supabase.from('import_batches').delete().eq('id', currentBatchId);
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
    setCurrentBatchId(null);
    setBatchProgress(null);
    setImportResult(null);
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
                ? 'Upload WhatsApp conversations or structured data - AI extracts leads automatically'
                : 'قم بتحميل محادثات واتساب أو بيانات منظمة - يستخرج الذكاء الاصطناعي العملاء تلقائيًا'}
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
                {language === 'EN' ? 'Supports .txt files (any format with phone numbers)' : 'يدعم ملفات .txt (أي تنسيق مع أرقام هواتف)'}
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
                  {language === 'EN' ? 'Analyzing file...' : 'جاري تحليل الملف...'}
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
              <p className="text-gray-600 mb-6">
                {language === 'EN' 
                  ? 'AI is extracting leads. This may take a few minutes for large files.'
                  : 'الذكاء الاصطناعي يستخرج العملاء. قد يستغرق هذا بضع دقائق للملفات الكبيرة.'}
              </p>

              {batchProgress && batchProgress.totalChunks > 0 ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{language === 'EN' ? 'Progress' : 'التقدم'}</span>
                      <span>{batchProgress.processedChunks} / {batchProgress.totalChunks}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all"
                        style={{ width: `${batchProgress.totalChunks > 0 ? (batchProgress.processedChunks / batchProgress.totalChunks) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {batchProgress.totalLeads > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {language === 'EN' ? `Found ${batchProgress.totalLeads} leads...` : `وجد ${batchProgress.totalLeads} عميل...`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {language === 'EN' ? 'Initializing...' : 'جاري التهيئة...'}
                </div>
              )}
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
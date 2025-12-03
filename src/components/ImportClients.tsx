import { useState } from 'react';
import { Upload, Sparkles, CheckCircle, FileText, Download, Loader2 } from 'lucide-react';
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

export default function ImportClients({ language, onNavigateToClients }: ImportClientsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ status: string; totalChunks: number; processedChunks: number; totalLeads: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const isRTL = language === 'AR';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    try {
      const text = await uploadedFile.text();
      console.log('File loaded, length:', text.length);
      
      // Estimate tokens (rough: 1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil(text.length / 4);
      console.log('Estimated tokens:', estimatedTokens);
      
      // For production: Use direct function call instead of background
      // This is more reliable on Netlify free tier
      if (estimatedTokens > 15000) {
        alert(language === 'EN' 
          ? 'This file is very large. Please split it into smaller files (under 60KB) for best results.'
          : 'هذا الملف كبير جدًا. يرجى تقسيمه إلى ملفات أصغر (أقل من 60 كيلوبايت) للحصول على أفضل النتائج.');
        handleReset();
        setLoading(false);
        return;
      }
      
      console.log('Starting extraction via direct function...');
      setStep('processing');
      setBatchProgress({
        status: 'processing',
        totalChunks: 1,
        processedChunks: 0,
        totalLeads: 0,
      });
      
      try {
        // Call the regular (non-background) function which works reliably
        const response = await fetch('/.netlify/functions/extract-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationText: text }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Extraction failed');
        }

        const { leads } = await response.json();
        console.log('Extraction completed, leads found:', leads.length);
        
        if (leads.length === 0) {
          alert(language === 'EN' 
            ? 'No leads with phone numbers found in the file.'
            : 'لم يتم العثور على عملاء محتملين بأرقام هواتف في الملف.');
          handleReset();
          return;
        }

        // Add country detection
        const leadsWithCountry = leads.map((lead: ExtractedLead) => ({
          ...lead,
          country: detectCountryFromPhone(lead.phone_number) || 'Unknown',
        }));

        setExtractedLeads(leadsWithCountry);
        setStep('preview');
      } catch (extractError) {
        console.error('Extraction error:', extractError);
        throw new Error(`Failed to extract leads: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
      }
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
    setExtractedLeads([]);
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
                {language === 'EN' ? 'Supports .txt and .csv files (any format)' : 'يدعم ملفات .txt و .csv (أي تنسيق)'}
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
                  ? 'AI is extracting leads with phone numbers. This usually takes 10-30 seconds.'
                  : 'الذكاء الاصطناعي يستخرج العملاء بأرقام الهواتف. عادة ما يستغرق ذلك 10-30 ثانية.'}
              </p>
              <p className="text-sm text-gray-500">
                {language === 'EN' ? 'Please wait...' : 'يرجى الانتظار...'}
              </p>
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
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
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
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

      if (data.status === 'completed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        let leads: ExtractedLead[] = [];

        if (data.leads_data) {
          let raw = data.leads_data;

          // Fix for extra quotes and escaped characters
          if (typeof raw === 'string') {
            raw = raw.replace(/^"+|"+$/g, ''); // remove leading/trailing quotes
            raw = raw.replace(/\\"/g, '"');    // unescape inner quotes
            try {
              leads = JSON.parse(raw);
            } catch (parseError) {
              console.error('Failed to parse leads_data:', parseError, raw);
            }
          } else {
            leads = raw;
          }
        }

        if (leads.length > 0) {
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
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

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
      console.log('File loaded, length:', text.length);
      
      if (text.length > 400000) {
        alert(language === 'EN' 
          ? 'This file is too large. Please split it into smaller files.'
          : 'هذا الملف كبير جدًا. يرجى تقسيمه إلى ملفات أصغر.');
        handleReset();
        setLoading(false);
        return;
      }
      
      setStep('processing');

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          conversationText: text 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('n8n response error:', errorText);
        throw new Error(`Failed to start processing: ${response.status}`);
      }

      const result = await response.json();
      const newBatchId = result.id;
      
      if (!newBatchId) {
        throw new Error('No batch ID returned from n8n');
      }

      setBatchId(newBatchId);

      const interval = setInterval(() => {
        pollBatchStatus(newBatchId);
      }, 3000);
      
      setPollingInterval(interval);

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
  };

  return (
    <div className="max-w-5xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* UI structure unchanged: upload, processing, preview, complete */}
        {/* Keep all your existing JSX for upload, processing, preview, and complete */}
      </div>
    </div>
  );
}

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface ExtractedLead {
  name: string;
  phone_number: string;
  destination: string;
  status: string;
  price: string;
  services?: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkConversation(text: string, maxTokens: number = 6000): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const line of lines) {
    const testChunk = currentChunk + '\n' + line;
    if (estimateTokens(testChunk) > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk = testChunk;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { conversationText, batchId } = JSON.parse(event.body || '{}');

    if (!conversationText || typeof conversationText !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'conversationText is required' }),
      };
    }

    if (!batchId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'batchId is required' }),
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Update status to processing
    await supabase
      .from('import_batches')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    const estimatedTokens = estimateTokens(conversationText);
    console.log(`[${batchId}] Conversation estimated tokens: ${estimatedTokens}`);

    let allLeads: ExtractedLead[] = [];

    if (estimatedTokens > 6000) {
      const chunks = chunkConversation(conversationText, 6000);
      console.log(`[${batchId}] Splitting conversation into ${chunks.length} chunks`);

      // Update progress
      await supabase
        .from('import_batches')
        .update({ 
          total_chunks: chunks.length,
          processed_chunks: 0
        })
        .eq('id', batchId);

      // Process chunks in parallel batches
      const batchSize = 3;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        console.log(`[${batchId}] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
        
        const batchPromises = batch.map((chunk, index) => 
          extractLeadsFromChunk(chunk, OPENAI_API_KEY, i + index + 1, chunks.length)
        );
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(leads => {
          allLeads = allLeads.concat(leads);
        });

        // Update progress
        await supabase
          .from('import_batches')
          .update({ 
            processed_chunks: Math.min(i + batchSize, chunks.length),
            updated_at: new Date().toISOString()
          })
          .eq('id', batchId);
      }
    } else {
      allLeads = await extractLeadsFromChunk(conversationText, OPENAI_API_KEY, 1, 1);
    }

    // Remove duplicate leads based on phone number
    const uniqueLeads = Array.from(
      new Map(allLeads.map(lead => [lead.phone_number, lead])).values()
    );

    console.log(`[${batchId}] Total unique leads extracted: ${uniqueLeads.length}`);

    // Save leads to temporary storage in import_batches
    await supabase
      .from('import_batches')
      .update({ 
        status: 'completed',
        leads_data: uniqueLeads,
        total_leads: uniqueLeads.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    console.log(`[${batchId}] Processing completed successfully`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Background processing completed',
        leadsCount: uniqueLeads.length 
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    // Try to update batch status to failed
    try {
      const { batchId } = JSON.parse(event.body || '{}');
      if (batchId) {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
        
        if (SUPABASE_URL && SUPABASE_KEY) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
          await supabase
            .from('import_batches')
            .update({ 
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', batchId);
        }
      }
    } catch (updateError) {
      console.error('Failed to update batch status:', updateError);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

async function extractLeadsFromChunk(
  text: string,
  apiKey: string,
  chunkNumber: number,
  totalChunks: number
): Promise<ExtractedLead[]> {
  const prompt = `You are an expert at extracting lead information from WhatsApp travel agency conversations (Arabic/English mixed).

${totalChunks > 1 ? `NOTE: This is part ${chunkNumber} of ${totalChunks} conversation chunks. Extract all leads from THIS chunk.` : ''}

CRITICAL RULES:
1. Extract EVERY unique person who has a phone number mentioned OR is clearly making booking inquiries
2. Phone numbers are preferred but not required if the customer name is clear
3. Each person = 1 separate lead
4. If multiple destinations discussed, list them separated by " - "
5. Extract ALL prices mentioned for each person
6. Status is ALWAYS "New Lead"

REQUIRED FIELDS:
- name: Extract from conversation (WhatsApp contact name or mentioned name)
- phone_number: Extract if present (any format). If not available, use "Not available"
- destination: Cities/countries discussed (multiple: "Istanbul - Trabzon")
- status: ALWAYS "New Lead"
- price: All prices for this person's services. Format: "Hotel: 140€, Transport: 500TL". If none, use "Not discussed"
- services: (Optional) What was discussed

CONVERSATION:
${text}

Return ONLY valid JSON array:
[
  {
    "name": "Name",
    "phone_number": "+90 XXX or Not available",
    "destination": "Cities",
    "status": "New Lead",
    "price": "Details or Not discussed",
    "services": "Hotels, Tours"
  }
]

Empty array if no leads: []`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a lead extraction expert. Return ONLY valid JSON arrays. No markdown, no explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API Error (chunk ${chunkNumber}):`, errorData);
      return [];
    }

    const data = await response.json();
    let leads: ExtractedLead[] = [];

    try {
      const content = data.choices[0].message.content.trim();
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      leads = JSON.parse(cleanedContent);

      leads = leads.filter(lead => {
        if (!lead.name || lead.name.trim() === '' || lead.name === 'Unknown') {
          return false;
        }
        
        lead.phone_number = lead.phone_number || 'Not available';
        lead.destination = lead.destination || 'Not specified';
        lead.status = 'New Lead';
        lead.price = lead.price || 'Not discussed';
        
        return true;
      });

      console.log(`Chunk ${chunkNumber}: Extracted ${leads.length} leads`);

    } catch (parseError) {
      console.error(`Error parsing chunk ${chunkNumber}:`, parseError);
      return [];
    }

    return leads;
  } catch (error) {
    console.error(`Error processing chunk ${chunkNumber}:`, error);
    return [];
  }
}

export { handler };
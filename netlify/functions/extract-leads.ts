import { Handler } from '@netlify/functions';

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
    const { conversationText } = JSON.parse(event.body || '{}');

    if (!conversationText || typeof conversationText !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'conversationText is required' }),
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found in environment');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const estimatedTokens = estimateTokens(conversationText);
    console.log(`Conversation estimated tokens: ${estimatedTokens}`);

    let allLeads: ExtractedLead[] = [];

    if (estimatedTokens > 6000) {
      // Chunk the conversation
      const chunks = chunkConversation(conversationText, 6000);
      console.log(`Splitting conversation into ${chunks.length} chunks`);

      // Process chunks in parallel (batches of 3 to avoid rate limits)
      const batchSize = 3;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)})`);
        
        const batchPromises = batch.map((chunk, index) => 
          extractLeadsFromChunk(chunk, OPENAI_API_KEY, i + index + 1, chunks.length)
        );
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(leads => {
          allLeads = allLeads.concat(leads);
        });
      }
    } else {
      allLeads = await extractLeadsFromChunk(conversationText, OPENAI_API_KEY, 1, 1);
    }

    // Remove duplicate leads based on phone number
    const uniqueLeads = Array.from(
      new Map(allLeads.map(lead => [lead.phone_number, lead])).values()
    );

    console.log(`Total unique leads extracted: ${uniqueLeads.length}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ leads: uniqueLeads }),
    };

  } catch (error) {
    console.error('Function error:', error);
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

// Detect data format
function detectDataFormat(text: string): 'whatsapp' | 'structured' | 'csv-like' {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const firstLine = lines[0] || '';
  
  if (firstLine.match(/[\[【\[].*?\d{1,2}\/\d{1,2}\/\d{2,4}.*?[\]】\]]/)) {
    return 'whatsapp';
  }
  
  const commaCount = lines.slice(0, 3).map(l => (l.match(/,/g) || []).length);
  const avgCommas = commaCount.reduce((a, b) => a + b, 0) / commaCount.length;
  if (avgCommas >= 3) {
    return 'csv-like';
  }
  
  return 'structured';
}

async function extractLeadsFromChunk(
  text: string,
  apiKey: string,
  chunkNumber: number,
  totalChunks: number
): Promise<ExtractedLead[]> {
  const format = detectDataFormat(text);
  
  let prompt = '';
  
  if (format === 'whatsapp') {
    prompt = `Extract leads from WhatsApp conversation (Arabic/English).

CRITICAL: NO PHONE NUMBER = SKIP THIS PERSON

RULES:
1. Extract EVERY person with phone number
2. Phone number REQUIRED (any format)
3. Status: "New Lead"

DATA:
${text}

JSON only:
[{"name":"Name","phone_number":"+90 XXX","destination":"City","status":"New Lead","price":"Details"}]`;
  } else {
    prompt = `Extract ALL leads from structured data. DO NOT skip any rows.

CRITICAL: Extract EVERY entry with phone number.

DATA:
${text}

Return COMPLETE JSON with ALL entries:
[{"name":"Name","phone_number":"+90 XXX","destination":"City","status":"New Lead","price":"400tl"}]`;
  }

  prompt += `\n\nEmpty array if no phone numbers: []`;

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
            content: 'You are a lead extraction expert. Return ONLY valid JSON arrays. Extract EVERY SINGLE lead from the data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
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
      console.log(`Chunk ${chunkNumber} raw response length:`, content.length);
      
      // Remove markdown code blocks if present
      let cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Sometimes AI adds extra text before/after JSON - extract just the JSON array
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      } else {
        console.error(`Chunk ${chunkNumber}: No JSON array found in response`);
        console.error('Content:', content.substring(0, 500));
        return [];
      }
      
      leads = JSON.parse(cleanedContent);

      if (!Array.isArray(leads)) {
        console.error(`Chunk ${chunkNumber}: Response is not an array`);
        return [];
      }

      leads = leads.filter(lead => {
        // MUST have valid phone number with at least 3 digits
        if (!lead.phone_number || 
            lead.phone_number.trim() === '' || 
            lead.phone_number === 'Not available' ||
            !lead.phone_number.match(/\d{3,}/)) {
          console.log(`Skipping lead without phone: ${lead.name}`);
          return false;
        }
        
        if (!lead.name || lead.name.trim() === '' || lead.name === 'Unknown') {
          console.log(`Skipping lead without name`);
          return false;
        }
        
        lead.destination = lead.destination || 'Not specified';
        lead.status = 'New Lead';
        lead.price = lead.price || 'Not discussed';
        
        return true;
      });

      console.log(`Chunk ${chunkNumber}: Extracted ${leads.length} valid leads`);

    } catch (parseError) {
      console.error(`Error parsing chunk ${chunkNumber}:`, parseError);
      console.error('Raw content (first 1000 chars):', data.choices[0].message.content.substring(0, 1000));
      return [];
    }

    return leads;
  } catch (error) {
    console.error(`Error processing chunk ${chunkNumber}:`, error);
    return [];
  }
}

export { handler };
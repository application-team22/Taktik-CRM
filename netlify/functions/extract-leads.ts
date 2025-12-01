import { Handler } from '@netlify/functions';

interface ExtractedLead {
  name: string;
  phone_number: string;
  destination: string;
  status: string;
  price: string;
  services?: string;
}

// Function to estimate token count (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Function to chunk conversation into smaller parts
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

    // Check if conversation is too large and needs chunking
    const estimatedTokens = estimateTokens(conversationText);
    console.log(`Conversation estimated tokens: ${estimatedTokens}`);

    let allLeads: ExtractedLead[] = [];

    if (estimatedTokens > 6000) {
      // Chunk the conversation
      const chunks = chunkConversation(conversationText, 6000);
      console.log(`Splitting conversation into ${chunks.length} chunks`);

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);
        const chunkLeads = await extractLeadsFromChunk(chunks[i], OPENAI_API_KEY, i + 1, chunks.length);
        allLeads = allLeads.concat(chunkLeads);
      }
    } else {
      // Process entire conversation at once
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

async function extractLeadsFromChunk(
  text: string,
  apiKey: string,
  chunkNumber: number,
  totalChunks: number
): Promise<ExtractedLead[]> {
  const prompt = `You are an expert at extracting lead information from WhatsApp travel agency conversations (Arabic/English mixed).

${totalChunks > 1 ? `NOTE: This is part ${chunkNumber} of ${totalChunks} conversation chunks. Extract all leads from THIS chunk.` : ''}

CRITICAL RULES:
1. Extract EVERY unique person who has a phone number mentioned in the conversation
2. Phone numbers are THE PRIMARY KEY - without a phone number, don't create a lead
3. Each person with a phone number = 1 separate lead
4. If multiple destinations are discussed for one person, list them separated by " - "
5. Extract ALL prices mentioned for services/trips for each person
6. Status must ALWAYS be "New Lead" (default for newly extracted leads)
7. If no explicit phone number is found but a customer name is clearly making inquiries, still create a lead with "Not available" as phone

REQUIRED FIELDS FOR EACH LEAD:
- name: Extract from conversation (full name if available, otherwise use WhatsApp contact name)
- phone_number: Extract if present (any format: +90..., 00..., etc.). If truly not available, use "Not available"
- destination: Cities/countries discussed (if multiple: "Istanbul - Trabzon - Bursa")
- status: ALWAYS set to "New Lead"
- price: Extract all prices mentioned for this person's trips/services. If multiple services, combine like "Hotel: 140€, Transport: 500TL, Tour: 100TL". If no price discussed, use "Not discussed"
- services: (Optional) List what was discussed: hotels, tours, transportation, etc.

CONVERSATION TO ANALYZE:
${text}

Return ONLY valid JSON array of leads. Format:
[
  {
    "name": "Full Name",
    "phone_number": "+90 XXX XXX XXXX or Not available",
    "destination": "City1 - City2",
    "status": "New Lead",
    "price": "Service1: 100€, Service2: 200TL",
    "services": "Hotels, Tours, Transportation"
  }
]

If no leads found, return empty array: []`;

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
            content: 'You are a lead extraction expert. Return ONLY valid JSON arrays. Never include markdown formatting or explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', errorData);
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    let leads: ExtractedLead[] = [];

    try {
      const content = data.choices[0].message.content.trim();
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      leads = JSON.parse(cleanedContent);

      // Validate and clean leads
      leads = leads.filter(lead => {
        // Allow leads without phone numbers if they have a name
        if ((!lead.phone_number || lead.phone_number.trim() === '' || lead.phone_number === 'Not available') && 
            (!lead.name || lead.name.trim() === '' || lead.name === 'Unknown')) {
          return false;
        }
        
        lead.name = lead.name || 'Unknown';
        lead.phone_number = lead.phone_number || 'Not available';
        lead.destination = lead.destination || 'Not specified';
        lead.status = 'New Lead';
        lead.price = lead.price || 'Not discussed';
        
        return true;
      });

    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw content:', data.choices[0].message.content);
      return [];
    }

    return leads;
  } catch (error) {
    console.error('Error extracting leads from chunk:', error);
    return [];
  }
}

export { handler };
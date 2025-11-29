const OPENAI_API_KEY = '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';

export interface ParsedClient {
  name: string;
  phone_number: string;
  destination: string;
  price: string;
  status?: string;
  country?: string;
}

export async function parseMessyText(text: string): Promise<ParsedClient[]> {
  try {
    const prompt = `You are a data extraction assistant for a travel CRM system.

Extract client information from the following messy text. Each client entry might be separated by blank lines or in any format.

Extract these fields for EACH client found:
- name (client's full name)
- phone_number (with country code in international format like +964, +90, +1, etc.)
- destination (where they want to travel - city or country)
- price (trip cost - extract ONLY the number)
- status (one of: "New Lead", "Contacted", "Interested", "Not Interested", "Booked" - if not clear, use "New Lead")

Text to parse:
"""
${text}
"""

Return ONLY a JSON array of objects. Each object represents one client.
Example format:
[
  {
    "name": "Ahmet Yarin",
    "phone_number": "+964 780 327 8288",
    "destination": "Bursa",
    "price": "240",
    "status": "New Lead"
  },
  {
    "name": "John Doe",
    "phone_number": "+90 532 123 4567",
    "destination": "Paris",
    "price": "1500",
    "status": "Contacted"
  }
]

IMPORTANT:
- Extract ALL clients found in the text
- Phone numbers MUST include country code (add + if missing)
- Price should be ONLY the number (remove currency symbols)
- If status is unclear, use "New Lead"
- Return valid JSON array only, no other text`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction expert. Extract client information from unstructured text and return valid JSON only.',
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
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Clean up the response - remove markdown code blocks if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsedClients = JSON.parse(cleanContent);

    if (!Array.isArray(parsedClients)) {
      throw new Error('AI did not return an array of clients');
    }

    return parsedClients;
  } catch (error) {
    console.error('Error parsing text with AI:', error);
    throw error;
  }
}

export function validateParsedClient(client: ParsedClient): boolean {
  return !!(
    client.name &&
    client.phone_number &&
    client.destination &&
    client.price
  );
}

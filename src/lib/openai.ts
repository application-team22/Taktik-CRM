const OPENAI_API_KEY = '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';

export interface FieldMapping {
  name: string | null;
  phone_number: string | null;
  destination: string | null;
  status: string | null;
  price: string | null;
  country: string | null;
}

export async function intelligentFieldMapping(
  headers: string[],
  sampleRows: any[][]
): Promise<FieldMapping> {
  try {
    const prompt = `You are a data mapping assistant for a travel CRM system.

Given these column headers and sample data, map them to these required fields:
- name (client's full name)
- phone_number (phone/mobile number with country code)
- destination (where client wants to travel)
- status (must be one of: "New Lead", "Contacted", "Interested", "Not Interested", "Booked")
- price (trip cost/price in numbers)
- country (client's home country - OPTIONAL, we can detect from phone number)

Headers: ${JSON.stringify(headers)}

Sample rows (first 3):
${JSON.stringify(sampleRows.slice(0, 3))}

IMPORTANT: For phone numbers, look for columns with international format (+countrycode) or any phone/mobile columns.
The country field is OPTIONAL - if you see a phone number with country code, you can leave country as null.

Return ONLY a JSON object mapping the required fields to the column headers. Use null if no match found.
Example: {"name": "Full Name", "phone_number": "Phone", "destination": "Travel To", "status": "Lead Status", "price": "Cost", "country": null}

For status field: if the data doesn't exactly match our status options, map to the closest column that indicates lead/booking status.`;

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
            content: 'You are a data mapping expert. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const mapping = JSON.parse(data.choices[0].message.content);

    return mapping;
  } catch (error) {
    console.error('Error mapping fields:', error);
    // Return basic fuzzy matching fallback
    return fallbackMapping(headers);
  }
}

function fallbackMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {
    name: null,
    phone_number: null,
    destination: null,
    status: null,
    price: null,
    country: null,
  };

  headers.forEach((header) => {
    const lower = header.toLowerCase();
    
    if (lower.includes('name') && !lower.includes('country')) {
      mapping.name = header;
    } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) {
      mapping.phone_number = header;
    } else if (lower.includes('destination') || lower.includes('travel') || lower.includes('trip')) {
      mapping.destination = header;
    } else if (lower.includes('status') || lower.includes('lead') || lower.includes('stage')) {
      mapping.status = header;
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('amount')) {
      mapping.price = header;
    } else if (lower.includes('country') || lower.includes('nationality') || lower.includes('origin')) {
      mapping.country = header;
    }
  });

  return mapping;
}

import { NextRequest } from 'next/server';

// Use server-side only environment variable (no EXPO_PUBLIC prefix)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  // Get origin from request
  const origin = request.headers.get('origin');
  
  // Define allowed origins (add your production domains)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    'https://your-production-domain.com', // Replace with your actual domain
  ];
  
  // Check if origin is allowed
  const isAllowedOrigin = allowedOrigins.includes(origin || '') || !origin;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };

  if (!isAllowedOrigin) {
    return new Response(JSON.stringify({ 
      error: 'Origin not allowed',
      status: 'FORBIDDEN'
    }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key') {
    return new Response(JSON.stringify({ 
      error: 'OpenAI API key not configured',
      status: 'CONFIGURATION_ERROR'
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    const body = await request.json();
    const { type, ...params } = body;
    
    if (type === 'analyze-storefront') {
      return await analyzeStorefront(params, corsHeaders);
    } else if (type === 'generate-review') {
      return await generateReview(params, corsHeaders);
    } else {
      return new Response(JSON.stringify({ 
        error: 'Invalid request type. Use: analyze-storefront or generate-review',
        status: 'INVALID_REQUEST'
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    console.error('OpenAI API proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Request processing failed',
      status: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function analyzeStorefront(params: any, corsHeaders: any) {
  const { imageUri, location } = params;
  
  if (!imageUri) {
    return new Response(JSON.stringify({ 
      error: 'Image URI is required',
      status: 'INVALID_REQUEST'
    }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this storefront image and identify the business. Look carefully for:

1) Business type/category (be specific - e.g., "Spa", "Beauty Salon", "Hair Salon", "Nail Salon", "Massage Spa", "Restaurant", "Coffee Shop", "Gym", etc.)
2) Business name - read ALL visible text on signs, windows, doors, and any text overlays in the image
3) Any address or location text visible in the image
4) Brief description of what you see
5) Notable visual features that help identify the business type

Pay special attention to:
- Any Vietnamese text or signage (this image may be from Vietnam)
- Spa/salon indicators: massage chairs, beauty equipment, salon chairs, spa signage
- Restaurant indicators: food displays, dining areas, kitchen equipment
- Text overlays that might show location information

Return ONLY a valid JSON object with fields: businessType, businessName, description, features (array), locationText (if any address/location text is visible). Do not include any markdown formatting or code blocks.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUri
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      return new Response(JSON.stringify({ 
        error: 'Invalid OpenAI response',
        status: 'API_ERROR'
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    
    try {
      let responseContent = data.choices[0].message.content.trim();
      responseContent = responseContent.replace(/^```json\s*/gm, '');
      responseContent = responseContent.replace(/^```\s*/gm, '');
      responseContent = responseContent.replace(/```$/gm, '');
      responseContent = responseContent.trim();
      
      const analysis = JSON.parse(responseContent);
      
      const result = {
        businessType: analysis.businessType,
        businessName: analysis.businessName || 'Unknown Business',
        description: analysis.description || 'Business storefront',
        features: Array.isArray(analysis.features) ? analysis.features : [],
        locationText: analysis.locationText || undefined,
        coordinates: location
      };
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response',
        status: 'PARSE_ERROR'
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'OpenAI API request failed',
      status: 'API_ERROR'
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function generateReview(params: any, corsHeaders: any) {
  const { businessName, businessType, googleReviews } = params;
  
  if (!businessName || !businessType || !googleReviews || googleReviews.length === 0) {
    return new Response(JSON.stringify({ 
      error: 'Business name, type, and reviews are required',
      status: 'INVALID_REQUEST'
    }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const reviewTexts = googleReviews
      .filter((review: any) => review.text && review.text.trim().length > 0)
      .slice(0, 5)
      .map((review: any) => `Rating: ${review.rating}/5 - ${review.text}`)
      .join('\n\n');
    
    if (!reviewTexts.trim()) {
      return new Response(JSON.stringify({ 
        error: 'No valid review texts found',
        status: 'INVALID_REQUEST'
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Analyze these Google reviews for ${businessName} (${businessType}) and create a comprehensive summary. Based on the actual customer reviews, provide:

1. summary: A brief overview of what customers think
2. pros: Array of positive aspects mentioned by customers
3. cons: Array of negative aspects or concerns mentioned by customers  
4. recommendations: Array of helpful tips for future visitors
5. overallSentiment: "positive", "neutral", or "negative"
6. bestFor: Array of what this place is best suited for

Return ONLY a valid JSON object with these fields. Do not include markdown formatting or code blocks.

Reviews:
${reviewTexts}`
          }
        ],
        max_tokens: 800
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      return new Response(JSON.stringify({ 
        error: 'Invalid OpenAI response',
        status: 'API_ERROR'
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    
    try {
      let responseContent = data.choices[0].message.content.trim();
      responseContent = responseContent.replace(/^```json\s*/gm, '');
      responseContent = responseContent.replace(/^```\s*/gm, '');
      responseContent = responseContent.replace(/```$/gm, '');
      responseContent = responseContent.trim();
      
      const review = JSON.parse(responseContent);
      
      const result = {
        summary: review.summary || `${businessName} is a ${businessType.toLowerCase()} with mixed reviews.`,
        pros: Array.isArray(review.pros) ? review.pros : ['Good service'],
        cons: Array.isArray(review.cons) ? review.cons : ['Limited information'],
        recommendations: Array.isArray(review.recommendations) ? review.recommendations : ['Worth a visit'],
        overallSentiment: ['positive', 'neutral', 'negative'].includes(review.overallSentiment) 
          ? review.overallSentiment : 'neutral',
        popularTimes: review.popularTimes || 'Peak hours vary',
        bestFor: Array.isArray(review.bestFor) ? review.bestFor : ['General visits']
      };
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response',
        status: 'PARSE_ERROR'
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'OpenAI API request failed',
      status: 'API_ERROR'
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    'https://your-production-domain.com',
  ];
  
  const isAllowedOrigin = allowedOrigins.includes(origin || '') || !origin;
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': isAllowedOrigin ? (origin || '*') : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  });
}
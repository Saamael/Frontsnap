import { NextRequest } from 'next/server';

// Use server-side only environment variable (no EXPO_PUBLIC prefix)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  // Get origin from request
  const origin = request.headers.get('origin');
  
  // Define allowed origins for production
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    'https://frontsnap.vercel.app', // Production domain
    'https://frontsnap.app', // Custom domain
    'exp://', // Expo development
    'http://localhost:19006', // Expo web
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

  if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '' || OPENAI_API_KEY === 'your_openai_api_key') {
    console.error('❌ OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    return new Response(JSON.stringify({ 
      error: 'OpenAI API key not configured. Please check your environment variables.',
      status: 'CONFIGURATION_ERROR',
      details: 'The OPENAI_API_KEY environment variable is missing or invalid.'
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
    } else if (type === 'quick-analysis') {
      return await quickAnalysis(params, corsHeaders);
    } else if (type === 'generate-review') {
      return await generateReview(params, corsHeaders);
    } else {
      return new Response(JSON.stringify({ 
        error: 'Invalid request type. Use: analyze-storefront, quick-analysis, or generate-review',
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
                text: `Analyze this storefront image comprehensively to identify the business, focusing on VISUAL FEATURES even when text is not visible. Examine:

VISUAL ANALYSIS (Primary - for when no text is visible):
1) Architectural features: storefront design, awnings, color schemes, window layouts, door styles
2) Interior elements visible: furniture type (massage chairs, dining tables, salon chairs, gym equipment, retail displays)
3) Equipment and fixtures: professional tools, machines, displays, lighting fixtures
4) Layout patterns: seating arrangements, workspace organization, customer flow areas
5) Contextual clues: outdoor seating, parking setup, building style, surrounding environment
6) Visual symbols and logos: non-text branding, color patterns, design elements

BUSINESS TYPE INDICATORS:
- Spa/Massage: massage tables, relaxation chairs, soft lighting, wellness decor, plants, tranquil colors
- Hair/Beauty Salon: salon chairs, mirrors, hair washing stations, beauty products displays, bright lighting
- Restaurant/Cafe: dining tables, kitchen equipment, food displays, menu boards, beverage machines
- Gym/Fitness: exercise equipment, mirrors, weights, mats, athletic flooring
- Retail/Store: product displays, shelving, checkout counters, shopping baskets, price tags
- Medical: clinical equipment, white/sterile environment, examination areas, medical signage

TEXT ANALYSIS (Secondary):
7) Business name from signs, windows, doors, overlays
8) Address or location text visible
9) Vietnamese text or international signage
10) Service descriptions or menu items

SCORING CONFIDENCE:
Rate your confidence (0-100) for:
- Business type identification
- Visual feature matching
- Name recognition (if any)
- Location context

Return ONLY a valid JSON object with fields: 
{
  "businessType": "specific category",
  "businessName": "name if visible or 'Unknown' if not",
  "description": "detailed visual description",
  "features": ["array of visual features observed"],
  "visualIndicators": ["specific visual clues for business type"],
  "confidence": {
    "businessType": 0-100,
    "visualFeatures": 0-100,
    "nameRecognition": 0-100
  },
  "locationText": "address if visible",
  "architecturalStyle": "building/storefront design characteristics"
}

Do not include markdown formatting or code blocks.`
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
        visualIndicators: Array.isArray(analysis.visualIndicators) ? analysis.visualIndicators : [],
        confidence: analysis.confidence || {
          businessType: 50,
          visualFeatures: 50,
          nameRecognition: 0
        },
        architecturalStyle: analysis.architecturalStyle || 'Standard storefront',
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

async function quickAnalysis(params: any, corsHeaders: any) {
  const { imageUri } = params;
  
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
        model: 'gpt-4o-mini', // Use faster, cheaper model for quick analysis
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `QUICK BUSINESS TYPE IDENTIFICATION - Respond in under 2 seconds.

Look at this image and identify the business type based on OBVIOUS visual cues only:

BUSINESS TYPES TO IDENTIFY:
- Restaurant (dining tables, food displays, kitchen visible)
- Cafe/Coffee Shop (coffee machines, pastry displays, casual seating)
- Spa/Massage (massage tables, relaxation chairs, wellness decor)
- Beauty/Hair Salon (salon chairs, mirrors, hair equipment)
- Gym/Fitness (exercise equipment, weights, mirrors)
- Retail/Store (product displays, shelving, checkout counters)
- Bar/Nightclub (bar counter, alcohol displays, dim lighting)
- Medical/Clinic (clinical equipment, white/sterile environment)
- Hotel/Lodging (reception desk, hotel furniture, lobby)
- Other (if none of the above clearly match)

CONFIDENCE SCORING:
- 90-100: Extremely obvious (multiple clear indicators)
- 70-89: Very clear (several good indicators)
- 50-69: Moderately clear (some indicators)
- 30-49: Somewhat unclear (few indicators)
- 0-29: Very unclear (no clear indicators)

Return ONLY a JSON object:
{
  "businessType": "specific type from list above",
  "confidence": 0-100,
  "visualCues": ["list", "of", "obvious", "visual", "elements", "seen"]
}

NO markdown, no explanation, just the JSON.`
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
        max_tokens: 200, // Keep response short
        temperature: 0.1 // Low temperature for consistency
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
        businessType: analysis.businessType || 'Other',
        confidence: Math.max(0, Math.min(100, analysis.confidence || 0)),
        visualCues: Array.isArray(analysis.visualCues) ? analysis.visualCues : []
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
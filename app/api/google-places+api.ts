import { NextRequest } from 'next/server';

// Use server-side only environment variable (no EXPO_PUBLIC prefix)
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  // Get origin from request
  const origin = request.headers.get('origin');
  
  // Define allowed origins (add your production domains)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    'https://your-production-domain.com', // Replace with your actual domain
    // Add more production domains as needed
  ];
  
  // Check if origin is allowed
  const isAllowedOrigin = allowedOrigins.includes(origin || '') || !origin; // Allow same-origin requests
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };

  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'your_google_places_api_key') {
    return new Response(JSON.stringify({ 
      error: 'Google Places API key not configured',
      status: 'REQUEST_DENIED'
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // nearbysearch, details, textsearch
  
  try {
    let googleUrl = 'https://maps.googleapis.com/maps/api/place/';
    
    switch (type) {
      case 'nearbysearch':
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const radius = searchParams.get('radius') || '1000';
        const keyword = searchParams.get('keyword');
        const placeType = searchParams.get('place_type');
        
        if (!lat || !lng) {
          return new Response(JSON.stringify({ 
            error: 'Latitude and longitude are required for nearby search',
            status: 'INVALID_REQUEST'
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        googleUrl += `nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${GOOGLE_PLACES_API_KEY}`;
        if (keyword) googleUrl += `&keyword=${encodeURIComponent(keyword)}`;
        if (placeType) googleUrl += `&type=${placeType}`;
        else googleUrl += '&type=restaurant|cafe|store|gym|beauty_salon';
        break;
        
      case 'details':
        const placeId = searchParams.get('place_id');
        const fields = searchParams.get('fields') || 'place_id,name,formatted_address,rating,user_ratings_total,price_level,opening_hours,photos,types,geometry';
        
        if (!placeId) {
          return new Response(JSON.stringify({ 
            error: 'Place ID is required for details request',
            status: 'INVALID_REQUEST'
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        googleUrl += `details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
        break;
        
      case 'textsearch':
        const query = searchParams.get('query');
        const searchLat = searchParams.get('lat');
        const searchLng = searchParams.get('lng');
        const searchRadius = searchParams.get('radius') || '5000';
        
        if (!query) {
          return new Response(JSON.stringify({ 
            error: 'Query is required for text search',
            status: 'INVALID_REQUEST'
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        googleUrl += `textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
        if (searchLat && searchLng) {
          googleUrl += `&location=${searchLat},${searchLng}&radius=${searchRadius}`;
        }
        break;
        
      case 'photo':
        const photoReference = searchParams.get('photo_reference');
        const maxwidth = searchParams.get('maxwidth') || '400';
        
        if (!photoReference) {
          return new Response(JSON.stringify({ 
            error: 'Photo reference is required for photo request',
            status: 'INVALID_REQUEST'
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
        
        // For photo requests, we need to return the actual image, not JSON
        try {
          const response = await fetch(googleUrl);
          if (!response.ok) {
            throw new Error(`Google API responded with status: ${response.status}`);
          }
          
          const imageBuffer = await response.arrayBuffer();
          return new Response(imageBuffer, {
            status: 200,
            headers: {
              'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
              'Cache-Control': 'public, max-age=86400', // Cache for 1 day
              ...corsHeaders,
            },
          });
        } catch (error) {
          console.error('Google Places Photo API error:', error);
          return new Response(JSON.stringify({ 
            error: 'Failed to fetch photo from Google Places API',
            status: 'PHOTO_ERROR'
          }), {
            status: 500,
            headers: corsHeaders,
          });
        }
        
      case 'geocode':
        const geocodeLat = searchParams.get('lat');
        const geocodeLng = searchParams.get('lng');
        
        if (!geocodeLat || !geocodeLng) {
          return new Response(JSON.stringify({ 
            error: 'Latitude and longitude are required for geocoding',
            status: 'INVALID_REQUEST'
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${geocodeLat},${geocodeLng}&key=${GOOGLE_PLACES_API_KEY}`;
        break;
        
      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid request type. Use: nearbysearch, details, textsearch, photo, or geocode',
          status: 'INVALID_REQUEST'
        }), {
          status: 400,
          headers: corsHeaders,
        });
    }

    console.log('Making request to Google Places API:', googleUrl.replace(GOOGLE_PLACES_API_KEY, '[API_KEY]'));
    
    const response = await fetch(googleUrl);
    
    if (!response.ok) {
      throw new Error(`Google API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Log the response status for debugging
    console.log('Google Places API response status:', data.status);
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders,
    });
    
  } catch (error) {
    console.error('Google Places API proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch from Google Places API',
      status: 'UNKNOWN_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function POST(request: NextRequest) {
  return GET(request); // Handle POST requests the same way
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    'https://your-production-domain.com', // Replace with your actual domain
  ];
  
  const isAllowedOrigin = allowedOrigins.includes(origin || '') || !origin;
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': isAllowedOrigin ? (origin || '*') : 'null',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  });
}
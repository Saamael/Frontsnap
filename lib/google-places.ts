// Google Places API integration via proxy

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  rating: number;
  user_ratings_total: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  photos?: {
    photo_reference: string;
    height: number;
    width: number;
  }[];
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface GoogleReview {
  author_name: string;
  author_url: string;
  language: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

export interface GooglePlaceDetails extends GooglePlace {
  reviews?: GoogleReview[];
  formatted_phone_number?: string;
  website?: string;
  business_status?: string;
}

// API key is now handled server-side in the API endpoint

// Map business types to Google Places types for better search accuracy
const getGooglePlaceTypes = (businessType: string): string[] => {
  const typeMap: { [key: string]: string[] } = {
    'Spa': ['spa', 'beauty_salon', 'health'],
    'Salon': ['beauty_salon', 'hair_care'],
    'Spa/Salon': ['spa', 'beauty_salon', 'hair_care', 'health'],
    'Beauty Salon': ['beauty_salon', 'hair_care'],
    'Hair Salon': ['hair_care', 'beauty_salon'],
    'Nail Salon': ['beauty_salon'],
    'Massage': ['spa', 'health'],
    'Restaurant': ['restaurant', 'food', 'meal_takeaway'],
    'Cafe': ['cafe', 'restaurant'],
    'Coffee Shop': ['cafe'],
    'Gym': ['gym'],
    'Fitness Center': ['gym'],
    'Store': ['store'],
    'Retail': ['store', 'clothing_store', 'shopping_mall'],
    'Bookstore': ['book_store'],
    'Hotel': ['lodging'],
    'Bar': ['bar', 'night_club'],
    'Pharmacy': ['pharmacy'],
    'Bank': ['bank'],
    'Gas Station': ['gas_station'],
    'Hospital': ['hospital'],
    'School': ['school'],
    'University': ['university']
  };

  const normalizedType = businessType.toLowerCase();
  
  // Try exact match first
  for (const [key, types] of Object.entries(typeMap)) {
    if (key.toLowerCase() === normalizedType) {
      return types;
    }
  }
  
  // Try partial match
  for (const [key, types] of Object.entries(typeMap)) {
    if (normalizedType.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedType)) {
      return types;
    }
  }
  
  // Default fallback
  return ['establishment'];
};

// Enhanced nearby search with business type filtering and location context
export const searchNearbyPlacesWithType = async (
  latitude: number,
  longitude: number,
  businessName: string,
  businessType: string,
  radius: number = 100
): Promise<GooglePlace[]> => {

  try {
    const placeTypes = getGooglePlaceTypes(businessType);
    console.log(`🎯 Searching for ${businessType} (${businessName}) with types:`, placeTypes);
    
    // Try each place type until we find results
    for (const placeType of placeTypes) {
      const params = new URLSearchParams({
        type: 'nearbysearch',
        lat: latitude.toString(),
        lng: longitude.toString(),
        radius: radius.toString(),
        place_type: placeType
      });
      
      // Only add keyword if business name is not "Unknown" or generic
      const isGenericName = !businessName || 
                           businessName.toLowerCase() === 'unknown' || 
                           businessName.toLowerCase() === 'unknown business' ||
                           businessName.toLowerCase() === 'business';
      
      if (!isGenericName) {
        params.set('keyword', businessName);
      }

      console.log(`🔍 Searching with type "${placeType}" and keyword "${businessName}"`);

      const response = await fetch(`/api/google-places?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        continue;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received');
        continue;
      }
      
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        console.log(`✅ Found ${data.results.length} places with type "${placeType}"`);
        
        // Filter results to match business type
        const filteredResults = data.results.filter((place: GooglePlace) => {
          const hasMatchingType = place.types.some(type => placeTypes.includes(type));
          
          // If business name is unknown/generic, skip name matching and just use type matching
          const isGenericName = !businessName || 
                               businessName.toLowerCase() === 'unknown' || 
                               businessName.toLowerCase() === 'unknown business' ||
                               businessName.toLowerCase() === 'business';
          
          const nameMatch = isGenericName || 
                           place.name.toLowerCase().includes(businessName.toLowerCase()) ||
                           businessName.toLowerCase().includes(place.name.toLowerCase());
          
          console.log(`🔎 Checking place: ${place.name}`);
          console.log(`  - Types: ${place.types.join(', ')}`);
          console.log(`  - Has matching type: ${hasMatchingType}`);
          console.log(`  - Name match: ${nameMatch} (generic name: ${isGenericName})`);
          
          return hasMatchingType && nameMatch;
        });
        
        if (filteredResults.length > 0) {
          console.log(`✅ Found ${filteredResults.length} filtered results`);
          return filteredResults;
        }
      } else if (data.status === 'ZERO_RESULTS') {
        console.log(`❌ No results for type "${placeType}"`);
      } else {
        console.error('Google Places API error:', data.status, data.error_message || data.error);
      }
    }
    
    console.log('❌ No results found for any place type');
    return [];
  } catch (error) {
    console.error('Error searching nearby places with type:', error);
    return [];
  }
};

// Search for nearby places using Google Places API via proxy with contextual filtering
export const searchNearbyPlaces = async (
  latitude: number,
  longitude: number,
  query?: string,
  radius: number = 1000
): Promise<GooglePlace[]> => {

  try {
    const params = new URLSearchParams({
      type: 'nearbysearch',
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radius.toString(),
    });
    
    if (query) {
      params.append('keyword', query);
    } else {
      params.append('place_type', 'restaurant|cafe|store|gym|beauty_salon');
    }

    console.log('Searching nearby places with params:', params.toString());
    
    const response = await fetch(`/api/google-places?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return [];
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 200));
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      return [];
    }
    
    const data = await response.json();

    if (data.status === 'OK') {
      return data.results || [];
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('Google Places API request denied:', data.error || data.error_message);
      return [];
    } else if (data.status === 'ZERO_RESULTS') {
      console.log('No places found for the given criteria');
      return [];
    } else {
      console.error('Google Places API error:', data.status, data.error_message || data.error);
      return [];
    }
  } catch (error) {
    console.error('Error searching nearby places:', error);
    return [];
  }
};

// Search for places by text query (more accurate for business name matching)
export const searchPlacesByText = async (
  query: string,
  latitude?: number,
  longitude?: number
): Promise<GooglePlace[]> => {

  try {
    const params = new URLSearchParams({
      type: 'textsearch',
      query: query,
    });
    
    if (latitude && longitude) {
      params.append('lat', latitude.toString());
      params.append('lng', longitude.toString());
      params.append('radius', '5000');
    }

    console.log('Searching places by text with params:', params.toString());

    const response = await fetch(`/api/google-places?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return [];
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 200));
      return [];
    }
    
    const data = await response.json();

    if (data.status === 'OK') {
      return data.results || [];
    } else if (data.status === 'ZERO_RESULTS') {
      console.log('No places found for the text query');
      return [];
    } else {
      console.error('Google Places API error:', data.status, data.error_message || data.error);
      return [];
    }
  } catch (error) {
    console.error('Error searching places by text:', error);
    return [];
  }
};

// Get detailed information about a specific place including reviews
export const getPlaceDetails = async (placeId: string): Promise<GooglePlaceDetails | null> => {

  try {
    const params = new URLSearchParams({
      type: 'details',
      place_id: placeId,
      fields: 'place_id,name,formatted_address,rating,user_ratings_total,price_level,opening_hours,photos,types,geometry,reviews,formatted_phone_number,website,business_status'
    });

    console.log('Getting place details for:', placeId);

    const response = await fetch(`/api/google-places?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 200));
      return null;
    }
    
    const data = await response.json();

    if (data.status === 'OK') {
      return data.result;
    } else {
      console.error('Google Places API error:', data.status, data.error_message || data.error);
      return null;
    }
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

// Get reviews for a specific place
export const getPlaceReviews = async (placeId: string): Promise<GoogleReview[]> => {

  try {
    const params = new URLSearchParams({
      type: 'details',
      place_id: placeId,
      fields: 'reviews'
    });

    const response = await fetch(`/api/google-places?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return [];
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 200));
      return [];
    }
    
    const data = await response.json();

    if (data.status === 'OK' && data.result.reviews) {
      return data.result.reviews;
    } else {
      console.error('Google Places API error:', data.status, data.error_message || data.error);
      return [];
    }
  } catch (error) {
    console.error('Error getting place reviews:', error);
    return [];
  }
};

// Get photo URL from Google Places photo reference (server-side proxy needed for security)
export const getPlacePhotoUrl = (
  photoReference: string,
  maxWidth: number = 400
): string => {
  // This should be proxied through your server-side API to keep the API key secure
  return `/api/google-places?type=photo&photo_reference=${photoReference}&maxwidth=${maxWidth}`;
};

// Reverse geocode coordinates to get formatted address (using server-side proxy)
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const response = await fetch(
      `/api/google-places?type=geocode&lat=${latitude}&lng=${longitude}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};

// Convert Google Place to our Place format
export const convertGooglePlaceToPlace = (googlePlace: GooglePlace, addedBy: string) => {
  const categoryMap: { [key: string]: string } = {
    'restaurant': 'Restaurant',
    'cafe': 'Coffee Shop',
    'food': 'Restaurant',
    'meal_takeaway': 'Restaurant',
    'beauty_salon': 'Nail Salon',
    'hair_care': 'Hair Salon',
    'gym': 'Gym',
    'store': 'Retail',
    'clothing_store': 'Retail',
    'book_store': 'Bookstore',
    'electronics_store': 'Retail'
  };

  // Determine category based on types
  let category = 'Other';
  for (const type of googlePlace.types) {
    if (categoryMap[type]) {
      category = categoryMap[type];
      break;
    }
  }

  // Get photo URL if available
  let imageUrl = 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800';
  if (googlePlace.photos && googlePlace.photos.length > 0) {
    imageUrl = getPlacePhotoUrl(googlePlace.photos[0].photo_reference);
  }

  // Format hours
  const hours = googlePlace.opening_hours?.open_now ? 'Open now' : 'Closed';
  const weekHours = googlePlace.opening_hours?.weekday_text || [];

  return {
    name: googlePlace.name,
    category,
    address: googlePlace.formatted_address,
    latitude: googlePlace.geometry.location.lat,
    longitude: googlePlace.geometry.location.lng,
    rating: googlePlace.rating || 0,
    review_count: googlePlace.user_ratings_total || 0,
    image_url: imageUrl,
    ai_summary: `${googlePlace.name} is a ${category.toLowerCase()} located at ${googlePlace.formatted_address}. ${googlePlace.rating ? `Rated ${googlePlace.rating} stars` : 'No ratings yet'}.`,
    pros: ['Great location', 'Good reviews'],
    cons: ['Limited information available'],
    recommendations: ['Check it out!'],
    google_place_id: googlePlace.place_id,
    is_open: googlePlace.opening_hours?.open_now || false,
    hours,
    week_hours: weekHours,
    added_by: addedBy
  };
};
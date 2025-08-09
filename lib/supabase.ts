import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
}

const _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  console.log('✅ Supabase client initialized successfully');

// Export the client
export const supabase = _supabase;

// Database Types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  points: number;
  level: string;
  role: string;
  // Social features (added in Phase 1)
  username?: string;
  bio?: string;
  allow_social_features: boolean;
}

export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  image_url: string;
  thumbnail_url?: string;
  ai_summary: string;
  pros: string[];
  cons: string[];
  recommendations: string[];
  google_place_id?: string;
  is_open: boolean;
  hours: string;
  week_hours: string[];
  phone?: string;
  website?: string;
  is_verified?: boolean;
  verification_source?: string;
  added_by: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  // Social features (Phase 2)
  friend_visited_count?: number;
  friend_visitor_names?: string[];
  // Friend context (Phase 4 - Enhanced Social)
  addedByFriend?: {
    id: string;
    full_name: string;
    username?: string;
    avatar_url?: string;
  };
}

export interface Review {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  text: string;
  likes: number;
  created_at: string;
  updated_at: string;
  user_profile?: Profile;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  color: string;
  is_public: boolean;
  cover_image?: string;
  created_at: string;
  updated_at: string;
  place_count?: number;
  places?: Place[];
  owner_name?: string;
  // Sharing features (Phase 4)
  is_shareable?: boolean;
  share_code?: string;
  shared_count?: number;
}

export interface SharedCollection extends Collection {
  owner_username?: string;
  owner_avatar_url?: string;
  permission: 'view' | 'collaborate';
  shared_at: string;
}

export interface CollectionShare {
  id: string;
  collection_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string;
  permission: 'view' | 'collaborate';
  shared_at: string;
}

export interface HiddenGem {
  id: string;
  city: string;
  country: string;
  title: string;
  description: string;
  reward: string;
  difficulty: string;
  clues: string[];
  rules: string[];
  hint_image_url: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  winner_id?: string;
  attempts: number;
  participants: number;
  time_left: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionPlace {
  id: string;
  collection_id: string;
  place_id: string;
  created_at: string;
}

// Social interfaces (added in Phase 1)
export interface UserConnection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'following' | 'friends';
  created_at: string;
}

export interface ConnectionsCount {
  following_count: number;
  followers_count: number;
}

export interface SocialProfile {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  allow_social_features: boolean;
}

export interface FriendActivity {
  id: string;
  user_id: string;
  user_full_name: string;
  user_username?: string;
  user_avatar_url?: string;
  activity_type: 'place_added' | 'collection_created' | 'place_saved' | 'review_added' | 'hidden_gem_found';
  place_id?: string;
  place_name?: string;
  place_image_url?: string;
  collection_id?: string;
  collection_name?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ReviewReply {
  id: string;
  review_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  user_profile?: Profile;
}

export interface PlacePhoto {
  id: string;
  place_id: string;
  user_id: string;
  photo_url: string;
  caption?: string;
  created_at: string;
}

// Auth functions
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await _supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await _supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await _supabase.auth.getUser();
  return user;
};

// Profile functions
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle zero results
  
  if (error) {
    console.error('Database error occurred while fetching profile'); // Don't log detailed error
    return null;
  }
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  console.log(' updateProfile called with userId:', userId);
  console.log(' updateProfile called with updates:', updates);
  
  const { data, error } = await _supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    console.error(' updateProfile error:', error);
  } else {
    console.log(' updateProfile success:', data);
  }
  
  return { data, error };
};

// User statistics functions
export const getUserPlacesCount = async (userId: string): Promise<number> => {
  const { count, error } = await _supabase
    .from('places')
    .select('*', { count: 'exact', head: true })
    .eq('added_by', userId);
  
  if (error) {
    console.error('Database error occurred while fetching user places count');
    return 0;
  }
  return count || 0;
};

export const getUserCollectionsCount = async (userId: string): Promise<number> => {
  const { count, error } = await _supabase
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching user collections count:', error);
    return 0;
  }
  return count || 0;
};

export const getUserReviewsCount = async (userId: string): Promise<number> => {
  const { count, error } = await _supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching user reviews count:', error);
    return 0;
  }
  return count || 0;
};

// Places functions
export const getPlaces = async (limit = 20, offset = 0): Promise<Place[]> => {
  const { data, error } = await _supabase
    .from('places')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('Error fetching places:', error);
    return [];
  }
  return data || [];
};

export const searchPlaces = async (query: string, category?: string): Promise<Place[]> => {
  let queryBuilder = _supabase
    .from('places')
    .select('*');
  
  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,ai_summary.ilike.%${query}%`);
  }
  
  if (category && category !== 'All') {
    queryBuilder = queryBuilder.eq('category', category);
  }
  
  const { data, error } = await queryBuilder
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('Error searching places:', error);
    return [];
  }
  return data || [];
};

// Get place by ID
export const getPlaceById = async (id: string): Promise<Place | null> => {
  const { data, error } = await _supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching place:', error);
    return null;
  }
  return data;
};

// Get reviews for a place with user profiles
export const getReviewsForPlace = async (placeId: string): Promise<Review[]> => {
  const { data, error } = await _supabase
    .from('reviews')
    .select(`
      *,
      user_profile:profiles(*)
    `)
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
  return data || [];
};

// Add review
export const addReview = async (review: {
  place_id: string;
  user_id: string;
  rating: number;
  text: string;
}): Promise<{ data: Review | null; error: any }> => {
  // Check if user already has a review for this place
  const { data: existingReview } = await _supabase
    .from('reviews')
    .select('id')
    .eq('place_id', review.place_id)
    .eq('user_id', review.user_id)
    .single();

  if (existingReview) {
    return { data: null, error: { message: 'You already have a review for this place' } };
  }

  const { data, error } = await _supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding review:', error);
    return { data: null, error };
  }

  // Update place rating and review count
  await updatePlaceRating(review.place_id);
  
  return { data, error: null };
};

// Update place rating and review count
const updatePlaceRating = async (placeId: string) => {
  try {
    // Get all reviews for this place
    const { data: reviews } = await _supabase
      .from('reviews')
      .select('rating')
      .eq('place_id', placeId);

    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      // Update place with new rating and review count
      await _supabase
        .from('places')
        .update({
          rating: averageRating,
          review_count: reviews.length
        })
        .eq('id', placeId);
    }
  } catch (error) {
    console.error('Error updating place rating:', error);
  }
};

// Update review
export const updateReview = async (reviewId: string, updates: {
  rating?: number;
  text?: string;
}): Promise<{ data: Review | null; error: any }> => {
  const { data, error } = await _supabase
    .from('reviews')
    .update(updates)
    .eq('id', reviewId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating review:', error);
    return { data: null, error };
  }

  // Update place rating if rating changed
  if (updates.rating !== undefined && data) {
    await updatePlaceRating(data.place_id);
  }
  
  return { data, error: null };
};

// Delete review
export const deleteReview = async (reviewId: string): Promise<{ error: any }> => {
  // Get review to find place_id for rating update
  const { data: review } = await _supabase
    .from('reviews')
    .select('place_id')
    .eq('id', reviewId)
    .single();

  const { error } = await _supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);
  
  if (error) {
    console.error('Error deleting review:', error);
    return { error };
  }

  // Update place rating
  if (review) {
    await updatePlaceRating(review.place_id);
  }
  
  return { error: null };
};

// Delete place (admin/owner only)
export const deletePlace = async (placeId: string): Promise<{ error: any }> => {
  const { error } = await _supabase
    .from('places')
    .delete()
    .eq('id', placeId);
  
  if (error) {
    console.error('Error deleting place:', error);
    return { error };
  }
  
  return { error: null };
};

export const addPlace = async (place: Omit<Place, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await _supabase
    .from('places')
    .insert(place)
    .select()
    .single();
  
  return { data, error };
};

// NEW PLACE MANAGEMENT FUNCTIONS WITH VISIBILITY CONTROL

// Check if a place already exists (for duplicate detection)
export const checkPlaceExists = async (
  googlePlaceId?: string, 
  latitude?: number, 
  longitude?: number
): Promise<{ publicPlace: Place | null, discoveryCount: number }> => {
  try {
    console.log('🔍 Checking if place exists:', { googlePlaceId, latitude, longitude });
    
    let query = _supabase
      .from('places')
      .select('*')
      .eq('is_public', true); // Only check public places for discovery counter
    
    // First try to find by Google Place ID (most reliable)
    if (googlePlaceId) {
      console.log('🎯 Searching by Google Place ID:', googlePlaceId);
      const { data: placesByGoogleId, error } = await query
        .eq('google_place_id', googlePlaceId);
      
      if (error) {
        console.error('Error checking place by Google ID:', error);
        return { publicPlace: null, discoveryCount: 0 };
      }
      
      if (placesByGoogleId && placesByGoogleId.length > 0) {
        console.log(`✅ Found ${placesByGoogleId.length} public places with Google ID`);
        return { 
          publicPlace: placesByGoogleId[0], 
          discoveryCount: placesByGoogleId.length 
        };
      }
    }
    
    // Fallback: Check by proximity (within 50m radius)
    if (latitude && longitude) {
      console.log('📍 Searching by proximity:', { latitude, longitude });
      
      // Use PostGIS distance calculation (if available) or simple lat/lng comparison
      const radiusInDegrees = 50 / 111000; // Approximate: 50m in degrees
      
      const { data: nearbyPlaces, error } = await query
        .gte('latitude', latitude - radiusInDegrees)
        .lte('latitude', latitude + radiusInDegrees)
        .gte('longitude', longitude - radiusInDegrees)
        .lte('longitude', longitude + radiusInDegrees);
      
      if (error) {
        console.error('Error checking place by proximity:', error);
        return { publicPlace: null, discoveryCount: 0 };
      }
      
      if (nearbyPlaces && nearbyPlaces.length > 0) {
        // Calculate actual distances and find closest
        const placesWithDistance = nearbyPlaces.map(place => {
          const distance = calculateDistance(latitude, longitude, place.latitude, place.longitude);
          return { ...place, distance };
        }).filter(place => place.distance <= 50); // 50m radius
        
        if (placesWithDistance.length > 0) {
          const closestPlace = placesWithDistance.sort((a, b) => a.distance - b.distance)[0];
          console.log(`✅ Found ${placesWithDistance.length} public places within 50m`);
          return { 
            publicPlace: closestPlace, 
            discoveryCount: placesWithDistance.length 
          };
        }
      }
    }
    
    console.log('❌ No existing public places found');
    return { publicPlace: null, discoveryCount: 0 };
    
  } catch (error) {
    console.error('Error in checkPlaceExists:', error);
    return { publicPlace: null, discoveryCount: 0 };
  }
};

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Add place with visibility control
export const addPlaceWithVisibility = async (
  place: Omit<Place, 'id' | 'created_at' | 'updated_at'>, 
  isPublic: boolean
): Promise<{ data: Place | null, error: any }> => {
  try {
    console.log('💾 Adding place with visibility:', { name: place.name, isPublic });
    
    const placeWithVisibility = {
      ...place,
      is_public: isPublic
    };
    
    const { data, error } = await _supabase
      .from('places')
      .insert(placeWithVisibility)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding place with visibility:', error);
      return { data: null, error };
    }
    
    console.log(`✅ Place added successfully (${isPublic ? 'public' : 'private'}):`, data?.name);
    return { data, error: null };
    
  } catch (error) {
    console.error('Error in addPlaceWithVisibility:', error);
    return { data: null, error };
  }
};

// Get only public places for discovery
export const getPublicPlaces = async (limit: number = 50, offset: number = 0): Promise<Place[]> => {
  try {
    console.log('🌍 Fetching public places:', { limit, offset });
    
    const { data, error } = await _supabase
      .from('places')
      .select('*')
      .eq('is_public', true) // Only return public places
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching public places:', error);
      // Fallback to regular getPlaces if is_public column doesn't exist yet
      if (error.code === '42703') {
        console.log('🔄 is_public column not found, falling back to regular places query');
        return await getPlaces(limit, offset);
      }
      return [];
    }
    
    console.log(`✅ Found ${data?.length || 0} public places`);
    return data || [];
    
  } catch (error) {
    console.error('Error in getPublicPlaces:', error);
    return [];
  }
};

// Get nearby public places only
// Helper function to extract city from address
const extractCityFromAddress = (address: string): string => {
  if (!address) return '';
  
  // Common patterns for city extraction from address
  // Format: "123 Street, City, State/Province, Country"
  const parts = address.split(',').map(part => part.trim());
  
  if (parts.length >= 2) {
    // Return the second-to-last part (usually city)
    return parts[parts.length - 2] || parts[0];
  }
  
  return parts[0] || '';
};

// New function with correct filtering: city name OR within 30km radius
export const getPlacesInCityAndNearby = async (
  cityName: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 30000
): Promise<Place[]> => {
  try {
    console.log(`🏙️ Fetching places in "${cityName}" and within ${radiusMeters/1000}km radius:`, { latitude, longitude });
    
    // First, get all public places (we'll filter client-side for better control)
    const { data, error } = await _supabase
      .from('places')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(500); // Reasonable limit for performance
    
    if (error) {
      console.error('❌ Error fetching places:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No public places found in database');
      return [];
    }
    
    console.log(`📊 Total public places in database: ${data.length}`);
    
    // Filter places by: same city name OR within radius
    const filteredPlaces = data.filter(place => {
      // Extract city from place address
      const placeCity = extractCityFromAddress(place.address);
      const isSameCity = placeCity.toLowerCase().includes(cityName.toLowerCase()) || 
                        cityName.toLowerCase().includes(placeCity.toLowerCase());
      
      if (isSameCity) {
        console.log(`🏙️ Including place "${place.name}" - same city: "${placeCity}"`);
        return true;
      }
      
      // Check if within radius
      const distance = calculateDistance(latitude, longitude, place.latitude, place.longitude);
      const withinRadius = distance <= radiusMeters;
      
      if (withinRadius) {
        console.log(`📍 Including place "${place.name}" - within ${Math.round(distance/1000)}km radius (city: "${placeCity}")`);
        return true;
      }
      
      return false;
    });
    
    console.log(`✅ Found ${filteredPlaces.length} places in "${cityName}" and nearby areas`);
    
    // Sort by: same city first, then by distance
    const sortedPlaces = filteredPlaces.sort((a, b) => {
      const aCityName = extractCityFromAddress(a.address);
      const bCityName = extractCityFromAddress(b.address);
      const aIsSameCity = aCityName.toLowerCase().includes(cityName.toLowerCase());
      const bIsSameCity = bCityName.toLowerCase().includes(cityName.toLowerCase());
      
      // Same city places first
      if (aIsSameCity && !bIsSameCity) return -1;
      if (!aIsSameCity && bIsSameCity) return 1;
      
      // Then sort by distance
      const aDistance = calculateDistance(latitude, longitude, a.latitude, a.longitude);
      const bDistance = calculateDistance(latitude, longitude, b.latitude, b.longitude);
      return aDistance - bDistance;
    });
    
    return sortedPlaces;
    
  } catch (error) {
    console.error('❌ Error in getPlacesInCityAndNearby:', error);
    return [];
  }
};

export const getNearbyPublicPlaces = async (
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Place[]> => {
  try {
    console.log('📍 Fetching nearby public places:', { latitude, longitude, radius });
    
    // Use a much larger bounding box to avoid filtering out places
    // Convert radius to a more generous degree approximation
    const radiusInKm = radius / 1000;
    const radiusInDegrees = (radiusInKm / 111) * 2; // More generous 2x multiplier
    
    console.log(`🔍 Using radius of ${radiusInKm}km (${radiusInDegrees.toFixed(4)} degrees) for public places query`);
    
    const { data, error } = await _supabase
      .from('places')
      .select('*')
      .eq('is_public', true) // Only return public places
      .gte('latitude', latitude - radiusInDegrees)
      .lte('latitude', latitude + radiusInDegrees)
      .gte('longitude', longitude - radiusInDegrees)
      .lte('longitude', longitude + radiusInDegrees)
      .order('created_at', { ascending: false })
      .limit(100); // Add reasonable limit for performance
    
    if (error) {
      console.error('❌ Error fetching nearby public places:', error);
      console.log('🔄 Error details:', { code: error.code, message: error.message });
      
      // Fallback to regular getNearbyPlaces if is_public column doesn't exist yet
      if (error.code === '42703') {
        console.log('🔄 is_public column not found, falling back to regular nearby places query');
        return await getNearbyPlaces(latitude, longitude, radiusInKm);
      }
      
      // For any other error, try to get all public places as fallback
      console.log('🔄 Trying fallback query for all public places...');
      const fallbackResult = await _supabase
        .from('places')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (fallbackResult.error) {
        console.error('❌ Fallback query also failed:', fallbackResult.error);
        return [];
      }
      
      console.log(`🔄 Fallback found ${fallbackResult.data?.length || 0} public places`);
      return fallbackResult.data || [];
    }
    
    console.log(`🎯 Raw query returned ${data?.length || 0} public places`);
    
    if (!data || data.length === 0) {
      console.log('⚠️ No public places found in database query');
      return [];
    }
    
    // Calculate actual distances and filter more generously
    const placesWithDistance = data.map(place => {
      const distance = calculateDistance(latitude, longitude, place.latitude, place.longitude);
      return { ...place, distance: distance };
    });
    
    // Apply distance filter with actual radius
    const filteredPlaces = placesWithDistance.filter(place => place.distance <= radius);
    
    // Sort by proximity
    const sortedPlaces = filteredPlaces.sort((a, b) => a.distance - b.distance);
    
    console.log(`✅ Found ${sortedPlaces.length} nearby public places within ${radius}m`);
    console.log(`🔍 Distance range: ${sortedPlaces.length > 0 ? Math.round(sortedPlaces[0].distance) : 0}m - ${sortedPlaces.length > 0 ? Math.round(sortedPlaces[sortedPlaces.length - 1]?.distance || 0) : 0}m`);
    
    // Debug: Log first few places for troubleshooting
    if (sortedPlaces.length > 0) {
      console.log('🏆 Top 3 public places found:', sortedPlaces.slice(0, 3).map(p => ({ 
        name: p.name, 
        distance: Math.round(p.distance), 
        is_public: p.is_public 
      })));
    }
    
    return sortedPlaces;
    
  } catch (error) {
    console.error('❌ Unexpected error in getNearbyPublicPlaces:', error);
    
    // Final fallback: try to get any public places at all
    try {
      console.log('🆘 Final fallback: getting any public places...');
      const { data, error: fallbackError } = await _supabase
        .from('places')
        .select('*')
        .eq('is_public', true)
        .limit(20);
        
      if (fallbackError) {
        console.error('❌ Final fallback also failed:', fallbackError);
        return [];
      }
      
      console.log(`🆘 Final fallback returned ${data?.length || 0} public places`);
      return data || [];
    } catch (finalError) {
      console.error('❌ All fallbacks failed:', finalError);
      return [];
    }
  }
};

export const getUserCollections = async (userId: string): Promise<Collection[]> => {
  const { data, error } = await _supabase
    .from('collections')
    .select(`
      *,
      places:collection_places(
        place:places(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
  return data || [];
};

export const createCollection = async (collection: Omit<Collection, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await _supabase
    .from('collections')
    .insert(collection)
    .select()
    .single();
  
  return { data, error };
};

export const addPlaceToCollection = async (collectionId: string, placeId: string) => {
  const { data, error } = await _supabase
    .from('collection_places')
    .insert({
      collection_id: collectionId,
      place_id: placeId,
    })
    .select()
    .single();
  
  return { data, error };
};

export const getHiddenGemByCity = async (city: string): Promise<HiddenGem | null> => {
  console.log(`🔍 Fetching hidden gem for city: "${city}"`);
  
  const { data, error } = await _supabase
    .from('hidden_gems')
    .select('*')
    .eq('city', city)
    .eq('is_active', true)
    .limit(1);
  
  if (error) {
    console.error('❌ Error fetching hidden gem:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    console.log(`⚠️ No active hidden gems found for city: "${city}"`);
    return null;
  }
  
  const hiddenGem = data[0];
  console.log(`✅ Found hidden gem: "${hiddenGem.title}" in ${hiddenGem.city}`);
  return hiddenGem;
};

// Get all active hidden gems for a city (for when there are multiple)
export const getActiveHiddenGemsByCity = async (city: string): Promise<HiddenGem[]> => {
  console.log(`🔍 Fetching all active hidden gems for city: "${city}"`);
  
  const { data, error } = await _supabase
    .from('hidden_gems')
    .select('*')
    .eq('city', city)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error fetching active hidden gems:', error);
    return [];
  }
  
  console.log(`✅ Found ${data?.length || 0} active hidden gems for "${city}"`);
  return data || [];
};

// Get all discovered hidden gems for a city (for grey diamonds)
export const getDiscoveredHiddenGemsByCity = async (city: string): Promise<HiddenGem[]> => {
  console.log(`🔍 Fetching discovered hidden gems for city: "${city}"`);
  
  const { data, error } = await _supabase
    .from('hidden_gems')
    .select('*')
    .eq('city', city)
    .eq('is_active', false)
    .not('winner_id', 'is', null)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error fetching discovered hidden gems:', error);
    return [];
  }
  
  console.log(`✅ Found ${data?.length || 0} discovered hidden gems for "${city}"`);
  return data || [];
};

export const updateHiddenGemStats = async (id: string, attempts: number, participants: number) => {
  const { data, error } = await _supabase
    .from('hidden_gems')
    .update({ attempts, participants })
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
};

export const getNearbyPlaces = async (latitude: number, longitude: number, radiusKm = 5): Promise<Place[]> => {
  try {
    console.log(`🔍 Attempting to fetch places near (${latitude}, ${longitude}) within ${radiusKm}km`);
    
    const { data, error } = await _supabase
      .rpc('get_nearby_places', {
        lat: latitude,
        lng: longitude,
        radius_km: radiusKm
      });
    
    if (error) {
      console.error('❌ Supabase RPC error for nearby places:', error);
      
      // If it's a type mismatch error (42804), fall back to regular places query
      if (error.code === '42804') {
        console.log('🔄 SQL type mismatch detected, falling back to general places query...');
        return await getPlaces(50, 0); // Fall back to general places
      }
      
      return [];
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} nearby places`);
    return data || [];
    
  } catch (error) {
    console.error('❌ Unexpected error in getNearbyPlaces:', error);
    // Fall back to general places query on any error
    console.log('🔄 Falling back to general places query...');
    try {
      return await getPlaces(50, 0);
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
      return [];
    }
  }
};

// Check if user is admin
export const isUserAdmin = async (userId?: string): Promise<boolean> => {
  try {
    const { data, error } = await _supabase
      .rpc('is_admin', { user_id: userId || (await getCurrentUser())?.id });
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    return data || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Enhanced place filtering function
export const getFilteredPlaces = async (
  searchQuery?: string,
  categoryFilter?: string,
  sortBy: string = 'newest',
  limit: number = 20,
  offset: number = 0
): Promise<Place[]> => {
  try {
    const { data, error } = await _supabase
      .rpc('get_filtered_places', {
        search_query: searchQuery || null,
        category_filter: categoryFilter || null,
        sort_by: sortBy,
        limit_count: limit,
        offset_count: offset
      });
    
    if (error) {
      console.error('Error fetching filtered places:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching filtered places:', error);
    return [];
  }
};

// Like/unlike review
export const toggleReviewLike = async (reviewId: string, increment: 1 | -1): Promise<{ error: any }> => {
  try {
    const { error } = await _supabase
      .rpc('update_review_likes', {
        review_id: reviewId,
        increment: increment
      });
    
    if (error) {
      console.error('Error updating review likes:', error);
      return { error };
    }
    return { error: null };
  } catch (error) {
    console.error('Error updating review likes:', error);
    return { error };
  }
};

// Get review replies
export const getReviewReplies = async (reviewId: string): Promise<ReviewReply[]> => {
  const { data, error } = await _supabase
    .from('review_replies')
    .select(`
      *,
      user_profile:profiles(*)
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching review replies:', error);
    return [];
  }
  return data || [];
};

// Add review reply
export const addReviewReply = async (reply: {
  review_id: string;
  user_id: string;
  text: string;
}): Promise<{ data: ReviewReply | null; error: any }> => {
  const { data, error } = await _supabase
    .from('review_replies')
    .insert(reply)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding review reply:', error);
    return { data: null, error };
  }
  return { data, error: null };
};

// Delete review reply
export const deleteReviewReply = async (replyId: string): Promise<{ error: any }> => {
  const { error } = await _supabase
    .from('review_replies')
    .delete()
    .eq('id', replyId);
  
  if (error) {
    console.error('Error deleting review reply:', error);
    return { error };
  }
  return { error: null };
};

// Get place photos
export const getPlacePhotos = async (placeId: string): Promise<PlacePhoto[]> => {
  const { data, error } = await _supabase
    .from('place_photos')
    .select('*')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching place photos:', error);
    return [];
  }
  return data || [];
};

// Add place photo
export const addPlacePhoto = async (photo: {
  place_id: string;
  user_id: string;
  photo_url: string;
  caption?: string;
}): Promise<{ data: PlacePhoto | null; error: any }> => {
  const { data, error } = await _supabase
    .from('place_photos')
    .insert(photo)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding place photo:', error);
    return { data: null, error };
  }
  return { data, error: null };
};

// Delete place photo
export const deletePlacePhoto = async (photoId: string): Promise<{ error: any }> => {
  const { error } = await _supabase
    .from('place_photos')
    .delete()
    .eq('id', photoId);
  
  if (error) {
    console.error('Error deleting place photo:', error);
    return { error };
  }
  return { error: null };
};

// Hidden Gems Functions

// Check if a location matches an active hidden gem (within proximity)
export const checkHiddenGemDiscovery = async (latitude: number, longitude: number, proximityMeters: number = 50): Promise<HiddenGem | null> => {
  try {
    console.log(`🔍 Checking for hidden gems near coordinates: ${latitude}, ${longitude}`);
    
    // Using PostGIS distance calculation to find hidden gems within proximity
    const { data, error } = await _supabase
      .rpc('find_nearby_hidden_gems', {
        search_lat: latitude,
        search_lng: longitude,
        radius_meters: proximityMeters
      });
    
    if (error) {
      console.error('Error checking hidden gem discovery:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      console.log(`🎯 Found hidden gem: ${data[0].title}`);
      return data[0];
    }
    
    console.log('❌ No hidden gems found in proximity');
    return null;
  } catch (error) {
    console.error('Error checking hidden gem discovery:', error);
    return null;
  }
};

// Mark a hidden gem as discovered by a user
export const markHiddenGemDiscovered = async (hiddenGemId: string, winnerId: string): Promise<{ data: HiddenGem | null, error: any }> => {
  try {
    console.log(`🏆 Marking hidden gem ${hiddenGemId} as discovered by user ${winnerId}`);
    
    const { data, error } = await _supabase
      .from('hidden_gems')
      .update({
        is_active: false,
        winner_id: winnerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', hiddenGemId)
      .eq('is_active', true) // Only update if still active
      .select()
      .single();
    
    if (error) {
      console.error('Error marking hidden gem as discovered:', error);
      return { data: null, error };
    }
    
    console.log(`✅ Hidden gem discovered successfully:`, data);
    return { data, error: null };
  } catch (error) {
    console.error('Error marking hidden gem as discovered:', error);
    return { data: null, error };
  }
};

// NOTE: Duplicate functions removed - these are already defined above around line 519-557

// Admin Functions

// Create a new hidden gem (admin only)
export const createHiddenGem = async (hiddenGemData: Omit<HiddenGem, 'id' | 'created_at' | 'updated_at' | 'winner_id' | 'attempts' | 'participants'>): Promise<{ data: HiddenGem | null, error: any }> => {
  try {
    console.log('📝 Creating new hidden gem:', hiddenGemData);
    
    const { data, error } = await _supabase
      .from('hidden_gems')
      .insert({
        ...hiddenGemData,
        is_active: true,
        attempts: 0,
        participants: 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating hidden gem:', error);
      return { data: null, error };
    }
    
    console.log('✅ Hidden gem created successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error creating hidden gem:', error);
    return { data: null, error };
  }
};

// Update hidden gem stats (attempts, participants)
export const incrementHiddenGemStats = async (hiddenGemId: string, incrementAttempts: boolean = true, incrementParticipants: boolean = false): Promise<{ error: any }> => {
  try {
    let updateData: any = {};
    
    if (incrementAttempts) {
      // Use SQL to increment attempts
      const { error } = await _supabase
        .rpc('increment_hidden_gem_attempts', { gem_id: hiddenGemId });
      
      if (error) {
        console.error('Error incrementing attempts:', error);
        return { error };
      }
    }
    
    if (incrementParticipants) {
      // Use SQL to increment participants
      const { error } = await _supabase
        .rpc('increment_hidden_gem_participants', { gem_id: hiddenGemId });
      
      if (error) {
        console.error('Error incrementing participants:', error);
        return { error };
      }
    }
    
    return { error: null };
  } catch (error) {
    console.error('Error updating hidden gem stats:', error);
    return { error };
  }
};

// Update user location for targeted notifications
export const updateUserLocationForNotifications = async (userId: string, city: string, country: string, latitude: number, longitude: number): Promise<{ error: any }> => {
  try {
    const { error } = await _supabase
      .from('profiles')
      .update({
        last_city: city,
        last_country: country,
        last_latitude: latitude,
        last_longitude: longitude,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user location for notifications:', error);
      return { error };
    }
    
    return { error: null };
  } catch (error) {
    console.error('Error updating user location for notifications:', error);
    return { error };
  }
};

// Enhanced Collections Functions

// Get user collections with place count
export const getUserCollectionsWithCount = async (userId: string): Promise<Collection[]> => {
  try {
    const { data, error } = await _supabase
      .rpc('get_collections_with_count', { user_id_param: userId });
    
    if (error) {
      console.error('Error fetching user collections:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user collections:', error);
    return [];
  }
};

// Get public collections
export const getPublicCollections = async (): Promise<Collection[]> => {
  try {
    const { data, error } = await _supabase
      .rpc('get_public_collections');
    
    if (error) {
      console.error('Error fetching public collections:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching public collections:', error);
    return [];
  }
};

// Create collection with new fields
export const createCollectionWithDetails = async (collectionData: {
  name: string;
  description?: string;
  user_id: string;
  color: string;
  is_public: boolean;
  cover_image?: string;
}): Promise<{ data: Collection | null, error: any }> => {
  try {
    const { data, error } = await _supabase
      .from('collections')
      .insert(collectionData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating collection:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating collection:', error);
    return { data: null, error };
  }
};

// Get collection places with details
export const getCollectionPlaces = async (collectionId: string): Promise<Place[]> => {
  try {
    const { data, error } = await _supabase
      .rpc('get_collection_places', { collection_id_param: collectionId });
    
    if (error) {
      console.error('Error fetching collection places:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching collection places:', error);
    return [];
  }
};

// Get all user places (for the places tab)
export const getUserAllPlaces = async (userId: string): Promise<Place[]> => {
  try {
    const { data, error } = await _supabase
      .from('places')
      .select('*')
      .eq('added_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user places:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user places:', error);
    return [];
  }
};

// Update collection
export const updateCollection = async (collectionId: string, updates: Partial<Collection>): Promise<{ data: Collection | null, error: any }> => {
  try {
    const { data, error } = await _supabase
      .from('collections')
      .update(updates)
      .eq('id', collectionId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating collection:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating collection:', error);
    return { data: null, error };
  }
};

// Delete collection
export const deleteCollection = async (collectionId: string): Promise<{ error: any }> => {
  try {
    const { error } = await _supabase
      .from('collections')
      .delete()
      .eq('id', collectionId);
    
    if (error) {
      console.error('Error deleting collection:', error);
      return { error };
    }
    
    return { error: null };
  } catch (error) {
    console.error('Error deleting collection:', error);
    return { error };
  }
};

// Get individual collection by ID with place count
export const getUserCollectionById = async (collectionId: string): Promise<Collection | null> => {
  try {
    // For now, use a direct query since we don't have the RPC function yet
    const { data, error } = await _supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single();
    
    if (error) {
      console.error('Error fetching collection by ID:', error);
      return null;
    }
    
    // Get place count separately
    const { count } = await _supabase
      .from('collection_places')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId);
    
    return {
      ...data,
      place_count: count || 0
    };
  } catch (error) {
    console.error('Error in getUserCollectionById:', error);
    return null;
  }
};

// ================================
// SOCIAL FUNCTIONS (Phase 1)
// ================================

// Update user's social profile
export const updateSocialProfile = async (updates: {
  username?: string;
  bio?: string;
  allow_social_features?: boolean;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await _supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      // Handle username uniqueness constraint
      if (error.code === '23505' && error.message.includes('username')) {
        return { success: false, error: 'Username already taken' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating social profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
};

// Check if username is available
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    if (!username || username.length < 3) return false;

    const { data, error } = await _supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows returned - username is available
      return true;
    }

    return false; // Username exists or other error
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
};

// Get social profile by ID or username
export const getSocialProfile = async (identifier: string): Promise<SocialProfile | null> => {
  try {
    const isUUID = identifier.includes('-');
    const field = isUUID ? 'id' : 'username';

    const { data, error } = await _supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, bio, allow_social_features')
      .eq(field, identifier)
      .eq('allow_social_features', true)
      .single();

    if (error) {
      console.error('Error fetching social profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getSocialProfile:', error);
    return null;
  }
};

// ================================
// SOCIAL DISCOVERY FUNCTIONS (Phase 2)
// ================================

// Get places with friend data for enhanced discovery
export const getPlacesWithFriendData = async (limit: number = 50): Promise<Place[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await _supabase
      .rpc('get_places_with_friend_data', {
        user_uuid: user.id,
        limit_count: limit
      });

    if (error) {
      console.error('Error fetching places with friend data:', error);
      // Fallback to regular places if function fails
      return await getPublicPlaces(limit, 0);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPlacesWithFriendData:', error);
    // Fallback to regular places
    return await getPublicPlaces(limit, 0);
  }
};

// Get places that only friends have visited (friends-only filter)
export const getFriendsOnlyPlaces = async (limit: number = 50): Promise<Place[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await _supabase
      .rpc('get_friends_only_places', {
        user_uuid: user.id,
        limit_count: limit
      });

    if (error) {
      console.error('Error fetching friends-only places:', error);
      // Fallback to regular places if social function fails
      console.log('Falling back to regular public places');
      return await getPublicPlaces(limit, 0);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getFriendsOnlyPlaces:', error);
    // Fallback to regular places
    return await getPublicPlaces(limit, 0);
  }
};

// Get nearby places that only friends have visited (friends-only filter)
// Enhanced friends-only places with city + radius filtering
export const getFriendsOnlyPlacesInCityAndNearby = async (
  cityName: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 30000,
  limit: number = 50
): Promise<Place[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
      console.log('❌ No authenticated user for friends-only places');
      return [];
    }

    console.log(`👥 Fetching friends-only places in "${cityName}" and within ${radiusMeters/1000}km`);
    
    // Try using the RPC function first
    const { data, error } = await _supabase
      .rpc('get_nearby_friends_only_places', {
        user_uuid: user.id,
        user_lat: latitude,
        user_lng: longitude,
        radius_meters: radiusMeters * 2, // Get broader results to filter by city
        limit_count: limit * 2
      });
    
    if (error) {
      console.error('Error fetching nearby friends-only places:', error);
      // Fallback to city + nearby filtering with regular places
      console.log('Falling back to city + nearby places filtering');
      return await getPlacesInCityAndNearby(cityName, latitude, longitude, radiusMeters);
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Apply city + radius filtering to friends-only results
    const filteredPlaces = data.filter((place: Place) => {
      const placeCity = extractCityFromAddress(place.address);
      const isSameCity = placeCity.toLowerCase().includes(cityName.toLowerCase()) || 
                        cityName.toLowerCase().includes(placeCity.toLowerCase());
      
      if (isSameCity) return true;
      
      const distance = calculateDistance(latitude, longitude, place.latitude, place.longitude);
      return distance <= radiusMeters;
    });
    
    console.log(`✅ Found ${filteredPlaces.length} friends-only places in "${cityName}" and nearby`);
    return filteredPlaces.slice(0, limit);
    
  } catch (error) {
    console.error('Error in getFriendsOnlyPlacesInCityAndNearby:', error);
    return await getPlacesInCityAndNearby(cityName, latitude, longitude, radiusMeters);
  }
};

export const getNearbyFriendsOnlyPlaces = async (
  latitude: number,
  longitude: number,
  radiusMeters: number = 30000,
  limit: number = 50
): Promise<Place[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await _supabase
      .rpc('get_nearby_friends_only_places', {
        user_uuid: user.id,
        user_lat: latitude,
        user_lng: longitude,
        radius_meters: radiusMeters,
        limit_count: limit
      });

    if (error) {
      console.error('Error fetching nearby friends-only places:', error);
      // Fallback to nearby public places if social function fails
      console.log('Falling back to nearby public places');
      return await getNearbyPublicPlaces(latitude, longitude, radiusMeters);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getNearbyFriendsOnlyPlaces:', error);
    // Fallback to nearby public places
    return await getNearbyPublicPlaces(latitude, longitude, radiusMeters);
  }
};

// Get friend activity feed
export const getFriendActivityFeed = async (limit: number = 20): Promise<FriendActivity[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await _supabase
      .rpc('get_friend_activity_feed', {
        user_uuid: user.id,
        limit_count: limit
      });

    if (error) {
      console.error('Error fetching friend activity feed:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getFriendActivityFeed:', error);
    return [];
  }
};

// Track user activity for social feed
export const trackUserActivity = async (
  activityType: FriendActivity['activity_type'],
  placeId?: string,
  collectionId?: string,
  metadata: Record<string, any> = {}
): Promise<string | null> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return null;

    // Check if user has social features enabled
    const profile = await getProfile(user.id);
    if (!profile?.allow_social_features) {
      return null; // Don't track if social features disabled
    }

    const { data, error } = await _supabase
      .rpc('track_user_activity', {
        activity_type_param: activityType,
        place_id_param: placeId || null,
        collection_id_param: collectionId || null,
        metadata_param: metadata
      });

    if (error) {
      console.error('Error tracking user activity:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in trackUserActivity:', error);
    return null;
  }
};

// Enhanced nearby places with friend data
// Enhanced places with friend data using city + radius filtering
export const getPlacesWithFriendDataInCityAndNearby = async (
  cityName: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 30000
): Promise<Place[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];
    
    console.log(`👥 Fetching places with friend data in "${cityName}" and within ${radiusMeters/1000}km`);
    
    // Get places using city + nearby filtering first
    const nearbyPlaces = await getPlacesInCityAndNearby(cityName, latitude, longitude, radiusMeters);
    
    // If user doesn't have social features enabled, return regular places
    const profile = await getProfile(user.id);
    if (!profile?.allow_social_features) {
      return nearbyPlaces;
    }
    
    // Enhance with friend data
    const placesWithFriendData = await Promise.all(
      nearbyPlaces.map(async (place) => {
        try {
          // Get friend visitors for this place
          const { data: friendVisitors } = await _supabase
            .rpc('get_place_friend_visitors', {
              place_id: place.id,
              user_id: user.id
            });
          
          if (friendVisitors && friendVisitors.length > 0) {
            return {
              ...place,
              friend_visited_count: friendVisitors.length,
              friend_visitor_names: friendVisitors.map((f: any) => f.display_name || f.full_name)
            };
          }
        } catch (error) {
          console.log(`Could not get friend data for place ${place.id}:`, error);
        }
        return place;
      })
    );
    
    return placesWithFriendData;
  } catch (error) {
    console.error('Error in getPlacesWithFriendDataInCityAndNearby:', error);
    // Fallback to regular city + nearby places
    return await getPlacesInCityAndNearby(cityName, latitude, longitude, radiusMeters);
  }
};

export const getNearbyPlacesWithFriendData = async (
  latitude: number,
  longitude: number,
  radiusMeters: number = 5000
): Promise<Place[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    // Get nearby places first
    const nearbyPlaces = await getNearbyPublicPlaces(latitude, longitude, radiusMeters);
    
    // If user doesn't have social features enabled, return regular places
    const profile = await getProfile(user.id);
    if (!profile?.allow_social_features) {
      return nearbyPlaces;
    }

    // Enhance with friend data
    const placesWithFriendData = await getPlacesWithFriendData(50);
    
    // Merge nearby places with friend data
    const enhancedPlaces = nearbyPlaces.map(place => {
      const friendData = placesWithFriendData.find(p => p.id === place.id);
      return {
        ...place,
        friend_visited_count: friendData?.friend_visited_count || 0,
        friend_visitor_names: friendData?.friend_visitor_names || []
      };
    });

    // Sort by friend data first, then by other criteria
    return enhancedPlaces.sort((a, b) => {
      if ((a.friend_visited_count || 0) !== (b.friend_visited_count || 0)) {
        return (b.friend_visited_count || 0) - (a.friend_visited_count || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  } catch (error) {
    console.error('Error in getNearbyPlacesWithFriendData:', error);
    // Fallback to regular nearby places
    return await getNearbyPublicPlaces(latitude, longitude, radiusMeters);
  }
};

// Enhanced function to show which specific friends added places
export const getNearbyPlacesWithFriendAttribution = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 5
): Promise<Place[]> => {
  try {
    console.log('🔍 Getting nearby places with friend attribution...');
    
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
      console.log('❌ No user found, returning regular nearby places');
      return await getNearbyPlaces(latitude, longitude, radiusKm);
    }

    // Check if user has social features enabled
    const profile = await getProfile(user.id);
    if (!profile?.allow_social_features) {
      console.log('ℹ️ Social features not enabled, returning regular places');
      return await getNearbyPlaces(latitude, longitude, radiusKm);
    }

    // Get nearby places
    const nearbyPlaces = await getNearbyPlaces(latitude, longitude, radiusKm);
    console.log(`📍 Found ${nearbyPlaces.length} nearby places`);

    // Get user's connections (friends they follow)
    const { data: connections, error: connectionsError } = await _supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', user.id);

    if (connectionsError || !connections) {
      console.log('ℹ️ No connections found, returning places without friend context');
      return nearbyPlaces;
    }

    const friendIds = connections.map(c => c.connected_user_id);
    console.log(`👥 Found ${friendIds.length} friends`);

    if (friendIds.length === 0) {
      return nearbyPlaces;
    }

    // Get friend profiles for places added by friends
    const { data: friendProfiles, error: profilesError } = await _supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', friendIds);

    if (profilesError) {
      console.error('❌ Error fetching friend profiles:', profilesError);
      return nearbyPlaces;
    }

    // Create friend lookup map
    const friendLookup = new Map(
      (friendProfiles || []).map(friend => [friend.id, friend])
    );

    // Enhance places with friend attribution
    const enhancedPlaces = nearbyPlaces.map(place => {
      const friend = friendLookup.get(place.added_by);
      
      if (friend) {
        console.log(`👤 Place "${place.name}" was added by friend: ${friend.full_name}`);
        return {
          ...place,
          addedByFriend: {
            id: friend.id,
            full_name: friend.full_name,
            username: friend.username,
            avatar_url: friend.avatar_url,
          }
        };
      }
      
      return place;
    });

    // Sort: places added by friends first, then by creation date
    const sortedPlaces = enhancedPlaces.sort((a, b) => {
      // Friends' places first
      if (a.addedByFriend && !b.addedByFriend) return -1;
      if (!a.addedByFriend && b.addedByFriend) return 1;
      
      // Then by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const friendPlacesCount = sortedPlaces.filter(p => p.addedByFriend).length;
    console.log(`✅ Enhanced ${friendPlacesCount} places with friend attribution`);

    return sortedPlaces;

  } catch (error) {
    console.error('❌ Error in getNearbyPlacesWithFriendAttribution:', error);
    // Fallback to regular nearby places
    return await getNearbyPlaces(latitude, longitude, radiusKm);
  }
};

// ================================
// COLLECTION SHARING FUNCTIONS (Phase 4)
// ================================

// Enable sharing for a collection
export const enableCollectionSharing = async (collectionId: string): Promise<{ success: boolean; shareCode?: string; error?: string }> => {
  try {
    const { data, error } = await _supabase
      .rpc('enable_collection_sharing', { collection_uuid: collectionId });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, shareCode: data };
  } catch (error) {
    console.error('Error enabling collection sharing:', error);
    return { success: false, error: 'Failed to enable sharing' };
  }
};

// Share collection with a friend
export const shareCollectionWithFriend = async (
  collectionId: string, 
  friendUserId: string, 
  permission: 'view' | 'collaborate' = 'view'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await _supabase
      .rpc('share_collection_with_friend', {
        collection_uuid: collectionId,
        friend_user_id: friendUserId,
        permission_level: permission
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sharing collection with friend:', error);
    return { success: false, error: 'Failed to share collection' };
  }
};

// Get collections shared with user
export const getSharedCollections = async (): Promise<SharedCollection[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await _supabase
      .rpc('get_shared_collections', { user_uuid: user.id });

    if (error) {
      console.error('Error fetching shared collections:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSharedCollections:', error);
    return [];
  }
};

// Get users who have access to a collection
export const getCollectionShareRecipients = async (collectionId: string): Promise<SocialProfile[]> => {
  try {
    const { data, error } = await _supabase
      .from('collection_shares')
      .select(`
        shared_with_user_id,
        permission,
        shared_at,
        profiles!collection_shares_shared_with_user_id_fkey (
          id,
          full_name,
          username,
          avatar_url,
          allow_social_features
        )
      `)
      .eq('collection_id', collectionId);

    if (error) {
      console.error('Error fetching collection shares:', error);
      return [];
    }

    type ProfileLite = {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      allow_social_features: boolean | null;
    };

    return (data ?? []).map((item: any) => {
      const profVal: ProfileLite | ProfileLite[] | null | undefined = item?.profiles;
      const profile: ProfileLite | undefined = Array.isArray(profVal) ? profVal[0] : profVal || undefined;
      return {
        id: profile?.id ?? '',
        full_name: profile?.full_name ?? '',
        username: profile?.username ?? undefined,
        avatar_url: profile?.avatar_url ?? undefined,
        allow_social_features: profile?.allow_social_features ?? false,
      };
    });
  } catch (error) {
    console.error('Error in getCollectionShareRecipients:', error);
    return [];
  }
};

// Remove collection share
export const removeCollectionShare = async (collectionId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await _supabase
      .from('collection_shares')
      .delete()
      .eq('collection_id', collectionId)
      .eq('shared_with_user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Decrement shared count (two-step to avoid unsupported SQL tag)
    const { data: collRow, error: fetchCollErr } = await _supabase
      .from('collections')
      .select('shared_count')
      .eq('id', collectionId)
      .single();

    if (!fetchCollErr) {
      const current = (collRow?.shared_count as number) ?? 0;
      const next = Math.max(0, current - 1);
      await _supabase
        .from('collections')
        .update({ shared_count: next })
        .eq('id', collectionId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing collection share:', error);
    return { success: false, error: 'Failed to remove share' };
  }
};

// Find collection by share code
export const findCollectionByShareCode = async (shareCode: string): Promise<Collection | null> => {
  try {
    const { data, error } = await _supabase
      .from('collections')
      .select(`
        *,
        profiles!collections_user_id_fkey (
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('share_code', shareCode.toUpperCase())
      .eq('is_shareable', true)
      .single();

    if (error) {
      console.error('Error finding collection by share code:', error);
      return null;
    }

    return {
      ...data,
      owner_name: data.profiles?.full_name
    };
  } catch (error) {
    console.error('Error in findCollectionByShareCode:', error);
    return null;
  }
};

// Location-based interfaces
export interface LocationPrivacySettings {
  id: string;
  share_city_with_friends: boolean;
  share_city_publicly: boolean;
  allow_nearby_suggestions: boolean;  
  location_sharing_radius_km: number;
  auto_update_location: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLocationHistory {
  id: string;
  user_id: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  recorded_at: string;
  is_current: boolean;
}

export interface NearbyUser extends SocialProfile {
  current_city?: string;
  current_country?: string;
  distance_km: number;
  mutual_friends_count: number;
}

export interface LocationUpdateResult {
  success: boolean;
  error?: string;
}

// Update user's current location
export const updateUserLocation = async (
  city: string,
  country: string,
  latitude?: number,
  longitude?: number,
  accuracy?: number
): Promise<LocationUpdateResult> => {
  try {
    const { data, error } = await _supabase
      .rpc('update_user_location', {
        city_param: city,
        country_param: country,
        latitude_param: latitude,
        longitude_param: longitude,
        accuracy_param: accuracy
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data === true };
  } catch (error) {
    console.error('Error updating user location:', error);
    return { success: false, error: 'Failed to update location' };
  }
};

// Find nearby users
export const findNearbyUsers = async (
  radiusKm: number = 50,
  limit: number = 20
): Promise<NearbyUser[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return [];
    }

    const { data, error } = await _supabase
      .rpc('find_nearby_users', {
        user_uuid: user.id,
        radius_km: radiusKm,
        limit_count: limit
      });

    if (error) {
      console.error('Error finding nearby users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in findNearbyUsers:', error);
    return [];
  }
};

// Find users in same city
export const findUsersInCity = async (limit: number = 20): Promise<NearbyUser[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return [];
    }

    const { data, error } = await _supabase
      .rpc('find_users_in_city', {
        user_uuid: user.id,
        limit_count: limit
      });

    if (error) {
      console.error('Error finding users in city:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in findUsersInCity:', error);
    return [];
  }
};

// Get user's location privacy settings
export const getLocationPrivacySettings = async (): Promise<LocationPrivacySettings | null> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await _supabase
      .from('location_privacy_settings')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // Create default settings if none exist
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: createError } = await _supabase
          .from('location_privacy_settings')
          .insert({ id: user.id })
          .select('*')
          .single();

        if (createError) {
          console.error('Error creating location privacy settings:', createError);
          return null;
        }

        return newSettings;
      }

      console.error('Error getting location privacy settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getLocationPrivacySettings:', error);
    return null;
  }
};

// Update location privacy settings
export const updateLocationPrivacySettings = async (
  settings: Partial<Omit<LocationPrivacySettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<LocationUpdateResult> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await _supabase
      .from('location_privacy_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating location privacy settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }
};

// Get user's location history
export const getUserLocationHistory = async (limit: number = 50): Promise<UserLocationHistory[]> => {
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await _supabase
      .from('user_location_history')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting location history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserLocationHistory:', error);
    return [];
  }
};

// Image upload functions
export const uploadAvatar = async (imageUri: string, userId: string): Promise<string | null> => {
  try {
    console.log('📤 Starting avatar upload for user:', userId);
    console.log('📤 Image URI:', imageUri);

    // Validate inputs
    if (!imageUri || !userId) {
      console.error('❌ Invalid inputs: imageUri or userId missing');
      return null;
    }

    // Skip bucket check - we know it exists
    console.log('📦 Preparing avatar upload...');

    // For React Native, we need to handle the file URI differently
    let blob;
    
    try {
      if (imageUri.startsWith('file://')) {
        // Local file - need to create proper blob for React Native
        console.log('📱 Processing local file URI...');
        
        // Fetch the local file
        const response = await fetch(imageUri);
        const imageBlob = await response.blob();
        
        // If blob is empty, try alternative method
        if (imageBlob.size === 0) {
          console.log('⚠️ Blob was empty, trying alternative method...');
          
          // Create FormData instead
          const formData = new FormData();
          formData.append('file', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'avatar.jpg',
          } as any);
          
          // Extract the file from FormData
          const file = formData.get('file');
          if (file && file instanceof Blob) {
            blob = file;
          } else {
            // Last resort: create blob with base64
            const base64Response = await fetch(imageUri);
            const base64Text = await base64Response.text();
            blob = new Blob([base64Text], { type: 'image/jpeg' });
          }
        } else {
          blob = imageBlob;
        }
      } else {
        // Remote URL
        console.log('🌐 Fetching remote image...');
        const response = await fetch(imageUri);
        if (!response.ok) {
          console.error('❌ Failed to fetch image:', response.status);
          return null;
        }
        blob = await response.blob();
      }
      
      console.log('📦 Blob created, size:', blob.size, 'type:', blob.type);
      
      // Verify blob has content
      if (!blob || blob.size === 0) {
        console.error('❌ Blob is empty or invalid!');
        
        // Try one more time with array buffer
        console.log('🔄 Attempting with array buffer method...');
        const response = await fetch(imageUri);
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength > 0) {
          blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
          console.log('✅ Created blob from array buffer, size:', blob.size);
        } else {
          console.error('❌ Array buffer is also empty');
          return null;
        }
      }
    } catch (error) {
      console.error('❌ Error creating blob:', error);
      return null;
    }
    
    // Create unique filename with userid folder structure
    // Extract extension more carefully
    let fileExt = 'jpg'; // default
    if (imageUri.includes('.')) {
      const parts = imageUri.split('.');
      const lastPart = parts[parts.length - 1].toLowerCase();
      // Only use if it's a valid image extension
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(lastPart)) {
        fileExt = lastPart;
      }
    }
    
    const fileName = `avatar_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    console.log('📤 Uploading to path:', filePath);

    // First, try to delete any existing avatar with the same path (in case of conflicts)
    try {
      const { error: deleteError } = await _supabase.storage
        .from('avatars')
        .remove([filePath]);
      if (deleteError) {
        console.log('📝 No existing file to remove or remove failed (this is ok):', deleteError.message);
      }
    } catch (e) {
      // Ignore deletion errors
    }

    // Final blob validation before upload
    if (!blob || blob.size === 0) {
      console.error('❌ Cannot upload empty blob!');
      return null;
    }
    
    console.log(`✅ Blob ready for upload: ${blob.size} bytes, type: ${blob.type}`);
    
    // Upload to Supabase Storage with retry logic
    let uploadAttempts = 0;
    let uploadSuccess = false;
    let data = null;
    let error = null;

    while (uploadAttempts < 2 && !uploadSuccess) {
      uploadAttempts++;
      console.log(`📤 Upload attempt ${uploadAttempts} with ${blob.size} bytes...`);
      
      const uploadResult = await _supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true, // Changed to true to allow overwriting
          contentType: blob.type || 'image/jpeg',
        });

      data = uploadResult.data;
      error = uploadResult.error;
      
      if (!error) {
        uploadSuccess = true;
      } else if (uploadAttempts === 1) {
        console.log('⚠️ First upload attempt failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    if (error) {
      console.error('❌ Upload error after retries:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // If it's a bucket not found error, the bucket might exist but not be visible due to caching
      // Try to upload anyway without the bucket check
      const msg = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
      if (msg.includes('bucket') || msg.includes('not found')) {
        console.log('🔄 Attempting direct upload despite bucket error...');
        const directUpload = await _supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: true,
            contentType: blob.type || 'image/jpeg',
          });
        
        if (directUpload.error) {
          console.error('❌ Direct upload also failed:', directUpload.error);
          return null;
        }
        
        data = directUpload.data;
        console.log('✅ Direct upload succeeded!');
      } else {
        return null;
      }
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: publicUrlData } = _supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log('🌐 Public URL:', publicUrl);

    // Verify the URL is accessible
    try {
      const testResponse = await fetch(publicUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        console.warn('⚠️ Public URL may not be accessible:', testResponse.status);
      } else {
        console.log('✅ Public URL is accessible');
      }
    } catch (testError) {
      console.warn('⚠️ Could not verify public URL accessibility:', testError);
    }

    return publicUrl;
  } catch (error) {
    console.error('❌ Error uploading avatar:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return null;
  }
};

export const deleteAvatar = async (avatarUrl: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = avatarUrl.split('/avatars/');
    if (urlParts.length < 2) return false;
    
    const filePath = urlParts[1];
    
    const { error } = await _supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting avatar:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAvatar:', error);
    return false;
  }
};
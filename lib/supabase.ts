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
  user_id: string;
  color: string;
  created_at: string;
  updated_at: string;
  places?: Place[];
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
  const { data, error } = await _supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
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
  const { data, error } = await _supabase
    .from('hidden_gems')
    .select('*')
    .eq('city', city)
    .eq('is_active', true)
    .single();
  
  if (error) {
    console.error('Error fetching hidden gem:', error);
    return null;
  }
  return data;
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
  const { data, error } = await _supabase
    .rpc('get_nearby_places', {
    lat: latitude,
    lng: longitude,
    radius_km: radiusKm
  });
  
  if (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
  return data || [];
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
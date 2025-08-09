// Shared types for places and collections

export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  description?: string;
  photos?: string[];
  image_url?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  is_public: boolean;
  google_place_id?: string;
  review_count?: number;
  ai_summary?: string;
  pros?: string[];
  cons?: string[];
  recommendations?: string[];
  is_open?: boolean;
  hours?: string;
  week_hours?: string[];
  phone?: string;
  website?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  places?: Place[];
  place_count?: number;
  is_public: boolean;
  cover_image?: string;
  created_at: string;
  updated_at: string;
  color?: string;
  user_id?: string;
}

export interface CollectionPlace {
  id: string;
  collection_id: string;
  place_id: string;
  added_at: string;
  notes?: string;
}

export interface PlaceReview {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  text?: string;
  created_at: string;
  updated_at?: string;
  author_name?: string;
  author_image?: string;
}

export interface PlaceImage {
  id: string;
  place_id: string;
  url: string;
  caption?: string;
  created_at: string;
  user_id?: string;
}
// Shared types for capture functionality

export interface AnalysisResult {
  businessName: string;
  businessType: string;
  description: string;
  features: string[];
  locationText?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface PlaceData {
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
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface CaptureState {
  capturedImage: string | null;
  analysisResult: AnalysisResult | null;
  placeData: PlaceData | null;
  suggestedPlaces: any[];
  currentLocation: LocationCoords | null;
  isAnalyzing: boolean;
  isLoading: boolean;
}

export enum CaptureScreen {
  CAMERA = 'camera',
  ANALYSIS = 'analysis',
  PLACE_DETAILS = 'place_details',
  PLACE_SELECTION = 'place_selection',
}

export interface CaptureActions {
  setCapturedImage: (image: string | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setPlaceData: (data: PlaceData | null) => void;
  setSuggestedPlaces: (places: any[]) => void;
  setCurrentLocation: (location: LocationCoords | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  resetCapture: () => void;
}
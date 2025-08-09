import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Upload, MapPin, Star, Clock, Phone, ExternalLink, Copy, ChevronDown, ChevronUp, Plus, Share, Search, RotateCcw, ArrowLeft, Camera as CameraIcon } from 'lucide-react-native';
import { Camera as ExpoCamera, CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { uploadImageAsync, ImageUploadResult } from '../../lib/supabase-storage';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { analyzeStorefrontPhoto, generateReviewSummary } from '@/lib/openai';
import { searchPlacesByText, searchNearbyPlaces, searchNearbyPlacesWithType, getPlaceDetails, convertGooglePlaceToPlace, reverseGeocode } from '@/lib/google-places';
import { addPlace, getUserCollections, createCollection, addPlaceToCollection, getCurrentUser, checkHiddenGemDiscovery, markHiddenGemDiscovered, incrementHiddenGemStats, updateUserLocation, checkPlaceExists, addPlaceWithVisibility } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useHaptics } from '@/hooks/useHaptics';

interface AnalysisResult {
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

interface PlaceData {
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

interface Collection {
  id: string;
  name: string;
  color: string;
}

export default function CaptureScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImageThumbnail, setCapturedImageThumbnail] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'analyzing' | 'complete'>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [placeData, setPlaceData] = useState<PlaceData | null>(null);
  const [suggestedPlaces, setSuggestedPlaces] = useState<any[]>([]);
  const [showPlaceSelection, setShowPlaceSelection] = useState(false);
  const [showFullHours, setShowFullHours] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveredHiddenGem, setDiscoveredHiddenGem] = useState<any>(null);
  const [showHiddenGemWinner, setShowHiddenGemWinner] = useState(false);
  const [existingPlace, setExistingPlace] = useState<any>(null);
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [showDiscoveryBanner, setShowDiscoveryBanner] = useState(false);
  const [photoLocation, setPhotoLocation] = useState<{latitude: number; longitude: number; direction?: number; accuracy?: number} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const mounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Haptic feedback
  const haptics = useHaptics();

  useEffect(() => {
    mounted.current = true;
    abortControllerRef.current = new AbortController();
    getCurrentLocationForSearch();
    
    // Auto-start camera if permissions are granted
    if (permission?.granted && !capturedImage) {
      // Camera will be shown by default when component mounts
    }
    
    return () => {
      mounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Clear any pending async operations
      setProcessingState('idle');
    };
  }, [permission]);

  const getCurrentLocationForSearch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        if (mounted.current) {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const checkForHiddenGemDiscovery = async (latitude: number, longitude: number): Promise<any> => {
    try {
      console.log('🔍 Checking for hidden gem discovery at:', latitude, longitude);
      
      // Check if this location matches any active hidden gems
      const hiddenGem = await checkHiddenGemDiscovery(latitude, longitude, 50); // 50 meter radius
      
      if (hiddenGem) {
        console.log('🎯 HIDDEN GEM DISCOVERED!', hiddenGem.title);
        
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          console.log('❌ No authenticated user for hidden gem discovery');
          return null;
        }

        // Mark as discovered
        const { data: updatedGem, error } = await markHiddenGemDiscovered(hiddenGem.id, user.id);
        
        if (error) {
          console.error('❌ Error marking hidden gem as discovered:', error);
          return null;
        }

        if (updatedGem) {
          console.log('🏆 Hidden gem successfully claimed by user!');
          return updatedGem;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error checking for hidden gem discovery:', error);
      return null;
    }
  };

  const extractImageLocation = async (imageUri: string, imagePickerAsset?: any): Promise<{ latitude: number; longitude: number; direction?: number; accuracy?: number } | null> => {
    try {
      console.log('🔍 Attempting to extract GPS data from image...');
      console.log('📱 Platform:', Platform.OS);
      console.log('📋 ImagePicker asset:', imagePickerAsset ? 'Available' : 'Not available');
      
      // Check if we have EXIF data from ImagePicker
      if (imagePickerAsset?.exif) {
        console.log('📊 EXIF data available:', Object.keys(imagePickerAsset.exif));
        const exif = imagePickerAsset.exif;
        
        // First try nested GPS object (Android format)
        const { GPS } = exif;
        let latitude = null;
        let longitude = null;
        let latRef = null;
        let lngRef = null;
        
        if (GPS && GPS.Latitude && GPS.Longitude) {
          console.log('🛰️ GPS object found (Android format):', GPS);
          latitude = GPS.Latitude;
          longitude = GPS.Longitude;
          latRef = GPS.LatitudeRef;
          lngRef = GPS.LongitudeRef;
        } 
        // Try iPhone format with individual GPS keys
        else if (exif.GPSLatitude && exif.GPSLongitude) {
          console.log('🛰️ GPS keys found (iPhone format)');
          latitude = exif.GPSLatitude;
          longitude = exif.GPSLongitude;
          latRef = exif.GPSLatitudeRef;
          lngRef = exif.GPSLongitudeRef;
        }
        
        if (latitude && longitude) {
          console.log('✅ Valid GPS coordinates found!');
          console.log('📍 Raw Latitude:', latitude, 'Ref:', latRef);
          console.log('📍 Raw Longitude:', longitude, 'Ref:', lngRef);
          
          // Convert GPS coordinates to decimal degrees if needed
          let finalLat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
          let finalLng = typeof longitude === 'number' ? longitude : parseFloat(longitude);
          
          // Handle GPS reference (N/S for latitude, E/W for longitude)
          if (latRef === 'S' || latRef === 'South') finalLat = -Math.abs(finalLat);
          if (lngRef === 'W' || lngRef === 'West') finalLng = -Math.abs(finalLng);
          
          // Extract camera direction/bearing data
          let cameraDirection = null;
          let accuracy = null;
          
          // Check for image direction (direction camera was pointing)
          if (exif.GPSImgDirection !== undefined) {
            const imgDirection = typeof exif.GPSImgDirection === 'number' ? exif.GPSImgDirection : parseFloat(exif.GPSImgDirection);
            const imgDirectionRef = exif.GPSImgDirectionRef; // 'T' for True North, 'M' for Magnetic North
            
            if (!isNaN(imgDirection) && imgDirection >= 0 && imgDirection <= 360) {
              cameraDirection = imgDirection;
              console.log(`🧭 Camera direction: ${cameraDirection}° (${imgDirectionRef === 'T' ? 'True North' : 'Magnetic North'})`);
            }
          }
          
          // Check for GPS accuracy/precision
          if (exif.GPSHPositioningError !== undefined) {
            const hError = typeof exif.GPSHPositioningError === 'number' ? exif.GPSHPositioningError : parseFloat(exif.GPSHPositioningError);
            if (!isNaN(hError)) {
              accuracy = hError;
              console.log(`🎯 GPS accuracy: ±${accuracy}m`);
            }
          }
          
          // Validate coordinates
          if (isNaN(finalLat) || isNaN(finalLng) || 
              finalLat < -90 || finalLat > 90 || 
              finalLng < -180 || finalLng > 180) {
            console.log('❌ Invalid GPS coordinates after processing:', finalLat, finalLng);
            return null;
          }
          
          console.log(`📍 Final coordinates: ${finalLat}, ${finalLng}`);
          console.log(`📍 This corresponds to: ${Math.abs(finalLat).toFixed(6)}° ${finalLat >= 0 ? 'N' : 'S'}, ${Math.abs(finalLng).toFixed(6)}° ${finalLng >= 0 ? 'E' : 'W'}`);
          
          const result = { 
            latitude: finalLat, 
            longitude: finalLng,
            ...(cameraDirection !== null && { direction: cameraDirection }),
            ...(accuracy !== null && { accuracy })
          };
          
          if (cameraDirection !== null) {
            console.log(`🧭 Camera was pointing ${cameraDirection}° from North when photo taken`);
          }
          
          return result;
        } else {
          console.log('❌ No valid GPS coordinates found in EXIF');
          console.log('📋 Available EXIF GPS keys:', Object.keys(exif).filter(key => key.startsWith('GPS')));
        }
      } else {
        console.log('❌ No EXIF data available');
      }
      
      if (Platform.OS === 'web') {
        console.log('🌐 EXIF extraction not available on web platform');
        return null;
      }
      
      // For native platforms without EXIF data
      console.log('📍 No GPS data found in image metadata');
      return null;
    } catch (error) {
      console.error('❌ Error extracting image location:', error);
      return null;
    }
  };

  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; // Normalize to 0-360
    
    return bearing;
  };

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

  const filterPlacesByDirection = (places: any[], photoLocation: any, cameraDirection: number, tolerance: number = 30): any[] => {
    if (!photoLocation.direction || places.length === 0) return places;
    
    console.log(`🧭 Filtering places by camera direction: ${cameraDirection}° (±${tolerance}°) with distance weighting`);
    
    // Score each place based on direction accuracy and distance
    const scoredPlaces = places.map(place => {
      const bearingToPlace = calculateBearing(
        photoLocation.latitude, 
        photoLocation.longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );
      
      const distanceToPlace = calculateDistance(
        photoLocation.latitude,
        photoLocation.longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );
      
      // Calculate angular difference (handling wraparound at 0/360)
      let angleDiff = Math.abs(bearingToPlace - cameraDirection);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;
      
      const inDirection = angleDiff <= tolerance;
      
      // Scoring: Lower is better
      // Direction score: 0-30 (lower angle diff = better score)
      // Distance score: 0-100m normalized (closer = better score)
      const directionScore = angleDiff; // 0-30 range
      const distanceScore = Math.min(distanceToPlace, 100); // Cap at 100m
      
      // Combined score: 70% direction, 30% distance
      const combinedScore = (directionScore * 0.7) + (distanceScore * 0.3);
      
      console.log(`📍 ${place.name}: bearing ${bearingToPlace.toFixed(1)}°, diff ${angleDiff.toFixed(1)}°, dist ${distanceToPlace.toFixed(1)}m, score ${combinedScore.toFixed(1)}, ${inDirection ? '✅ IN' : '❌ OUT'} direction`);
      
      return {
        ...place,
        directionScore,
        distanceScore,
        combinedScore,
        inDirection,
        distance: distanceToPlace,
        angleDiff
      };
    });
    
    // Filter places within direction tolerance and sort by combined score
    const filteredPlaces = scoredPlaces
      .filter(place => place.inDirection)
      .sort((a, b) => a.combinedScore - b.combinedScore); // Lower score = better
    
    console.log(`🎯 Direction filtering: ${filteredPlaces.length}/${places.length} places in camera direction`);
    
    if (filteredPlaces.length > 0) {
      console.log(`🥇 Top candidate: ${filteredPlaces[0].name} (${filteredPlaces[0].distance.toFixed(1)}m, ${filteredPlaces[0].angleDiff.toFixed(1)}° diff)`);
    }
    
    // Return original place objects (without scoring metadata)
    return filteredPlaces.map(({ directionScore, distanceScore, combinedScore, inDirection, distance, angleDiff, ...place }) => place);
  };

  const analyzePhoto = async (imageUri: string, imagePickerAsset?: any) => {
    setProcessingState('analyzing');
    try {
      console.log('Starting photo analysis...');
      
      // First, try to extract location from photo metadata
      const extractedPhotoLocation = await extractImageLocation(imageUri, imagePickerAsset);
      console.log('📍 Photo location from metadata:', extractedPhotoLocation);
      
      // Store photo location in state for later use
      setPhotoLocation(extractedPhotoLocation);
      
      // Use photo location if available, otherwise fall back to current location
      const searchLocation = extractedPhotoLocation || currentLocation;
      
      if (extractedPhotoLocation) {
        console.log('🎯 Using GPS coordinates from photo metadata!');
        console.log(`📍 GPS Location: ${extractedPhotoLocation.latitude}, ${extractedPhotoLocation.longitude}`);
      } else if (currentLocation) {
        console.log('📱 Using current device location (no GPS in photo)');
        console.log(`📍 Device Location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
      } else {
        console.log('❌ No location available (neither GPS nor device location)');
      }
      
      console.log('🔍 Final search location:', searchLocation);
      
      if (!searchLocation) {
        Alert.alert('Location Required', 'Please enable location services or manually enter an address to identify places.');
        return;
      }

      // 🎯 CHECK FOR DUPLICATE PLACES FIRST!
      console.log('🔍 Checking if place already exists...');
      const { publicPlace, discoveryCount: count } = await checkPlaceExists(
        undefined, // Will be set after getting place details
        searchLocation.latitude,
        searchLocation.longitude
      );
      
      if (publicPlace) {
        console.log(`✅ Found existing public place: ${publicPlace.name} (${count} discoveries)`);
        setExistingPlace(publicPlace);
        setDiscoveryCount(count);
        setShowDiscoveryBanner(true);
      }

      // 🎯 CHECK FOR HIDDEN GEM DISCOVERY!
      console.log('🔍 Checking for hidden gem discovery...');
      const discoveredGem = await checkForHiddenGemDiscovery(searchLocation.latitude, searchLocation.longitude);
      
      if (discoveredGem && mounted.current) {
        console.log('🏆 HIDDEN GEM WON!', discoveredGem);
        haptics.hiddenGemFound(); // Special haptic feedback for hidden gem discovery
        setDiscoveredHiddenGem(discoveredGem);
        setShowHiddenGemWinner(true);
        
        // Show success alert with navigation options
        Alert.alert(
          '🎉 HIDDEN GEM DISCOVERED!',
          `Congratulations! You found "${discoveredGem.title}" and won: ${discoveredGem.reward}`,
          [
            {
              text: 'View Hidden Gem',
              onPress: () => {
                haptics.buttonPress();
                setShowHiddenGemWinner(false);
                router.push('/hidden-gem');
              }
            },
            {
              text: 'Continue',
              onPress: () => {
                haptics.buttonPress();
                setShowHiddenGemWinner(false);
              }
            }
          ]
        );
        
        // Continue with normal flow but also show the hidden gem success
      }

      // Analyze the photo with OpenAI
      console.log('Analyzing photo with OpenAI...');
      if (!searchLocation) {
        throw new Error('Location not available for analysis.');
      }
      const locationString = `${searchLocation.latitude},${searchLocation.longitude}`;
      const analysis = await analyzeStorefrontPhoto(imageUri, locationString);
      console.log('OpenAI analysis result:', analysis);
      
      if (mounted.current) {
        setAnalysisResult({
          businessName: analysis.businessName || 'Unknown Business',
          businessType: analysis.businessType,
          description: analysis.description,
          features: analysis.features,
          locationText: analysis.locationText,
          coordinates: analysis.coordinates
        });
      }

      // Log location text if found for debugging
      if (analysis.locationText) {
        console.log('📍 Location text found in image:', analysis.locationText);
      }

      // Search for places using enhanced GPS-based approach with business type filtering
      console.log('🎯 Searching for places using GPS coordinates and business type...');
      
      const businessName = analysis.businessName || 'Unknown Business';
      const businessType = analysis.businessType || 'Business';
      
      // Step 1: Enhanced nearby search with business type filtering (50m radius)
      let places = await searchNearbyPlacesWithType(
        searchLocation.latitude,
        searchLocation.longitude,
        businessName,
        businessType,
        50 // 50 meter radius - very precise
      );
      console.log(`📍 Found ${places.length} places within 50m using enhanced search`);
      
      // Step 2: If no results, expand to 200m radius
      if (places.length === 0) {
        console.log('🔍 Expanding search to 200m...');
        places = await searchNearbyPlacesWithType(
          searchLocation.latitude,
          searchLocation.longitude,
          businessName,
          businessType,
          200 // 200 meter radius
        );
        console.log(`📍 Found ${places.length} places within 200m`);
      }
      
      // Step 3: If still no results, expand to 500m with type focus
      if (places.length === 0) {
        console.log('🔍 Expanding to 500m with type focus...');
        places = await searchNearbyPlacesWithType(
          searchLocation.latitude,
          searchLocation.longitude,
          businessName,
          businessType,
          500 // 500 meter radius
        );
        console.log(`📍 Found ${places.length} places within 500m`);
      }
      
      // Step 4: Final fallback to text search with location bias
      if (places.length === 0) {
        console.log('🌐 Final fallback to text search with location bias...');
        
        // Use more location-specific query for generic business names
        const isGenericName = !businessName || 
                             businessName.toLowerCase() === 'unknown' || 
                             businessName.toLowerCase() === 'unknown business' ||
                             businessName.toLowerCase() === 'business';
        
        let searchQuery;
        if (isGenericName) {
          // For generic names, search by business type only to get local results
          searchQuery = businessType;
        } else {
          searchQuery = `${businessName} ${businessType}`;
        }
        
        console.log(`🔍 Final fallback search query: "${searchQuery}"`);
        places = await searchPlacesByText(searchQuery, searchLocation.latitude, searchLocation.longitude);
        console.log(`📍 Found ${places.length} places using text search fallback`);
      }

      // Step 5: Apply camera direction filtering if we have direction data
      if (places.length > 0 && extractedPhotoLocation && extractedPhotoLocation.direction !== undefined) {
        console.log('🧭 Applying camera direction filtering...');
        const originalCount = places.length;
        const originalPlaces = [...places]; // Keep copy of original results
        places = filterPlacesByDirection(places, extractedPhotoLocation, extractedPhotoLocation.direction, 45); // Increased tolerance to 45°
        
        // If direction filtering eliminated all results, fall back to original nearby results
        if (places.length === 0) {
          console.log('⚠️ Direction filtering eliminated all results, using closest nearby places instead');
          
          // Sort original places by distance and take top 5
          const sortedByDistance = originalPlaces.map(place => {
            const distance = calculateDistance(
              searchLocation.latitude,
              searchLocation.longitude,
              place.geometry.location.lat,
              place.geometry.location.lng
            );
            return { ...place, distance };
          }).sort((a, b) => a.distance - b.distance);
          
          places = sortedByDistance.slice(0, 5); // Take 5 closest places
          console.log(`🎯 Using ${places.length} closest nearby places as fallback`);
        } else {
          console.log(`🎯 Direction filtering reduced results from ${originalCount} to ${places.length}`);
        }
      }

      if (places.length > 0) {
        // Get detailed information for the first (most likely) match
        const topPlace = places[0];
        console.log('Getting details for top place:', topPlace.name);
        
        const placeDetails = await getPlaceDetails(topPlace.place_id);
        if (placeDetails && mounted.current) {
          console.log('Place details received:', placeDetails);
          
          // Check for duplicates with Google Place ID now that we have it
          console.log('🔍 Re-checking for duplicates with Google Place ID...');
          const { publicPlace: exactPlace, discoveryCount: exactCount } = await checkPlaceExists(
            placeDetails.place_id,
            placeDetails.geometry.location.lat,
            placeDetails.geometry.location.lng
          );
          
          if (exactPlace && !existingPlace) {
            console.log(`✅ Found exact match by Google Place ID: ${exactPlace.name} (${exactCount} discoveries)`);
            setExistingPlace(exactPlace);
            setDiscoveryCount(exactCount);
            setShowDiscoveryBanner(true);
          }

          // Generate AI review summary from actual Google reviews
          let reviewSummary;
          if (placeDetails.reviews && placeDetails.reviews.length > 0) {
            console.log('Generating AI review summary from', placeDetails.reviews.length, 'reviews');
            reviewSummary = await generateReviewSummary(
              placeDetails.name,
              businessType,
              placeDetails.reviews
            );
          } else {
            console.log('No reviews found, using mock summary');
            reviewSummary = {
              summary: `${placeDetails.name} is a ${businessType.toLowerCase()} with limited review information available.`,
              pros: ['Good location', 'Professional service'],
              cons: ['Limited information available'],
              recommendations: ['Visit to experience firsthand'],
              overallSentiment: 'neutral' as const,
              bestFor: ['General visits']
            };
          }

          // Format the place data
          const formattedPlace: PlaceData = {
            name: placeDetails.name,
            category: businessType,
            address: placeDetails.formatted_address,
            latitude: placeDetails.geometry.location.lat,
            longitude: placeDetails.geometry.location.lng,
            rating: placeDetails.rating || 0,
            review_count: placeDetails.user_ratings_total || 0,
            image_url: imageUri,
            ai_summary: reviewSummary.summary,
            pros: reviewSummary.pros,
            cons: reviewSummary.cons,
            recommendations: reviewSummary.recommendations,
            google_place_id: placeDetails.place_id,
            is_open: placeDetails.opening_hours?.open_now || false,
            hours: placeDetails.opening_hours?.open_now ? 'Open now' : 'Closed',
            week_hours: placeDetails.opening_hours?.weekday_text || [],
            phone: placeDetails.formatted_phone_number,
            website: placeDetails.website
          };

          setPlaceData(formattedPlace);
          setSuggestedPlaces(places.slice(1, 6)); // Show other suggestions
          
          // Show completion state briefly before showing results
          setProcessingState('complete');
          setTimeout(() => {
            if (mounted.current) {
              setProcessingState('idle');
            }
          }, 1000); // Show complete state for 1 second
          
          haptics.placeDiscovered(); // Haptic feedback when place is found
        }
      } else {
        console.log('No places found, showing place selection');
        setSuggestedPlaces([]);
        setShowPlaceSelection(true);
        
        // Show completion state briefly before showing place selection
        setProcessingState('complete');
        setTimeout(() => {
          if (mounted.current) {
            setProcessingState('idle');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error analyzing photo:', error);
      haptics.errorOccurred(); // Haptic feedback on error
      Alert.alert('Analysis Failed', 'Failed to analyze the photo. Please try again.');
    } finally {
      if (mounted.current) {
        setProcessingState('idle');
      }
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    setProcessingState('uploading');
    try {
      haptics.photoCapture();
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Reduced for faster processing - will be further optimized in upload
        base64: false,
        exif: true,
      });
      
      if (photo && mounted.current) {
        const localUri = photo.uri;
        
        // Upload to Supabase (both thumbnail and full-size)
        const uploadResult = await uploadImageAsync(localUri);
        
        if (!uploadResult) {
          throw new Error('Failed to upload image');
        }
        
        // Store both URLs - full-size for analysis, thumbnail for later use
        setCapturedImage(uploadResult.fullUrl);
        setCapturedImageThumbnail(uploadResult.thumbnailUrl);
        await analyzePhoto(uploadResult.fullUrl, photo);
      }
    } catch (error) {
      console.error('Error taking or uploading picture:', error);
      Alert.alert('Camera Error', 'Failed to process picture. Please try again.');
    } finally {
      if (mounted.current && processingState !== 'analyzing') {
        setProcessingState('idle');
      }
    }
  };

  const pickImageFromGallery = async () => {
    setProcessingState('uploading');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: true, // Include EXIF data
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        setProcessingState('idle');
        return;
      }

      if (mounted.current) {
        const localUri = result.assets[0].uri;
        
        // Upload to Supabase (both thumbnail and full-size)
        const uploadResult = await uploadImageAsync(localUri);
        
        if (!uploadResult) {
          throw new Error('Failed to upload image');
        }
        
        // Store both URLs - full-size for analysis, thumbnail for later use
        setCapturedImage(uploadResult.fullUrl);
        setCapturedImageThumbnail(uploadResult.thumbnailUrl);
        await analyzePhoto(uploadResult.fullUrl, result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking and uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please check your connection and try again.');
    } finally {
      if (mounted.current && processingState !== 'analyzing') {
        setProcessingState('idle');
      }
    }
  };

  const handlePlaceSelection = async (selectedPlace: any) => {
    try {
      console.log('Getting details for selected place:', selectedPlace.name);
      const placeDetails = await getPlaceDetails(selectedPlace.place_id);
      
      if (placeDetails && analysisResult && mounted.current) {
        // Generate AI review summary
        let reviewSummary;
        if (placeDetails.reviews && placeDetails.reviews.length > 0) {
          reviewSummary = await generateReviewSummary(
            placeDetails.name,
            analysisResult.businessType,
            placeDetails.reviews
          );
        } else {
          reviewSummary = {
            summary: `${placeDetails.name} is a ${analysisResult.businessType.toLowerCase()} with limited review information available.`,
            pros: ['Good location', 'Professional service'],
            cons: ['Limited information available'],
            recommendations: ['Visit to experience firsthand'],
            overallSentiment: 'neutral' as const,
            bestFor: ['General visits']
          };
        }

        const formattedPlace: PlaceData = {
          name: placeDetails.name,
          category: analysisResult.businessType,
          address: placeDetails.formatted_address,
          latitude: placeDetails.geometry.location.lat,
          longitude: placeDetails.geometry.location.lng,
          rating: placeDetails.rating || 0,
          review_count: placeDetails.user_ratings_total || 0,
          image_url: capturedImage || '',
          thumbnail_url: capturedImageThumbnail || '',
          ai_summary: reviewSummary.summary,
          pros: reviewSummary.pros,
          cons: reviewSummary.cons,
          recommendations: reviewSummary.recommendations,
          google_place_id: placeDetails.place_id,
          is_open: placeDetails.opening_hours?.open_now || false,
          hours: placeDetails.opening_hours?.open_now ? 'Open now' : 'Closed',
          week_hours: placeDetails.opening_hours?.weekday_text || [],
          phone: placeDetails.formatted_phone_number,
          website: placeDetails.website
        };

        setPlaceData(formattedPlace);
        setShowPlaceSelection(false);
        setProcessingState('complete');
      }
    } catch (error) {
      console.error('Error selecting place:', error);
      Alert.alert('Error', 'Failed to get place details. Please try again.');
    }
  };

  const handleManualAddressSearch = async () => {
    if (!manualAddress.trim()) return;
    
    try {
      setIsLoading(true);
      const places = await searchPlacesByText(manualAddress);
      setSuggestedPlaces(places);
      setShowAddressInput(false);
    } catch (error) {
      console.error('Error searching manual address:', error);
      Alert.alert('Search Error', 'Failed to search for the address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (currentLocation && analysisResult) {
      try {
        setIsLoading(true);
        const searchQuery = `${analysisResult.businessName} ${analysisResult.businessType}`;
        const places = await searchPlacesByText(searchQuery, currentLocation.latitude, currentLocation.longitude);
        setSuggestedPlaces(places);
        setShowAddressInput(false);
      } catch (error) {
        console.error('Error using current location:', error);
        Alert.alert('Location Error', 'Failed to search using current location. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getTodayHours = (weekHours: string[]): string => {
    if (!weekHours || weekHours.length === 0) return 'Hours not available';
    
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayIndex = today === 0 ? 6 : today - 1; // Convert to Monday = 0 format
    
    if (weekHours[dayIndex]) {
      const dayHours = weekHours[dayIndex];
      // Extract just the hours part (after the colon)
      const hoursMatch = dayHours.match(/:\s*(.+)/);
      return hoursMatch ? hoursMatch[1] : dayHours;
    }
    
    return 'Hours not available';
  };

  const makePhoneCall = (phoneNumber: string) => {
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${cleanNumber}`);
    }
  };

  const openInMaps = (type: 'google' | 'apple' | 'copy') => {
    if (!placeData) return;
    
    const { latitude, longitude, address, name } = placeData;
    
    switch (type) {
      case 'google':
        const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeData.google_place_id}`;
        Linking.openURL(googleUrl);
        break;
      case 'apple':
        const appleUrl = `http://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${latitude},${longitude}`;
        Linking.openURL(appleUrl);
        break;
      case 'copy':
        // For web, we can't copy to clipboard easily, so show an alert
        Alert.alert('Address', address, [
          { text: 'OK', style: 'default' }
        ]);
        break;
    }
  };

  const loadUserCollections = async () => {
    try {
      console.log('📚 Loading user collections...');
      const user = await getCurrentUser();
      if (!user) {
        console.log('❌ No user found');
        Alert.alert('Error', 'Please sign in to view collections.');
        return;
      }

      console.log('📚 Fetching collections for user:', user.id);
      const userCollections = await getUserCollections(user.id);
      console.log('📚 Collections loaded:', userCollections);
      
      setCollections(userCollections.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color
      })));
    } catch (error) {
      console.error('❌ Error loading collections:', error);
      Alert.alert('Error', `Failed to load collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddToCollection = async () => {
    await loadUserCollections();
    setShowCollections(true);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      Alert.alert('Error', 'Please enter a collection name.');
      return;
    }
    
    try {
      console.log('📝 Creating collection:', newCollectionName);
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to create collections.');
        return;
      }

      const collectionData = {
        name: newCollectionName.trim(),
        user_id: user.id,
        color: '#007AFF',
        is_public: true
      };

      console.log('📝 Collection data:', collectionData);
      const { data, error } = await supabase
        .from('collections')
        .insert(collectionData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating collection:', error);
        Alert.alert('Error', `Failed to create collection: ${error.message || 'Unknown error'}`);
        return;
      }
      
      if (data) {
        console.log('✅ Collection created successfully:', data);
        setCollections([...collections, {
          id: data.id,
          name: data.name,
          color: data.color
        }]);
        setNewCollectionName('');
        setShowCreateCollection(false);
        Alert.alert('Success', 'Collection created successfully!');
      } else {
        console.error('❌ No data returned from createCollection');
        Alert.alert('Error', 'Failed to create collection - no data returned.');
      }
    } catch (error) {
      console.error('❌ Error creating collection:', error);
      Alert.alert('Error', `Failed to create collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSelectCollection = async (collectionId: string) => {
    if (!placeData) {
      Alert.alert('Error', 'No place data available.');
      return;
    }
    
    try {
      console.log('📁 Adding place to collection:', collectionId);
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to add to collections.');
        return;
      }

      // First add the place to the database (exclude phone/website as they're not in schema)
      const placeToAdd = {
        name: placeData.name,
        category: placeData.category,
        address: placeData.address,
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        rating: placeData.rating,
        review_count: placeData.review_count,
        image_url: placeData.image_url,
        ai_summary: placeData.ai_summary,
        pros: placeData.pros,
        cons: placeData.cons,
        recommendations: placeData.recommendations,
        google_place_id: placeData.google_place_id,
        is_open: placeData.is_open,
        hours: placeData.hours,
        week_hours: placeData.week_hours,
        added_by: user.id,
        is_public: true
      };

      console.log('📁 Adding place to database first:', placeToAdd);
      const { data: addedPlace, error } = await supabase.from('places').insert(placeToAdd).select().single();
      
      if (error) {
        console.error('❌ Error adding place:', error);
        Alert.alert('Error', `Failed to save place: ${error.message || 'Unknown error'}`);
        return;
      }
      
      if (!addedPlace) {
        console.error('❌ No place data returned');
        Alert.alert('Error', 'Failed to save place - no data returned.');
        return;
      }

      console.log('✅ Place added to database:', addedPlace);
      
      // Then add to the selected collection
      console.log('📁 Adding to collection:', { collectionId, placeId: addedPlace.id });
      const { data: collectionPlaceData, error: collectionError } = await addPlaceToCollection(collectionId, addedPlace.id);
      
      if (collectionError) {
        console.error('❌ Error adding to collection:', collectionError);
        Alert.alert('Error', `Failed to add to collection: ${collectionError.message || 'Unknown error'}`);
        return;
      }

      console.log('✅ Added to collection successfully:', collectionPlaceData);
      haptics.addToCollection(); // Haptic feedback for successful addition
      Alert.alert('Success', 'Place added to collection successfully!');
      
      // Close modal first, then reset with delay to prevent race conditions
      setShowCollections(false);
      
      // Use setTimeout to batch state updates and prevent crash
      setTimeout(() => {
        if (mounted.current) {
          resetCapture();
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error adding to collection:', error);
      Alert.alert('Error', `Failed to add place to collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleWrongPlace = async () => {
    try {
      console.log('🔄 User indicated wrong place, loading all nearby places...');
      setIsLoading(true);
      
      // Use stored photo location if available, otherwise analysis coordinates, otherwise current location
      const searchLocation = photoLocation || (analysisResult?.coordinates) || currentLocation;
      
      if (!searchLocation) {
        Alert.alert('Location Required', 'Unable to find nearby places without location information.');
        return;
      }

      // Search for all nearby places with a broader radius
      console.log('🔍 Searching nearby places for manual selection...');
      let allNearbyPlaces = await searchNearbyPlaces(
        searchLocation.latitude,
        searchLocation.longitude,
        undefined, // No specific query - get all nearby places
        500 // 500 meter radius for more options
      );

      console.log(`📍 Found ${allNearbyPlaces.length} nearby places for manual selection`);

      if (allNearbyPlaces.length === 0) {
        // If no results with 500m, try 1000m
        console.log('🔍 Expanding search to 1000m radius...');
        allNearbyPlaces = await searchNearbyPlaces(
          searchLocation.latitude,
          searchLocation.longitude,
          undefined,
          1000
        );
        console.log(`📍 Found ${allNearbyPlaces.length} places within 1000m`);
      }

      if (allNearbyPlaces.length === 0) {
        Alert.alert('No Places Found', 'No nearby places found. Please try a different location or manually search.');
        return;
      }

      // Sort places by distance
      const placesWithDistance = allNearbyPlaces.map(place => {
        const distance = calculateDistance(
          searchLocation.latitude,
          searchLocation.longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );
        return { ...place, distance };
      }).sort((a, b) => a.distance - b.distance);

      console.log(`🎯 Showing ${placesWithDistance.length} nearby places sorted by distance`);
      setSuggestedPlaces(placesWithDistance);
      setSearchQuery(''); // Clear search query
      setShowPlaceSelection(true);
      console.log(`📱 Place selection modal should now be visible: ${true}`);
      
    } catch (error) {
      console.error('❌ Error loading nearby places:', error);
      Alert.alert('Error', 'Failed to load nearby places. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndRecommend = async () => {
    if (!placeData) return;
    
    try {
      setIsLoading(true);
      console.log('📤 Saving and recommending place:', placeData.name);
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to save places.');
        return;
      }

      // Save place as public (visible to everyone)
      const placeToAdd = {
        name: placeData.name,
        category: placeData.category,
        address: placeData.address,
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        rating: placeData.rating,
        review_count: placeData.review_count,
        image_url: placeData.image_url,
        ai_summary: placeData.ai_summary,
        pros: placeData.pros,
        cons: placeData.cons,
        recommendations: placeData.recommendations,
        google_place_id: placeData.google_place_id,
        is_open: placeData.is_open,
        hours: placeData.hours,
        week_hours: placeData.week_hours,
        phone: placeData.phone,
        website: placeData.website,
        added_by: user.id,
        is_public: true
      };

      console.log('📤 Adding place as public to database:', placeToAdd.name);
      const { data: addedPlace, error } = await addPlaceWithVisibility(placeToAdd, true); // true = public
      
      if (error) {
        console.error('❌ Error saving and recommending place:', error);
        Alert.alert('Error', `Failed to save place: ${error.message || 'Unknown error'}`);
        return;
      }
      
      if (!addedPlace) {
        console.error('❌ No data returned from addPlaceWithVisibility');
        Alert.alert('Error', 'Failed to save place - no data returned.');
        return;
      }

      console.log('✅ Place saved and recommended successfully:', addedPlace.name);

      // Create or find "Recommended Places" collection
      console.log('📁 Finding or creating "Recommended Places" collection...');
      let recommendedCollection = null;
      
      const userCollections = await getUserCollections(user.id);
      if (userCollections) {
        recommendedCollection = userCollections.find((c: any) => c.name === 'Recommended Places');
      }
      
      if (!recommendedCollection) {
        console.log('📁 Creating "Recommended Places" collection...');
        const { data: newCollection, error: createError } = await supabase
        .from('collections')
        .insert({ name: 'Recommended Places', user_id: user.id, color: '#34C759', is_public: true })
        .select()
        .single();
        
        if (createError) {
          console.error('❌ Error creating recommended collection:', createError);
        } else {
          recommendedCollection = newCollection;
          console.log('✅ Created "Recommended Places" collection:', recommendedCollection);
        }
      }

      // Add place to "Recommended Places" collection
      if (recommendedCollection) {
        console.log('📁 Adding to collection:', { collectionId: recommendedCollection.id, placeId: addedPlace.id });
        const { error: collectionError } = await supabase.from('collection_places').insert({ collection_id: recommendedCollection.id, place_id: addedPlace.id });
        
        if (collectionError) {
          console.error('❌ Error adding to recommended collection:', collectionError);
        } else {
          console.log('✅ Added to "Recommended Places" collection successfully');
        }
      }

      // Show success message
      haptics.shareSuccess();
      Alert.alert(
        '🎉 Successfully Recommended!', 
        `${placeData.name} has been shared with the community and added to your "Recommended Places" collection.`,
        [
          {
            text: 'View on Discover',
            onPress: () => {
              haptics.buttonPress();
              resetCapture();
              router.push('/(tabs)');
            }
          },
          {
            text: 'Take Another Photo',
            onPress: () => {
              haptics.buttonPress();
              resetCapture();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error saving and recommending:', error);
      Alert.alert('Error', `Failed to save place: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!placeData) return;
    
    try {
      setIsLoading(true);
      console.log('💾 Saving place privately:', placeData.name);
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to save places.');
        return;
      }

      // Save place as private (not visible to others)
      const placeToAdd = {
        name: placeData.name,
        category: placeData.category,
        address: placeData.address,
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        rating: placeData.rating,
        review_count: placeData.review_count,
        image_url: placeData.image_url,
        ai_summary: placeData.ai_summary,
        pros: placeData.pros,
        cons: placeData.cons,
        recommendations: placeData.recommendations,
        google_place_id: placeData.google_place_id,
        is_open: placeData.is_open,
        hours: placeData.hours,
        week_hours: placeData.week_hours,
        phone: placeData.phone,
        website: placeData.website,
        added_by: user.id,
        is_public: false
      };

      console.log('💾 Adding place as private to database:', placeToAdd.name);
      const { data: addedPlace, error } = await addPlaceWithVisibility(placeToAdd, false); // false = private
      
      if (error) {
        console.error('❌ Error saving place privately:', error);
        Alert.alert('Error', `Failed to save place: ${error.message || 'Unknown error'}`);
        return;
      }
      
      if (!addedPlace) {
        console.error('❌ No data returned from addPlaceWithVisibility');
        Alert.alert('Error', 'Failed to save place - no data returned.');
        return;
      }

      console.log('✅ Place saved privately successfully:', addedPlace.name);

      // Show collections modal for user to choose where to save
      await loadUserCollections();
      setShowCollections(true);
      
    } catch (error) {
      console.error('❌ Error saving privately:', error);
      Alert.alert('Error', `Failed to save place: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const performBroaderSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      console.log(`🔍 Performing broader search for: "${query}"`);
      
      // Use photo location if available, otherwise current location
      const searchLocation = photoLocation || currentLocation;
      
      if (!searchLocation) {
        console.log('❌ No location available for broader search');
        return;
      }

      // Search Google Places API directly with text query
      const results = await searchPlacesByText(
        query,
        searchLocation.latitude,
        searchLocation.longitude
      );

      console.log(`📍 Broader search found ${results.length} results for "${query}"`);
      setSearchResults(results);
      
    } catch (error) {
      console.error('❌ Error in broader search:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setCapturedImageThumbnail(null);
    setAnalysisResult(null);
    setPlaceData(null);
    setProcessingState('idle');
    setSuggestedPlaces([]);
    setShowPlaceSelection(false);
    setShowFullHours(false);
    setManualAddress('');
    setShowAddressInput(false);
    setSearchQuery('');
    setDiscoveredHiddenGem(null);
    setShowHiddenGemWinner(false);
    setExistingPlace(null);
    setDiscoveryCount(0);
    setShowDiscoveryBanner(false);
    setPhotoLocation(null);
    setIsSearching(false);
    setSearchResults([]);
  };

  const filteredSuggestedPlaces = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return suggestedPlaces; // Show all nearby places when no search query
    }
    
    const query = searchQuery.toLowerCase();
    
    // Filter local nearby places
    const localFiltered = suggestedPlaces.filter(place => {
      const name = (place.name?.toLowerCase() || '');
      const address = (place.formatted_address?.toLowerCase() || '');
      const types = (place.types || []).join(' ').toLowerCase();
      
      return name.includes(query) || 
             address.includes(query) || 
             types.includes(query) ||
             // More flexible partial matching
             name.split(' ').some((word: string) => word.startsWith(query)) ||
             address.split(' ').some((word: string) => word.startsWith(query));
    });

    // If we found good local matches, prioritize them
    if (localFiltered.length > 0) {
      // Also include API search results but show local results first
      const uniqueApiResults = searchResults.filter(apiPlace => 
        !localFiltered.some(localPlace => 
          localPlace.place_id === apiPlace.place_id ||
          (localPlace.name === apiPlace.name && 
           localPlace.formatted_address === apiPlace.formatted_address)
        )
      );
      return [...localFiltered, ...uniqueApiResults];
    }

    // If no local matches, show API search results
    return searchResults;
  }, [suggestedPlaces, searchResults, searchQuery]);

  // Debounced search effect for broader API search
  React.useEffect(() => {
    if (!showPlaceSelection || !searchQuery.trim()) {
      return;
    }

    const timeoutId = setTimeout(() => {
      performBroaderSearch(searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showPlaceSelection]);

  // Debug logging for modal
  React.useEffect(() => {
    if (showPlaceSelection) {
      console.log(`🔍 Modal should be visible: ${showPlaceSelection}`);
      console.log(`📋 Total suggested places: ${suggestedPlaces.length}`);
      console.log(`🔍 API search results: ${searchResults.length}`);
      console.log(`🔎 Final filtered places: ${filteredSuggestedPlaces.length}`);
      console.log(`🔤 Search query: "${searchQuery}"`);
      if (suggestedPlaces.length > 0) {
        console.log(`📍 First nearby place: ${suggestedPlaces[0]?.name || 'Unknown'}`);
      }
      if (searchResults.length > 0) {
        console.log(`🌐 First API result: ${searchResults[0]?.name || 'Unknown'}`);
      }
    }
  }, [showPlaceSelection, suggestedPlaces, searchResults, filteredSuggestedPlaces, searchQuery]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <CameraIcon size={64} color="#8E8E93" strokeWidth={1.5} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionMessage}>
            We need access to your camera to capture storefront photos and identify places.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show camera by default if no image captured
  if (!capturedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
              >
                <Text style={styles.controlButtonText}>Flip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
                <Upload size={24} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.analysisHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => { haptics.navigationBack(); resetCapture(); }}>
          <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place Details</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.resultSection}>
          {/* Captured Image */}
          <Image 
            source={{ uri: capturedImage }} 
            style={styles.capturedImage}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            priority="high"
          />
          {(processingState === 'uploading' || processingState === 'analyzing' || processingState === 'complete') && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingCard}>
                {processingState === 'complete' ? (
                  <>
                    <View style={styles.successIcon}>
                      <Text style={styles.successIconText}>✓</Text>
                    </View>
                    <Text style={styles.processingTitle}>Complete!</Text>
                    <Text style={styles.processingSubtitle}>Successfully identified your place</Text>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="large" color="#007AFF" style={styles.processingSpinner} />
                    <Text style={styles.processingTitle}>
                      {processingState === 'uploading' ? 'Uploading Photo' : 'Analyzing Storefront'}
                    </Text>
                    <Text style={styles.processingSubtitle}>
                      {processingState === 'uploading' 
                        ? 'Optimizing and uploading your photo...' 
                        : 'Identifying place details and information...'
                      }
                    </Text>
                    
                    {/* Progress Steps */}
                    <View style={styles.progressSteps}>
                      <View style={[styles.progressStep, (processingState === 'uploading' || processingState === 'analyzing') ? styles.progressStepActive : null]}>
                        <View style={[styles.progressDot, (processingState === 'uploading' || processingState === 'analyzing') ? styles.progressDotActive : null]} />
                        <Text style={[styles.progressLabel, (processingState === 'uploading' || processingState === 'analyzing') ? styles.progressLabelActive : null]}>Upload</Text>
                      </View>
                      <View style={[styles.progressLine, processingState === 'analyzing' ? styles.progressLineActive : null]} />
                      <View style={[styles.progressStep, processingState === 'analyzing' ? styles.progressStepActive : null]}>
                        <View style={[styles.progressDot, processingState === 'analyzing' ? styles.progressDotActive : null]} />
                        <Text style={[styles.progressLabel, processingState === 'analyzing' ? styles.progressLabelActive : null]}>Analyze</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
          
          {/* Hidden Gem Discovery Banner */}
          {discoveredHiddenGem && (
            <View style={styles.hiddenGemBanner}>
              <View style={styles.hiddenGemBannerContent}>
                <Text style={styles.hiddenGemBannerIcon}>🎉</Text>
                <View style={styles.hiddenGemBannerText}>
                  <Text style={styles.hiddenGemBannerTitle}>HIDDEN GEM DISCOVERED!</Text>
                  <Text style={styles.hiddenGemBannerSubtitle}>{discoveredHiddenGem.title}</Text>
                  <Text style={styles.hiddenGemBannerReward}>Won: {discoveredHiddenGem.reward}</Text>
                </View>
              </View>
            </View>
          )}
          
          {placeData ? (
            <View style={styles.placeDetails}>
              {/* Header with Name */}
              <View style={styles.placeHeader}>
                <Text style={styles.placeName}>{placeData.name}</Text>
                <Text style={styles.placeCategory}>{placeData.category}</Text>
              </View>

              {/* Discovery Banner */}
              {showDiscoveryBanner && existingPlace && (
                <View style={styles.discoveryBanner}>
                  <Text style={styles.discoveryBannerText}>
                    🎉 You're the {discoveryCount + 1} person to discover this place!
                  </Text>
                  <Text style={styles.discoveryBannerSubtext}>
                    This place was already recommended by another user.
                  </Text>
                </View>
              )}

              {/* Action Buttons - New System */}
              <View style={styles.actionButtonsRow}>
                {existingPlace ? (
                  // If place already exists publicly, only show collection options
                  <>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.primaryActionBtn]} 
                      onPress={() => { haptics.buttonPress(); handleAddToCollection(); }}
                    >
                      <Plus size={16} color="#FFFFFF" strokeWidth={2} />
                      <Text style={[styles.actionBtnText, styles.primaryActionBtnText]}>Add to Collection</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  // If place is new, show save options
                  <>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.primaryActionBtn, isLoading && styles.actionBtnDisabled]} 
                      onPress={() => { haptics.buttonPress(); handleSaveAndRecommend(); }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Share size={16} color="#FFFFFF" strokeWidth={2} />
                      )}
                      <Text style={[styles.actionBtnText, styles.primaryActionBtnText]}>
                        {isLoading ? 'Saving...' : 'Save & Recommend'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.saveOnlyBtn]} 
                      onPress={() => { haptics.buttonPress(); handleSaveOnly(); }}
                      activeOpacity={0.7}
                    >
                      <Plus size={16} color="#007AFF" strokeWidth={2} />
                      <Text style={styles.actionBtnText}>Save Only</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.retakeBtn]} 
                  onPress={() => { haptics.buttonPress(); resetCapture(); }}
                  activeOpacity={0.7}
                >
                  <CameraIcon size={16} color="#007AFF" strokeWidth={2} />
                  <Text style={styles.actionBtnText}>Retake</Text>
                </TouchableOpacity>
                
                {/* Always show Wrong button - allows manual search even with no nearby places */}
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.wrongBtn]} 
                  onPress={() => { haptics.buttonPress(); handleWrongPlace(); }}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={16} color="#007AFF" strokeWidth={2} />
                  <Text style={styles.actionBtnText}>Wrong?</Text>
                </TouchableOpacity>
              </View>

              {/* Rating and Status */}
              <View style={styles.placeStats}>
                <View style={styles.rating}>
                  <Star size={16} color="#FFD700" strokeWidth={2} fill="#FFD700" />
                  <Text style={styles.ratingText}>{placeData.rating.toFixed(1)}</Text>
                </View>
                
                <View style={styles.statusContainer}>
                  <Clock size={14} color={placeData.is_open ? '#34C759' : '#FF3B30'} strokeWidth={2} />
                  <Text style={[styles.statusText, { color: placeData.is_open ? '#34C759' : '#FF3B30' }]}>
                    {placeData.is_open ? 'Open' : 'Closed'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.hoursDropdown}
                    onPress={() => setShowFullHours(!showFullHours)}
                  >
                    <Text style={styles.hoursText}>{getTodayHours(placeData.week_hours)}</Text>
                    {showFullHours ? (
                      <ChevronUp size={14} color="#8E8E93" strokeWidth={2} />
                    ) : (
                      <ChevronDown size={14} color="#8E8E93" strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Full Hours Dropdown */}
              {showFullHours && (
                <View style={styles.fullHours}>
                  {placeData.week_hours.map((hours) => (
                    <Text key={hours} style={styles.dayHours}>{hours}</Text>
                  ))}
                </View>
              )}

              {/* Address Section */}
              <View style={styles.addressSection}>
                <View style={styles.addressHeader}>
                  <MapPin size={16} color="#8E8E93" strokeWidth={2} />
                  <Text style={styles.addressText}>{placeData.address}</Text>
                </View>
              </View>

              {/* Phone Number */}
              {placeData.phone && (
                <TouchableOpacity 
                  style={styles.phoneSection}
                  onPress={() => makePhoneCall(placeData.phone!)}
                >
                  <Phone size={16} color="#007AFF" strokeWidth={2} />
                  <Text style={styles.phoneText}>{placeData.phone}</Text>
                </TouchableOpacity>
              )}

              {/* AI Review Summary */}
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>AI Review Summary</Text>
                <Text style={styles.summaryText}>{placeData.ai_summary}</Text>
                
                <View style={styles.prosConsContainer}>
                  <View style={styles.prosSection}>
                    <Text style={styles.prosConsTitle}>What People Love</Text>
                    {placeData.pros.map((pro) => (
                      <Text key={`pro-${pro}`} style={styles.prosConsItem}>• {pro}</Text>
                    ))}
                  </View>
                  
                  <View style={styles.consSection}>
                    <Text style={styles.prosConsTitle}>Things to Know</Text>
                    {placeData.cons.map((con) => (
                      <Text key={`con-${con}`} style={styles.prosConsItem}>• {con}</Text>
                    ))}
                  </View>
                </View>

                <View style={styles.recommendationsSection}>
                  <Text style={styles.prosConsTitle}>Recommendations</Text>
                  {placeData.recommendations.map((rec) => (
                    <Text key={`rec-${rec}`} style={styles.prosConsItem}>• {rec}</Text>
                  ))}
                </View>
              </View>

              {/* Navigation */}
              <View style={styles.navigationSection}>
                <Text style={styles.sectionTitle}>Navigation</Text>
                <View style={styles.navigationButtons}>
                  <TouchableOpacity style={styles.navButton} onPress={() => openInMaps('google')}>
                    <ExternalLink size={20} color="#007AFF" strokeWidth={2} />
                    <Text style={styles.navButtonText}>Google Maps</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.navButton} onPress={() => openInMaps('apple')}>
                    <ExternalLink size={20} color="#007AFF" strokeWidth={2} />
                    <Text style={styles.navButtonText}>Apple Maps</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.navButton} onPress={() => openInMaps('copy')}>
                    <Copy size={20} color="#007AFF" strokeWidth={2} />
                    <Text style={styles.navButtonText}>Copy Address</Text>
                  </TouchableOpacity>
                </View>
              </View>


            </View>
          ) : analysisResult ? (
            <View style={styles.analysisResult}>
              <Text style={styles.analysisTitle}>Business Identified</Text>
              <Text style={styles.analysisName}>{analysisResult.businessName}</Text>
              <Text style={styles.analysisType}>{analysisResult.businessType}</Text>
              <Text style={styles.analysisDescription}>{analysisResult.description}</Text>
              
              <View style={styles.addressInputSection}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.locationButtons}>
                  <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation}>
                    <MapPin size={16} color="#007AFF" strokeWidth={2} />
                    <Text style={styles.locationButtonText}>Use Current Location</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.locationButton} 
                    onPress={() => setShowAddressInput(true)}
                  >
                    <Search size={16} color="#007AFF" strokeWidth={2} />
                    <Text style={styles.locationButtonText}>Enter Address</Text>
                  </TouchableOpacity>
                </View>
                
                {showAddressInput && (
                  <View style={styles.addressInput}>
                    <TextInput
                      style={styles.addressTextInput}
                      placeholder="Enter city or address"
                      value={manualAddress}
                      onChangeText={setManualAddress}
                      onSubmitEditing={handleManualAddressSearch}
                    />
                    <TouchableOpacity 
                      style={styles.searchButton}
                      onPress={handleManualAddressSearch}
                    >
                      <Search size={16} color="#FFFFFF" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.chooseAnotherButton}
                onPress={() => setShowPlaceSelection(true)}
              >
                <Text style={styles.chooseAnotherText}>Choose from suggestions</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          
          <TouchableOpacity style={styles.retakeButton} onPress={resetCapture}>
            <Text style={styles.retakeButtonText}>Take Another Photo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Place Selection Modal */}
      <Modal visible={showPlaceSelection} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Place</Text>
            <TouchableOpacity onPress={() => setShowPlaceSelection(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#8E8E93" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for any place name or business type..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#007AFF" />
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={styles.clearSearchButton}
              >
                <Text style={styles.clearSearchText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={styles.placesList}>
            {filteredSuggestedPlaces.length === 0 && searchQuery.trim() && !isSearching ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No places found for "{searchQuery}"</Text>
                <Text style={styles.noResultsSubtext}>
                  We searched both nearby places and broader area results
                </Text>
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <Text style={styles.clearSearchText}>Clear search</Text>
                </TouchableOpacity>
              </View>
            ) : filteredSuggestedPlaces.length === 0 && !searchQuery.trim() && !isSearching ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No nearby places found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try searching for the place name or type in the search box above
                </Text>
                <Text style={styles.searchHintText}>
                  💡 You can search for any business name, address, or type of place
                </Text>
              </View>
            ) : isSearching && searchQuery.trim() ? (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.searchingText}>Searching broader area...</Text>
              </View>
            ) : (
              filteredSuggestedPlaces.map((place, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.placeItem}
                  onPress={() => handlePlaceSelection(place)}
                >
                  <View style={styles.placeItemInfo}>
                    <Text style={styles.placeItemName}>{place.name}</Text>
                    <Text style={styles.placeItemAddress}>{place.formatted_address}</Text>
                    {place.rating && (
                      <View style={styles.placeItemRating}>
                        <Star size={12} color="#FFD700" strokeWidth={2} fill="#FFD700" />
                        <Text style={styles.placeItemRatingText}>{place.rating}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Collections Modal */}
      <Modal visible={showCollections} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to Collection</Text>
            <TouchableOpacity onPress={() => setShowCollections(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.collectionsList}>
            <TouchableOpacity 
              style={styles.createCollectionButton}
              onPress={() => setShowCreateCollection(true)}
            >
              <Plus size={20} color="#007AFF" strokeWidth={2} />
              <Text style={styles.createCollectionText}>Create New Collection</Text>
            </TouchableOpacity>
            
            {collections.length === 0 ? (
              <View style={styles.emptyCollections}>
                <Text style={styles.emptyCollectionsText}>No collections yet</Text>
                <Text style={styles.emptyCollectionsSubtext}>Create your first collection to organize your favorite places!</Text>
              </View>
            ) : (
              collections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.collectionItem}
                  onPress={() => handleSelectCollection(collection.id)}
                >
                  <View style={[styles.collectionColor, { backgroundColor: collection.color }]} />
                  <Text style={styles.collectionName}>{collection.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create Collection Modal */}
      <Modal visible={showCreateCollection} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Collection</Text>
            <TouchableOpacity onPress={() => setShowCreateCollection(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.createCollectionForm}>
            <TextInput
              style={styles.collectionNameInput}
              placeholder="Collection name (emojis supported! 🎉)"
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              autoFocus
              multiline={false}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleCreateCollection}
            />
            
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleCreateCollection}
            >
              <Text style={styles.createButtonText}>Create Collection</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  // Enhanced Processing Overlay Styles
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 20,
  },
  processingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 280,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  processingSpinner: {
    marginBottom: 16,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressStep: {
    alignItems: 'center',
    gap: 8,
  },
  progressStepActive: {
    // Active step styling handled by individual elements
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E5EA',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  progressLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  progressLine: {
    width: 32,
    height: 2,
    backgroundColor: '#E5E5EA',
  },
  progressLineActive: {
    backgroundColor: '#007AFF',
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 50,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultSection: {
    padding: 20,
  },
  capturedImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    marginBottom: 20,
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  analyzingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  placeDetails: {
    gap: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 70,
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  primaryActionBtn: {
    backgroundColor: '#007AFF',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
  },
  saveOnlyBtn: {
    // Unique identifier to prevent cross-button animation
  },
  retakeBtn: {
    // Unique identifier to prevent cross-button animation
  },
  wrongBtn: {
    // Unique identifier to prevent cross-button animation
  },
  placeHeader: {
    marginBottom: 4,
  },
  placeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  placeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hoursDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hoursText: {
    fontSize: 12,
    color: '#3C3C43',
  },
  fullHours: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  dayHours: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 4,
  },
  addressSection: {
    paddingVertical: 4,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  phoneSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  phoneText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  summarySection: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 22,
    marginBottom: 16,
  },
  prosConsContainer: {
    gap: 16,
    marginBottom: 16,
  },
  prosSection: {},
  consSection: {},
  recommendationsSection: {},
  prosConsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  prosConsItem: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 4,
  },
  navigationSection: {
    paddingVertical: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  navButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },

  suggestionsSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  chooseAnotherButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  chooseAnotherText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  analysisResult: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  analysisName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  analysisType: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 12,
  },
  analysisDescription: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 20,
  },
  addressInputSection: {
    marginBottom: 20,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  addressInput: {
    flexDirection: 'row',
    gap: 12,
  },
  addressTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  retakeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  clearSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  clearSearchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  placesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  searchHintText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 8,
  },
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  searchingText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  placeItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  placeItemInfo: {
    gap: 4,
  },
  placeItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  placeItemAddress: {
    fontSize: 14,
    color: '#8E8E93',
  },
  placeItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  placeItemRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  collectionsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  createCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  createCollectionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  collectionColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  collectionName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  createCollectionForm: {
    padding: 20,
    gap: 20,
  },
  collectionNameInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCollections: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyCollectionsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptyCollectionsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  hiddenGemBanner: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFA500',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  hiddenGemBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiddenGemBannerIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  hiddenGemBannerText: {
    flex: 1,
  },
  hiddenGemBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  hiddenGemBannerSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  hiddenGemBannerReward: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  discoveryBanner: {
    backgroundColor: '#E7F3FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  discoveryBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  discoveryBannerSubtext: {
    fontSize: 14,
    color: '#5A5A5A',
    textAlign: 'center',
  },
});
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Camera, Upload, MapPin, Star, Clock, Phone, ExternalLink, Copy, ChevronDown, ChevronUp, Plus, Share, Search, RotateCcw } from 'lucide-react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { analyzeStorefrontPhoto, generateReviewSummary } from '@/lib/openai';
import { searchPlacesByText, searchNearbyPlaces, searchNearbyPlacesWithType, getPlaceDetails, convertGooglePlaceToPlace, reverseGeocode } from '@/lib/google-places';
import { addPlace, getUserCollections, createCollection, addPlaceToCollection, getCurrentUser } from '@/lib/supabase';
import { useRouter } from 'expo-router';

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getCurrentLocationForSearch();
    
    // Auto-start camera if permissions are granted
    if (permission?.granted && !capturedImage) {
      // Camera will be shown by default when component mounts
    }
    
    return () => {
      mounted.current = false;
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

  const extractImageLocation = async (imageUri: string, imagePickerAsset?: any): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      console.log('🔍 Attempting to extract GPS data from image...');
      console.log('📱 Platform:', Platform.OS);
      console.log('📋 ImagePicker asset:', imagePickerAsset ? 'Available' : 'Not available');
      
      // Check if we have EXIF data from ImagePicker
      if (imagePickerAsset?.exif) {
        console.log('📊 EXIF data available:', Object.keys(imagePickerAsset.exif));
        const { GPS } = imagePickerAsset.exif;
        
        if (GPS) {
          console.log('🛰️ GPS object found:', GPS);
          console.log('📍 GPS.Latitude:', GPS.Latitude);
          console.log('📍 GPS.Longitude:', GPS.Longitude);
          console.log('📍 GPS.LatitudeRef:', GPS.LatitudeRef);
          console.log('📍 GPS.LongitudeRef:', GPS.LongitudeRef);
          
          if (GPS.Latitude && GPS.Longitude) {
            console.log('✅ Valid GPS coordinates found!');
            
            // Convert GPS coordinates to decimal degrees
            let latitude = GPS.Latitude;
            let longitude = GPS.Longitude;
            
            // Handle GPS reference (N/S for latitude, E/W for longitude)
            if (GPS.LatitudeRef === 'S') latitude = -latitude;
            if (GPS.LongitudeRef === 'W') longitude = -longitude;
            
            console.log(`📍 Final coordinates: ${latitude}, ${longitude}`);
            console.log(`📍 This corresponds to: ${Math.abs(latitude).toFixed(6)}° ${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(6)}° ${longitude >= 0 ? 'E' : 'W'}`);
            
            return { latitude, longitude };
          } else {
            console.log('❌ GPS coordinates missing or invalid');
          }
        } else {
          console.log('❌ No GPS object in EXIF data');
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

  const analyzePhoto = async (imageUri: string, imagePickerAsset?: any) => {
    setIsAnalyzing(true);
    try {
      console.log('Starting photo analysis...');
      
      // First, try to extract location from photo metadata
      const photoLocation = await extractImageLocation(imageUri, imagePickerAsset);
      console.log('📍 Photo location from metadata:', photoLocation);
      
      // Use photo location if available, otherwise fall back to current location
      const searchLocation = photoLocation || currentLocation;
      
      if (photoLocation) {
        console.log('🎯 Using GPS coordinates from photo metadata!');
        console.log(`📍 GPS Location: ${photoLocation.latitude}, ${photoLocation.longitude}`);
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

      // Analyze the photo with OpenAI
      console.log('Analyzing photo with OpenAI...');
      const analysis = await analyzeStorefrontPhoto(imageUri, searchLocation);
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
      
      // Step 3: If still no results, try generic nearby search
      if (places.length === 0) {
        console.log('🔍 Fallback to generic nearby search...');
        places = await searchNearbyPlaces(
          searchLocation.latitude,
          searchLocation.longitude,
          businessName,
          100 // 100 meter radius
        );
        console.log(`📍 Found ${places.length} places using generic search`);
      }
      
      // Step 4: Final fallback to text search with location bias
      if (places.length === 0) {
        console.log('🌐 Final fallback to text search with location bias...');
        const searchQuery = `${businessName} ${businessType}`;
        places = await searchPlacesByText(searchQuery, searchLocation.latitude, searchLocation.longitude);
        console.log(`📍 Found ${places.length} places using text search fallback`);
      }

      if (places.length > 0) {
        // Get detailed information for the first (most likely) match
        const topPlace = places[0];
        console.log('Getting details for top place:', topPlace.name);
        
        const placeDetails = await getPlaceDetails(topPlace.place_id);
        if (placeDetails && mounted.current) {
          console.log('Place details received:', placeDetails);
          
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
        }
      } else {
        console.log('No places found, showing place selection');
        setSuggestedPlaces([]);
        setShowPlaceSelection(true);
      }
    } catch (error) {
      console.error('Error analyzing photo:', error);
      Alert.alert('Analysis Failed', 'Failed to analyze the photo. Please try again.');
    } finally {
      if (mounted.current) {
        setIsAnalyzing(false);
      }
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          exif: true, // Include EXIF data
        });
        
        if (photo && mounted.current) {
          setCapturedImage(photo.uri);
          await analyzePhoto(photo.uri, photo);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Camera Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: true, // Include EXIF data
      });

      if (!result.canceled && result.assets[0] && mounted.current) {
        setCapturedImage(result.assets[0].uri);
        await analyzePhoto(result.assets[0].uri, result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Gallery Error', 'Failed to pick image. Please try again.');
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
        color: '#007AFF'
      };

      console.log('📝 Collection data:', collectionData);
      const { data, error } = await createCollection(collectionData);
      
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
        added_by: user.id
      };

      console.log('📁 Adding place to database first:', placeToAdd);
      const { data: addedPlace, error: placeError } = await addPlace(placeToAdd);
      
      if (placeError) {
        console.error('❌ Error adding place:', placeError);
        Alert.alert('Error', `Failed to save place: ${placeError.message || 'Unknown error'}`);
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
      Alert.alert('Success', 'Place added to collection successfully!');
      setShowCollections(false);
      resetCapture();
    } catch (error) {
      console.error('❌ Error adding to collection:', error);
      Alert.alert('Error', `Failed to add place to collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSharePublicly = async () => {
    if (!placeData) return;
    
    try {
      setIsLoading(true);
      console.log('📤 Sharing place publicly:', placeData.name);
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to share places.');
        return;
      }

      // Step 1: Share the place publicly
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
        added_by: user.id
      };

      console.log('📤 Adding place to database:', JSON.stringify(placeToAdd, null, 2));
      const { data: addedPlace, error } = await addPlace(placeToAdd);
      
      if (error) {
        console.error('❌ Error sharing place:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        Alert.alert('Error', `Failed to share place: ${error.message || error.details || 'Unknown error'}`);
        return;
      }
      
      if (!addedPlace) {
        console.error('❌ No data returned from addPlace');
        Alert.alert('Error', 'Failed to share place - no data returned.');
        return;
      }

      console.log('✅ Place shared successfully:', JSON.stringify(addedPlace, null, 2));

      // Step 2: Create or find "Shared Places" collection
      console.log('📁 Finding or creating "Shared Places" collection...');
      let sharedCollection = null;
      
      // Load user collections to check if "Shared Places" exists
      const userCollections = await getUserCollections(user.id);
      if (userCollections) {
        sharedCollection = userCollections.find((c: any) => c.name === 'Shared Places');
      }
      
      // Create "Shared Places" collection if it doesn't exist
      if (!sharedCollection) {
        console.log('📁 Creating "Shared Places" collection...');
        const { data: newCollection, error: createError } = await createCollection({
          name: 'Shared Places',
          user_id: user.id,
          color: '#34C759' // Green color for shared places
        });
        
        if (createError) {
          console.error('❌ Error creating shared collection:', createError);
          // Continue without adding to collection, but still show success for sharing
        } else {
          sharedCollection = newCollection;
          console.log('✅ Created "Shared Places" collection:', sharedCollection);
        }
      }

      // Step 3: Add place to "Shared Places" collection
      if (sharedCollection) {
        console.log('📁 Adding to "Shared Places" collection...');
        const { error: collectionError } = await addPlaceToCollection(sharedCollection.id, addedPlace.id);
        
        if (collectionError) {
          console.error('❌ Error adding to shared collection:', collectionError);
          // Continue, don't fail the whole operation
        } else {
          console.log('✅ Added to "Shared Places" collection successfully');
        }
      }

      // Step 4: Show success message
      Alert.alert(
        '🎉 Successfully Recommended!', 
        `${placeData.name} has been shared with the community and added to your "Shared Places" collection.`,
        [
          {
            text: 'View on Discover',
            onPress: () => {
              resetCapture();
              router.push('/(tabs)');
            }
          },
          {
            text: 'Take Another Photo',
            onPress: () => resetCapture()
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error sharing publicly:', error);
      Alert.alert('Error', `Failed to share place: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setPlaceData(null);
    setSuggestedPlaces([]);
    setShowPlaceSelection(false);
    setShowFullHours(false);
    setManualAddress('');
    setShowAddressInput(false);
    setSearchQuery('');
  };

  const filteredSuggestedPlaces = suggestedPlaces.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.formatted_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#8E8E93" strokeWidth={1.5} />
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.resultSection}>
          {/* Captured Image */}
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
          
          {isAnalyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.analyzingText}>Analyzing storefront...</Text>
            </View>
          ) : placeData ? (
            <View style={styles.placeDetails}>
              {/* Header with Name */}
              <View style={styles.placeHeader}>
                <Text style={styles.placeName}>{placeData.name}</Text>
                <Text style={styles.placeCategory}>{placeData.category}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleAddToCollection}>
                  <Plus size={16} color="#007AFF" strokeWidth={2} />
                  <Text style={styles.actionBtnText}>Save</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, isLoading && styles.actionBtnDisabled]} 
                  onPress={handleSharePublicly}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Share size={16} color="#007AFF" strokeWidth={2} />
                  )}
                  <Text style={styles.actionBtnText}>
                    {isLoading ? 'Sharing...' : 'Recommend'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionBtn} onPress={resetCapture}>
                  <Camera size={16} color="#007AFF" strokeWidth={2} />
                  <Text style={styles.actionBtnText}>Retake</Text>
                </TouchableOpacity>
                
                {suggestedPlaces.length > 0 && (
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => setShowPlaceSelection(true)}
                  >
                    <RotateCcw size={16} color="#007AFF" strokeWidth={2} />
                    <Text style={styles.actionBtnText}>Wrong?</Text>
                  </TouchableOpacity>
                )}
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
                  {placeData.week_hours.map((hours, index) => (
                    <Text key={index} style={styles.dayHours}>{hours}</Text>
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
                    {placeData.pros.map((pro, index) => (
                      <Text key={index} style={styles.prosConsItem}>• {pro}</Text>
                    ))}
                  </View>
                  
                  <View style={styles.consSection}>
                    <Text style={styles.prosConsTitle}>Things to Know</Text>
                    {placeData.cons.map((con, index) => (
                      <Text key={index} style={styles.prosConsItem}>• {con}</Text>
                    ))}
                  </View>
                </View>

                <View style={styles.recommendationsSection}>
                  <Text style={styles.prosConsTitle}>Recommendations</Text>
                  {placeData.recommendations.map((rec, index) => (
                    <Text key={index} style={styles.prosConsItem}>• {rec}</Text>
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
              placeholder="Search places..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <ScrollView style={styles.placesList}>
            {filteredSuggestedPlaces.map((place, index) => (
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
            ))}
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
    marginBottom: 32,
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
  placesList: {
    flex: 1,
    paddingHorizontal: 20,
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
});
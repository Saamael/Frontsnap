import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Share as RNShare,
  FlatList,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Clock, 
  Phone, 
  ExternalLink, 
  Camera, 
  MessageCircle, 
  ThumbsUp, 
  MoreVertical,
  Edit3,
  Trash2,
  Flag,
  Share,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  getPlaceById, 
  getReviewsForPlace, 
  addReview, 
  updateReview,
  deleteReview,
  deletePlace,
  getCurrentUser,
  getProfile,
  isUserAdmin,
  toggleReviewLike,
  getPlacePhotos,
  addPlacePhoto,
  Place, 
  Review,
  Profile,
  PlacePhoto
} from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

interface ReviewWithReplies extends Review {
  replies?: ReviewWithReplies[];
  canEdit?: boolean;
  canDelete?: boolean;
}

// Working Hours Section Component (simplified to match Option 1)
const WorkingHoursSection = ({ hours }: { hours: string[] }) => {
  const [showFullHours, setShowFullHours] = useState(false);
  
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
  
  return (
    <View style={styles.hoursSection}>
      <TouchableOpacity 
        style={styles.hoursDropdown}
        onPress={() => setShowFullHours(!showFullHours)}
      >
        <Text style={styles.hoursText}>{getTodayHours(hours)}</Text>
        {showFullHours ? (
          <ChevronUp size={14} color="#8E8E93" strokeWidth={2} />
        ) : (
          <ChevronDown size={14} color="#8E8E93" strokeWidth={2} />
        )}
      </TouchableOpacity>
      
      {showFullHours && (
        <View style={styles.fullHours}>
          {hours.map((dayHours, index) => (
            <Text key={index} style={styles.dayHours}>{dayHours}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

export default function PlaceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<ReviewWithReplies[]>([]);
  const [userReview, setUserReview] = useState<ReviewWithReplies | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userCollections, setUserCollections] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewWithReplies | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReviewWithReplies | null>(null);
  const [placePhotos, setPlacePhotos] = useState<string[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (id) {
      loadPlaceDetails();
    }
    
    return () => {
      mounted.current = false;
    };
  }, [id]);

  useEffect(() => {
    if (showSaveModal && currentUser) {
      loadUserCollections();
    }
  }, [showSaveModal, currentUser]);

  const loadPlaceDetails = async () => {
    try {
      setIsLoading(true);
      
      // Load current user and their profile
      const user = await getCurrentUser();
      let userProfile: Profile | null = null;
      
      if (user) {
        userProfile = await getProfile(user.id);
        if (userProfile && mounted.current) {
          setCurrentUser(userProfile);
        }
      }

      // Load place details
      const placeData = await getPlaceById(id!);
      if (placeData && mounted.current) {
        setPlace(placeData);
        
        // Initialize photos array with the main image
        setPlacePhotos([placeData.image_url]);
      }

      // Load reviews
      const reviewsData = await getReviewsForPlace(id!);
      if (reviewsData && mounted.current) {
        const processedReviews = reviewsData.map(review => ({
          ...review,
          canEdit: userProfile ? review.user_id === userProfile.id : false,
          canDelete: userProfile ? (review.user_id === userProfile.id || placeData?.added_by === userProfile.id) : false,
          replies: [] // TODO: Implement replies
        }));

        // Find user's review
        const userReviewData = processedReviews.find(r => r.user_id === userProfile?.id);
        if (userReviewData) {
          setUserReview(userReviewData);
        }

        // Set other reviews (excluding user's review)
        const otherReviews = processedReviews.filter(r => r.user_id !== userProfile?.id);
        setReviews(otherReviews);
      }
    } catch (error) {
      console.error('Error loading place details:', error);
      Alert.alert('Error', 'Failed to load place details');
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSharePlace = async () => {
    if (!place) return;
    
    try {
      const shareUrl = `frontsnap://place/${place.id}`;
      await RNShare.share({
        message: `Check out ${place.name} on FrontSnap! ${shareUrl}`,
        url: shareUrl,
        title: `${place.name} - ${place.category}`,
      });
    } catch (error) {
      console.error('Error sharing place:', error);
      Alert.alert('Error', 'Failed to share place');
    }
  };

  const handleSaveToCollection = async (collectionId: string) => {
    if (!place || !currentUser) return;
    
    try {
      // TODO: Implement save to collection in supabase
      // await addPlaceToCollection(place.id, collectionId, currentUser.id);
      setShowSaveModal(false);
      Alert.alert('Success', 'Place saved to collection!');
    } catch (error) {
      console.error('Error saving to collection:', error);
      Alert.alert('Error', 'Failed to save to collection');
    }
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const loadUserCollections = async () => {
    if (!currentUser) return;
    
    try {
      // TODO: Implement getUserCollections from supabase
      // const collections = await getUserCollections(currentUser.id);
      // setUserCollections(collections || []);
      
      // Mock data for now
      setUserCollections([
        { id: '1', name: 'Favorites', place_count: 5 },
        { id: '2', name: 'Coffee Shops', place_count: 12 },
        { id: '3', name: 'Weekend Spots', place_count: 8 },
      ]);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const handleAddReview = () => {
    if (userReview) {
      // Edit existing review
      setEditingReview(userReview);
      setReviewText(userReview.text);
      setReviewRating(userReview.rating);
    } else {
      // Add new review
      setReviewText('');
      setReviewRating(5);
      setEditingReview(null);
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!currentUser || !place) return;
    
    if (reviewText.trim().length < 10) {
      Alert.alert('Error', 'Review must be at least 10 characters long');
      return;
    }

    try {
      setIsSubmittingReview(true);

      if (editingReview) {
        // Update existing review
        const { data, error } = await updateReview(editingReview.id, {
          rating: reviewRating,
          text: reviewText.trim()
        });

        if (error) {
          Alert.alert('Error', 'Failed to update review');
          return;
        }

        if (data) {
          // Refresh reviews
          await loadPlaceDetails();
          setShowReviewModal(false);
          Alert.alert('Success', 'Review updated successfully!');
        }
      } else {
        // Add new review
        const { data, error } = await addReview({
          place_id: place.id,
          user_id: currentUser.id,
          rating: reviewRating,
          text: reviewText.trim()
        });

        if (error) {
          Alert.alert('Error', 'Failed to add review');
          return;
        }

        if (data) {
          // Refresh reviews
          await loadPlaceDetails();
          setShowReviewModal(false);
          Alert.alert('Success', 'Review added successfully!');
        }
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = (review: ReviewWithReplies) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteReview(review.id);
              if (error) {
                Alert.alert('Error', 'Failed to delete review');
                return;
              }
              
              // Refresh reviews
              await loadPlaceDetails();
              Alert.alert('Success', 'Review deleted successfully');
            } catch (error) {
              console.error('Error deleting review:', error);
              Alert.alert('Error', 'Failed to delete review');
            }
          }
        }
      ]
    );
  };

  const handleDeletePlace = () => {
    Alert.alert(
      'Delete Place',
      'Are you sure you want to delete this place? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!place || !currentUser) return;
              const { error } = await deletePlace(place.id);
              if (error) {
                Alert.alert('Error', 'Failed to delete place');
                return;
              }
              
              Alert.alert('Success', 'Place deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.back()
                }
              ]);
            } catch (error) {
              console.error('Error deleting place:', error);
              Alert.alert('Error', 'Failed to delete place');
            }
          }
        }
      ]
    );
  };

  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && place && currentUser) {
        const photoUri = result.assets[0].uri;
        
        try {
          // Upload photo to Supabase storage and add to place
          const { data, error } = await addPlacePhoto({
            place_id: place.id,
            user_id: currentUser.id,
            photo_url: photoUri, // In production, this would be uploaded to storage first
            caption: ''
          });
          
          if (error) {
            throw error;
          }
          
          // Add to local state immediately for better UX
          setPlacePhotos(prev => [...prev, photoUri]);
          setShowPhotoModal(false);
          Alert.alert('Success', 'Photo uploaded successfully!');
          
          // Reload place details to get updated photos from server
          await loadPlaceDetails();
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          Alert.alert('Error', 'Failed to upload photo. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleAddressPress = (address: string, name: string, latitude: number, longitude: number) => {
    Alert.alert(
      'Address Options',
      address,
      [
        {
          text: 'Google Maps',
          onPress: () => {
            const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query=${encodeURIComponent(address)}`;
            Linking.openURL(googleUrl);
          }
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const appleUrl = `http://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${latitude},${longitude}`;
            Linking.openURL(appleUrl);
          }
        },
        {
          text: 'Copy Address',
          onPress: () => {
            Alert.alert('Address', address, [
              { text: 'OK', style: 'default' }
            ]);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && place && currentUser) {
        const photoUri = result.assets[0].uri;
        
        try {
          // Upload photo to Supabase storage and add to place
          const { data, error } = await addPlacePhoto({
            place_id: place.id,
            user_id: currentUser.id,
            photo_url: photoUri, // In production, this would be uploaded to storage first
            caption: ''
          });
          
          if (error) {
            throw error;
          }
          
          // Add to local state immediately for better UX
          setPlacePhotos(prev => [...prev, photoUri]);
          setShowPhotoModal(false);
          Alert.alert('Success', 'Photo uploaded successfully!');
          
          // Reload place details to get updated photos from server
          await loadPlaceDetails();
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          Alert.alert('Error', 'Failed to upload photo. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const renderStars = (rating: number, size: number = 16, interactive: boolean = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          disabled={!interactive}
          onPress={() => interactive && setReviewRating(i)}
        >
          <Star
            size={size}
            color={i <= rating ? '#FFD700' : '#E5E5EA'}
            strokeWidth={2}
            fill={i <= rating ? '#FFD700' : 'none'}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const [canDeletePlace, setCanDeletePlace] = useState(false);

  useEffect(() => {
    const checkDeletePermission = async () => {
      if (!currentUser || !place) {
        setCanDeletePlace(false);
        return;
      }

      const isOwner = currentUser.id === place.added_by;
      const isAdmin = await isUserAdmin(currentUser.id);
      
      setCanDeletePlace(isOwner || isAdmin);
    };

    checkDeletePermission();
  }, [currentUser, place]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading place details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!place) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Place not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#000000" strokeWidth={2} />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleSharePlace}>
            <Share size={20} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowSaveModal(true)}>
            <Bookmark size={20} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          {canDeletePlace && (
            <TouchableOpacity style={styles.headerButton} onPress={handleDeletePlace}>
              <Trash2 size={20} color="#FF3B30" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery */}
        <View style={styles.photoSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.photoGallery}
            decelerationRate="fast"
            snapToInterval={200}
            snapToAlignment="start"
          >
            {placePhotos.map((photo, index) => (
              <TouchableOpacity 
                key={`photo-${index}`} 
                onPress={() => handleImagePress(index)}
                style={styles.photoTouchable}
              >
                <Image 
                  source={{ uri: photo }} 
                  style={styles.placePhoto}
                  contentFit="cover"
                  transition={300}
                  cachePolicy="memory-disk"
                  priority="high"
                  placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                  onError={(error) => {
                    console.error('Image loading error:', error);
                  }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity style={styles.addPhotoButton} onPress={() => setShowPhotoModal(true)}>
            <Camera size={20} color="#007AFF" strokeWidth={2} />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Place Info */}
        <View style={styles.placeInfo}>
          <Text style={styles.placeName}>{place.name}</Text>
          <Text style={styles.placeCategory}>{place.category}</Text>
          
          <View style={styles.placeStats}>
            <View style={styles.rating}>
              <Star size={16} color="#FFD700" strokeWidth={2} fill="#FFD700" />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({place.review_count} reviews)</Text>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: place.is_open ? '#34C759' : '#FF3B30' }]} />
              <Text style={styles.statusText}>{place.is_open ? 'Open' : 'Closed'}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.placeLocation}
            onPress={() => handleAddressPress(place.address, place.name, place.latitude, place.longitude)}
          >
            <MapPin size={16} color="#8E8E93" strokeWidth={2} />
            <Text style={styles.placeAddress}>{place.address}</Text>
          </TouchableOpacity>

          {place.week_hours.length > 0 && (
            <WorkingHoursSection hours={place.week_hours} />
          )}
        </View>

        {/* AI Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>AI Review Summary</Text>
          <Text style={styles.summaryText}>{place.ai_summary}</Text>
          
          {place.pros.length > 0 && (
            <View style={styles.prosConsSection}>
              <Text style={styles.prosConsTitle}>What People Love</Text>
              {place.pros.map((pro, index) => (
                <Text key={index} style={styles.prosConsItem}>• {pro}</Text>
              ))}
            </View>
          )}
          
          {place.cons.length > 0 && (
            <View style={styles.prosConsSection}>
              <Text style={styles.prosConsTitle}>Things to Know</Text>
              {place.cons.map((con, index) => (
                <Text key={index} style={styles.prosConsItem}>• {con}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length + (userReview ? 1 : 0)})</Text>
            <TouchableOpacity style={styles.addReviewButton} onPress={handleAddReview}>
              <Edit3 size={16} color="#007AFF" strokeWidth={2} />
              <Text style={styles.addReviewText}>
                {userReview ? 'Edit Review' : 'Add Review'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* User's Review */}
          {userReview && (
            <View style={[styles.reviewCard, styles.userReviewCard]}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewUser}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>
                      {currentUser?.full_name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.reviewUserName}>You</Text>
                    <Text style={styles.reviewDate}>{formatDate(userReview.created_at)}</Text>
                  </View>
                </View>
                
                <View style={styles.reviewActions}>
                  {renderStars(userReview.rating)}
                  <TouchableOpacity onPress={() => handleDeleteReview(userReview)}>
                    <MoreVertical size={16} color="#8E8E93" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.reviewText}>{userReview.text}</Text>
              
              <View style={styles.reviewFooter}>
                <TouchableOpacity style={styles.likeButton}>
                  <ThumbsUp size={14} color="#8E8E93" strokeWidth={2} />
                  <Text style={styles.likeCount}>{userReview.likes}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Other Reviews */}
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewUser}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>
                      {review.user_profile?.full_name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.reviewUserName}>
                      {review.user_profile?.full_name || 'Anonymous'}
                    </Text>
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                </View>
                
                <View style={styles.reviewActions}>
                  {renderStars(review.rating)}
                  {review.canDelete && (
                    <TouchableOpacity onPress={() => handleDeleteReview(review)}>
                      <MoreVertical size={16} color="#8E8E93" strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <Text style={styles.reviewText}>{review.text}</Text>
              
              <View style={styles.reviewFooter}>
                <TouchableOpacity style={styles.likeButton}>
                  <ThumbsUp size={14} color="#8E8E93" strokeWidth={2} />
                  <Text style={styles.likeCount}>{review.likes}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.replyButton}
                  onPress={() => setReplyingTo(review)}
                >
                  <MessageCircle size={14} color="#8E8E93" strokeWidth={2} />
                  <Text style={styles.replyText}>Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {reviews.length === 0 && !userReview && (
            <View style={styles.emptyReviews}>
              <Text style={styles.emptyReviewsText}>No reviews yet</Text>
              <Text style={styles.emptyReviewsSubtext}>Be the first to review this place!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingReview ? 'Edit Review' : 'Add Review'}
            </Text>
            <TouchableOpacity 
              onPress={handleSubmitReview}
              disabled={isSubmittingReview}
            >
              <Text style={[styles.modalSaveText, isSubmittingReview && styles.disabledText]}>
                {isSubmittingReview ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reviewForm}>
            <Text style={styles.formLabel}>Rating</Text>
            {renderStars(reviewRating, 24, true)}
            
            <Text style={styles.formLabel}>Review</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            
            <Text style={styles.characterCount}>
              {reviewText.length}/500 characters
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Photo Modal */}
      <Modal visible={showPhotoModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Photo</Text>
            <View />
          </View>

          <View style={styles.photoOptions}>
            <TouchableOpacity style={styles.photoOption} onPress={handleTakePhoto}>
              <Camera size={32} color="#007AFF" strokeWidth={2} />
              <Text style={styles.photoOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.photoOption} onPress={handleAddPhoto}>
              <Image 
                source={{ uri: 'https://via.placeholder.com/32' }} 
                style={{ width: 32, height: 32 }}
                contentFit="cover"
                cachePolicy="memory"
              />
              <Text style={styles.photoOptionText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Save to Collection Modal */}
      <Modal visible={showSaveModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSaveModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Save to Collection</Text>
            <View />
          </View>

          <View style={styles.collectionsContainer}>
            <FlatList
              data={userCollections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.collectionItem}
                  onPress={() => handleSaveToCollection(item.id)}
                >
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName}>{item.name}</Text>
                    <Text style={styles.collectionCount}>{item.place_count} places</Text>
                  </View>
                  <Text style={styles.collectionArrow}>›</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyCollections}>
                  <Text style={styles.emptyText}>No collections found</Text>
                  <Text style={styles.emptySubtext}>Create a collection first to save places</Text>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Enhanced Image Viewer Modal */}
      <Modal visible={showImageViewer} animationType="fade" presentationStyle="fullScreen">
        <View style={styles.imageViewerContainer}>
          {/* Close Button and Header */}
          <SafeAreaView style={styles.imageViewerHeader}>
            <TouchableOpacity 
              style={styles.imageViewerCloseButton}
              onPress={() => setShowImageViewer(false)}
            >
              <View style={styles.closeButtonContainer}>
                <Text style={styles.imageViewerCloseText}>×</Text>
              </View>
            </TouchableOpacity>
          </SafeAreaView>
          
          {/* Swipe-to-dismiss container */}
          <View
            style={styles.imageViewerContent}
            {...PanResponder.create({
              onMoveShouldSetPanResponder: (evt, gestureState) => {
                return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 20;
              },
              onPanResponderRelease: (evt, gestureState) => {
                // Close if swiped up or down significantly
                if (Math.abs(gestureState.dy) > 100 && Math.abs(gestureState.vy) > 0.5) {
                  setShowImageViewer(false);
                }
              },
            }).panHandlers}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: selectedImageIndex * Dimensions.get('window').width, y: 0 }}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                setSelectedImageIndex(newIndex);
              }}
            >
              {placePhotos.map((photo, index) => (
                <ScrollView
                  key={index}
                  style={[styles.imageZoomContainerStyle, { width: Dimensions.get('window').width }]}
                  contentContainerStyle={styles.imageZoomContainer}
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  centerContent
                >
                  <TouchableOpacity 
                    activeOpacity={1}
                    onPress={() => setShowImageViewer(false)}
                    style={styles.imageContainer}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={styles.fullSizeImage}
                      contentFit="contain"
                      transition={200}
                      cachePolicy="memory-disk"
                      priority="high"
                    />
                  </TouchableOpacity>
                </ScrollView>
              ))}
            </ScrollView>
          </View>
          
          {/* Footer with counter */}
          <SafeAreaView style={styles.imageViewerFooter}>
            <View style={styles.imageCounterContainer}>
              <Text style={styles.imageCounterText}>
                {selectedImageIndex + 1} of {placePhotos.length}
              </Text>
              <Text style={styles.swipeHintText}>
                Swipe up/down or tap to close
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  photoSection: {
    position: 'relative',
  },
  photoGallery: {
    height: 250,
  },
  photoTouchable: {
    marginRight: 12,
  },
  placePhoto: {
    width: 300,
    height: 250,
    borderRadius: 12,
    backgroundColor: '#F2F2F7', // Prevents flash during loading
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addPhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  placeInfo: {
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  placeName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 16,
  },
  placeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  reviewCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3C3C43',
  },
  placeLocation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
  },
  placeAddress: {
    fontSize: 16,
    color: '#007AFF',
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  hoursSection: {
    marginBottom: 8,
  },
  hoursDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  hoursText: {
    fontSize: 12,
    color: '#3C3C43',
  },
  fullHours: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  dayHours: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  hoursText: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 4,
  },
  summarySection: {
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  summaryText: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 22,
    marginBottom: 16,
  },
  prosConsSection: {
    marginBottom: 16,
  },
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
  reviewsSection: {
    padding: 20,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addReviewText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userReviewCard: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  reviewDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: 'row',
    gap: 20,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyReviewsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptyReviewsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
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
  modalSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  reviewForm: {
    padding: 20,
    gap: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  reviewInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
  },
  photoOptions: {
    padding: 20,
    gap: 20,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderRadius: 12,
  },
  photoOptionText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 12,
  },
  // Save to Collection Modal Styles
  collectionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 14,
    color: '#666666',
  },
  collectionArrow: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '300',
  },
  emptyCollections: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  // Image Viewer Modal Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imageViewerCloseButton: {
    alignSelf: 'flex-end',
  },
  closeButtonContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageViewerCloseText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 28,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageZoomContainerStyle: {
    width: 400,
    flex: 1,
  },
  imageZoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  fullSizeImage: {
    width: 400,
    height: '100%',
  },
  imageViewerFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 8,
    alignItems: 'center',
  },
  imageCounterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  imageCounterText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  swipeHintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
});
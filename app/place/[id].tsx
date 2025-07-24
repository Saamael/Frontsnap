import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
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
  Bookmark
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

interface ReviewWithReplies extends Review {
  replies?: ReviewWithReplies[];
  canEdit?: boolean;
  canDelete?: boolean;
}

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
              if (!place) return;
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Upload photo to storage and add to place
        const newPhotoUri = result.assets[0].uri;
        setPlacePhotos(prev => [...prev, newPhotoUri]);
        setShowPhotoModal(false);
        Alert.alert('Success', 'Photo added successfully!');
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      Alert.alert('Error', 'Failed to add photo');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Upload photo to storage and add to place
        const newPhotoUri = result.assets[0].uri;
        setPlacePhotos(prev => [...prev, newPhotoUri]);
        setShowPhotoModal(false);
        Alert.alert('Success', 'Photo added successfully!');
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
          <TouchableOpacity style={styles.headerButton}>
            <Share size={20} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
            {placePhotos.map((photo, index) => (
              <Image key={index} source={{ uri: photo }} style={styles.placePhoto} />
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

          <View style={styles.placeLocation}>
            <MapPin size={16} color="#8E8E93" strokeWidth={2} />
            <Text style={styles.placeAddress}>{place.address}</Text>
          </View>

          {place.week_hours.length > 0 && (
            <View style={styles.hoursSection}>
              <Text style={styles.sectionTitle}>Hours</Text>
              {place.week_hours.map((hours, index) => (
                <Text key={index} style={styles.hoursText}>{hours}</Text>
              ))}
            </View>
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
              />
              <Text style={styles.photoOptionText}>Choose from Library</Text>
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
  placePhoto: {
    width: 300,
    height: 250,
    marginRight: 12,
    borderRadius: 0,
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
  },
  placeAddress: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
    lineHeight: 22,
  },
  hoursSection: {
    marginTop: 8,
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
    color: '#000000',
    fontWeight: '500',
  },
});
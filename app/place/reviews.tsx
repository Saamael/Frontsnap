import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

type Review = Database['public']['Tables']['reviews']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ReviewWithProfile extends Review {
  profiles?: Profile;
}

interface NewReview {
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
}

export default function PlaceReviews() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState<NewReview>({
    rating: 5,
    title: '',
    content: '',
    pros: [],
    cons: [],
  });
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userReview, setUserReview] = useState<ReviewWithProfile | null>(null);

  useEffect(() => {
    if (id) {
      loadReviews();
      getCurrentUser();
    }
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('place_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      // Find current user's review
      if (currentUser) {
        const userReviewData = data?.find(review => review.user_id === currentUser);
        setUserReview(userReviewData || null);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews();
  };

  const handleAddPro = () => {
    setNewReview(prev => ({
      ...prev,
      pros: [...prev.pros, '']
    }));
  };

  const handleAddCon = () => {
    setNewReview(prev => ({
      ...prev,
      cons: [...prev.cons, '']
    }));
  };

  const handleUpdatePro = (index: number, value: string) => {
    setNewReview(prev => ({
      ...prev,
      pros: prev.pros.map((pro, i) => i === index ? value : pro)
    }));
  };

  const handleUpdateCon = (index: number, value: string) => {
    setNewReview(prev => ({
      ...prev,
      cons: prev.cons.map((con, i) => i === index ? value : con)
    }));
  };

  const handleRemovePro = (index: number) => {
    setNewReview(prev => ({
      ...prev,
      pros: prev.pros.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveCon = (index: number) => {
    setNewReview(prev => ({
      ...prev,
      cons: prev.cons.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitReview = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to write a review');
      return;
    }

    if (!newReview.title.trim() || !newReview.content.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const reviewData = {
        place_id: id,
        user_id: currentUser,
        rating: newReview.rating,
        title: newReview.title.trim(),
        content: newReview.content.trim(),
        pros: newReview.pros.filter(pro => pro.trim()),
        cons: newReview.cons.filter(con => con.trim()),
      };

      let error;
      if (userReview) {
        // Update existing review
        ({ error } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', userReview.id));
      } else {
        // Create new review
        ({ error } = await supabase
          .from('reviews')
          .insert([reviewData]));
      }

      if (error) throw error;

      Alert.alert(
        'Success',
        userReview ? 'Review updated successfully' : 'Review added successfully'
      );

      setShowAddReview(false);
      setNewReview({
        rating: 5,
        title: '',
        content: '',
        pros: [],
        cons: [],
      });
      loadReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
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
              const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', reviewId);

              if (error) throw error;

              Alert.alert('Success', 'Review deleted successfully');
              loadReviews();
            } catch (error) {
              console.error('Error deleting review:', error);
              Alert.alert('Error', 'Failed to delete review');
            }
          }
        }
      ]
    );
  };

  const openAddReview = () => {
    if (userReview) {
      // Pre-fill form with existing review
      setNewReview({
        rating: userReview.rating,
        title: userReview.title,
        content: userReview.content,
        pros: userReview.pros || [],
        cons: userReview.cons || [],
      });
    }
    setShowAddReview(true);
  };

  const StarRating = ({ rating, onRatingChange, size = 24, interactive = false }: {
    rating: number;
    onRatingChange?: (rating: number) => void;
    size?: number;
    interactive?: boolean;
  }) => {
    return (
      <View style={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && onRatingChange?.(star)}
            disabled={!interactive}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color={star <= rating ? '#FFD700' : '#DDD'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const ReviewCard = ({ review }: { review: ReviewWithProfile }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUser}>
          <Text style={styles.reviewUserName}>
            {review.profiles?.full_name || review.profiles?.username || 'Anonymous'}
          </Text>
          <StarRating rating={review.rating} size={16} />
        </View>
        <View style={styles.reviewActions}>
          <Text style={styles.reviewDate}>
            {new Date(review.created_at).toLocaleDateString()}
          </Text>
          {review.user_id === currentUser && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteReview(review.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.reviewTitle}>{review.title}</Text>
      <Text style={styles.reviewContent}>{review.content}</Text>

      {(review.pros?.length > 0 || review.cons?.length > 0) && (
        <View style={styles.prosConsContainer}>
          {review.pros?.length > 0 && (
            <View style={styles.prosConsSection}>
              <Text style={styles.prosConsTitle}>👍 Pros:</Text>
              {review.pros.map((pro, index) => (
                <Text key={index} style={styles.prosConsItem}>• {pro}</Text>
              ))}
            </View>
          )}
          {review.cons?.length > 0 && (
            <View style={styles.prosConsSection}>
              <Text style={styles.prosConsTitle}>👎 Cons:</Text>
              {review.cons.map((con, index) => (
                <Text key={index} style={styles.prosConsItem}>• {con}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const AddReviewModal = () => (
    <Modal
      visible={showAddReview}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAddReview(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {userReview ? 'Edit Review' : 'Write Review'}
          </Text>
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={handleSubmitReview}
          >
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Rating *</Text>
            <StarRating
              rating={newReview.rating}
              onRatingChange={(rating) => setNewReview(prev => ({ ...prev, rating }))}
              size={32}
              interactive
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={newReview.title}
              onChangeText={(title) => setNewReview(prev => ({ ...prev, title }))}
              placeholder="Brief summary of your experience"
              maxLength={100}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Review *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newReview.content}
              onChangeText={(content) => setNewReview(prev => ({ ...prev, content }))}
              placeholder="Share your detailed experience..."
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
          </View>

          <View style={styles.formSection}>
            <View style={styles.prosConsHeader}>
              <Text style={styles.formLabel}>Pros</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddPro}>
                <Ionicons name="add" size={20} color="#007AFF" />
                <Text style={styles.addButtonText}>Add Pro</Text>
              </TouchableOpacity>
            </View>
            {newReview.pros.map((pro, index) => (
              <View key={index} style={styles.prosConsInput}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={pro}
                  onChangeText={(value) => handleUpdatePro(index, value)}
                  placeholder="What did you like?"
                  maxLength={100}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemovePro(index)}
                >
                  <Ionicons name="close" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.formSection}>
            <View style={styles.prosConsHeader}>
              <Text style={styles.formLabel}>Cons</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddCon}>
                <Ionicons name="add" size={20} color="#007AFF" />
                <Text style={styles.addButtonText}>Add Con</Text>
              </TouchableOpacity>
            </View>
            {newReview.cons.map((con, index) => (
              <View key={index} style={styles.prosConsInput}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={con}
                  onChangeText={(value) => handleUpdateCon(index, value)}
                  placeholder="What could be improved?"
                  maxLength={100}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveCon(index)}
                >
                  <Ionicons name="close" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Reviews ({reviews.length})</Text>
        {currentUser && (
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={openAddReview}
          >
            <Ionicons 
              name={userReview ? "create" : "add"} 
              size={24} 
              color="#007AFF" 
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to share your experience at this place!
            </Text>
            {currentUser && (
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={openAddReview}
              >
                <Text style={styles.emptyActionText}>Write First Review</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </ScrollView>

      <AddReviewModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  addReviewButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUser: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  prosConsContainer: {
    gap: 12,
  },
  prosConsSection: {
    gap: 4,
  },
  prosConsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  prosConsItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  starRating: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  emptyActionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyActionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSaveButton: {
    padding: 4,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prosConsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  prosConsInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  removeButton: {
    padding: 4,
  },
});
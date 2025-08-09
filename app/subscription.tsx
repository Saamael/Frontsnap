import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Check, Crown, Zap, Star, Shield, TrendingUp, Users } from 'lucide-react-native';
import { iapManager, IAP_PRODUCTS, SubscriptionTier, TIER_FEATURES } from '@/lib/iap-manager';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import * as Haptics from 'expo-haptics';
import * as InAppPurchases from 'expo-in-app-purchases';

interface PricingPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  price: string;
  productId: string;
  period: string;
  features: string[];
  icon: React.ReactNode;
  recommended?: boolean;
  savings?: string;
}

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [products, setProducts] = useState<InAppPurchases.IAPItemDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');

  useEffect(() => {
    initializeStore();
    checkCurrentSubscription();
  }, []);

  const initializeStore = async () => {
    try {
      setIsLoading(true);
      const initialized = await iapManager.initialize();
      
      if (initialized) {
        const availableProducts = await iapManager.getProducts();
        setProducts(availableProducts);
        console.log('Products loaded:', availableProducts);
      }
    } catch (error) {
      console.error('Failed to initialize store:', error);
      Alert.alert(
        'Store Unavailable',
        'Unable to connect to the app store. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentSubscription = async () => {
    const tier = await iapManager.checkSubscriptionStatus();
    setCurrentTier(tier);
  };

  const getProductPrice = (productId: string): string => {
    const product = products.find(p => p.productId === productId);
    return product?.price || 'Loading...';
  };

  const PRICING_PLANS: PricingPlan[] = [
    {
      id: 'free',
      tier: SubscriptionTier.FREE,
      name: 'Free',
      price: '$0',
      productId: '',
      period: 'forever',
      features: [
        '5 places per month',
        'Basic search',
        '1 collection',
        'Community support',
      ],
      icon: <Zap size={24} color="#8E8E93" />,
    },
    {
      id: 'basic',
      tier: SubscriptionTier.BASIC,
      name: 'Basic',
      price: getProductPrice(IAP_PRODUCTS.BASIC_MONTHLY),
      productId: IAP_PRODUCTS.BASIC_MONTHLY,
      period: 'per month',
      features: [
        '50 places per month',
        'Advanced search & filters',
        '10 collections',
        'Export your data',
        'Email support',
        'No ads',
      ],
      icon: <Crown size={24} color="#007AFF" />,
      recommended: true,
    },
    {
      id: 'pro_monthly',
      tier: SubscriptionTier.PRO,
      name: 'Pro',
      price: getProductPrice(IAP_PRODUCTS.PRO_MONTHLY),
      productId: IAP_PRODUCTS.PRO_MONTHLY,
      period: 'per month',
      features: [
        'Unlimited places',
        'AI-powered recommendations',
        'Unlimited collections',
        'Analytics dashboard',
        'Team collaboration',
        'Priority support',
        'Early access to features',
      ],
      icon: <Star size={24} color="#FFD700" />,
    },
    {
      id: 'pro_yearly',
      tier: SubscriptionTier.PRO,
      name: 'Pro Annual',
      price: getProductPrice(IAP_PRODUCTS.PRO_YEARLY),
      productId: IAP_PRODUCTS.PRO_YEARLY,
      period: 'per year',
      features: [
        'Everything in Pro Monthly',
        '🎉 Save 20% with annual billing',
        'Exclusive annual member badge',
        'Priority feature requests',
      ],
      icon: <Shield size={24} color="#34C759" />,
      savings: 'Save 20%',
    },
  ];

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe');
      router.push('/auth/login');
      return;
    }

    if (!plan.productId) {
      // Downgrading to free
      Alert.alert(
        'Downgrade to Free',
        'Your subscription will remain active until the end of the billing period.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Downgrade', 
            style: 'destructive',
            onPress: () => {
              // Handle downgrade logic
              console.log('Downgrading to free');
            }
          }
        ]
      );
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await iapManager.purchaseSubscription(plan.productId);
      
      if (success) {
        await checkCurrentSubscription();
        Alert.alert(
          '🎉 Welcome to ' + plan.name + '!',
          'Your subscription is now active. Enjoy all the premium features!',
          [{ text: 'Awesome!', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const restored = await iapManager.restorePurchases();
      
      if (restored.length > 0) {
        await checkCurrentSubscription();
        Alert.alert(
          'Purchases Restored',
          `Successfully restored ${restored.length} purchase(s).`
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases found to restore.'
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert(
        'Restore Failed',
        'Unable to restore purchases. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F8F9FA', '#FFFFFF']} style={styles.gradient}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
              <ArrowLeft size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>Premium Plans</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Why Go Premium?</Text>
            <View style={styles.benefitsGrid}>
              <View style={styles.benefitItem}>
                <TrendingUp size={20} color="#007AFF" />
                <Text style={styles.benefitText}>Track More Places</Text>
              </View>
              <View style={styles.benefitItem}>
                <Shield size={20} color="#34C759" />
                <Text style={styles.benefitText}>Priority Support</Text>
              </View>
              <View style={styles.benefitItem}>
                <Star size={20} color="#FFD700" />
                <Text style={styles.benefitText}>AI Recommendations</Text>
              </View>
              <View style={styles.benefitItem}>
                <Users size={20} color="#FF3B30" />
                <Text style={styles.benefitText}>Team Features</Text>
              </View>
            </View>
          </View>

          {/* Current Plan Badge */}
          {currentTier !== SubscriptionTier.FREE && (
            <View style={styles.currentPlanBadge}>
              <Text style={styles.currentPlanLabel}>Your Current Plan</Text>
              <Text style={styles.currentPlanName}>
                {currentTier.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Pricing Cards */}
          <View style={styles.plansContainer}>
            {PRICING_PLANS.map((plan) => {
              const isCurrentPlan = plan.tier === currentTier && currentTier !== SubscriptionTier.FREE;
              const isSelected = plan.id === selectedPlan;

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    plan.recommended && styles.planCardRecommended,
                    isCurrentPlan && styles.planCardCurrent,
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                  disabled={isCurrentPlan}
                  activeOpacity={0.8}
                >
                  {plan.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>MOST POPULAR</Text>
                    </View>
                  )}
                  
                  {plan.savings && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>{plan.savings}</Text>
                    </View>
                  )}

                  <View style={styles.planHeader}>
                    {plan.icon}
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                      {plan.period !== 'forever' && (
                        <Text style={styles.planPeriod}>/{plan.period}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Check size={16} color="#34C759" strokeWidth={3} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {isCurrentPlan ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
                    </View>
                  ) : (
                    <Button
                      title={plan.tier === SubscriptionTier.FREE ? 'Downgrade' : 'Subscribe'}
                      onPress={() => handleSubscribe(plan)}
                      disabled={isLoading}
                      variant={plan.recommended ? 'primary' : 'secondary'}
                      size="medium"
                      fullWidth
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Restore Button */}
          <TouchableOpacity 
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={isLoading}
          >
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>

          {/* Legal Text */}
          <View style={styles.legalSection}>
            <Text style={styles.legalText}>
              • Subscriptions automatically renew unless cancelled
            </Text>
            <Text style={styles.legalText}>
              • Cancel anytime in {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} settings
            </Text>
            <Text style={styles.legalText}>
              • Prices shown in your local currency
            </Text>
            <Text style={styles.legalText}>
              • No refunds for partial periods
            </Text>
          </View>

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  benefitsSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: '#3C3C43',
    flex: 1,
  },
  currentPlanBadge: {
    backgroundColor: '#E8F4FF',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  plansContainer: {
    paddingHorizontal: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  planCardRecommended: {
    borderColor: '#007AFF',
  },
  planCardCurrent: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  savingsBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#3C3C43',
    marginLeft: 12,
    flex: 1,
  },
  currentBadge: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  restoreButton: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  restoreText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  legalSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  legalText: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#007AFF',
  },
});

export default SubscriptionScreen;
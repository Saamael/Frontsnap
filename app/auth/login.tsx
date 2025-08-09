import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react-native';
import { signIn as supabaseSignIn } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { validateLoginForm } from '@/lib/validation';
import { logAndGetSafeError } from '@/lib/error-handling';
import { Button } from '@/components/Button';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [fieldTouched, setFieldTouched] = useState<{ [key: string]: boolean }>({});
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '#8E8E93' });
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Validate autofilled values
  useEffect(() => {
    if (email.trim()) {
      validateEmailOnChange(email);
    }
  }, [email]);

  useEffect(() => {
    if (password.trim()) {
      validatePasswordOnChange(password);
    }
  }, [password]);

  const validateEmail = (emailValue: string) => {
    if (!emailValue.trim()) {
      return 'Email is required';
    } else if (!emailValue.includes('@') || !emailValue.includes('.')) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (passwordValue: string) => {
    if (!passwordValue.trim()) {
      return 'Password is required';
    } else if (passwordValue.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const validateEmailOnChange = (value: string) => {
    const error = validateEmail(value);
    setErrors(prev => ({ ...prev, email: error }));
    if (value.trim()) {
      setFieldTouched(prev => ({ ...prev, email: true }));
    }
  };

  const validatePasswordOnChange = (value: string) => {
    const error = validatePassword(value);
    setErrors(prev => ({ ...prev, password: error })); 
    if (value.trim()) {
      setFieldTouched(prev => ({ ...prev, password: true }));
    }
  };

  const validateEmailOnBlur = () => {
    setFieldTouched(prev => ({ ...prev, email: true }));
    const error = validateEmail(email);
    setErrors(prev => ({ ...prev, email: error }));
  };

  const validatePasswordOnBlur = () => {
    setFieldTouched(prev => ({ ...prev, password: true }));
    const error = validatePassword(password);
    setErrors(prev => ({ ...prev, password: error }));
  };

  const calculatePasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength({ score: 0, text: '', color: '#8E8E93' });
      return;
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      symbols: /[^a-zA-Z0-9]/.test(password),
    };

    score = Object.values(checks).filter(Boolean).length;

    if (score <= 1) {
      setPasswordStrength({ score, text: 'Weak', color: '#FF3B30' });
    } else if (score <= 3) {
      setPasswordStrength({ score, text: 'Fair', color: '#FF9500' });
    } else if (score <= 4) {
      setPasswordStrength({ score, text: 'Good', color: '#34C759' });
    } else {
      setPasswordStrength({ score, text: 'Strong', color: '#34C759' });
    }
  };

  const handleLogin = async () => {
    // Haptic feedback for button press
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Clear previous errors
    setErrors({});

    // Validate form data
    const validation = validateLoginForm({
      email: email.trim(),
      password: password.trim()
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    setIsLoading(true);
    
    try {
      // Use sanitized values
      const { data, error } = await supabaseSignIn(email.trim().toLowerCase(), password.trim());
      
      if (error) {
        const safeError = logAndGetSafeError(error, 'user_login');
        Alert.alert('Error', safeError.message);
      } else if (data.user) {
        console.log('✅ User signed in successfully');
        console.log('🍎 iOS Debug - About to call AuthContext signIn...');
        
        // Update AuthContext with the authenticated user
        await signIn(data.user);
        console.log('🍎 iOS Debug - AuthContext signIn completed');
        
        // Give AuthContext state a moment to propagate, then navigate
        console.log('🍎 iOS Debug - Waiting for state propagation before navigation...');
        setTimeout(() => {
          console.log('🍎 iOS Debug - Navigating to main app...');
          router.replace('/(tabs)');
        }, 100);
      }
    } catch (error) {
      const safeError = logAndGetSafeError(error, 'user_login_exception');
      Alert.alert('Error', safeError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/signup');
  };

  const navigateBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/onboarding');
  };


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#1C1C1E', '#000000'] : ['#F8F9FA', '#FFFFFF']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <ArrowLeft size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Mail size={20} color="#8E8E93" strokeWidth={2} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  validateEmailOnChange(text);
                }}
                onBlur={validateEmailOnBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
                textContentType="emailAddress"
                placeholderTextColor="#8E8E93"
                accessibilityLabel="Email address input field"
                accessibilityHint="Enter your email address to sign in"
              />
            </View>
            {fieldTouched.email && errors.email && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            )}

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Lock size={20} color="#8E8E93" strokeWidth={2} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  validatePasswordOnChange(text);
                  calculatePasswordStrength(text);
                }}
                onBlur={validatePasswordOnBlur}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                placeholderTextColor="#8E8E93"
                accessibilityLabel="Password input field"
                accessibilityHint="Enter your password to sign in"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPassword(!showPassword);
                }}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#8E8E93" strokeWidth={2} />
                ) : (
                  <Eye size={20} color="#8E8E93" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
            {fieldTouched.password && errors.password && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            )}
            {password && passwordStrength.text && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.strengthBarContainer}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor: level <= passwordStrength.score 
                            ? passwordStrength.color 
                            : '#E5E5EA'
                        }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.text}
                </Text>
              </View>
            )}

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <Button
              title={isLoading ? 'Signing In...' : 'Continue to FrontSnap'}
              onPress={handleLogin}
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              size="large"
              fullWidth
              accessibilityLabel="Sign in to FrontSnap"
              accessibilityHint="Sign in to your account and start using FrontSnap"
            />

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={navigateToSignup}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>FrontSnap</Text>
            <Text style={styles.footerSubtext}>by SUPERING TECHNOLOGY</Text>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    flex: 2.5,
    justifyContent: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 16,
  },
  eyeButton: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  signUpLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 24,
    padding: 8,
    zIndex: 1,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
  },
  passwordStrengthContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
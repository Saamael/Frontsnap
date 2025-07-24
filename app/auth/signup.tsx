import { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react-native';
import { signUp } from '@/lib/supabase';
import { validateSignupForm } from '@/lib/validation';
import { logAndGetSafeError } from '@/lib/error-handling';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSignup = async () => {
    // Clear previous errors
    setErrors({});

    // Validate form data
    const validation = validateSignupForm({
      name: name.trim(),
      email: email.trim(),
      password,
      confirmPassword
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    if (!acceptTerms) {
      Alert.alert('Error', 'Please accept the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);
    
    try {
      // Use sanitized values from validation
      const { data, error } = await signUp(email.trim().toLowerCase(), password, name.trim());
      
      if (error) {
        const safeError = logAndGetSafeError(error, 'user_signup');
        Alert.alert('Error', safeError.message);
      } else if (data.user) {
        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          // User is immediately confirmed, navigate to app
        Alert.alert(
            'Welcome!',
          'Your account has been created successfully.',
          [{ 
              text: 'Get Started', 
            onPress: () => {
                console.log('✅ User signed up and confirmed');
              router.replace('/');
            }
          }]
        );
        } else {
          // Email confirmation required
          Alert.alert(
            'Check Your Email!',
            `We've sent a confirmation link to ${email}. Please click the link in your email to activate your account.`,
            [{ 
              text: 'OK', 
              onPress: () => {
                console.log('✅ User signed up, email confirmation required');
                router.replace('/auth/login');
              }
            }]
          );
        }
      }
    } catch (error) {
      const safeError = logAndGetSafeError(error, 'user_signup_exception');
      Alert.alert('Error', safeError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.replace('/auth/login');
  };

  const navigateBack = () => {
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
              <ArrowLeft size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join FrontSnap and start discovering</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <User size={20} color="#8E8E93" strokeWidth={2} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Mail size={20} color="#8E8E93" strokeWidth={2} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={20} color="#8E8E93" strokeWidth={2} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#8E8E93"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#8E8E93" strokeWidth={2} />
                  ) : (
                    <Eye size={20} color="#8E8E93" strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={20} color="#8E8E93" strokeWidth={2} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#8E8E93"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#8E8E93" strokeWidth={2} />
                  ) : (
                    <Eye size={20} color="#8E8E93" strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Terms and Conditions */}
              <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                <View style={[styles.checkbox, acceptTerms && styles.checkedCheckbox]}>
                  {acceptTerms && <View style={styles.checkmark} />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.signUpButton, isLoading && styles.disabledButton]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                <Text style={styles.signUpButtonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity onPress={navigateToLogin}>
                  <Text style={styles.signInLink}>Sign In</Text>
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
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
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
  },
  form: {
    paddingBottom: 40,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  termsLink: {
    color: '#007AFF',
    fontWeight: '500',
  },
  signUpButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    fontSize: 14,
    color: '#8E8E93',
    marginHorizontal: 16,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  signInLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
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
});
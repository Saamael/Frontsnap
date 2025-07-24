// Secure API configuration utility
// This handles environment-specific API keys and provides a secure way to access them

interface ApiConfig {
  googlePlacesKey: string | null;
  openaiKey: string | null;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  googleMapsKey: string | null;
}

const getApiConfig = (): ApiConfig => {
  // In development, use environment variables
  if (__DEV__) {
    return {
      googlePlacesKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || null,
      openaiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || null,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || null,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || null,
      googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || null,
    };
  }

  // In production, use backend proxy for sensitive APIs
  // This prevents API keys from being exposed in the client bundle
  return {
    googlePlacesKey: null, // Use backend proxy
    openaiKey: null, // Use backend proxy
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || null,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || null,
    googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || null,
  };
};

export const apiConfig = getApiConfig();

// Validation function to ensure required config is available
export const validateApiConfig = (): boolean => {
  const config = getApiConfig();
  
  if (__DEV__) {
    // In development, check if all required keys are present
    const requiredKeys = [
      'googlePlacesKey',
      'openaiKey', 
      'supabaseUrl',
      'supabaseAnonKey',
      'googleMapsKey'
    ];
    
    const missingKeys = requiredKeys.filter(key => !config[key as keyof ApiConfig]);
    
    if (missingKeys.length > 0) {
      console.warn('⚠️ Missing API keys in development:', missingKeys);
      return false;
    }
  } else {
    // In production, only Supabase keys are required (others use backend proxy)
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('❌ Missing Supabase configuration in production');
      return false;
    }
  }
  
  return true;
};

// Secure API key getter with validation
export const getSecureApiKey = (keyName: keyof ApiConfig): string => {
  const config = getApiConfig();
  const value = config[keyName];
  
  if (!value) {
    throw new Error(`API key '${keyName}' is not configured`);
  }
  
  return value;
};

// Check if we should use backend proxy for a specific API
export const shouldUseBackendProxy = (apiName: string): boolean => {
  if (__DEV__) {
    return false; // Use direct API calls in development
  }
  
  // Use backend proxy for sensitive APIs in production
  const sensitiveApis = ['googlePlaces', 'openai'];
  return sensitiveApis.includes(apiName);
}; 
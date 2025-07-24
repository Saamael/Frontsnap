declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Client-side accessible (EXPO_PUBLIC_ prefix)
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      
      // Server-side only (NO EXPO_PUBLIC_ prefix for security)
      OPENAI_API_KEY: string;
      GOOGLE_PLACES_API_KEY: string;
      GOOGLE_MAPS_API_KEY: string;
    }
  }
}

export {};
import { supabase } from './supabase';
import { uploadAvatarDirect } from './avatar-upload-direct';
import { uploadAvatarAsBase64 } from './avatar-base64';

/**
 * Hybrid avatar upload - tries storage first, falls back to base64
 */
export const uploadAvatarHybrid = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    console.log('📤 Starting hybrid avatar upload...');
    
    // First, try the regular storage upload
    console.log('🔄 Attempting storage upload...');
    const storageUrl = await uploadAvatarDirect(imageUri, userId);
    
    if (storageUrl) {
      // Test if the URL is actually accessible
      console.log('🔍 Testing if storage URL is accessible...');
      try {
        const testResponse = await fetch(storageUrl);
        if (testResponse.ok) {
          console.log('✅ Storage upload successful and accessible');
          return storageUrl;
        }
        console.log('⚠️ Storage URL not accessible, falling back to base64');
      } catch (e) {
        console.log('⚠️ Could not verify storage URL, falling back to base64');
      }
    }
    
    // If storage upload failed or URL is not accessible, use base64
    console.log('🔄 Falling back to base64 storage...');
    const base64Url = await uploadAvatarAsBase64(imageUri, userId);
    
    if (base64Url) {
      console.log('✅ Base64 storage successful');
      return base64Url;
    }
    
    console.error('❌ Both upload methods failed');
    return null;

  } catch (error) {
    console.error('❌ Hybrid avatar upload failed:', error);
    return null;
  }
};
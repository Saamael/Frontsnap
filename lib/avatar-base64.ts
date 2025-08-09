import { supabase } from './supabase';

/**
 * Upload avatar as base64 data URL directly to the profiles table
 * This completely bypasses storage RLS issues
 */
export const uploadAvatarAsBase64 = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    console.log('📤 Converting avatar to base64...');
    
    // Fetch the image
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    console.log('📦 Blob size:', blob.size, 'bytes');
    
    // Check file size (limit to 1MB for base64)
    if (blob.size > 1024 * 1024) {
      console.log('🔄 Image too large, need to compress...');
      // For now, we'll proceed but you might want to add compression
    }
    
    // Convert to base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        console.log('📝 Base64 string created, length:', base64String.length);
        
        // Update profile with base64 data URL
        const { data, error } = await supabase
          .from('profiles')
          .update({ 
            avatar_url: base64String // Store as data:image/jpeg;base64,...
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          console.error('❌ Profile update error:', error);
          resolve(null);
          return;
        }

        console.log('✅ Avatar saved as base64 successfully');
        resolve(base64String);
      };
      
      reader.onerror = () => {
        console.error('❌ Failed to convert to base64');
        resolve(null);
      };
      
      reader.readAsDataURL(blob);
    });

  } catch (error) {
    console.error('❌ Avatar base64 upload failed:', error);
    return null;
  }
};
import { supabase } from './supabase';

/**
 * Alternative: Store avatar as base64 in database
 * This bypasses storage RLS issues entirely
 */
export const uploadAvatarToDatabase = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    console.log('📤 Uploading avatar to database as base64...');
    
    // Convert image to base64
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Convert blob to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(blob);
    
    const base64Data = await base64Promise;
    console.log('📦 Converted to base64, size:', base64Data.length);
    
    // Store in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: base64Data // Store base64 directly
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database update error:', error);
      return null;
    }

    console.log('✅ Avatar stored in database successfully');
    return base64Data;

  } catch (error) {
    console.error('❌ Avatar database upload failed:', error);
    return null;
  }
};
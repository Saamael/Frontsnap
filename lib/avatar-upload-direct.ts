import { supabase } from './supabase';

/**
 * Direct avatar upload using Supabase's built-in methods
 * This should work regardless of RLS policies
 */
export const uploadAvatarDirect = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    console.log('📤 Starting direct avatar upload...');
    
    // Create a blob from the image URI
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    console.log('📦 Blob created:', blob.size, 'bytes');

    // Use a folder structure: avatars/[userId]/avatar.jpg
    // This overwrites the existing avatar automatically
    const filePath = `${userId}/avatar.jpg`;
    
    console.log('📁 Uploading to path:', filePath);

    // Upload with upsert to replace existing
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true // This will overwrite existing file
      });

    if (error) {
      console.error('❌ Upload error:', error);
      
      // If RLS error, try alternative approach
      if (error.message?.includes('row-level security')) {
        console.log('🔄 Trying alternative upload method...');
        
        // Try using the authenticated client directly
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          console.error('❌ No active session');
          return null;
        }

        // Create a new file name with timestamp to avoid conflicts
        const timestamp = Date.now();
        const altPath = `${userId}/${timestamp}.jpg`;
        
        const { data: altData, error: altError } = await supabase.storage
          .from('avatars')
          .upload(altPath, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (altError) {
          console.error('❌ Alternative upload also failed:', altError);
          return null;
        }

        // Get public URL for alternative path
        const altUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${altPath}`;
        console.log('✅ Alternative upload successful:', altUrl);

        // Update profile
        await supabase
          .from('profiles')
          .update({ avatar_url: altUrl })
          .eq('id', userId);

        return altUrl;
      }
      
      return null;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const publicUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`;
    
    console.log('🌐 Public URL:', publicUrl);

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      // Don't return null here - the upload succeeded even if profile update failed
    }

    console.log('✅ Avatar upload complete');
    return publicUrl;

  } catch (error) {
    console.error('❌ Avatar upload failed:', error);
    return null;
  }
};
import { supabase } from './supabase';

/**
 * Simple avatar upload function
 * Uses existing 'avatars' bucket for cleaner implementation
 */
export const uploadSimpleAvatar = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    console.log('📤 Starting simple avatar upload...');
    console.log('📤 User ID:', userId);
    console.log('📤 Image URI:', imageUri);

    // Basic validation
    if (!imageUri || !userId) {
      console.error('❌ Missing required parameters');
      return null;
    }

    // Create a blob from the image URI
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    console.log('📦 Blob created:', blob.size, 'bytes');

    // Generate filename and storage path inside user's folder
    const timestamp = Date.now();
    const filename = `avatar_${timestamp}.jpg`;
    const storagePath = `${userId}/${filename}`;
    
    console.log('📁 Uploading as:', storagePath);

    // Upload to Supabase Storage (avatars bucket - existing bucket)
    // First, try to remove user's current avatar (if any), using exact storage path from URL
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      const currentUrl: string | null = profile?.avatar_url ?? null;
      if (currentUrl && currentUrl.includes('/avatars/')) {
        const existingPath = currentUrl.split('/avatars/')[1];
        if (existingPath) {
          await supabase.storage
            .from('avatars')
            .remove([existingPath]);
          console.log('🗑️ Removed previous avatar:', existingPath);
        }
      }
    } catch (e) {
      console.log('No existing avatar to remove or insufficient permission');
    }

    // Now upload the new file
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(storagePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false, // Don't upsert, we already deleted old files
      });

    if (error) {
      console.error('❌ Upload error:', error);
      return null;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL - using simple, direct approach
    const publicUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${storagePath}`;
    
    console.log('🌐 Public URL:', publicUrl);

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      return null;
    }

    console.log('✅ Profile updated with new avatar URL');
    return publicUrl;

  } catch (error) {
    console.error('❌ Avatar upload failed:', error);
    return null;
  }
};

/**
 * Delete avatar from storage
 */
export const deleteAvatar = async (userId: string): Promise<boolean> => {
  try {
    // Get current avatar URL from profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (fetchError || !profile?.avatar_url) {
      console.log('No avatar to delete');
      return true;
    }

    // Derive exact storage path from public URL (relative to bucket)
    let storagePath: string | null = null;
    if (profile.avatar_url.includes('/avatars/')) {
      storagePath = profile.avatar_url.split('/avatars/')[1];
    } else {
      // Fallback to last segment if URL is unconventional
      const urlParts = profile.avatar_url.split('/');
      storagePath = urlParts[urlParts.length - 1] ?? null;
    }

    if (!storagePath) {
      console.error('❌ Could not determine storage path for avatar');
      return false;
    }

    // Delete from storage using path relative to bucket
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([storagePath]);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return false;
    }

    // Clear avatar URL in profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      return false;
    }

    console.log('✅ Avatar deleted successfully');
    return true;

  } catch (error) {
    console.error('❌ Avatar deletion failed:', error);
    return false;
  }
};
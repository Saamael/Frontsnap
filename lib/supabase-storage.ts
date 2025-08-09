import 'react-native-url-polyfill/auto';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface ImageUploadResult {
  fullUrl: string;
  thumbnailUrl: string;
}

export async function uploadImageAsync(uri: string): Promise<ImageUploadResult | null> {
  try {
    console.log('Starting dual-tier image processing and upload for URI:', uri);

    const timestamp = Date.now();
    const bucketName = 'photos';
    
    // 1. Create full-size image (2K resolution)
    const fullSizeResult = await manipulateAsync(
      uri,
      [{ resize: { width: 2048 } }], // 2K for high-quality detail views
      { compress: 0.8, format: SaveFormat.JPEG }
    );
    console.log('Full-size image processed (2K):', fullSizeResult);

    // 2. Create thumbnail (800px for fast loading)
    const thumbnailResult = await manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // 800px for fast discover page loading
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    console.log('Thumbnail processed (800px):', thumbnailResult);

    // 3. Convert both images to base64
    const [fullBase64, thumbnailBase64] = await Promise.all([
      FileSystem.readAsStringAsync(fullSizeResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      }),
      FileSystem.readAsStringAsync(thumbnailResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
    ]);
    console.log('Both images converted to base64');

    // 4. Define file paths
    const fullFileName = `full/${timestamp}.jpeg`;
    const thumbnailFileName = `thumbnails/${timestamp}.jpeg`;

    // 5. Upload both images in parallel
    const [fullUpload, thumbnailUpload] = await Promise.all([
      supabase.storage
        .from(bucketName)
        .upload(fullFileName, decode(fullBase64), {
          contentType: 'image/jpeg',
          upsert: false,
        }),
      supabase.storage
        .from(bucketName)
        .upload(thumbnailFileName, decode(thumbnailBase64), {
          contentType: 'image/jpeg',
          upsert: false,
        })
    ]);

    // 6. Check for upload errors
    if (fullUpload.error) {
      console.error('Error uploading full-size image:', fullUpload.error.message);
      return null;
    }

    if (thumbnailUpload.error) {
      console.error('Error uploading thumbnail:', thumbnailUpload.error.message);
      return null;
    }

    if (!fullUpload.data || !thumbnailUpload.data) {
      console.error('Upload successful, but no data returned from Supabase.');
      return null;
    }

    console.log('Both images uploaded successfully:', {
      full: fullUpload.data.path,
      thumbnail: thumbnailUpload.data.path
    });

    // 7. Get public URLs for both images
    const { data: fullUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fullUpload.data.path);

    const { data: thumbnailUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(thumbnailUpload.data.path);

    if (!fullUrlData || !thumbnailUrlData) {
      console.error('Could not get public URLs for uploaded images.');
      return null;
    }

    const result = {
      fullUrl: fullUrlData.publicUrl,
      thumbnailUrl: thumbnailUrlData.publicUrl
    };

    console.log('Public URLs retrieved:', result);
    return result;

  } catch (e) {
    if (e instanceof Error) {
      console.error('An unexpected error occurred in uploadImageAsync:', e.message);
    } else {
      console.error('An unexpected error occurred in uploadImageAsync:', e);
    }
    return null;
  }
}

// Legacy function for backward compatibility
export async function uploadImageAsyncLegacy(uri: string): Promise<string | null> {
  const result = await uploadImageAsync(uri);
  return result ? result.fullUrl : null;
}

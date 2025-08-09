import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

export interface ProcessedImage {
  base64: string;
  uri: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Convert a local image URI to base64 for API usage
 */
export async function convertImageToBase64(imageUri: string): Promise<string> {
  try {
    console.log('🔄 Converting image to base64:', imageUri);
    
    // First, optimize the image to reduce size
    const optimizedImage = await manipulateAsync(
      imageUri,
      [
        { resize: { width: 1024 } }, // Resize to max width of 1024px
      ],
      {
        compress: 0.8, // 80% quality
        format: SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!optimizedImage.base64) {
      throw new Error('Failed to convert image to base64');
    }

    console.log('✅ Image converted to base64:', {
      originalUri: imageUri,
      optimizedSize: `${optimizedImage.width}x${optimizedImage.height}`,
      base64Length: optimizedImage.base64.length,
    });

    return optimizedImage.base64;
  } catch (error) {
    console.error('❌ Error converting image to base64:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('out of memory')) {
        throw new Error('Image is too large to process. Please try a smaller image.');
      } else if (error.message.includes('invalid')) {
        throw new Error('Invalid image format. Please use JPG, PNG, or WebP images.');
      } else {
        throw new Error(`Image processing failed: ${error.message}`);
      }
    } else {
      throw new Error('Failed to process image. Please try again with a different image.');
    }
  }
}

/**
 * Get image info including file size
 */
export async function getImageInfo(imageUri: string): Promise<{
  width: number;
  height: number;
  size: number;
}> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    
    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }

    // Get image dimensions
    const imageInfo = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width: number, height: number) => resolve({ width, height }),
        (error: any) => reject(error)
      );
    });

    return {
      width: imageInfo.width,
      height: imageInfo.height,
      size: fileInfo.size || 0,
    };
  } catch (error) {
    console.error('Error getting image info:', error);
    throw error;
  }
}

/**
 * Process image for OpenAI analysis - converts to base64 and optimizes
 */
export async function processImageForAnalysis(imageUri: string): Promise<ProcessedImage> {
  try {
    console.log('🖼️ Processing image for analysis:', imageUri);
    
    // Get original image info
    const originalInfo = await getImageInfo(imageUri);
    console.log('📊 Original image info:', originalInfo);

    // Check if image is too large
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    let targetWidth = originalInfo.width;
    
    if (originalInfo.size > MAX_SIZE) {
      // Calculate resize ratio to keep under 5MB
      const ratio = Math.sqrt(MAX_SIZE / originalInfo.size);
      targetWidth = Math.floor(originalInfo.width * ratio);
      console.log('📏 Image too large, resizing to width:', targetWidth);
    }

    // Optimize image
    const optimizedImage = await manipulateAsync(
      imageUri,
      [
        { resize: { width: Math.min(targetWidth, 1024) } }, // Max 1024px width
      ],
      {
        compress: 0.8,
        format: SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!optimizedImage.base64) {
      throw new Error('Failed to optimize image');
    }

    const result: ProcessedImage = {
      base64: optimizedImage.base64,
      uri: optimizedImage.uri,
      width: optimizedImage.width || originalInfo.width,
      height: optimizedImage.height || originalInfo.height,
      size: optimizedImage.base64.length * 0.75, // Approximate size from base64
    };

    console.log('✅ Image processed for analysis:', {
      originalSize: `${originalInfo.width}x${originalInfo.height}`,
      optimizedSize: `${result.width}x${result.height}`,
      sizeReduction: `${(originalInfo.size / 1024).toFixed(1)}KB → ${(result.size / 1024).toFixed(1)}KB`,
    });

    return result;
  } catch (error) {
    console.error('❌ Error processing image:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('out of memory')) {
        throw new Error('Image is too large to process. Please try a smaller image or reduce image quality.');
      } else if (error.message.includes('does not exist')) {
        throw new Error('Image file not found. Please select another image.');
      } else if (error.message.includes('permission')) {
        throw new Error('Unable to access image file. Please check app permissions.');
      } else {
        throw new Error(`Image processing failed: ${error.message}`);
      }
    } else {
      throw new Error('Failed to process image. Please try again with a different image.');
    }
  }
}

/**
 * Validate image format and size
 */
export function validateImage(imageUri: string): boolean {
  try {
    // Check if it's a valid image URI
    if (!imageUri || typeof imageUri !== 'string') {
      return false;
    }

    // Check file extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExtension = validExtensions.some(ext => 
      imageUri.toLowerCase().includes(ext)
    );

    return hasValidExtension;
  } catch {
    return false;
  }
}
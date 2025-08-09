// OpenAI integration for photo analysis and review generation
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { processImageForAnalysis } from '@/utils/image-processing';

export interface StorefrontAnalysis {
  businessType: string;
  businessName?: string;
  description: string;
  features: string[];
  visualIndicators: string[];
  confidence: {
    businessType: number;
    visualFeatures: number;
    nameRecognition: number;
  };
  architecturalStyle: string;
  locationText?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface PlaceReview {
  summary: string;
  pros: string[];
  cons: string[];
  recommendations: string[];
  overallSentiment: 'positive' | 'neutral' | 'negative';
  popularTimes?: string;
  bestFor: string[];
}

// Analyze storefront photo using secure OpenAI API endpoint
export const analyzeStorefrontPhoto = async (
  imageUri: string, 
  locationText?: string
): Promise<StorefrontAnalysis> => {
  try {
    console.log('🤖 Starting OpenAI analysis for image:', imageUri);
    
    // Convert local file to base64 if needed
    let base64Image = imageUri;
    
    if (imageUri.startsWith('file://')) {
      console.log('📱 Processing local image file...');
      try {
        // First, resize image to 2K resolution for high-quality analysis
        const resizedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 2048 } }], // Resize to 2K (2048px) for optimal AI analysis
          { 
            compress: 0.8, 
            format: ImageManipulator.SaveFormat.JPEG 
          }
        );
        
        console.log('📱 Converting resized image to base64...');
        const base64 = await FileSystem.readAsStringAsync(resizedImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        base64Image = `data:image/jpeg;base64,${base64}`;
        console.log('✅ Successfully processed and converted image');
      } catch (conversionError) {
        console.error('❌ Failed to process image:', conversionError);
        throw new Error('Failed to process image file. Please try again.');
      }
    } else if (imageUri.startsWith('data:image/')) {
      // Already base64
      base64Image = imageUri;
      console.log('✅ Image already in base64 format');
    } else {
      // Assume it's a web URL
      base64Image = imageUri;
      console.log('✅ Using web URL for image');
    }

    console.log('🔗 Calling OpenAI API...');
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'analyze-storefront',
        imageUri: base64Image,
        locationText
      })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse error response:', parseError);
        throw new Error(`API request failed with status ${response.status}. Please check your internet connection and try again.`);
      }
      
      console.error('❌ OpenAI API error:', errorData);
      
      // Provide more specific error messages based on the error type
      if (errorData.status === 'CONFIGURATION_ERROR') {
        throw new Error('Image analysis is currently unavailable. Please contact support.');
      } else if (errorData.status === 'API_ERROR') {
        throw new Error('Unable to analyze image at this time. Please try again later.');
      } else {
        throw new Error(errorData.error || 'Failed to analyze storefront photo. Please try again.');
      }
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing storefront photo:', error);
    throw error;
  }
};

// Generate review summary using secure OpenAI API endpoint
export const generateReviewSummary = async (
  businessName: string,
  businessType: string,
  googleReviews: any[]
): Promise<PlaceReview> => {
  if (!googleReviews || googleReviews.length === 0) {
    throw new Error('Google reviews are required for generating summary');
  }

  try {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'generate-review',
        businessName,
        businessType,
        googleReviews
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate review summary');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating review summary:', error);
    throw error;
  }
};


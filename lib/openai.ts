// OpenAI integration for photo analysis and review generation

export interface StorefrontAnalysis {
  businessType: string;
  businessName?: string;
  description: string;
  features: string[];
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
  location?: { latitude: number; longitude: number }
): Promise<StorefrontAnalysis> => {
  try {
    // Convert image to base64 if needed
    let base64Image = imageUri;
    if (imageUri.startsWith('file://')) {
      throw new Error('Local file conversion not implemented. Please use a web URL for images');
    }

    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'analyze-storefront',
        imageUri: base64Image,
        location
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze storefront photo');
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


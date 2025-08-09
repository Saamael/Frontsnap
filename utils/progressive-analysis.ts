// Progressive image analysis system with confidence weighting

export interface QuickAnalysisResult {
  businessType: string;
  confidence: number;
  visualCues: string[];
  needsDetailedAnalysis: boolean;
  processingTime: number;
}

export interface DetailedAnalysisResult {
  businessType: string;
  businessName: string;
  description: string;
  features: string[];
  visualIndicators: string[];
  confidence: {
    businessType: number;
    visualFeatures: number;
    nameRecognition: number;
  };
  architecturalStyle: string;
  processingTime: number;
}

export interface CombinedAnalysisResult {
  businessType: string;
  businessName: string;
  description: string;
  features: string[];
  visualIndicators: string[];
  confidence: {
    businessType: number;
    visualFeatures: number;
    nameRecognition: number;
    overall: number;
  };
  architecturalStyle: string;
  analysisMethod: 'quick' | 'detailed' | 'combined';
  processingTime: number;
  locationText?: string;
}

// Quick business type detection using simple visual cues
export const performQuickAnalysis = async (
  imageUri: string
): Promise<QuickAnalysisResult> => {
  const startTime = Date.now();
  
  try {
    console.log('⚡ Starting quick analysis...');
    
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'quick-analysis',
        imageUri: imageUri
      })
    });

    if (!response.ok) {
      throw new Error(`Quick analysis failed: ${response.status}`);
    }

    const result = await response.json();
    const processingTime = Date.now() - startTime;
    
    console.log(`⚡ Quick analysis completed in ${processingTime}ms:`, {
      businessType: result.businessType,
      confidence: result.confidence
    });

    return {
      businessType: result.businessType || 'Unknown',
      confidence: result.confidence || 0,
      visualCues: result.visualCues || [],
      needsDetailedAnalysis: result.confidence < 75, // Need detailed if confidence < 75%
      processingTime
    };
  } catch (error) {
    console.error('⚡ Quick analysis failed:', error);
    return {
      businessType: 'Unknown',
      confidence: 0,
      visualCues: [],
      needsDetailedAnalysis: true,
      processingTime: Date.now() - startTime
    };
  }
};

// Combine quick and detailed analysis results
export const combineAnalysisResults = (
  quickResult: QuickAnalysisResult,
  detailedResult?: DetailedAnalysisResult
): CombinedAnalysisResult => {
  if (!detailedResult) {
    // Use only quick analysis
    return {
      businessType: quickResult.businessType,
      businessName: 'Unknown Business',
      description: `Quick analysis identified this as a ${quickResult.businessType.toLowerCase()}`,
      features: [],
      visualIndicators: quickResult.visualCues,
      confidence: {
        businessType: quickResult.confidence,
        visualFeatures: quickResult.confidence * 0.8, // Slightly lower for visual features
        nameRecognition: 0,
        overall: quickResult.confidence
      },
      architecturalStyle: 'Unknown',
      analysisMethod: 'quick',
      processingTime: quickResult.processingTime
    };
  }

  // Combine both analyses with weighted confidence
  const quickWeight = 0.3;
  const detailedWeight = 0.7;

  // Choose business type based on higher confidence
  const businessType = quickResult.confidence > detailedResult.confidence.businessType 
    ? quickResult.businessType 
    : detailedResult.businessType;

  // Combine confidence scores
  const combinedBusinessTypeConfidence = (
    quickResult.confidence * quickWeight +
    detailedResult.confidence.businessType * detailedWeight
  );

  const overallConfidence = (
    combinedBusinessTypeConfidence * 0.4 +
    detailedResult.confidence.visualFeatures * 0.4 +
    detailedResult.confidence.nameRecognition * 0.2
  );

  console.log('🔄 Combined analysis results:', {
    quickConfidence: quickResult.confidence,
    detailedConfidence: detailedResult.confidence.businessType,
    combinedConfidence: combinedBusinessTypeConfidence.toFixed(1),
    overallConfidence: overallConfidence.toFixed(1)
  });

  return {
    businessType,
    businessName: detailedResult.businessName,
    description: detailedResult.description,
    features: detailedResult.features,
    visualIndicators: [
      ...quickResult.visualCues,
      ...detailedResult.visualIndicators
    ].filter((item, index, arr) => arr.indexOf(item) === index), // Remove duplicates
    confidence: {
      businessType: combinedBusinessTypeConfidence,
      visualFeatures: detailedResult.confidence.visualFeatures,
      nameRecognition: detailedResult.confidence.nameRecognition,
      overall: overallConfidence
    },
    architecturalStyle: detailedResult.architecturalStyle,
    analysisMethod: 'combined',
    processingTime: quickResult.processingTime + detailedResult.processingTime
  };
};

// Main progressive analysis function
export const performProgressiveAnalysis = async (
  imageUri: string,
  locationText?: string
): Promise<CombinedAnalysisResult> => {
  const totalStartTime = Date.now();
  
  try {
    // Step 1: Quick analysis
    const quickResult = await performQuickAnalysis(imageUri);
    
    // Step 2: Decide if detailed analysis is needed
    if (!quickResult.needsDetailedAnalysis) {
      console.log('✅ Quick analysis sufficient - skipping detailed analysis');
      const result = combineAnalysisResults(quickResult);
      result.processingTime = Date.now() - totalStartTime;
      return result;
    }

    // Step 3: Perform detailed analysis
    console.log('🔍 Quick analysis insufficient - performing detailed analysis...');
    
    const detailedStartTime = Date.now();
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'analyze-storefront',
        imageUri: imageUri,
        locationText: locationText,
        quickAnalysisHint: {
          businessType: quickResult.businessType,
          confidence: quickResult.confidence,
          visualCues: quickResult.visualCues
        }
      })
    });

    if (!response.ok) {
      console.warn('Detailed analysis failed, using quick analysis only');
      const result = combineAnalysisResults(quickResult);
      result.processingTime = Date.now() - totalStartTime;
      return result;
    }

    const detailedData = await response.json();
    const detailedResult: DetailedAnalysisResult = {
      businessType: detailedData.businessType,
      businessName: detailedData.businessName || 'Unknown Business',
      description: detailedData.description || '',
      features: detailedData.features || [],
      visualIndicators: detailedData.visualIndicators || [],
      confidence: detailedData.confidence || {
        businessType: 50,
        visualFeatures: 50,
        nameRecognition: 0
      },
      architecturalStyle: detailedData.architecturalStyle || '',
      processingTime: Date.now() - detailedStartTime
    };

    // Step 4: Combine results
    const combinedResult = combineAnalysisResults(quickResult, detailedResult);
    combinedResult.processingTime = Date.now() - totalStartTime;
    combinedResult.locationText = locationText;

    console.log(`✅ Progressive analysis completed in ${combinedResult.processingTime}ms using ${combinedResult.analysisMethod} method`);
    
    return combinedResult;
  } catch (error) {
    console.error('Progressive analysis failed:', error);
    
    // Fallback to basic result
    return {
      businessType: 'Unknown',
      businessName: 'Unknown Business',
      description: 'Analysis failed',
      features: [],
      visualIndicators: [],
      confidence: {
        businessType: 0,
        visualFeatures: 0,
        nameRecognition: 0,
        overall: 0
      },
      architecturalStyle: 'Unknown',
      analysisMethod: 'quick',
      processingTime: Date.now() - totalStartTime,
      locationText
    };
  }
};

// Confidence threshold recommendations
export const getConfidenceThresholds = () => ({
  QUICK_ANALYSIS_SUFFICIENT: 75,  // Above this, skip detailed analysis
  AUTO_SELECT_THRESHOLD: 90,      // Above this, can auto-select place
  HIGH_CONFIDENCE: 80,            // High confidence match
  MEDIUM_CONFIDENCE: 60,          // Medium confidence match
  LOW_CONFIDENCE: 40              // Below this, show warning
});

// Analysis performance metrics
export const getAnalysisMetrics = (result: CombinedAnalysisResult) => ({
  efficiency: result.analysisMethod === 'quick' ? 100 : 
             result.analysisMethod === 'detailed' ? 50 : 75,
  confidence: result.confidence.overall,
  processingTime: result.processingTime,
  method: result.analysisMethod,
  recommendation: result.confidence.overall > 80 ? 'high_confidence' :
                 result.confidence.overall > 60 ? 'medium_confidence' :
                 result.confidence.overall > 40 ? 'low_confidence' : 'very_low_confidence'
});
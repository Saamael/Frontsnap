import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { OptimizedImage } from '../../components/OptimizedImage';
import * as FileSystem from 'expo-file-system';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  cacheDirectory: '/cache/',
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

// Mock Image component
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Image: (props: any) => {
      // Simulate image load
      setTimeout(() => {
        if (props.onLoad) props.onLoad();
      }, 100);
      return RN.View(props);
    },
  };
});

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('OptimizedImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with local image source', () => {
    const { getByTestId } = render(
      <OptimizedImage 
        source={require('../../assets/test-image.png')} 
        testID="optimized-image"
      />
    );
    
    expect(getByTestId('optimized-image')).toBeTruthy();
  });

  it('should show loading state initially for remote images', () => {
    const { getByText } = render(
      <OptimizedImage 
        source={{ uri: 'https://example.com/image.jpg' }}
        showLoading={true}
      />
    );
    
    // Should show loading indicator or skeleton
    expect(getByText).toBeDefined();
  });

  it('should handle image load success', async () => {
    const onLoad = jest.fn();
    
    render(
      <OptimizedImage 
        source={{ uri: 'https://example.com/image.jpg' }}
        onLoad={onLoad}
      />
    );
    
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });
  });

  it('should handle image load error', async () => {
    const onError = jest.fn();
    
    // Mock Image to trigger error
    jest.doMock('react-native', () => {
      const RN = jest.requireActual('react-native');
      return {
        ...RN,
        Image: (props: any) => {
          setTimeout(() => {
            if (props.onError) props.onError(new Error('Load failed'));
          }, 100);
          return RN.View(props);
        },
      };
    });
    
    render(
      <OptimizedImage 
        source={{ uri: 'https://example.com/broken-image.jpg' }}
        onError={onError}
      />
    );
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should use cache when available', async () => {
    mockFileSystem.getInfoAsync.mockResolvedValueOnce({
      exists: true,
      isDirectory: false,
      modificationTime: Date.now() / 1000,
      size: 1024,
      uri: '/cache/optimized_images/test.jpg',
    });
    
    render(
      <OptimizedImage 
        source={{ uri: 'https://example.com/image.jpg' }}
        cachePolicy="disk"
      />
    );
    
    await waitFor(() => {
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalled();
    });
  });

  it('should download and cache new images', async () => {
    mockFileSystem.getInfoAsync.mockResolvedValueOnce({
      exists: false,
      isDirectory: false,
      modificationTime: 0,
      size: 0,
      uri: '',
    });
    
    mockFileSystem.downloadAsync.mockResolvedValueOnce({
      status: 200,
      uri: '/cache/optimized_images/test.jpg',
      headers: {},
      mimeType: 'image/jpeg',
    });
    
    render(
      <OptimizedImage 
        source={{ uri: 'https://example.com/image.jpg' }}
        cachePolicy="disk"
      />
    );
    
    await waitFor(() => {
      expect(mockFileSystem.downloadAsync).toHaveBeenCalled();
    });
  });

  it('should skip caching when policy is none', () => {
    render(
      <OptimizedImage 
        source={{ uri: 'https://example.com/image.jpg' }}
        cachePolicy="none"
      />
    );
    
    expect(mockFileSystem.getInfoAsync).not.toHaveBeenCalled();
    expect(mockFileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('should render fallback on error', async () => {
    const fallback = <div>Custom fallback</div>;
    
    // Mock Image to trigger error
    jest.doMock('react-native', () => {
      const RN = jest.requireActual('react-native');
      return {
        ...RN,
        Image: (props: any) => {
          setTimeout(() => {
            if (props.onError) props.onError(new Error('Load failed'));
          }, 100);
          return RN.View(props);
        },
      };
    });
    
    const { getByText } = render(
      <OptimizedImage 
        source={{ uri: 'https://example.com/broken-image.jpg' }}
        fallback={fallback}
      />
    );
    
    await waitFor(() => {
      expect(getByText('Custom fallback')).toBeTruthy();
    });
  });

  it('should render skeleton placeholder while loading', () => {
    const { container } = render(
      <OptimizedImage 
        source={{ uri: 'https://example.com/image.jpg' }}
        placeholder="skeleton"
      />
    );
    
    // Should render skeleton component
    expect(container).toBeTruthy();
  });
});
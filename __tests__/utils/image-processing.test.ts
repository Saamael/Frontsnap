import * as ImageManipulator from 'expo-image-manipulator';
import { 
  compressImage,
  generateThumbnail,
  resizeImage,
  validateImageUri,
  getImageDimensions
} from '../../utils/image-processing';

jest.mock('expo-image-manipulator');

const mockImageManipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>;

describe('Image Processing Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compressImage', () => {
    it('should compress image with default settings', async () => {
      const mockResult = {
        uri: 'file://compressed/image.jpg',
        width: 800,
        height: 600,
      };

      mockImageManipulator.manipulateAsync.mockResolvedValue(mockResult);

      const result = await compressImage('file://original/image.jpg');

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original/image.jpg',
        [{ resize: { width: 800 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      expect(result).toEqual(mockResult);
    });

    it('should compress image with custom quality', async () => {
      const mockResult = {
        uri: 'file://compressed/image.jpg',
        width: 800,
        height: 600,
      };

      mockImageManipulator.manipulateAsync.mockResolvedValue(mockResult);

      await compressImage('file://original/image.jpg', 0.5);

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original/image.jpg',
        [{ resize: { width: 800 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
    });

    it('should handle compression errors', async () => {
      const error = new Error('Compression failed');
      mockImageManipulator.manipulateAsync.mockRejectedValue(error);

      await expect(compressImage('file://invalid/image.jpg')).rejects.toThrow('Compression failed');
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail with default size', async () => {
      const mockResult = {
        uri: 'file://thumbnail/image.jpg',
        width: 150,
        height: 150,
      };

      mockImageManipulator.manipulateAsync.mockResolvedValue(mockResult);

      const result = await generateThumbnail('file://original/image.jpg');

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original/image.jpg',
        [{ resize: { width: 150, height: 150 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      expect(result).toEqual(mockResult);
    });

    it('should generate thumbnail with custom size', async () => {
      const mockResult = {
        uri: 'file://thumbnail/image.jpg',
        width: 200,
        height: 200,
      };

      mockImageManipulator.manipulateAsync.mockResolvedValue(mockResult);

      await generateThumbnail('file://original/image.jpg', 200);

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original/image.jpg',
        [{ resize: { width: 200, height: 200 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
    });
  });

  describe('resizeImage', () => {
    it('should resize image to specified dimensions', async () => {
      const mockResult = {
        uri: 'file://resized/image.jpg',
        width: 400,
        height: 300,
      };

      mockImageManipulator.manipulateAsync.mockResolvedValue(mockResult);

      const result = await resizeImage('file://original/image.jpg', 400, 300);

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original/image.jpg',
        [{ resize: { width: 400, height: 300 } }],
        {
          compress: 1.0,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      expect(result).toEqual(mockResult);
    });

    it('should resize image with only width specified', async () => {
      const mockResult = {
        uri: 'file://resized/image.jpg',
        width: 500,
        height: 375,
      };

      mockImageManipulator.manipulateAsync.mockResolvedValue(mockResult);

      await resizeImage('file://original/image.jpg', 500);

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original/image.jpg',
        [{ resize: { width: 500 } }],
        {
          compress: 1.0,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
    });
  });

  describe('validateImageUri', () => {
    it('should validate valid image URIs', () => {
      expect(validateImageUri('file://image.jpg')).toBe(true);
      expect(validateImageUri('https://example.com/image.png')).toBe(true);
      expect(validateImageUri('http://example.com/image.jpeg')).toBe(true);
      expect(validateImageUri('file://path/to/image.webp')).toBe(true);
    });

    it('should reject invalid image URIs', () => {
      expect(validateImageUri('')).toBe(false);
      expect(validateImageUri('not-a-uri')).toBe(false);
      expect(validateImageUri('https://example.com/document.pdf')).toBe(false);
      expect(validateImageUri('file://document.txt')).toBe(false);
    });

    it('should handle null or undefined URIs', () => {
      expect(validateImageUri(null as any)).toBe(false);
      expect(validateImageUri(undefined as any)).toBe(false);
    });
  });

  describe('getImageDimensions', () => {
    it('should get image dimensions without modifying image', async () => {
      const mockResult = {
        uri: 'file://original/image.jpg',
        width: 1920,
        height: 1080,
      };

      mockImageManipulator.manipulateAsync.mockResolvedValue(mockResult);

      const result = await getImageDimensions('file://original/image.jpg');

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original/image.jpg',
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('should handle errors when getting dimensions', async () => {
      const error = new Error('Failed to get dimensions');
      mockImageManipulator.manipulateAsync.mockRejectedValue(error);

      await expect(getImageDimensions('file://invalid/image.jpg')).rejects.toThrow('Failed to get dimensions');
    });
  });
});
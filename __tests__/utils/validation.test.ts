import {
  validateEmail,
  validatePassword,
  validateName,
  validateSearchQuery,
  sanitizeText,
  validateRating,
  validateCoordinates,
  sanitizeInput,
} from '../../lib/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('test@example.com');
    });

    it('should reject invalid email formats', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid email address');
    });

    it('should trim and lowercase emails', () => {
      const result = validateEmail('  TEST@EXAMPLE.COM  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('test@example.com');
    });

    it('should reject emails with suspicious patterns', () => {
      const result = validateEmail('test..test@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should reject empty emails', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('StrongPass123');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('StrongPassword');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('strongpass123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('STRONGPASS123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Short1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('should reject common passwords', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too common');
    });
  });

  describe('validateName', () => {
    it('should validate normal names', () => {
      const result = validateName('John Doe');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('John Doe');
    });

    it('should accept names with hyphens and apostrophes', () => {
      const result = validateName("Mary-Jane O'Connor");
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe("Mary-Jane O'Connor");
    });

    it('should reject names with numbers', () => {
      const result = validateName('John123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('letters');
    });

    it('should reject very short names', () => {
      const result = validateName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('2 characters');
    });

    it('should trim whitespace', () => {
      const result = validateName('  John Doe  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('John Doe');
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate normal search queries', () => {
      const result = validateSearchQuery('coffee shop');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('coffee shop');  
    });

    it('should reject very short queries', () => {
      const result = validateSearchQuery('a');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('2 characters');
    });

    it('should sanitize dangerous patterns', () => {
      const result = validateSearchQuery('coffee<script>alert(1)</script>');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('coffeealert(1)');
    });

    it('should reject SQL injection attempts', () => {
      const result = validateSearchQuery('coffee DROP TABLE users');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid search query');
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeText('<p>Hello <b>world</b></p>');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Hello world');
    });

    it('should remove script tags', () => {
      const result = sanitizeText('Hello<script>alert(1)</script>world');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Helloworld');
    });

    it('should respect max length', () => {
      const longText = 'a'.repeat(1500);
      const result = sanitizeText(longText, 1000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject eval patterns', () => {
      const result = sanitizeText('Hello eval(something) world');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid content');
    });
  });

  describe('validateRating', () => {
    it('should validate ratings 1-5', () => {
      [1, 2, 3, 4, 5].forEach(rating => {
        const result = validateRating(rating);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(rating);
      });
    });

    it('should reject ratings outside 1-5', () => {
      [0, 6, -1, 10].forEach(rating => {
        const result = validateRating(rating);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('between 1 and 5');
      });
    });

    it('should reject decimal ratings', () => {
      const result = validateRating(3.5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('integer');
    });
  });

  describe('validateCoordinates', () => {
    it('should validate valid coordinates', () => {
      const result = validateCoordinates(37.7749, -122.4194);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toEqual({ lat: 37.7749, lng: -122.4194 });
    });

    it('should reject invalid latitude', () => {
      const result = validateCoordinates(91, -122.4194);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Latitude must be between -90 and 90');
    });

    it('should reject invalid longitude', () => {
      const result = validateCoordinates(37.7749, 181);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Longitude must be between -180 and 180');
    });

    it('should reject non-number inputs', () => {
      const result = validateCoordinates('37.7749' as any, -122.4194);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be numbers');
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML entities', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should respect max length', () => {
      const longInput = 'a'.repeat(1000);
      const result = sanitizeInput(longInput, 10);
      expect(result).toBe('aaaaaaaaaa');
    });

    it('should trim whitespace', () => {
      const result = sanitizeInput('  hello world  ');
      expect(result).toBe('hello world');
    });

    it('should handle non-string inputs', () => {
      const result = sanitizeInput(null as any);
      expect(result).toBe('');
    });
  });
});
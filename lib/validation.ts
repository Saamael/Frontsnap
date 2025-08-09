// Input validation and sanitization utilities

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const sanitizedEmail = email.trim().toLowerCase();
  
  if (!sanitizedEmail) {
    return { isValid: false, error: 'Email is required' };
  }
  
  // Basic email regex - more secure than complex ones
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitizedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  // Check for suspicious patterns
  if (sanitizedEmail.includes('..') || sanitizedEmail.includes('@@')) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  // Length check
  if (sanitizedEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedEmail };
};

// Password validation with stronger requirements
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  // Minimum 8 characters (increased from 6)
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  // Maximum length to prevent DoS
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long (maximum 128 characters)' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'abc123456', 'password123',
    'admin123', 'welcome123', 'letmein123', 'monkey123', '123456789'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: 'This password is too common. Please choose a stronger password' };
  }
  
  return { isValid: true, sanitizedValue: password };
};

// Name validation
export const validateName = (name: string): ValidationResult => {
  const sanitizedName = name.trim();
  
  if (!sanitizedName) {
    return { isValid: false, error: 'Name is required' };
  }
  
  // Length checks
  if (sanitizedName.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }
  
  if (sanitizedName.length > 50) {
    return { isValid: false, error: 'Name is too long (maximum 50 characters)' };
  }
  
  // Allow only letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(sanitizedName)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  // Prevent excessive spaces or special characters
  if (sanitizedName.includes('  ') || sanitizedName.includes('--') || sanitizedName.includes("''")) {
    return { isValid: false, error: 'Invalid name format' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedName };
};

// General text sanitization (for reviews, comments, etc.)
export const sanitizeText = (text: string, maxLength: number = 1000): ValidationResult => {
  const sanitizedText = text.trim();
  
  if (!sanitizedText) {
    return { isValid: false, error: 'Text cannot be empty' };
  }
  
  if (sanitizedText.length > maxLength) {
    return { isValid: false, error: `Text is too long (maximum ${maxLength} characters)` };
  }
  
  // Remove potentially dangerous HTML/script tags
  const cleanText = sanitizedText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '');
  
  // Check for suspicious patterns
  if (cleanText.includes('eval(') || cleanText.includes('Function(')) {
    return { isValid: false, error: 'Invalid content detected' };
  }
  
  return { isValid: true, sanitizedValue: cleanText };
};

// URL validation (for image URLs, etc.)
export const validateUrl = (url: string): ValidationResult => {
  const sanitizedUrl = url.trim();
  
  if (!sanitizedUrl) {
    return { isValid: false, error: 'URL is required' };
  }
  
  try {
    const urlObj = new URL(sanitizedUrl);
    
    // Only allow HTTPS URLs for security
    if (urlObj.protocol !== 'https:') {
      return { isValid: false, error: 'Only HTTPS URLs are allowed' };
    }
    
    // Block local/private network URLs
    if (urlObj.hostname === 'localhost' || 
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('172.') ||
        urlObj.hostname === '127.0.0.1') {
      return { isValid: false, error: 'Local URLs are not allowed' };
    }
    
    return { isValid: true, sanitizedValue: sanitizedUrl };
  } catch (error) {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

// Rating validation (1-5 stars)
export const validateRating = (rating: number): ValidationResult => {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return { isValid: false, error: 'Rating must be an integer between 1 and 5' };
  }
  
  return { isValid: true, sanitizedValue: rating };
};

// Coordinate validation
export const validateCoordinates = (lat: number, lng: number): ValidationResult => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { isValid: false, error: 'Coordinates must be numbers' };
  }
  
  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90' };
  }
  
  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180' };
  }
  
  return { isValid: true, sanitizedValue: { lat, lng } };
};

// Comprehensive form validation
export const validateSignupForm = (data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  
  const nameValidation = validateName(data.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error!;
  }
  
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }
  
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  }
  
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateLoginForm = (data: {
  email: string;
  password: string;
}): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }
  
  if (!data.password.trim()) {
    errors.password = 'Password is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Search query validation
export const validateSearchQuery = (query: string): ValidationResult => {
  const sanitizedQuery = query.trim();
  
  if (!sanitizedQuery) {
    return { isValid: false, error: 'Search query cannot be empty' };
  }
  
  if (sanitizedQuery.length < 2) {
    return { isValid: false, error: 'Search query must be at least 2 characters' };
  }
  
  if (sanitizedQuery.length > 100) {
    return { isValid: false, error: 'Search query is too long (maximum 100 characters)' };
  }
  
  // Remove potentially dangerous patterns
  const cleanQuery = sanitizedQuery
    .replace(/[<>\"'&]/g, '') // Remove HTML/SQL injection characters
    .replace(/javascript:/gi, '')
    .replace(/script/gi, '');
  
  // Check for remaining suspicious patterns
  if (cleanQuery.includes('DROP') || cleanQuery.includes('DELETE') || cleanQuery.includes('UPDATE')) {
    return { isValid: false, error: 'Invalid search query' };
  }
  
  return { isValid: true, sanitizedValue: cleanQuery };
};

// Review validation
export const validateReview = (data: {
  rating: number;
  comment: string;
}): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  
  const ratingValidation = validateRating(data.rating);
  if (!ratingValidation.isValid) {
    errors.rating = ratingValidation.error!;
  }
  
  const commentValidation = sanitizeText(data.comment, 500);
  if (!commentValidation.isValid) {
    errors.comment = commentValidation.error!;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Phone number validation (optional)
export const validatePhoneNumber = (phone: string): ValidationResult => {
  const sanitizedPhone = phone.trim().replace(/\D/g, ''); // Remove non-digits
  
  if (!sanitizedPhone) {
    return { isValid: true, sanitizedValue: '' }; // Phone is optional
  }
  
  // Basic international phone number validation
  if (sanitizedPhone.length < 10 || sanitizedPhone.length > 15) {
    return { isValid: false, error: 'Phone number must be between 10-15 digits' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedPhone };
};

// Collection name validation
export const validateCollectionName = (name: string): ValidationResult => {
  const sanitizedName = name.trim();
  
  if (!sanitizedName) {
    return { isValid: false, error: 'Collection name is required' };
  }
  
  if (sanitizedName.length < 3) {
    return { isValid: false, error: 'Collection name must be at least 3 characters' };
  }
  
  if (sanitizedName.length > 50) {
    return { isValid: false, error: 'Collection name is too long (maximum 50 characters)' };
  }
  
  // Allow letters, numbers, spaces, and common punctuation
  const nameRegex = /^[a-zA-Z0-9\s\-_'.!?]+$/;
  if (!nameRegex.test(sanitizedName)) {
    return { isValid: false, error: 'Collection name contains invalid characters' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedName };
};

// Generic input sanitizer for preventing XSS
export const sanitizeInput = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"'&]/g, (match) => {
      const htmlEntities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return htmlEntities[match] || match;
    });
};

// Batch validation utility
export const validateFields = (
  fields: { [key: string]: any },
  validators: { [key: string]: (value: any) => ValidationResult }
): { isValid: boolean; errors: { [key: string]: string }; sanitizedData: { [key: string]: any } } => {
  const errors: { [key: string]: string } = {};
  const sanitizedData: { [key: string]: any } = {};
  
  Object.keys(fields).forEach(field => {
    if (validators[field]) {
      const result = validators[field](fields[field]);
      if (!result.isValid) {
        errors[field] = result.error!;
      } else {
        sanitizedData[field] = result.sanitizedValue !== undefined ? result.sanitizedValue : fields[field];
      }
    } else {
      sanitizedData[field] = fields[field];
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
};
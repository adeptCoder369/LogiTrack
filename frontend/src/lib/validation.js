// Import useState for the hook
import { useState } from 'react';
/**
 * Validation utilities for LogiTrack Pro
 */

// Validation patterns
export const PATTERNS = {
  mobile: /^[6-9]\d{9}$/,  // Indian mobile: starts with 6-9, 10 digits
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  pincode: /^[1-9][0-9]{5}$/,
  aadhaar: /^[2-9]{1}[0-9]{11}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  vehicleNumber: /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/,
};

// Validation functions
export const validators = {
  // Required field
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  },

  // Mobile number (10 digits, starts with 6-9)
  mobile: (value, fieldName = 'Mobile number') => {
    if (!value) return null; // Let required handle empty
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      return `${fieldName} must be exactly 10 digits`;
    }
    if (!PATTERNS.mobile.test(cleaned)) {
      return `${fieldName} must start with 6, 7, 8, or 9`;
    }
    return null;
  },

  // Email
  email: (value, fieldName = 'Email') => {
    if (!value) return null;
    if (!PATTERNS.email.test(value)) {
      return `Please enter a valid ${fieldName.toLowerCase()}`;
    }
    return null;
  },

  // GST Number (15 characters)
  gst: (value, fieldName = 'GST number') => {
    if (!value) return null;
    const cleaned = value.toUpperCase().replace(/\s/g, '');
    if (cleaned.length !== 15) {
      return `${fieldName} must be exactly 15 characters`;
    }
    if (!PATTERNS.gst.test(cleaned)) {
      return `Please enter a valid ${fieldName}`;
    }
    return null;
  },

  // PAN Number (10 characters)
  pan: (value, fieldName = 'PAN number') => {
    if (!value) return null;
    const cleaned = value.toUpperCase().replace(/\s/g, '');
    if (cleaned.length !== 10) {
      return `${fieldName} must be exactly 10 characters`;
    }
    if (!PATTERNS.pan.test(cleaned)) {
      return `Please enter a valid ${fieldName} (e.g., ABCDE1234F)`;
    }
    return null;
  },

  // Pin Code (6 digits)
  pincode: (value, fieldName = 'Pin code') => {
    if (!value) return null;
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      return `${fieldName} must be exactly 6 digits`;
    }
    if (!PATTERNS.pincode.test(cleaned)) {
      return `Please enter a valid ${fieldName}`;
    }
    return null;
  },

  // Aadhaar Number (12 digits)
  aadhaar: (value, fieldName = 'Aadhaar number') => {
    if (!value) return null;
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length !== 12) {
      return `${fieldName} must be exactly 12 digits`;
    }
    if (!PATTERNS.aadhaar.test(cleaned)) {
      return `Please enter a valid ${fieldName}`;
    }
    return null;
  },

  // IFSC Code
  ifsc: (value, fieldName = 'IFSC code') => {
    if (!value) return null;
    const cleaned = value.toUpperCase().replace(/\s/g, '');
    if (cleaned.length !== 11) {
      return `${fieldName} must be exactly 11 characters`;
    }
    if (!PATTERNS.ifsc.test(cleaned)) {
      return `Please enter a valid ${fieldName}`;
    }
    return null;
  },

  // Vehicle Number
  vehicleNumber: (value, fieldName = 'Vehicle number') => {
    if (!value) return null;
    const cleaned = value.toUpperCase().replace(/\s/g, '');
    if (cleaned.length < 6 || cleaned.length > 12) {
      return `${fieldName} must be between 6-12 characters`;
    }
    // Basic format check - allow various Indian formats
    if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(cleaned)) {
      return `Please enter a valid ${fieldName} (e.g., MH12AB1234)`;
    }
    return null;
  },

  // Positive number
  positiveNumber: (value, fieldName = 'Value') => {
    if (!value && value !== 0) return null;
    const num = parseFloat(value);
    if (isNaN(num)) {
      return `${fieldName} must be a valid number`;
    }
    if (num < 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  },

  // Min length
  minLength: (min) => (value, fieldName = 'Field') => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  // Max length
  maxLength: (max) => (value, fieldName = 'Field') => {
    if (!value) return null;
    if (value.length > max) {
      return `${fieldName} must not exceed ${max} characters`;
    }
    return null;
  },

  // Password strength
  password: (value, fieldName = 'Password') => {
    if (!value) return null;
    if (value.length < 6) {
      return `${fieldName} must be at least 6 characters`;
    }
    return null;
  },

  // Confirm password
  confirmPassword: (password) => (value, fieldName = 'Confirm password') => {
    if (!value) return null;
    if (value !== password) {
      return 'Passwords do not match';
    }
    return null;
  },

  // Date (not in future)
  dateNotFuture: (value, fieldName = 'Date') => {
    if (!value) return null;
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (inputDate > today) {
      return `${fieldName} cannot be in the future`;
    }
    return null;
  },

  // Quantity (positive, reasonable range)
  quantity: (value, fieldName = 'Quantity') => {
    if (!value && value !== 0) return null;
    const num = parseFloat(value);
    if (isNaN(num)) {
      return `${fieldName} must be a valid number`;
    }
    if (num <= 0) {
      return `${fieldName} must be greater than 0`;
    }
    if (num > 100000) {
      return `${fieldName} seems too high. Please verify.`;
    }
    return null;
  },

  // Bank account number
  bankAccount: (value, fieldName = 'Account number') => {
    if (!value) return null;
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 9 || cleaned.length > 18) {
      return `${fieldName} must be between 9-18 digits`;
    }
    return null;
  },
};

/**
 * Validate a form object against a validation schema
 * @param {Object} data - Form data to validate
 * @param {Object} schema - Validation schema { fieldName: [validator1, validator2, ...] }
 * @returns {Object} - { isValid: boolean, errors: { fieldName: errorMessage } }
 */
export const validateForm = (data, schema) => {
  const errors = {};
  
  for (const [fieldName, validatorList] of Object.entries(schema)) {
    const value = data[fieldName];
    const fieldLabel = fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    for (const validator of validatorList) {
      const error = typeof validator === 'function' 
        ? validator(value, fieldLabel)
        : null;
      
      if (error) {
        errors[fieldName] = error;
        break; // Stop at first error for this field
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Format input values as user types
 */
export const formatters = {
  mobile: (value) => value.replace(/\D/g, '').slice(0, 10),
  pincode: (value) => value.replace(/\D/g, '').slice(0, 6),
  aadhaar: (value) => value.replace(/\D/g, '').slice(0, 12),
  pan: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
  gst: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15),
  ifsc: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11),
  vehicleNumber: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
  number: (value) => value.replace(/[^0-9.]/g, ''),
  uppercase: (value) => value.toUpperCase(),
  
  /**
   * Format vehicle number for display with spaces
   * Input: "JH05EE7265" -> Output: "JH 05 EE 7265"
   * Handles various Indian vehicle number formats
   */
  vehicleNumberDisplay: (value) => {
    if (!value) return '';
    // Remove existing spaces and convert to uppercase
    const cleaned = value.toUpperCase().replace(/\s/g, '');
    
    // Try to match Indian vehicle number pattern
    // Format: [State 2 letters][District 1-2 digits][Series 0-3 letters][Number 1-4 digits]
    const match = cleaned.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/);
    
    if (match) {
      const [, state, district, series, number] = match;
      // Pad district with leading zero if single digit
      const paddedDistrict = district.padStart(2, '0');
      // Build formatted string
      if (series) {
        return `${state} ${paddedDistrict} ${series} ${number}`;
      } else {
        return `${state} ${paddedDistrict} ${number}`;
      }
    }
    
    // Fallback: just add spaces every 2-4 characters for readability
    return cleaned.replace(/(.{2})(.{2})(.+)/, '$1 $2 $3');
  },
};

/**
 * Hook for form validation
 */
export const useFormValidation = (initialErrors = {}) => {
  const [errors, setErrors] = useState(initialErrors);
  
  const validateField = (fieldName, value, validatorList, fieldLabel) => {
    for (const validator of validatorList) {
      const error = validator(value, fieldLabel);
      if (error) {
        setErrors(prev => ({ ...prev, [fieldName]: error }));
        return false;
      }
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    return true;
  };
  
  const clearError = (fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };
  
  const clearAllErrors = () => setErrors({});
  
  return { errors, setErrors, validateField, clearError, clearAllErrors };
};

export default validators;

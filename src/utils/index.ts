import * as Keychain from 'react-native-keychain';
import { AuthorizeResult } from 'react-native-app-auth';

export const getItem = async (key: string): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials && typeof credentials === 'object' && 'password' in credentials) {
      if (key === 'accessToken') {
        return credentials.password;
      }
    }
    // For refreshToken, we'll use a separate keychain entry
    if (key === 'refreshToken') {
      const refreshCredentials = await Keychain.getInternetCredentials('refreshToken');
      if (refreshCredentials && refreshCredentials.password) {
        return refreshCredentials.password;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting item from keychain:', error);
    return null;
  }
};

export const setItem = async (key: string, value: string): Promise<void> => {
  try {
    if (key === 'accessToken') {
      await Keychain.setGenericPassword(key, value);
    } else if (key === 'refreshToken') {
      await Keychain.setInternetCredentials('refreshToken', 'refreshToken', value);
    }
  } catch (error) {
    console.error('Error setting item in keychain:', error);
  }
};

export const removeItem = async (key: string): Promise<void> => {
  try {
    if (key === 'accessToken') {
      await Keychain.resetGenericPassword();
    } else if (key === 'refreshToken') {
      await Keychain.resetInternetCredentials('refreshToken');
    }
  } catch (error) {
    console.error('Error removing item from keychain:', error);
  }
};

export const getAccessToken = async (): Promise<AuthorizeResult | null> => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials && typeof credentials === 'object' && 'password' in credentials) {
      const token = credentials.password;
      console.log('Token retrieved from Keychain:', token);
      return {
        accessToken: token,
        accessTokenExpirationDate: '',
        refreshToken: '',
        idToken: '',
        tokenType: 'Bearer',
        scopes: [],
        authorizationCode: '',
      };
    } else {
      console.log('No credentials stored');
      return null;
    }
  } catch (error) {
    console.log("Keychain couldn't be accessed!", error);
    return null;
  }
};

/**
 * Base64 URL decode (for JWT)
 */
const base64UrlDecode = (str: string): string => {
  try {
    // Replace URL-safe characters and add padding if needed
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Use atob if available (React Native 0.60+)
    if (typeof atob !== 'undefined') {
      return atob(base64);
    }
    
    // Fallback for older React Native versions
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
    
    throw new Error('No base64 decoder available');
  } catch (error) {
    console.error('Base64 decode error:', error);
    throw error;
  }
};

/**
 * Decode JWT token to extract payload information
 */
export const decodeJWT = (token: string): { exp?: number; iat?: number; [key: string]: any } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT format: expected 3 parts, got', parts.length);
      return null;
    }
    const payload = parts[1];
    const decodedStr = base64UrlDecode(payload);
    const decoded = JSON.parse(decodedStr);
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Get token expiration info
 */
export const getTokenExpirationInfo = (token: string | null): {
  isExpired: boolean;
  expiresAt: number | null;
  expiresIn: number | null;
  remainingSeconds: number | null;
} => {
  if (!token) {
    return {
      isExpired: true,
      expiresAt: null,
      expiresIn: null,
      remainingSeconds: null,
    };
  }

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return {
      isExpired: false,
      expiresAt: null,
      expiresIn: null,
      remainingSeconds: null,
    };
  }

  const expiresAt = decoded.exp;
  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = expiresAt - now;
  const isExpired = remainingSeconds <= 0;

  return {
    isExpired,
    expiresAt,
    expiresIn: decoded.exp - (decoded.iat || decoded.exp),
    remainingSeconds,
  };
};


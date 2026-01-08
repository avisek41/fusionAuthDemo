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
    }
  } catch (error) {
    console.error('Error setting item in keychain:', error);
  }
};

export const removeItem = async (key: string): Promise<void> => {
  try {
    if (key === 'accessToken') {
      await Keychain.resetGenericPassword();
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


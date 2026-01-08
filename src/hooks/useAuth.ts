import { useCallback } from 'react';
import { Alert, AppState } from 'react-native';
import {
  authorize,
  AuthorizeResult,
  revoke,
  BaseAuthConfiguration,
} from 'react-native-app-auth';
import { configs } from '../../config';
import { setItem, removeItem, getAccessToken } from '../utils';
import { useAppDispatch } from '../redux/hooks';
import { setCredentials, logIn, logOut } from '../features';
import { useLazyGetUserInfoQuery } from '../services/userApi';


export const useAuth = () => {
  const dispatch = useAppDispatch();
  const [getUserInfo] = useLazyGetUserInfoQuery();

  const handleAuthorize = useCallback(async (): Promise<AuthorizeResult | null> => {
    try {
      if (AppState.currentState !== 'active') {
        console.warn('App is not in foreground, waiting...');
        return null;
      }

      console.log('Starting authorization with config:', configs.fusionauth);
      const newAuthState = await authorize(configs.fusionauth);

      console.log('Full auth state:', JSON.stringify(newAuthState, null, 2));
      console.log('Token:', newAuthState.accessToken);
      console.log('Authorization successful:', {
        hasAccessToken: !!newAuthState.accessToken,
        accessTokenLength: newAuthState.accessToken?.length,
        accessTokenPreview: newAuthState.accessToken?.substring(0, 20),
        expirationDate: newAuthState.accessTokenExpirationDate,
        hasIdToken: !!newAuthState.idToken,
      });

      if (!newAuthState.accessToken || newAuthState.accessToken.length === 0) {
        console.error('No access token received from OAuth flow!');
        Alert.alert(
          'Login Error',
          'No access token received. Please check your FusionAuth configuration.',
        );
        return null;
      }

      try {
        await setItem('accessToken', newAuthState.accessToken);
        console.log('Token stored in Keychain successfully');
        
        // Store refreshToken if available
        if (newAuthState.refreshToken) {
          await setItem('refreshToken', newAuthState.refreshToken);
          console.log('Refresh token stored in Keychain successfully');
        }
      } catch (keychainError) {
        console.error('Failed to store token in Keychain:', keychainError);
        Alert.alert('Warning', 'Token received but could not be stored securely.');
      }

      dispatch(setCredentials({ 
        token: newAuthState.accessToken,
        refreshToken: newAuthState.refreshToken || undefined,
      }));
      dispatch(logIn());
      console.log('Auth state updated in Redux');

      return newAuthState;
    } catch (error) {
      console.error('Authorization error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Unknown error occurred';

      if (AppState.currentState === 'active') {
        Alert.alert('Failed to log in', errorMessage);
      }
      return null;
    }
  }, [dispatch]);

  const handleLogout = useCallback(async () => {
    try {
      console.log('Starting logout process...');

      const token = await getAccessToken();
      if (token?.accessToken && configs.fusionauth.serviceConfiguration) {
        try {
          const baseConfig: BaseAuthConfiguration = {
            serviceConfiguration: configs.fusionauth.serviceConfiguration,
            clientId: configs.fusionauth.clientId,
          } as BaseAuthConfiguration;

          await revoke(baseConfig, {
            tokenToRevoke: token.accessToken,
            sendClientId: true,
          });
          console.log('Token revoked with FusionAuth');
        } catch (revokeError) {
          console.warn('Failed to revoke token (this is okay):', revokeError);
        }
      }

      try {
        await removeItem('accessToken');
        await removeItem('refreshToken');
        console.log('Keychain cleared');

        const verify = await getAccessToken();
        if (verify) {
          console.warn('Keychain still has data after reset, trying again...');
          await removeItem('accessToken');
          await removeItem('refreshToken');
        }
      } catch (keychainError) {
        console.warn('Keychain clear error (continuing anyway):', keychainError);
        try {
          await removeItem('accessToken');
          await removeItem('refreshToken');
        } catch (e) {
          console.error('Second keychain clear attempt failed:', e);
        }
      }

      dispatch(logOut());
      console.log('Logout completed successfully - state cleared');
    } catch (error) {
      console.error('Logout error:', error);
      dispatch(logOut());
      try {
        await removeItem('accessToken');
        await removeItem('refreshToken');
      } catch (e) {
        console.error('Emergency keychain clear failed:', e);
      }
    }
  }, [dispatch]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const result = await getUserInfo().unwrap();
      return result;
    } catch (error) {
      console.error('Error fetching user info:', error);
      Alert.alert('Error', 'Failed to fetch user information');
      return null;
    }
  }, [getUserInfo]);

  const initializeAuth = useCallback(async () => {
    const authState = await getAccessToken();
    if (authState?.accessToken) {
      dispatch(setCredentials({ token: authState.accessToken }));
      dispatch(logIn());
    }
    return authState;
  }, [dispatch]);

  return {
    handleAuthorize,
    handleLogout,
    fetchUserInfo,
    initializeAuth,
  };
};


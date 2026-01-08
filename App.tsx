/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {
  Alert,
  AppState,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  authorize,
  AuthorizeResult,
  revoke,
  BaseAuthConfiguration,
} from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';
import {configs} from './config';

interface UserInfo {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [authState, setAuthState] = useState<AuthorizeResult | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Check for existing credentials on app start
    getAccessToken();
  }, []);

  const getAccessToken = async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && typeof credentials === 'object' && 'password' in credentials) {
        const token = credentials.password;
        console.log('Token retrieved from Keychain:', token);
        // Verify token is still valid by checking expiration
        // For now, we'll just set it - in production, check expiration
        setAuthState({
          accessToken: token,
          accessTokenExpirationDate: '',
          refreshToken: '',
          idToken: '',
          tokenType: 'Bearer',
          scopes: [],
          authorizationCode: '',
        });
      } else {
        console.log('No credentials stored');
      }
    } catch (error) {
      console.log("Keychain couldn't be accessed!", error);
    }
  };

  const handleAuthorize = async () => {
    try {
      // Check if app is in foreground before starting OAuth
      if (AppState.currentState !== 'active') {
        console.warn('App is not in foreground, waiting...');
        return;
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

      // Check if we actually got a token
      if (!newAuthState.accessToken || newAuthState.accessToken.length === 0) {
        console.error('No access token received from OAuth flow!');
        Alert.alert(
          'Login Error',
          'No access token received. Please check your FusionAuth configuration.',
        );
        return;
      }

      // Store token in Keychain
      try {
        await Keychain.setGenericPassword(
          'accessToken',
          newAuthState.accessToken,
        );
        console.log('Token stored in Keychain successfully');
      } catch (keychainError) {
        console.error('Failed to store token in Keychain:', keychainError);
        Alert.alert('Warning', 'Token received but could not be stored securely.');
      }

      // Update state after storing in Keychain
      setAuthState(newAuthState);
      console.log('Auth state updated in component');
    } catch (error) {
      console.error('Authorization error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Unknown error occurred';
      
      // Only show alert if app is in foreground
      if (AppState.currentState === 'active') {
        Alert.alert('Failed to log in', errorMessage);
      }
    }
  };

  const getUser = async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && typeof credentials === 'object' && 'password' in credentials) {
        const token = credentials.password;
        console.log('Token:', token);
        
        // Use the token endpoint URL to construct the userinfo endpoint
        const tokenEndpoint = configs.fusionauth.serviceConfiguration?.tokenEndpoint;
        const userInfoUrl = tokenEndpoint
          ? tokenEndpoint.replace('/oauth2/token', '/oauth2/userinfo')
          : 'http://localhost:9011/oauth2/userinfo';
        
        fetch(userInfoUrl, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
          },
        })
          .then(response => response.json())
          .then(json => {
            console.log("user info", json);
            setUserInfo(json);
          })
          .catch(error => {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch user information');
          });
      } else {
        Alert.alert('Error', 'No access token found');
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Failed to retrieve access token');
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      
      // Try to revoke the token with FusionAuth if we have one
      if (authState?.accessToken && configs.fusionauth.serviceConfiguration) {
        try {
          const baseConfig: BaseAuthConfiguration = {
            serviceConfiguration: configs.fusionauth.serviceConfiguration,
            clientId: configs.fusionauth.clientId,
          } as BaseAuthConfiguration;
          
          await revoke(baseConfig, {
            tokenToRevoke: authState.accessToken,
            sendClientId: true,
          });
          console.log('Token revoked with FusionAuth');
        } catch (revokeError) {
          console.warn('Failed to revoke token (this is okay):', revokeError);
          // Continue with logout even if revocation fails
        }
      }

      // Clear Keychain - try multiple times to ensure it's cleared
      try {
        const cleared = await Keychain.resetGenericPassword();
        console.log('Keychain cleared:', cleared);
        
        // Verify it's actually cleared
        const verify = await Keychain.getGenericPassword();
        if (verify) {
          console.warn('Keychain still has data after reset, trying again...');
          await Keychain.resetGenericPassword();
        }
      } catch (keychainError) {
        console.warn('Keychain clear error (continuing anyway):', keychainError);
        // Try one more time
        try {
          await Keychain.resetGenericPassword();
        } catch (e) {
          console.error('Second keychain clear attempt failed:', e);
        }
      }

      // Clear all state FIRST before any async operations complete
      setAuthState(null);
      setUserInfo(null);
      
      console.log('Logout completed successfully - state cleared');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear the local state
      setAuthState(null);
      setUserInfo(null);
      try {
        await Keychain.resetGenericPassword();
      } catch (e) {
        console.error('Emergency keychain clear failed:', e);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <Text style={styles.headerText}>FusionAuth OAuth Demo</Text>
      </View>
      <View style={styles.content}>
        {authState?.accessToken ? (
          <View style={styles.userInfoContainer}>
            <View style={styles.tokenInfo}>
              <Text style={styles.label}>Access Token:</Text>
              <Text style={styles.value} numberOfLines={2}>
                {authState.accessToken && authState.accessToken.length > 0
                  ? `${authState.accessToken.substring(0, 50)}...`
                  : 'No token available'}
              </Text>
              <Text style={styles.label}>Token Length: {authState.accessToken?.length || 0}</Text>
              {authState.accessTokenExpirationDate ? (
                <>
                  <Text style={styles.label}>Expiration:</Text>
                  <Text style={styles.value}>
                    {authState.accessTokenExpirationDate}
                  </Text>
                </>
              ) : (
                <Text style={styles.label}>Expiration: Not set</Text>
              )}
            </View>

            {userInfo ? (
              <View style={styles.userDetails}>
                <Text style={styles.sectionTitle}>User Information</Text>
                {userInfo.sub && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>User ID:</Text>
                    <Text style={styles.value}>{userInfo.sub}</Text>
                  </View>
                )}
                {userInfo.email && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{userInfo.email}</Text>
                  </View>
                )}
                {userInfo.given_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Given Name:</Text>
                    <Text style={styles.value}>{userInfo.given_name}</Text>
                  </View>
                )}
                {userInfo.family_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Family Name:</Text>
                    <Text style={styles.value}>{userInfo.family_name}</Text>
                  </View>
                )}
                {userInfo.picture && (
                  <Image
                    source={{uri: userInfo.picture}}
                    style={styles.userImage}
                    testID="userImage"
                  />
                )}
                <Pressable
                  onPress={handleLogout}
                  style={({pressed}) => [
                    styles.button,
                    styles.logoutButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                  testID="logoutButton">
                  <Text style={styles.buttonText}>Logout</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.buttonContainer}>
                <Pressable
                  onPress={() => getUser()}
                  style={({pressed}) => [
                    styles.button,
                    pressed ? styles.buttonPressed : null,
                  ]}
                  testID="getUserButton">
                  <Text style={styles.buttonText}>Get User Info</Text>
                </Pressable>
                <Pressable
                  onPress={handleLogout}
                  style={({pressed}) => [
                    styles.button,
                    styles.logoutButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                  testID="logoutButton">
                  <Text style={styles.buttonText}>Logout</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.loginContainer}>
            <Text style={styles.welcomeText}>
              Welcome to FusionAuth OAuth Demo
            </Text>
            <Pressable
              onPress={() => handleAuthorize()}
              style={({pressed}) => [
                styles.button,
                styles.loginButton,
                pressed ? styles.buttonPressed : null,
              ]}
              testID="loginButton">
              <Text style={styles.buttonText}>Login with FusionAuth</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loginContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  userInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tokenInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userDetails: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 10,
    minWidth: 100,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  userImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 15,
    alignSelf: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    minWidth: 200,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;

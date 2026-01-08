import {Platform} from 'react-native';
import {AuthConfiguration} from 'react-native-app-auth';

// For Android emulator: use 10.0.2.2 to access host machine's localhost
// For Android physical device: use your computer's IP address (e.g., 192.168.2.79)
// For iOS simulator: use localhost
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Use 10.0.2.2 for Android emulator, or your computer's IP for physical device
    return 'http://10.0.2.2:9011'; // Change to your computer's IP if using physical device
  }
  return 'http://localhost:9011'; // iOS simulator
};

const baseUrl = getBaseUrl();

export const configs: {fusionauth: AuthConfiguration} = {
  fusionauth: {
    // Use serviceConfiguration to specify endpoints directly
    // This allows us to connect via 10.0.2.2 for Android emulator
    serviceConfiguration: {
      authorizationEndpoint: `${baseUrl}/oauth2/authorize`,
      tokenEndpoint: `${baseUrl}/oauth2/token`,
      revocationEndpoint: `${baseUrl}/oauth2/revoke`,
    },
    clientId: '31055b18-2156-4230-8a21-a91672319525',
    clientSecret: 'L-6Mrv3VkWJ-jd51XX5aFikVsiFtg5Uy-QuWFbxL2so',
    redirectUrl: 'fusionauth.demo:/oauthredirect',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    dangerouslyAllowInsecureHttpRequests: true,
    // Force login prompt to always show login screen (not use cached session)
    additionalParameters: {
      prompt: 'login',
    },
  },
};


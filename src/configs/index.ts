import {Platform} from 'react-native';

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

export const BASE_URL = getBaseUrl();


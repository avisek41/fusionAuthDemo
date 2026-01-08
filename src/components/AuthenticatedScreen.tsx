import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { AuthorizeResult } from 'react-native-app-auth';
import { TokenInfo } from './TokenInfo';
import { UserDetails } from './UserDetails';
import { useAuth } from '../hooks';
import { UserInfo } from '../services/userApi';

interface AuthenticatedScreenProps {
  authState: AuthorizeResult | null;
  onLogout: () => Promise<void>;
}

export const AuthenticatedScreen = ({
  authState,
  onLogout,
}: AuthenticatedScreenProps) => {
  const { fetchUserInfo } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const handleGetUserInfo = async () => {
    const info = await fetchUserInfo();
    if (info) {
      setUserInfo(info);
    }
  };

  return (
    <View style={styles.userInfoContainer} testID="authenticatedScreen">
      <TokenInfo authState={authState} />
      {userInfo ? (
        <UserDetails userInfo={userInfo} onLogout={onLogout} />
      ) : (
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleGetUserInfo}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
            testID="getUserButton">
            <Text style={styles.buttonText}>Get User Info</Text>
          </Pressable>
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [
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
  );
};

const styles = StyleSheet.create({
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


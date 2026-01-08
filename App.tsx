/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { AuthorizeResult } from 'react-native-app-auth';
import { useAuth } from './src/hooks';
import { useAppSelector } from './src/redux/hooks';
import { selectCurrentToken } from './src/features';
import { LoginScreen, AuthenticatedScreen } from './src/components';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [authState, setAuthState] = useState<AuthorizeResult | null>(null);
  const token = useAppSelector(selectCurrentToken);
  const { initializeAuth, handleAuthorize, handleLogout } = useAuth();

  useEffect(() => {
    const init = async () => {
      const state = await initializeAuth();
      setAuthState(state);
    };
    init();
  }, [initializeAuth]);

  useEffect(() => {
    if (!token) {
      setAuthState(null);
    }
  }, [token]);

  const onAuthorize = async () => {
    const newAuthState = await handleAuthorize();
    if (newAuthState) {
      setAuthState(newAuthState);
    }
  };

  const onLogout = async () => {
    await handleLogout();
    setAuthState(null);
  };

  return (
    <SafeAreaView style={styles.container} testID="appContainer">
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <Text style={styles.headerText}>FusionAuth OAuth Demo</Text>
      </View>
      <View style={styles.content}>
        {authState?.accessToken || token ? (
          <AuthenticatedScreen authState={authState} onLogout={onLogout} />
        ) : (
          <LoginScreen onAuthorize={onAuthorize} />
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
});

export default App;

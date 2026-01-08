import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

interface LoginScreenProps {
  onAuthorize: () => Promise<void>;
}

export const LoginScreen = ({ onAuthorize }: LoginScreenProps) => {
  return (
    <View style={styles.loginContainer} testID="loginContainer">
      <Text style={styles.welcomeText}>
        Welcome to FusionAuth OAuth Demo
      </Text>
      <Pressable
        onPress={onAuthorize}
        style={({ pressed }) => [
          styles.button,
          styles.loginButton,
          pressed ? styles.buttonPressed : null,
        ]}
        testID="loginButton">
        <Text style={styles.buttonText}>Login with FusionAuth</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  loginContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
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
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


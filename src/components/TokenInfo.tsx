import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthorizeResult } from 'react-native-app-auth';

interface TokenInfoProps {
  authState: AuthorizeResult | null;
}

export const TokenInfo = ({ authState }: TokenInfoProps) => {
  if (!authState?.accessToken) {
    return null;
  }

  return (
    <View style={styles.tokenInfo} testID="tokenInfo">
      <Text style={styles.label}>Access Token:</Text>
      <Text style={styles.value} numberOfLines={2}>
        {authState.accessToken && authState.accessToken.length > 0
          ? `${authState.accessToken.substring(0, 50)}...`
          : 'No token available'}
      </Text>
      <Text style={styles.label}>
        Token Length: {authState.accessToken?.length || 0}
      </Text>
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
  );
};

const styles = StyleSheet.create({
  tokenInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 10,
    minWidth: 100,
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginBottom: 10,
  },
});


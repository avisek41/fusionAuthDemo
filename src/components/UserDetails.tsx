import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { UserInfo } from '../services/userApi';

interface UserDetailsProps {
  userInfo: UserInfo;
  onLogout: () => Promise<void>;
}

export const UserDetails = ({ userInfo, onLogout }: UserDetailsProps) => {

  return (
    <View style={styles.userDetails} testID="userDetails">
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
          source={{ uri: userInfo.picture }}
          style={styles.userImage}
          testID="userImage"
        />
      )}
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
  );
};

const styles = StyleSheet.create({
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


import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const [walletAddress, setWalletAddress] = useState<string>('Not connected');
  const [coords, setCoords] = useState<string>('Not captured');
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    setLoading(true);
    try {
      const authResult = await transact(async (wallet) => {
        return wallet.authorize({
          chain: 'solana:devnet',
          identity: {
            name: 'Root-Chain',
            uri: 'https://root-chain.local',
            icon: 'favicon.ico',
          },
        });
      });

      const address = authResult.accounts[0]?.address;
      setWalletAddress(address ?? 'Unknown');
    } catch (error) {
      Alert.alert('Wallet connection failed', `${error}`);
    } finally {
      setLoading(false);
    }
  };

  const registerFarm = async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Location access is required to register farm.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const value = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      setCoords(value);

      // Placeholder for on-chain registration transaction.
      Alert.alert('Farm registered', `Captured coordinates: ${value}`);
    } catch (error) {
      Alert.alert('Registration failed', `${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#d1fae5', dark: '#064e3b' }}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Field App</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">1. Connect Wallet</ThemedText>
        <ThemedText>Use Solana Mobile Stack to connect Phantom or Solflare.</ThemedText>
        <Pressable onPress={connectWallet} disabled={loading} style={styles.primaryButton}>
          <ThemedText style={styles.buttonText}>{loading ? 'Processing...' : 'Connect Wallet'}</ThemedText>
        </Pressable>
        <ThemedText>Wallet: {walletAddress}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">2. Register Farm</ThemedText>
        <ThemedText>Capture your live GPS coordinates to initialize your farm account.</ThemedText>
        <Pressable onPress={registerFarm} disabled={loading} style={styles.secondaryButton}>
          <ThemedText style={styles.buttonText}>{loading ? 'Processing...' : 'Register Farm'}</ThemedText>
        </Pressable>
        <ThemedText>Coordinates: {coords}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">3. Optional Proof of Land</ThemedText>
        <ThemedText>
          Camera capture and metadata hashing can be added to upload proof artifacts next.
        </ThemedText>
      </ThemedView>

      <View style={styles.bottomSpacer} />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    gap: 4,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  primaryButton: {
    backgroundColor: '#047857',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  secondaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 20,
  },
});

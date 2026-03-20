import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  Connection,
  Ed25519Program,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(
  process.env.EXPO_PUBLIC_PROGRAM_ID ?? '8qJjY3qeJc9cTGw3GRW7xVfN32B2j3YkM3p6N5cm6QkM',
);
const RPC_URL =
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const AI_ENGINE_URL =
  process.env.EXPO_PUBLIC_AI_ENGINE_URL ?? 'http://10.0.2.2:8000';
const TOKEN_2022_PROGRAM_ID = new PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe8bXY',
);

const REGISTER_FARM_DISCRIMINATOR = hexToBytes('b734c8baf55bd8f6');
const MINT_CARBON_DISCRIMINATOR = hexToBytes('a77b75af7933820f');

const IDENTITY = {
  name: 'Root-Chain',
  uri: 'https://root-chain.local',
  icon: 'favicon.ico',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function u32Le(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

function u64Le(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, value, true);
  return out;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function deriveFarmPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('farm'), owner.toBytes()],
    PROGRAM_ID,
  )[0];
}

function deriveMintAuthorityPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('mint-authority')],
    PROGRAM_ID,
  )[0];
}

function deriveAta(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBytes(), TOKEN_2022_PROGRAM_ID.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

function buildRegisterFarmIx(
  owner: PublicKey,
  farmPda: PublicKey,
  areaGeojson: string,
): TransactionInstruction {
  const areaBytes = new TextEncoder().encode(areaGeojson);
  const data = concatBytes(
    REGISTER_FARM_DISCRIMINATOR,
    u32Le(areaBytes.length),
    areaBytes,
  );
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: farmPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

function buildCreateAtaIdempotentIx(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]), // 1 = idempotent variant
  });
}

function buildMintCarbonCreditsIx(
  owner: PublicKey,
  farmPda: PublicKey,
  co2Mint: PublicKey,
  ownerTokenAccount: PublicKey,
  mintAuthority: PublicKey,
  amount: bigint,
  slotNumber: bigint,
  signature64: Uint8Array,
): TransactionInstruction {
  const data = concatBytes(
    MINT_CARBON_DISCRIMINATOR,
    u64Le(amount),
    u64Le(slotNumber),
    signature64,
  );
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: farmPda, isSigner: false, isWritable: true },
      { pubkey: co2Mint, isSigner: false, isWritable: true },
      { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mintAuthority, isSigner: false, isWritable: false },
      {
        pubkey: new PublicKey('Sysvar1nstructions1111111111111111111111111'),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [registerTx, setRegisterTx] = useState<string | null>(null);
  const [claimTx, setClaimTx] = useState<string | null>(null);
  const [claimAmount, setClaimAmount] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const connection = new Connection(RPC_URL, 'confirmed');

  const connectWallet = async () => {
    setRegisterLoading(true);
    try {
      const authResult = await transact(async (wallet) => {
        return wallet.authorize({ chain: 'solana:devnet', identity: IDENTITY });
      });
      const address = authResult.accounts[0]?.address ?? '';
      setWalletAddress(address);
      setStatusMsg('Wallet connected.');
    } catch (error) {
      Alert.alert('Wallet connection failed', `${error}`);
    } finally {
      setRegisterLoading(false);
    }
  };

  const registerFarm = async () => {
    if (!walletAddress) {
      Alert.alert('Connect wallet first');
      return;
    }

    setRegisterLoading(true);
    setRegisterTx(null);
    setStatusMsg('Capturing GPS coordinates...');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Location access is required to register farm.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setCoords({ lat, lng });

      const areaGeojson = JSON.stringify({ type: 'Point', coordinates: [lng, lat] });
      const owner = new PublicKey(walletAddress);
      const farmPda = deriveFarmPda(owner);

      setStatusMsg('Submitting register_farm transaction...');

      const sig = await transact(async (wallet) => {
        const auth = await wallet.authorize({ chain: 'solana:devnet', identity: IDENTITY });
        const ownerPk = new PublicKey(auth.accounts[0].address);
        const pda = deriveFarmPda(ownerPk);

        const tx = new Transaction();
        tx.add(buildRegisterFarmIx(ownerPk, pda, areaGeojson));

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = ownerPk;

        const [txSig] = await wallet.signAndSendTransactions({ transactions: [tx] });
        return txSig;
      });

      await connection.confirmTransaction(sig as string, 'confirmed');
      setRegisterTx(sig as string);
      setStatusMsg(`Farm registered at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (error) {
      Alert.alert('Registration failed', `${error}`);
      setStatusMsg('Registration failed.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const claimCredits = async () => {
    if (!walletAddress) {
      Alert.alert('Connect wallet first');
      return;
    }

    const co2MintEnv = process.env.EXPO_PUBLIC_CO2_MINT;
    if (!co2MintEnv) {
      Alert.alert('Config missing', 'Set EXPO_PUBLIC_CO2_MINT in your .env file.');
      return;
    }

    setClaimLoading(true);
    setClaimTx(null);
    setStatusMsg('Requesting AI oracle verification...');

    try {
      const owner = new PublicKey(walletAddress);
      const farmPda = deriveFarmPda(owner);
      const co2Mint = new PublicKey(co2MintEnv);
      const slot = await connection.getSlot('confirmed');

      const oracleRes = await fetch(`${AI_ENGINE_URL}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_pda: farmPda.toBase58(),
          coordinates: coords ?? { lat: 12.9716, lng: 77.5946 },
          satellite_provider_api_key: 'demo-key',
          slot_number: slot,
        }),
      });

      if (!oracleRes.ok) throw new Error(`AI engine error: ${oracleRes.status}`);
      const payload = await oracleRes.json();

      const messageBytes = hexToBytes(payload.message_hex);
      const signatureBytes = hexToBytes(payload.signature_hex);
      const oraclePubkey = new PublicKey(payload.oracle_pubkey);
      const ownerTokenAccount = deriveAta(owner, co2Mint);
      const mintAuthority = deriveMintAuthorityPda();

      setStatusMsg('Submitting mint transaction...');

      const sig = await transact(async (wallet) => {
        const auth = await wallet.authorize({ chain: 'solana:devnet', identity: IDENTITY });
        const ownerPk = new PublicKey(auth.accounts[0].address);
        const pda = deriveFarmPda(ownerPk);
        const ata = deriveAta(ownerPk, co2Mint);

        const tx = new Transaction();

        // Create ATA if needed
        const ataInfo = await connection.getAccountInfo(ata, 'confirmed');
        if (!ataInfo) {
          tx.add(buildCreateAtaIdempotentIx(ownerPk, ata, ownerPk, co2Mint));
        }

        // Ed25519 verify instruction
        tx.add(
          Ed25519Program.createInstructionWithPublicKey({
            publicKey: oraclePubkey.toBytes(),
            message: messageBytes,
            signature: signatureBytes,
          }),
        );

        // Mint instruction
        tx.add(
          buildMintCarbonCreditsIx(
            ownerPk,
            pda,
            co2Mint,
            ata,
            mintAuthority,
            BigInt(payload.amount_carbon),
            BigInt(payload.slot_number),
            signatureBytes,
          ),
        );

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = ownerPk;

        const [txSig] = await wallet.signAndSendTransactions({ transactions: [tx] });
        return txSig;
      });

      await connection.confirmTransaction(sig as string, 'confirmed');
      setClaimTx(sig as string);
      setClaimAmount(payload.amount_carbon);
      setStatusMsg(`Minted ${payload.amount_carbon} CO2 tokens.`);
    } catch (error) {
      Alert.alert('Claim failed', `${error}`);
      setStatusMsg('Claim failed.');
    } finally {
      setClaimLoading(false);
    }
  };

  const isLoading = registerLoading || claimLoading;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Root-Chain Field App</Text>
        <Text style={styles.subtitle}>Solana Carbon Credit Protocol</Text>
      </View>

      {/* Step 1: Connect Wallet */}
      <View style={styles.card}>
        <Text style={styles.stepTitle}>1. Connect Wallet</Text>
        <Text style={styles.description}>Use Solana Mobile Stack to connect Phantom or Solflare.</Text>
        <Pressable onPress={connectWallet} disabled={isLoading} style={styles.primaryButton}>
          <Text style={styles.buttonText}>
            {registerLoading && !coords ? 'Connecting...' : 'Connect Wallet'}
          </Text>
        </Pressable>
        {walletAddress ? (
          <Text style={styles.monospace}>
            {walletAddress.slice(0, 8)}…{walletAddress.slice(-8)}
          </Text>
        ) : (
          <Text style={styles.muted}>Not connected</Text>
        )}
      </View>

      {/* Step 2: Register Farm */}
      <View style={styles.card}>
        <Text style={styles.stepTitle}>2. Register Farm On-Chain</Text>
        <Text style={styles.description}>
          Captures live GPS coordinates and submits a register_farm transaction to Solana.
        </Text>
        <Pressable onPress={registerFarm} disabled={isLoading} style={styles.secondaryButton}>
          <Text style={styles.buttonText}>
            {registerLoading && coords === null ? 'Registering...' : 'Register Farm'}
          </Text>
        </Pressable>
        {coords && (
          <Text style={styles.monospace}>
            GPS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </Text>
        )}
        {registerTx && (
          <View style={styles.txBox}>
            <Text style={styles.txLabel}>Tx confirmed</Text>
            <Text style={styles.txValue} numberOfLines={1}>
              {registerTx.slice(0, 20)}…
            </Text>
          </View>
        )}
      </View>

      {/* Step 3: Claim Credits */}
      <View style={styles.card}>
        <Text style={styles.stepTitle}>3. Claim Carbon Credits</Text>
        <Text style={styles.description}>
          Calls AI oracle for biomass verification then mints CO2 tokens to your wallet.
        </Text>
        <Pressable onPress={claimCredits} disabled={isLoading} style={styles.accentButton}>
          <Text style={styles.buttonText}>{claimLoading ? 'Claiming...' : 'Claim Credits'}</Text>
        </Pressable>
        {claimAmount !== null && (
          <Text style={styles.successText}>Minted: {claimAmount} CO2 tokens</Text>
        )}
        {claimTx && (
          <View style={styles.txBox}>
            <Text style={styles.txLabel}>Mint tx confirmed</Text>
            <Text style={styles.txValue} numberOfLines={1}>
              {claimTx.slice(0, 20)}…
            </Text>
          </View>
        )}
      </View>

      {/* Status bar */}
      {statusMsg ? (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>
      ) : null}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6ee7b7',
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 19,
  },
  primaryButton: {
    backgroundColor: '#047857',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  secondaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  accentButton: {
    backgroundColor: '#0e7490',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#64748b',
  },
  muted: {
    fontSize: 12,
    color: '#475569',
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6ee7b7',
  },
  txBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  txLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#38bdf8',
  },
  statusBar: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statusText: {
    fontSize: 13,
    color: '#cbd5e1',
  },
});

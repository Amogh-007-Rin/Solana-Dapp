import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";

// ─── Farm Account Types ────────────────────────────────────────────────────

export interface FarmAccountData {
  owner: PublicKey;
  areaGeojson: string;
  lastMintTimestamp: bigint;
  totalCarbonSequestered: bigint;
  amountCarbon: bigint;
  lastUpdate: bigint;
  isActive: boolean;
  bump: number;
}

/**
 * Fetch and deserialise a FarmAccount from the chain.
 * Layout (after 8-byte discriminator):
 *   32  owner Pubkey
 *    4  geojson string length (u32 LE)
 *   ??  geojson bytes
 *    8  last_mint_timestamp (i64 LE)
 *    8  total_carbon_sequestered (u64 LE)
 *    8  amount_carbon (u64 LE)
 *    8  last_update (i64 LE)
 *    1  is_active (bool)
 *    1  bump
 */
export async function fetchFarmAccount(
  connection: Connection,
  farmPda: PublicKey,
): Promise<FarmAccountData | null> {
  const info = await connection.getAccountInfo(farmPda, "confirmed");
  if (!info || info.data.length < 8) return null;

  const raw = info.data;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  let offset = 8; // skip discriminator

  const owner = new PublicKey(raw.slice(offset, offset + 32));
  offset += 32;

  const geojsonLen = view.getUint32(offset, true);
  offset += 4;

  const areaGeojson = new TextDecoder().decode(raw.slice(offset, offset + geojsonLen));
  offset += geojsonLen;

  const lastMintTimestamp = view.getBigInt64(offset, true);
  offset += 8;

  const totalCarbonSequestered = view.getBigUint64(offset, true);
  offset += 8;

  const amountCarbon = view.getBigUint64(offset, true);
  offset += 8;

  const lastUpdate = view.getBigInt64(offset, true);
  offset += 8;

  const isActive = raw[offset] !== 0;
  offset += 1;

  const bump = raw[offset];

  return { owner, areaGeojson, lastMintTimestamp, totalCarbonSequestered, amountCarbon, lastUpdate, isActive, bump };
}

// ─── Instruction Discriminators ───────────────────────────────────────────

const REGISTER_FARM_DISCRIMINATOR = hexToBytes("b734c8baf55bd8f6");
const MINT_CARBON_DISCRIMINATOR = hexToBytes("a77b75af7933820f");
const RETIRE_CREDITS_DISCRIMINATOR = hexToBytes("00df6a01e452aa2d");

export function deriveFarmPda(owner: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([new TextEncoder().encode("farm"), owner.toBytes()], programId)[0];
}

export function deriveMintAuthorityPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([new TextEncoder().encode("mint-authority")], programId)[0];
}

export function deriveOwnerToken2022Ata(owner: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
}

export function buildCreateOwnerTokenAtaIx(owner: PublicKey, mint: PublicKey): TransactionInstruction {
  const ata = deriveOwnerToken2022Ata(owner, mint);
  return createAssociatedTokenAccountIdempotentInstruction(
    owner,
    ata,
    owner,
    mint,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export function buildRegisterFarmIx(params: {
  programId: PublicKey;
  owner: PublicKey;
  farmPda: PublicKey;
  areaGeojson: string;
}): TransactionInstruction {
  const areaBytes = new TextEncoder().encode(params.areaGeojson);
  const data = concatBytes(REGISTER_FARM_DISCRIMINATOR, u32Le(areaBytes.length), areaBytes);

  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: true },
      { pubkey: params.farmPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function buildMintCarbonCreditsIx(params: {
  programId: PublicKey;
  owner: PublicKey;
  farmPda: PublicKey;
  co2Mint: PublicKey;
  ownerTokenAccount: PublicKey;
  mintAuthority: PublicKey;
  amount: bigint;
  slotNumber: bigint;
  signature64: Uint8Array;
}): TransactionInstruction {
  const data = concatBytes(
    MINT_CARBON_DISCRIMINATOR,
    u64Le(params.amount),
    u64Le(params.slotNumber),
    fixed64(params.signature64),
  );

  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: true },
      { pubkey: params.farmPda, isSigner: false, isWritable: true },
      { pubkey: params.co2Mint, isSigner: false, isWritable: true },
      { pubkey: params.ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: params.mintAuthority, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function buildRetireCreditsIx(params: {
  programId: PublicKey;
  owner: PublicKey;
  farmPda: PublicKey;
  co2Mint: PublicKey;
  ownerTokenAccount: PublicKey;
  amount: bigint;
}): TransactionInstruction {
  const data = concatBytes(RETIRE_CREDITS_DISCRIMINATOR, u64Le(params.amount));

  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: true },
      { pubkey: params.farmPda, isSigner: false, isWritable: true },
      { pubkey: params.co2Mint, isSigner: false, isWritable: true },
      { pubkey: params.ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) {
    throw new Error("Hex string length must be even.");
  }

  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function fixed64(bytes: Uint8Array): Uint8Array {
  if (bytes.length !== 64) {
    throw new Error("Expected 64-byte signature.");
  }
  return bytes;
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
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);

  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }

  return out;
}

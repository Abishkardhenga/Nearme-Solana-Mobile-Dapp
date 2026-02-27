import {Connection, Keypair, PublicKey, SystemProgram, Transaction} from "@solana/web3.js";
import {AnchorProvider, Program, web3} from "@project-serum/anchor";
import {readFileSync} from "fs";
import * as path from "path";

// Devnet RPC endpoint
const DEVNET_RPC = "https://api.devnet.solana.com";

// Program ID - must match the deployed program on Devnet
// This will be updated after initial deployment
export const PROGRAM_ID = new PublicKey("6bLHpe5CJxL9F7mXSq2VVNiNHQv2ZNGBtVXWxvfg9PDB");

/**
 * Load server keypair from environment or file
 * In production, store the private key in Firebase Functions environment config:
 * firebase functions:config:set solana.private_key="[1,2,3,...]"
 */
export function loadServerKeypair(): Keypair {
  // Try to load from environment first (production)
  const envKey = process.env.SOLANA_PRIVATE_KEY;
  if (envKey) {
    const secretKey = Uint8Array.from(JSON.parse(envKey));
    return Keypair.fromSecretKey(secretKey);
  }

  // Fallback to file for local development
  const keypairPath = path.join(process.env.HOME || "", ".config/solana/id.json");
  try {
    const secretKeyString = readFileSync(keypairPath, "utf8");
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error(
      "Server keypair not found. Set SOLANA_PRIVATE_KEY env var or ensure ~/.config/solana/id.json exists"
    );
  }
}

/**
 * Get Solana connection
 */
export function getConnection(): Connection {
  return new Connection(DEVNET_RPC, "confirmed");
}

/**
 * Get Anchor provider with server keypair
 */
export function getProvider(): AnchorProvider {
  const connection = getConnection();
  const wallet = {
    publicKey: loadServerKeypair().publicKey,
    signTransaction: async (tx: Transaction) => {
      tx.partialSign(loadServerKeypair());
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      txs.forEach((tx) => tx.partialSign(loadServerKeypair()));
      return txs;
    },
  };

  return new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
}

/**
 * Get the Anchor program instance
 * Note: IDL should be imported from the generated types
 */
export async function getProgram(): Promise<Program> {
  const provider = getProvider();

  // IDL will be loaded from the deployed program or imported from generated files
  // For now, we'll construct it manually based on our program structure
  const idl = {
    version: "0.1.0",
    name: "nearme_contract",
    instructions: [
      {
        name: "createLocationProof",
        accounts: [
          {name: "proof", isMut: true, isSigner: false},
          {name: "payer", isMut: true, isSigner: true},
          {name: "systemProgram", isMut: false, isSigner: false},
        ],
        args: [
          {name: "lat", type: "i64"},
          {name: "lng", type: "i64"},
          {name: "merchantId", type: "string"},
        ],
      },
      {
        name: "closeLocationProof",
        accounts: [
          {name: "proof", isMut: true, isSigner: false},
          {name: "authority", isMut: true, isSigner: true},
        ],
        args: [],
      },
    ],
    accounts: [
      {
        name: "LocationProof",
        type: {
          kind: "struct",
          fields: [
            {name: "lat", type: "i64"},
            {name: "lng", type: "i64"},
            {name: "verifiedAt", type: "i64"},
            {name: "bump", type: "u8"},
          ],
        },
      },
    ],
    events: [
      {
        name: "LocationVerifiedEvent",
        fields: [
          {name: "lat", type: "i64"},
          {name: "lng", type: "i64"},
          {name: "timestamp", type: "i64"},
        ],
      },
    ],
  };

  return new Program(idl as any, PROGRAM_ID, provider);
}

/**
 * Derive PDA for location proof
 * @param merchantId Firebase merchant document ID
 */
export async function getLocationProofPDA(merchantId: string): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from("proof"), Buffer.from(merchantId)],
    PROGRAM_ID
  );
}

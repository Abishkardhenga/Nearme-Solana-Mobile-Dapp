import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {transact} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {Buffer} from "buffer";
import * as borsh from "borsh";

// Program ID from your deployed contract
const PROGRAM_ID = new PublicKey("CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd");

// Treasury wallet that receives registration fees
const TREASURY_WALLET = new PublicKey("6dP9shzmifUZbyiRopa3HjcD8T31EFDM7y4zhFP8UsTV");

// Registration fee in lamports (0.01 SOL = 10,000,000 lamports)
export const REGISTRATION_FEE_LAMPORTS = 10_000_000;
export const REGISTRATION_FEE_SOL = 0.01;

// RPC endpoints (with fallback)
const RPC_ENDPOINTS = [
  "https://api.devnet.solana.com",
  "https://devnet.helius-rpc.com/?api-key=public", // Fallback 1
  "https://rpc.ankr.com/solana_devnet", // Fallback 2
];
const RPC_ENDPOINT = RPC_ENDPOINTS[0];

interface RegisterMerchantParams {
  merchantWalletPubkey: PublicKey;
  merchantId: string;
  businessName: string;
  latitude: number;
  longitude: number;
}

/**
 * Find the PDA (Program Derived Address) for a merchant account
 */
export async function findMerchantAccountPDA(
  merchantWalletPubkey: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merchant"), merchantWalletPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Create the instruction data for register_merchant
 */
function createRegisterMerchantInstructionData(
  merchantId: string,
  businessName: string,
  lat: number,
  lng: number
): Buffer {
  // Convert lat/lng to integer format (multiply by 1,000,000)
  const latInt = Math.round(lat * 1_000_000);
  const lngInt = Math.round(lng * 1_000_000);

  // Instruction discriminator (first 8 bytes) - computed from "global:register_merchant"
  // For Anchor, this is the first 8 bytes of SHA256("global:register_merchant")
  const discriminator = Buffer.from([0x2e, 0x3f, 0x91, 0x7f, 0x4f, 0x9c, 0x8a, 0x1f]);

  // Serialize the data
  const merchantIdBuffer = Buffer.from(merchantId, "utf8");
  const businessNameBuffer = Buffer.from(businessName, "utf8");

  // Create data buffer
  const dataLayout = Buffer.alloc(
    8 + // discriminator
      4 +
      merchantIdBuffer.length + // merchant_id length + data
      4 +
      businessNameBuffer.length + // business_name length + data
      8 + // lat (i64)
      8 // lng (i64)
  );

  let offset = 0;

  // Write discriminator
  discriminator.copy(dataLayout, offset);
  offset += 8;

  // Write merchant_id (string: u32 length + bytes)
  dataLayout.writeUInt32LE(merchantIdBuffer.length, offset);
  offset += 4;
  merchantIdBuffer.copy(dataLayout, offset);
  offset += merchantIdBuffer.length;

  // Write business_name (string: u32 length + bytes)
  dataLayout.writeUInt32LE(businessNameBuffer.length, offset);
  offset += 4;
  businessNameBuffer.copy(dataLayout, offset);
  offset += businessNameBuffer.length;

  // Write lat (i64)
  dataLayout.writeBigInt64LE(BigInt(latInt), offset);
  offset += 8;

  // Write lng (i64)
  dataLayout.writeBigInt64LE(BigInt(lngInt), offset);

  return dataLayout;
}

/**
 * Register a merchant on-chain with fee payment
 *
 * @returns Transaction signature on success
 */
export async function registerMerchantOnChain(
  params: RegisterMerchantParams
): Promise<{success: boolean; signature?: string; error?: string}> {
  console.log("🚀 Starting merchant registration on-chain...");
  console.log("  📋 Params:", {
    merchantWallet: params.merchantWalletPubkey.toBase58(),
    merchantId: params.merchantId,
    businessName: params.businessName,
    lat: params.latitude,
    lng: params.longitude,
  });

  try {
    // Step 1: Connect to RPC and test connection
    console.log("📡 Step 1: Connecting to Solana RPC...");
    console.log("  Endpoint:", RPC_ENDPOINT);

    const connection = new Connection(RPC_ENDPOINT, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000, // 60 seconds
    });

    // Test connection by getting version
    console.log("  Testing RPC connection...");
    try {
      const version = await connection.getVersion();
      console.log("✅ RPC connection successful!");
      console.log("  Solana version:", version["solana-core"]);
    } catch (rpcError: any) {
      console.error("❌ Cannot connect to RPC!");
      console.error("  Error:", rpcError.message);
      throw new Error(`Cannot connect to Solana network. Please check your internet connection. Error: ${rpcError.message}`);
    }

    // Step 2: Verify smart contract is deployed
    console.log("🔍 Step 2: Verifying smart contract is deployed...");
    console.log("  Program ID:", PROGRAM_ID.toBase58());
    try {
      const programInfo = await connection.getAccountInfo(PROGRAM_ID);
      if (!programInfo) {
        console.error("❌ Smart contract not found!");
        console.error("  Program ID:", PROGRAM_ID.toBase58());
        throw new Error(
          `Smart contract not deployed!\n\nProgram ID: ${PROGRAM_ID.toBase58()}\n\nPlease deploy the contract first:\ncd nearme_contract\nanchor deploy --provider.cluster devnet`
        );
      }
      console.log("✅ Smart contract found!");
      console.log("  Program account owner:", programInfo.owner.toBase58());
      console.log("  Program data size:", programInfo.data.length, "bytes");
    } catch (progError: any) {
      if (progError.message?.includes("Smart contract not deployed")) {
        throw progError; // Re-throw our custom error
      }
      console.error("⚠️ Error checking program:", progError.message);
      // Continue anyway - might be a network blip
    }

    // Step 3: Get merchant PDA
    console.log("🔑 Step 3: Finding merchant account PDA...");
    const [merchantAccountPDA] = await findMerchantAccountPDA(params.merchantWalletPubkey);
    console.log("  PDA:", merchantAccountPDA.toBase58());

    // Step 4: Check if already registered
    console.log("🔍 Step 4: Checking if merchant already registered...");
    try {
      const merchantAccountInfo = await connection.getAccountInfo(merchantAccountPDA);
      if (merchantAccountInfo) {
        console.log("❌ Merchant already registered!");
        return {
          success: false,
          error: "Merchant already registered on-chain",
        };
      }
      console.log("✅ Merchant not yet registered");
    } catch (checkError: any) {
      console.error("⚠️ Error checking merchant account:", checkError);
      throw new Error(`Failed to check merchant status: ${checkError.message}`);
    }

    // Step 5: Create instruction data
    console.log("📝 Step 5: Creating instruction data...");
    const instructionData = createRegisterMerchantInstructionData(
      params.merchantId,
      params.businessName,
      params.latitude,
      params.longitude
    );
    console.log("  Instruction data size:", instructionData.length, "bytes");

    // Step 6: Build instruction
    console.log("🔨 Step 6: Building transaction instruction...");
    console.log("  Program ID:", PROGRAM_ID.toBase58());
    console.log("  Treasury:", TREASURY_WALLET.toBase58());
    const instruction = new TransactionInstruction({
      keys: [
        {pubkey: merchantAccountPDA, isSigner: false, isWritable: true},
        {pubkey: params.merchantWalletPubkey, isSigner: true, isWritable: true},
        {pubkey: TREASURY_WALLET, isSigner: false, isWritable: true},
        {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });
    console.log("✅ Instruction created");

    // Step 7: Get blockhash
    console.log("⏱️ Step 7: Getting recent blockhash...");
    let blockhash, lastValidBlockHeight;
    try {
      const result = await connection.getLatestBlockhash();
      blockhash = result.blockhash;
      lastValidBlockHeight = result.lastValidBlockHeight;
      console.log("  Blockhash:", blockhash);
      console.log("  Last valid block:", lastValidBlockHeight);
    } catch (bhError: any) {
      console.error("❌ Failed to get blockhash:", bhError);
      throw new Error(`Network error - Failed to get blockhash: ${bhError.message}`);
    }

    // Step 8: Create versioned transaction (modern format for Mobile Wallet Adapter)
    console.log("📦 Step 8: Creating versioned transaction...");
    console.log("  Using TransactionMessage for proper signing");

    const messageV0 = new TransactionMessage({
      payerKey: params.merchantWalletPubkey,
      recentBlockhash: blockhash,
      instructions: [instruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    console.log("✅ Versioned transaction created");
    console.log("  Version:", transaction.version);
    console.log("  Message:", transaction.message);

    // Step 9: Sign and send via Mobile Wallet Adapter
    console.log("📱 Step 9: Opening mobile wallet for signing...");
    console.log("  Transaction details:");
    console.log("    Fee payer:", params.merchantWalletPubkey.toBase58());
    console.log("    Transaction size:", transaction.serialize().length, "bytes");

    let result;
    try {
      console.log("  🔄 Calling transact()...");

      result = await transact(async (wallet) => {
        console.log("  ✅ transact() callback started");
        console.log("  Wallet object received:", typeof wallet);

        try {
          console.log("  🔐 Step 9a: Authorizing wallet...");
          console.log("    Authorization config:", {
            cluster: "devnet",
            identity: {name: "NearMe", uri: "https://nearme.app"},
          });

          const authResult = await wallet.authorize({
            cluster: "devnet",
            identity: {
              name: "NearMe",
              uri: "https://nearme.app",
              icon: "favicon.ico",
            },
          });

          console.log("  ✅ Wallet authorized successfully!");
          console.log("    Auth result:", authResult);
          console.log("    Accounts:", authResult.accounts?.length || 0);
        } catch (authError: any) {
          console.error("  ❌ Authorization failed!");
          console.error("    Error type:", authError?.constructor?.name);
          console.error("    Error message:", authError?.message);
          console.error("    Error code:", authError?.code);
          console.error("    Error name:", authError?.name);
          console.error("    Full error:", JSON.stringify(authError, null, 2));
          throw new Error(`Wallet authorization failed: ${authError?.message || "Unknown error"}`);
        }

        let signedTransactions;
        try {
          console.log("  ✍️ Step 9b: Signing transaction...");
          console.log("    Transaction type:", transaction.constructor.name);
          console.log("    Transaction version:", transaction.version);
          console.log("    Transactions to sign:", 1);

          signedTransactions = await wallet.signTransactions({
            transactions: [transaction],
          });

          console.log("  ✅ Transaction signed successfully!");
          console.log("    Signed transactions received:", signedTransactions?.length || 0);
          console.log("    First signed tx type:", signedTransactions[0]?.constructor?.name);

          // Verify signature
          if (signedTransactions[0].signatures && signedTransactions[0].signatures.length > 0) {
            console.log("    ✅ Signature present:", signedTransactions[0].signatures.length, "signature(s)");
          } else {
            console.warn("    ⚠️ No signatures found in signed transaction!");
          }
        } catch (signError: any) {
          console.error("  ❌ Signing failed!");
          console.error("    Error type:", signError?.constructor?.name);
          console.error("    Error message:", signError?.message);
          console.error("    Error code:", signError?.code);
          console.error("    Error name:", signError?.name);
          console.error("    Full error:", JSON.stringify(signError, null, 2));
          throw new Error(`Transaction signing failed: ${signError?.message || "Unknown error"}`);
        }

        let signature;
        try {
          console.log("  📤 Step 9c: Sending transaction to network...");
          console.log("    RPC endpoint:", RPC_ENDPOINT);
          console.log("    Serialized tx size:", signedTransactions[0].serialize().length, "bytes");

          // First, simulate the transaction to check for errors
          console.log("  🔍 Simulating transaction first...");
          try {
            const simulation = await connection.simulateTransaction(signedTransactions[0]);
            console.log("  📊 Simulation result:", simulation);

            if (simulation.value.err) {
              console.error("  ❌ Simulation failed!");
              console.error("    Error:", simulation.value.err);
              console.error("    Logs:", simulation.value.logs);
              throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join("\n")}`);
            }

            console.log("  ✅ Simulation successful!");
            console.log("    Units consumed:", simulation.value.unitsConsumed);
          } catch (simError: any) {
            console.error("  ⚠️ Simulation error (continuing anyway):", simError.message);
            // Continue even if simulation fails - sometimes it's inaccurate
          }

          // Now send the real transaction
          console.log("  📡 Sending transaction to network...");
          console.log("    Using sendRawTransaction with skipPreflight: true");

          signature = await connection.sendRawTransaction(signedTransactions[0].serialize(), {
            skipPreflight: true, // Skip preflight since we already simulated
            maxRetries: 3,
          });

          console.log("  ✅ Transaction sent to network!");
          console.log("    Signature:", signature);
        } catch (sendError: any) {
          console.error("  ❌ Send transaction failed!");
          console.error("    Error type:", sendError?.constructor?.name);
          console.error("    Error message:", sendError?.message);
          console.error("    Error code:", sendError?.code);
          console.error("    Error name:", sendError?.name);

          // Check for specific error types
          if (sendError?.message?.includes("Network request failed") || sendError?.message?.includes("fetch")) {
            console.error("    This is a NETWORK connectivity error");
            console.error("    Possible causes:");
            console.error("      1. No internet connection");
            console.error("      2. RPC endpoint is down");
            console.error("      3. Firewall blocking the request");
            console.error("      4. CORS or security policy issue");
            throw new Error(`Network error: Unable to send transaction to Solana. Please check your internet connection and try again.`);
          }

          console.error("    Error logs:", sendError?.logs);
          console.error("    Full error:");
          try {
            console.error(JSON.stringify(sendError, null, 2));
          } catch {
            console.error("    (Cannot stringify error)");
          }

          throw new Error(`Failed to send transaction: ${sendError?.message || "Unknown error"}`);
        }

        try {
          console.log("  ⏳ Step 9d: Confirming transaction...");
          console.log("    Signature to confirm:", signature);
          console.log("    Blockhash:", blockhash);
          console.log("    Last valid block:", lastValidBlockHeight);

          const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
          });

          console.log("  📝 Confirmation received:", confirmation);

          if (confirmation.value.err) {
            console.error("  ❌ Transaction failed on-chain!");
            console.error("    Confirmation error:", JSON.stringify(confirmation.value.err, null, 2));
            throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
          }

          console.log("  ✅ Transaction confirmed successfully!");
        } catch (confirmError: any) {
          console.error("  ❌ Confirmation failed!");
          console.error("    Error type:", confirmError?.constructor?.name);
          console.error("    Error message:", confirmError?.message);
          console.error("    Error code:", confirmError?.code);
          console.error("    Full error:", JSON.stringify(confirmError, null, 2));
          throw new Error(`Transaction confirmation failed: ${confirmError?.message || "Unknown error"}`);
        }

        console.log("  🎉 All steps completed! Returning signature:", signature);
        return signature;
      });

      console.log("  ✅ transact() completed successfully!");

    } catch (walletError: any) {
      console.error("❌❌❌ WALLET ADAPTER ERROR ❌❌❌");
      console.error("  Error caught in outer try-catch");
      console.error("  Error type:", walletError?.constructor?.name);
      console.error("  Error name:", walletError?.name);
      console.error("  Error message:", walletError?.message);
      console.error("  Error code:", walletError?.code);
      console.error("  Error stack:", walletError?.stack);
      console.error("  Error toString:", walletError?.toString());

      // Try to extract all properties
      console.error("  All error properties:");
      for (let key in walletError) {
        console.error(`    ${key}:`, walletError[key]);
      }

      console.error("  Full error object (JSON):");
      try {
        console.error(JSON.stringify(walletError, null, 2));
      } catch {
        console.error("  (Unable to stringify error)");
      }

      throw new Error(`Wallet signing failed: ${walletError?.message || walletError?.toString() || "Unknown wallet error"}`);
    }

    console.log("🎉 Merchant registration completed successfully!");
    console.log("  Transaction signature:", result);

    return {
      success: true,
      signature: result,
    };
  } catch (error: any) {
    console.error("❌❌❌ REGISTRATION FAILED ❌❌❌");
    console.error("  Error type:", error.constructor.name);
    console.error("  Error message:", error.message);
    console.error("  Error stack:", error.stack);
    console.error("  Full error object:", error);

    return {
      success: false,
      error: error.message || "Failed to register merchant on blockchain",
    };
  }
}

/**
 * Check if a merchant is registered on-chain
 */
export async function isMerchantRegisteredOnChain(merchantWalletPubkey: PublicKey): Promise<boolean> {
  try {
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const [merchantAccountPDA] = await findMerchantAccountPDA(merchantWalletPubkey);

    const accountInfo = await connection.getAccountInfo(merchantAccountPDA);
    return accountInfo !== null;
  } catch (error) {
    console.error("Failed to check merchant registration:", error);
    return false;
  }
}

/**
 * Get merchant account data from blockchain
 */
export async function getMerchantAccountData(merchantWalletPubkey: PublicKey): Promise<any | null> {
  try {
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const [merchantAccountPDA] = await findMerchantAccountPDA(merchantWalletPubkey);

    const accountInfo = await connection.getAccountInfo(merchantAccountPDA);
    if (!accountInfo) {
      return null;
    }

    // Parse the account data
    // Structure: merchant (32) + business_name (string) + lat (8) + lng (8) + registered_at (8) + is_active (1) + bump (1)
    const data = accountInfo.data;

    // Skip 8-byte discriminator
    let offset = 8;

    // Read merchant pubkey
    const merchant = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // Read business_name (string: u32 length + bytes)
    const businessNameLen = data.readUInt32LE(offset);
    offset += 4;
    const businessName = data.slice(offset, offset + businessNameLen).toString("utf8");
    offset += businessNameLen;

    // Read lat (i64)
    const lat = Number(data.readBigInt64LE(offset)) / 1_000_000;
    offset += 8;

    // Read lng (i64)
    const lng = Number(data.readBigInt64LE(offset)) / 1_000_000;
    offset += 8;

    // Read registered_at (i64)
    const registeredAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // Read is_active (bool)
    const isActive = data[offset] === 1;
    offset += 1;

    // Read bump (u8)
    const bump = data[offset];

    return {
      merchant: merchant.toBase58(),
      businessName,
      lat,
      lng,
      registeredAt: new Date(registeredAt * 1000),
      isActive,
      bump,
    };
  } catch (error) {
    console.error("Failed to get merchant account data:", error);
    return null;
  }
}

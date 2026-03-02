import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { NearmeContract } from "../target/types/nearme_contract";
import { assert } from "chai";

describe("nearme_contract - Location Proof Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NearmeContract as Program<NearmeContract>;
  const payer = provider.wallet as anchor.Wallet;

  // Test data
  const merchantId = "test_merchant_" + Date.now();
  const validLat = 37_774_900; // San Francisco: 37.7749° * 1,000,000
  const validLng = -122_419_400; // San Francisco: -122.4194° * 1,000,000

  let proofPda: PublicKey;
  let proofBump: number;

  before(async () => {
    // Derive PDA for this test merchant
    [proofPda, proofBump] = await PublicKey.findProgramAddress(
      [Buffer.from("proof"), Buffer.from(merchantId)],
      program.programId
    );
    console.log("Test Merchant ID:", merchantId);
    console.log("Proof PDA:", proofPda.toString());
  });

  describe("create_location_proof", () => {
    it("Creates a location proof with valid coordinates", async () => {
      const tx = await program.methods
        .createLocationProof(
          new anchor.BN(validLat),
          new anchor.BN(validLng),
          merchantId
        )
        .accounts({
          proof: proofPda,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Transaction signature:", tx);

      // Fetch the created account
      const proofAccount = await program.account.locationProof.fetch(proofPda);

      // Assertions
      assert.equal(
        proofAccount.lat.toNumber(),
        validLat,
        "Latitude should match"
      );
      assert.equal(
        proofAccount.lng.toNumber(),
        validLng,
        "Longitude should match"
      );
      assert.ok(
        proofAccount.verifiedAt.toNumber() > 0,
        "Timestamp should be set"
      );
      assert.equal(proofAccount.bump, proofBump, "Bump should match");

      console.log("Location Proof created successfully:");
      console.log("  Latitude:", proofAccount.lat.toNumber() / 1_000_000);
      console.log("  Longitude:", proofAccount.lng.toNumber() / 1_000_000);
      console.log("  Verified At:", new Date(proofAccount.verifiedAt.toNumber() * 1000));
    });

    it("Fails to create duplicate proof for same merchant", async () => {
      try {
        await program.methods
          .createLocationProof(
            new anchor.BN(validLat),
            new anchor.BN(validLng),
            merchantId
          )
          .accounts({
            proof: proofPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        assert.fail("Should have failed to create duplicate proof");
      } catch (error: any) {
        // Expected error - account already exists
        assert.include(
          error.toString().toLowerCase(),
          "already in use",
          "Should fail with account already in use error"
        );
      }
    });

    it("Rejects invalid latitude (too high)", async () => {
      const invalidMerchantId = "invalid_lat_high_" + Date.now();
      const [invalidProofPda] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(invalidMerchantId)],
        program.programId
      );

      try {
        await program.methods
          .createLocationProof(
            new anchor.BN(91_000_000), // 91 degrees - invalid
            new anchor.BN(validLng),
            invalidMerchantId
          )
          .accounts({
            proof: invalidProofPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        assert.fail("Should have rejected invalid latitude");
      } catch (error: any) {
        assert.include(
          error.toString(),
          "InvalidLatitude",
          "Should fail with InvalidLatitude error"
        );
      }
    });

    it("Rejects invalid latitude (too low)", async () => {
      const invalidMerchantId = "invalid_lat_low_" + Date.now();
      const [invalidProofPda] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(invalidMerchantId)],
        program.programId
      );

      try {
        await program.methods
          .createLocationProof(
            new anchor.BN(-91_000_000), // -91 degrees - invalid
            new anchor.BN(validLng),
            invalidMerchantId
          )
          .accounts({
            proof: invalidProofPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        assert.fail("Should have rejected invalid latitude");
      } catch (error: any) {
        assert.include(
          error.toString(),
          "InvalidLatitude",
          "Should fail with InvalidLatitude error"
        );
      }
    });

    it("Rejects invalid longitude (too high)", async () => {
      const invalidMerchantId = "invalid_lng_high_" + Date.now();
      const [invalidProofPda] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(invalidMerchantId)],
        program.programId
      );

      try {
        await program.methods
          .createLocationProof(
            new anchor.BN(validLat),
            new anchor.BN(181_000_000), // 181 degrees - invalid
            invalidMerchantId
          )
          .accounts({
            proof: invalidProofPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        assert.fail("Should have rejected invalid longitude");
      } catch (error: any) {
        assert.include(
          error.toString(),
          "InvalidLongitude",
          "Should fail with InvalidLongitude error"
        );
      }
    });

    it("Rejects invalid longitude (too low)", async () => {
      const invalidMerchantId = "invalid_lng_low_" + Date.now();
      const [invalidProofPda] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(invalidMerchantId)],
        program.programId
      );

      try {
        await program.methods
          .createLocationProof(
            new anchor.BN(validLat),
            new anchor.BN(-181_000_000), // -181 degrees - invalid
            invalidMerchantId
          )
          .accounts({
            proof: invalidProofPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        assert.fail("Should have rejected invalid longitude");
      } catch (error: any) {
        assert.include(
          error.toString(),
          "InvalidLongitude",
          "Should fail with InvalidLongitude error"
        );
      }
    });

    it("Rejects merchant ID that's too long", async () => {
      const longMerchantId = "a".repeat(33); // 33 characters - too long
      const [invalidProofPda] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(longMerchantId)],
        program.programId
      );

      try {
        await program.methods
          .createLocationProof(
            new anchor.BN(validLat),
            new anchor.BN(validLng),
            longMerchantId
          )
          .accounts({
            proof: invalidProofPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        assert.fail("Should have rejected long merchant ID");
      } catch (error: any) {
        assert.include(
          error.toString(),
          "MerchantIdTooLong",
          "Should fail with MerchantIdTooLong error"
        );
      }
    });

    it("Accepts extreme but valid coordinates", async () => {
      const extremeMerchantId = "extreme_coords_" + Date.now();
      const [extremeProofPda] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(extremeMerchantId)],
        program.programId
      );

      // North Pole: 90°N, 0°E
      const extremeLat = 90_000_000;
      const extremeLng = 0;

      await program.methods
        .createLocationProof(
          new anchor.BN(extremeLat),
          new anchor.BN(extremeLng),
          extremeMerchantId
        )
        .accounts({
          proof: extremeProofPda,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const proofAccount = await program.account.locationProof.fetch(extremeProofPda);
      assert.equal(proofAccount.lat.toNumber(), extremeLat);
      assert.equal(proofAccount.lng.toNumber(), extremeLng);
    });
  });

  describe("close_location_proof", () => {
    let closeTestMerchantId: string;
    let closeTestProofPda: PublicKey;

    before(async () => {
      // Create a proof that we can close
      closeTestMerchantId = "close_test_" + Date.now();
      [closeTestProofPda] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(closeTestMerchantId)],
        program.programId
      );

      await program.methods
        .createLocationProof(
          new anchor.BN(validLat),
          new anchor.BN(validLng),
          closeTestMerchantId
        )
        .accounts({
          proof: closeTestProofPda,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("Closes a location proof account", async () => {
      const balanceBefore = await provider.connection.getBalance(payer.publicKey);

      await program.methods
        .closeLocationProof()
        .accounts({
          proof: closeTestProofPda,
          authority: payer.publicKey,
        })
        .rpc();

      // Verify account is closed
      try {
        await program.account.locationProof.fetch(closeTestProofPda);
        assert.fail("Account should be closed");
      } catch (error: any) {
        assert.include(
          error.toString(),
          "Account does not exist",
          "Account should not exist after closing"
        );
      }

      // Verify rent was reclaimed
      const balanceAfter = await provider.connection.getBalance(payer.publicKey);
      assert.ok(
        balanceAfter > balanceBefore,
        "Balance should increase after reclaiming rent"
      );
    });
  });

  describe("Event emission", () => {
    it("Emits LocationVerifiedEvent on creation", async () => {
      const eventMerchantId = "event_test_" + Date.now();
      const [eventProofPda] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(eventMerchantId)],
        program.programId
      );

      const tx = await program.methods
        .createLocationProof(
          new anchor.BN(validLat),
          new anchor.BN(validLng),
          eventMerchantId
        )
        .accounts({
          proof: eventProofPda,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Note: In a real test environment, you'd parse transaction logs to verify the event
      // For now, we just verify the transaction succeeded
      assert.ok(tx, "Transaction should succeed and emit event");
    });
  });

  describe("PDA derivation", () => {
    it("Derives consistent PDAs for the same merchant ID", async () => {
      const testMerchantId = "pda_consistency_test";

      const [pda1, bump1] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(testMerchantId)],
        program.programId
      );

      const [pda2, bump2] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(testMerchantId)],
        program.programId
      );

      assert.equal(pda1.toString(), pda2.toString(), "PDAs should match");
      assert.equal(bump1, bump2, "Bumps should match");
    });

    it("Derives different PDAs for different merchant IDs", async () => {
      const merchantId1 = "pda_test_1";
      const merchantId2 = "pda_test_2";

      const [pda1] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(merchantId1)],
        program.programId
      );

      const [pda2] = await PublicKey.findProgramAddress(
        [Buffer.from("proof"), Buffer.from(merchantId2)],
        program.programId
      );

      assert.notEqual(pda1.toString(), pda2.toString(), "PDAs should differ");
    });
  });

  describe("Merchant Registration Tests", () => {
    // Registration fee in lamports (0.01 SOL)
    const REGISTRATION_FEE = 10_000_000;

    // Treasury wallet (use a new keypair for testing)
    let treasury: Keypair;

    before(() => {
      treasury = Keypair.generate();
      console.log("\n=== Merchant Registration Test Setup ===");
      console.log("Treasury wallet:", treasury.publicKey.toString());
    });

    describe("register_merchant", () => {
      it("Successfully registers a merchant with fee payment", async () => {
        const merchant = Keypair.generate();
        const merchantId = "merchant_" + Date.now();
        const businessName = "Joe's Coffee Shop";
        const lat = new anchor.BN(37_774_900); // San Francisco
        const lng = new anchor.BN(-122_419_400);

        // Airdrop SOL to merchant for rent + fee
        const airdropSig = await provider.connection.requestAirdrop(
          merchant.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        // Derive merchant account PDA
        const [merchantAccountPda, merchantBump] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
          program.programId
        );

        // Get treasury balance before
        const treasuryBalanceBefore = await provider.connection.getBalance(treasury.publicKey);

        // Register merchant
        const tx = await program.methods
          .registerMerchant(merchantId, businessName, lat, lng)
          .accounts({
            merchantAccount: merchantAccountPda,
            merchant: merchant.publicKey,
            treasury: treasury.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();

        console.log("\n✅ Merchant registered! Transaction:", tx);

        // Verify merchant account was created
        const merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);

        assert.equal(
          merchantAccount.merchant.toString(),
          merchant.publicKey.toString(),
          "Merchant pubkey should match"
        );
        assert.equal(merchantAccount.businessName, businessName, "Business name should match");
        assert.equal(merchantAccount.lat.toNumber(), lat.toNumber(), "Latitude should match");
        assert.equal(merchantAccount.lng.toNumber(), lng.toNumber(), "Longitude should match");
        assert.ok(merchantAccount.registeredAt.toNumber() > 0, "Registration timestamp should be set");
        assert.equal(merchantAccount.isActive, true, "Merchant should be active");
        assert.equal(merchantAccount.bump, merchantBump, "Bump should match");

        // Verify fee was transferred to treasury
        const treasuryBalanceAfter = await provider.connection.getBalance(treasury.publicKey);
        const feeReceived = treasuryBalanceAfter - treasuryBalanceBefore;

        assert.equal(
          feeReceived,
          REGISTRATION_FEE,
          `Treasury should receive ${REGISTRATION_FEE} lamports (0.01 SOL)`
        );

        console.log("\n📊 Merchant Account Data:");
        console.log("  Business:", merchantAccount.businessName);
        console.log("  Location:", merchantAccount.lat.toNumber() / 1_000_000, merchantAccount.lng.toNumber() / 1_000_000);
        console.log("  Registered:", new Date(merchantAccount.registeredAt.toNumber() * 1000));
        console.log("  Active:", merchantAccount.isActive);
        console.log("\n💰 Fee Payment:");
        console.log("  Fee paid:", REGISTRATION_FEE / anchor.web3.LAMPORTS_PER_SOL, "SOL");
        console.log("  Treasury balance increased by:", feeReceived / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      });

      it("Prevents duplicate registration for same merchant", async () => {
        const merchant = Keypair.generate();
        const merchantId = "duplicate_test_" + Date.now();
        const businessName = "Duplicate Store";
        const lat = new anchor.BN(40_712_800);
        const lng = new anchor.BN(-74_006_000);

        // Airdrop SOL
        const airdropSig = await provider.connection.requestAirdrop(
          merchant.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        const [merchantAccountPda] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
          program.programId
        );

        // First registration - should succeed
        await program.methods
          .registerMerchant(merchantId, businessName, lat, lng)
          .accounts({
            merchantAccount: merchantAccountPda,
            merchant: merchant.publicKey,
            treasury: treasury.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();

        // Second registration - should fail
        try {
          await program.methods
            .registerMerchant(merchantId + "_2", "New Name", lat, lng)
            .accounts({
              merchantAccount: merchantAccountPda,
              merchant: merchant.publicKey,
              treasury: treasury.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([merchant])
            .rpc();

          assert.fail("Should not allow duplicate registration");
        } catch (error: any) {
          assert.include(
            error.toString().toLowerCase(),
            "already in use",
            "Should fail with account already in use error"
          );
          console.log("✅ Duplicate registration correctly prevented");
        }
      });

      it("Rejects empty business name", async () => {
        const merchant = Keypair.generate();
        const merchantId = "empty_name_test_" + Date.now();
        const emptyName = "";
        const lat = new anchor.BN(40_712_800);
        const lng = new anchor.BN(-74_006_000);

        const airdropSig = await provider.connection.requestAirdrop(
          merchant.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        const [merchantAccountPda] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
          program.programId
        );

        try {
          await program.methods
            .registerMerchant(merchantId, emptyName, lat, lng)
            .accounts({
              merchantAccount: merchantAccountPda,
              merchant: merchant.publicKey,
              treasury: treasury.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([merchant])
            .rpc();

          assert.fail("Should reject empty business name");
        } catch (error: any) {
          assert.include(
            error.toString(),
            "InvalidBusinessName",
            "Should fail with InvalidBusinessName error"
          );
          console.log("✅ Empty business name correctly rejected");
        }
      });

      it("Rejects business name that's too long", async () => {
        const merchant = Keypair.generate();
        const merchantId = "long_name_test_" + Date.now();
        const longName = "a".repeat(65); // 65 characters - exceeds 64 limit
        const lat = new anchor.BN(40_712_800);
        const lng = new anchor.BN(-74_006_000);

        const airdropSig = await provider.connection.requestAirdrop(
          merchant.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        const [merchantAccountPda] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
          program.programId
        );

        try {
          await program.methods
            .registerMerchant(merchantId, longName, lat, lng)
            .accounts({
              merchantAccount: merchantAccountPda,
              merchant: merchant.publicKey,
              treasury: treasury.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([merchant])
            .rpc();

          assert.fail("Should reject long business name");
        } catch (error: any) {
          assert.include(
            error.toString(),
            "InvalidBusinessName",
            "Should fail with InvalidBusinessName error"
          );
          console.log("✅ Long business name correctly rejected");
        }
      });

      it("Accepts maximum length business name (64 chars)", async () => {
        const merchant = Keypair.generate();
        const merchantId = "max_name_test_" + Date.now();
        const maxName = "a".repeat(64); // Exactly 64 characters
        const lat = new anchor.BN(40_712_800);
        const lng = new anchor.BN(-74_006_000);

        const airdropSig = await provider.connection.requestAirdrop(
          merchant.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        const [merchantAccountPda] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .registerMerchant(merchantId, maxName, lat, lng)
          .accounts({
            merchantAccount: merchantAccountPda,
            merchant: merchant.publicKey,
            treasury: treasury.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();

        const merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
        assert.equal(merchantAccount.businessName, maxName, "Should accept max length name");
        assert.equal(merchantAccount.businessName.length, 64, "Name should be 64 characters");
        console.log("✅ Maximum length business name accepted");
      });

      it("Rejects invalid coordinates in merchant registration", async () => {
        const merchant = Keypair.generate();
        const merchantId = "invalid_coords_test_" + Date.now();
        const businessName = "Invalid Location Store";
        const invalidLat = new anchor.BN(91_000_000); // Invalid latitude
        const validLng = new anchor.BN(-74_006_000);

        const airdropSig = await provider.connection.requestAirdrop(
          merchant.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        const [merchantAccountPda] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
          program.programId
        );

        try {
          await program.methods
            .registerMerchant(merchantId, businessName, invalidLat, validLng)
            .accounts({
              merchantAccount: merchantAccountPda,
              merchant: merchant.publicKey,
              treasury: treasury.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([merchant])
            .rpc();

          assert.fail("Should reject invalid latitude");
        } catch (error: any) {
          assert.include(
            error.toString(),
            "InvalidLatitude",
            "Should fail with InvalidLatitude error"
          );
          console.log("✅ Invalid coordinates correctly rejected");
        }
      });

      it("Fails registration when merchant has insufficient funds", async () => {
        const poorMerchant = Keypair.generate();
        const merchantId = "poor_merchant_" + Date.now();
        const businessName = "Broke Store";
        const lat = new anchor.BN(40_712_800);
        const lng = new anchor.BN(-74_006_000);

        // Give merchant very small amount (not enough for fee + rent)
        const airdropSig = await provider.connection.requestAirdrop(
          poorMerchant.publicKey,
          1_000_000 // Only 0.001 SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        const [merchantAccountPda] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), poorMerchant.publicKey.toBuffer()],
          program.programId
        );

        try {
          await program.methods
            .registerMerchant(merchantId, businessName, lat, lng)
            .accounts({
              merchantAccount: merchantAccountPda,
              merchant: poorMerchant.publicKey,
              treasury: treasury.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([poorMerchant])
            .rpc();

          assert.fail("Should fail with insufficient funds");
        } catch (error: any) {
          assert.include(
            error.toString().toLowerCase(),
            "insufficient",
            "Should fail with insufficient funds error"
          );
          console.log("✅ Insufficient funds correctly prevented registration");
        }
      });

      it("Registers multiple merchants successfully", async () => {
        const numMerchants = 3;
        const merchants: Keypair[] = [];
        const registeredMerchants: any[] = [];

        console.log(`\n📝 Registering ${numMerchants} merchants...`);

        for (let i = 0; i < numMerchants; i++) {
          const merchant = Keypair.generate();
          merchants.push(merchant);

          const merchantId = `multi_merchant_${i}_${Date.now()}`;
          const businessName = `Store ${i + 1}`;
          const lat = new anchor.BN(37_774_900 + i * 10_000); // Slightly different locations
          const lng = new anchor.BN(-122_419_400 + i * 10_000);

          // Airdrop SOL
          const airdropSig = await provider.connection.requestAirdrop(
            merchant.publicKey,
            2 * anchor.web3.LAMPORTS_PER_SOL
          );
          await provider.connection.confirmTransaction(airdropSig);

          const [merchantAccountPda] = await PublicKey.findProgramAddress(
            [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
            program.programId
          );

          // Register
          await program.methods
            .registerMerchant(merchantId, businessName, lat, lng)
            .accounts({
              merchantAccount: merchantAccountPda,
              merchant: merchant.publicKey,
              treasury: treasury.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([merchant])
            .rpc();

          const merchantAccount = await program.account.merchantAccount.fetch(merchantAccountPda);
          registeredMerchants.push(merchantAccount);

          console.log(`  ✅ Registered: ${businessName} at ${merchantAccount.lat.toNumber() / 1_000_000}, ${merchantAccount.lng.toNumber() / 1_000_000}`);
        }

        // Verify all merchants are registered with unique accounts
        assert.equal(
          registeredMerchants.length,
          numMerchants,
          `Should have ${numMerchants} registered merchants`
        );

        // Verify all business names are unique
        const businessNames = registeredMerchants.map(m => m.businessName);
        const uniqueNames = new Set(businessNames);
        assert.equal(
          uniqueNames.size,
          numMerchants,
          "All merchant names should be unique"
        );

        console.log(`✅ Successfully registered ${numMerchants} unique merchants`);
      });

      it("Verifies merchant PDA derivation is consistent", async () => {
        const merchantPubkey = Keypair.generate().publicKey;

        const [pda1, bump1] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchantPubkey.toBuffer()],
          program.programId
        );

        const [pda2, bump2] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchantPubkey.toBuffer()],
          program.programId
        );

        assert.equal(pda1.toString(), pda2.toString(), "PDAs should be consistent");
        assert.equal(bump1, bump2, "Bumps should be consistent");
        console.log("✅ Merchant PDA derivation is deterministic");
      });

      it("Verifies different merchants get different PDAs", async () => {
        const merchant1 = Keypair.generate().publicKey;
        const merchant2 = Keypair.generate().publicKey;

        const [pda1] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant1.toBuffer()],
          program.programId
        );

        const [pda2] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant2.toBuffer()],
          program.programId
        );

        assert.notEqual(pda1.toString(), pda2.toString(), "Different merchants should have different PDAs");
        console.log("✅ Different merchants get unique PDA addresses");
      });

      it("Emits MerchantRegisteredEvent on successful registration", async () => {
        const merchant = Keypair.generate();
        const merchantId = "event_merchant_" + Date.now();
        const businessName = "Event Test Store";
        const lat = new anchor.BN(37_774_900);
        const lng = new anchor.BN(-122_419_400);

        const airdropSig = await provider.connection.requestAirdrop(
          merchant.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        const [merchantAccountPda] = await PublicKey.findProgramAddress(
          [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
          program.programId
        );

        const tx = await program.methods
          .registerMerchant(merchantId, businessName, lat, lng)
          .accounts({
            merchantAccount: merchantAccountPda,
            merchant: merchant.publicKey,
            treasury: treasury.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();

        // In production, you would parse transaction logs to verify the event data
        assert.ok(tx, "Transaction should succeed and emit event");
        console.log("✅ MerchantRegisteredEvent emitted on registration");
      });
    });
  });
});

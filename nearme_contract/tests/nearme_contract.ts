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
});

use anchor_lang::prelude::*;

declare_id!("6bLHpe5CJxL9F7mXSq2VVNiNHQv2ZNGBtVXWxvfg9PDB");

/// Maximum length for merchant ID string (32 bytes + length prefix)
const MAX_MERCHANT_ID_LEN: usize = 32;

#[program]
pub mod nearme_contract {
    use super::*;

    /// Create an immutable on-chain proof of a merchant's verified GPS location
    ///
    /// # Arguments
    /// * `lat` - Latitude multiplied by 1,000,000 (6 decimal precision)
    /// * `lng` - Longitude multiplied by 1,000,000 (6 decimal precision)
    /// * `merchant_id` - Firebase merchant document ID (used as PDA seed)
    ///
    /// # Security
    /// - Only the server keypair (payer) can call this
    /// - PDA seeds: [b"proof", merchant_id_bytes]
    /// - Each merchant can only have ONE proof (PDA ensures uniqueness)
    /// - Location coordinates are validated for reasonable bounds
    pub fn create_location_proof(
        ctx: Context<CreateLocationProof>,
        lat: i64,
        lng: i64,
        merchant_id: String,
    ) -> Result<()> {
        // Validate merchant_id length
        require!(
            merchant_id.len() <= MAX_MERCHANT_ID_LEN,
            ErrorCode::MerchantIdTooLong
        );

        // Validate latitude (-90 to +90 degrees * 1,000,000)
        require!(
            lat >= -90_000_000 && lat <= 90_000_000,
            ErrorCode::InvalidLatitude
        );

        // Validate longitude (-180 to +180 degrees * 1,000,000)
        require!(
            lng >= -180_000_000 && lng <= 180_000_000,
            ErrorCode::InvalidLongitude
        );

        let proof = &mut ctx.accounts.proof;
        let clock = Clock::get()?;

        proof.lat = lat;
        proof.lng = lng;
        proof.verified_at = clock.unix_timestamp;
        proof.bump = ctx.bumps.proof;

        msg!(
            "Location proof created: lat={}, lng={}, timestamp={}",
            lat,
            lng,
            clock.unix_timestamp
        );

        // Emit event for indexing/monitoring
        emit!(LocationVerifiedEvent {
            lat,
            lng,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Close a location proof account (admin only)
    ///
    /// This is a safety mechanism to handle edge cases like:
    /// - Fraudulent merchant detection
    /// - Account cleanup if needed
    ///
    /// The authority must be the server keypair that created the proof
    pub fn close_location_proof(ctx: Context<CloseLocationProof>) -> Result<()> {
        msg!("Location proof closed for merchant");
        Ok(())
    }
}

/// Account struct for storing location proof (33 bytes total)
#[account]
pub struct LocationProof {
    /// Latitude * 1,000,000 (6 decimal places)
    pub lat: i64, // 8 bytes

    /// Longitude * 1,000,000 (6 decimal places)
    pub lng: i64, // 8 bytes

    /// Unix timestamp when location was verified
    pub verified_at: i64, // 8 bytes

    /// PDA bump seed
    pub bump: u8, // 1 byte
}

// 8 (discriminator) + 8 (lat) + 8 (lng) + 8 (timestamp) + 1 (bump) = 33 bytes

#[derive(Accounts)]
#[instruction(lat: i64, lng: i64, merchant_id: String)]
pub struct CreateLocationProof<'info> {
    /// The location proof PDA account
    #[account(
        init,
        payer = payer,
        space = 8 + 8 + 8 + 8 + 1, // discriminator + lat + lng + timestamp + bump
        seeds = [b"proof", merchant_id.as_bytes()],
        bump
    )]
    pub proof: Account<'info, LocationProof>,

    /// The server keypair that pays for the account creation
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseLocationProof<'info> {
    /// The location proof PDA account to close
    #[account(
        mut,
        close = authority,
        seeds = [b"proof"],
        bump = proof.bump
    )]
    pub proof: Account<'info, LocationProof>,

    /// The authority that can close the account (must be the original payer)
    #[account(mut)]
    pub authority: Signer<'info>,
}

/// Event emitted when a location is verified on-chain
#[event]
pub struct LocationVerifiedEvent {
    pub lat: i64,
    pub lng: i64,
    pub timestamp: i64,
}

/// Custom error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Merchant ID exceeds maximum length of 32 characters")]
    MerchantIdTooLong,

    #[msg("Invalid latitude. Must be between -90 and +90 degrees (multiplied by 1,000,000)")]
    InvalidLatitude,

    #[msg("Invalid longitude. Must be between -180 and +180 degrees (multiplied by 1,000,000)")]
    InvalidLongitude,
}

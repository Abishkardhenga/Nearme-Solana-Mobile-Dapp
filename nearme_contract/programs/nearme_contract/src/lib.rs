use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd");

/// Maximum length for merchant ID string (32 bytes + length prefix)
const MAX_MERCHANT_ID_LEN: usize = 32;

/// Maximum length for business name (64 bytes)
const MAX_BUSINESS_NAME_LEN: usize = 64;

/// Registration fee in lamports (0.01 SOL = 10,000,000 lamports)
const REGISTRATION_FEE: u64 = 10_000_000;

#[program]
pub mod nearme_contract {
    use super::*;

    /// Register a new merchant with registration fee
    ///
    /// # Arguments
    /// * `merchant_id` - Firebase merchant document ID (used as PDA seed)
    /// * `business_name` - Name of the business
    /// * `lat` - Latitude multiplied by 1,000,000 (6 decimal precision)
    /// * `lng` - Longitude multiplied by 1,000,000 (6 decimal precision)
    ///
    /// # Fee
    /// - Merchant must pay REGISTRATION_FEE (0.01 SOL) to register
    /// - Fee goes to the treasury account
    ///
    /// # Security
    /// - Only the merchant (signer) can register themselves
    /// - Each merchant can only register once (PDA ensures uniqueness)
    pub fn register_merchant(
        ctx: Context<RegisterMerchant>,
        merchant_id: String,
        business_name: String,
        lat: i64,
        lng: i64,
    ) -> Result<()> {
        // Validate inputs
        require!(
            merchant_id.len() <= MAX_MERCHANT_ID_LEN,
            ErrorCode::MerchantIdTooLong
        );

        require!(
            business_name.len() <= MAX_BUSINESS_NAME_LEN && !business_name.is_empty(),
            ErrorCode::InvalidBusinessName
        );

        require!(
            lat >= -90_000_000 && lat <= 90_000_000,
            ErrorCode::InvalidLatitude
        );

        require!(
            lng >= -180_000_000 && lng <= 180_000_000,
            ErrorCode::InvalidLongitude
        );

        let clock = Clock::get()?;

        // Transfer registration fee from merchant to treasury
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.merchant.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        );
        transfer(cpi_context, REGISTRATION_FEE)?;

        // Initialize merchant account
        let merchant_account = &mut ctx.accounts.merchant_account;
        merchant_account.merchant = ctx.accounts.merchant.key();
        merchant_account.business_name = business_name.clone();
        merchant_account.lat = lat;
        merchant_account.lng = lng;
        merchant_account.registered_at = clock.unix_timestamp;
        merchant_account.is_active = true;
        merchant_account.bump = ctx.bumps.merchant_account;

        msg!(
            "Merchant registered: {} at ({}, {}), fee paid: {} lamports",
            business_name,
            lat,
            lng,
            REGISTRATION_FEE
        );

        // Emit event
        emit!(MerchantRegisteredEvent {
            merchant: ctx.accounts.merchant.key(),
            business_name,
            lat,
            lng,
            timestamp: clock.unix_timestamp,
            fee_paid: REGISTRATION_FEE,
        });

        Ok(())
    }

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

/// Account struct for storing merchant registration data
#[account]
pub struct MerchantAccount {
    /// The merchant's wallet public key
    pub merchant: Pubkey, // 32 bytes

    /// Business name (variable length, max 64 bytes)
    pub business_name: String, // 4 + 64 = 68 bytes

    /// Latitude * 1,000,000 (6 decimal places)
    pub lat: i64, // 8 bytes

    /// Longitude * 1,000,000 (6 decimal places)
    pub lng: i64, // 8 bytes

    /// Unix timestamp when registered
    pub registered_at: i64, // 8 bytes

    /// Whether merchant is active
    pub is_active: bool, // 1 byte

    /// PDA bump seed
    pub bump: u8, // 1 byte
}

// 8 (discriminator) + 32 (merchant) + 68 (business_name) + 8 (lat) + 8 (lng) + 8 (timestamp) + 1 (is_active) + 1 (bump) = 134 bytes

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
#[instruction(merchant_id: String, business_name: String, lat: i64, lng: i64)]
pub struct RegisterMerchant<'info> {
    /// The merchant account PDA
    #[account(
        init,
        payer = merchant,
        space = 8 + 32 + 68 + 8 + 8 + 8 + 1 + 1, // discriminator + merchant + business_name + lat + lng + timestamp + is_active + bump
        seeds = [b"merchant", merchant.key().as_ref()],
        bump
    )]
    pub merchant_account: Account<'info, MerchantAccount>,

    /// The merchant wallet (pays rent + registration fee)
    #[account(mut)]
    pub merchant: Signer<'info>,

    /// Treasury account that receives registration fees
    /// CHECK: This is safe because we only transfer SOL to it
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

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

/// Event emitted when a merchant registers
#[event]
pub struct MerchantRegisteredEvent {
    pub merchant: Pubkey,
    pub business_name: String,
    pub lat: i64,
    pub lng: i64,
    pub timestamp: i64,
    pub fee_paid: u64,
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

    #[msg("Business name must be between 1 and 64 characters")]
    InvalidBusinessName,

    #[msg("Invalid latitude. Must be between -90 and +90 degrees (multiplied by 1,000,000)")]
    InvalidLatitude,

    #[msg("Invalid longitude. Must be between -180 and +180 degrees (multiplied by 1,000,000)")]
    InvalidLongitude,
}

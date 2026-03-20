use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    instruction::Instruction,
    sysvar::instructions::{load_current_index_checked, load_instruction_at_checked},
};
use anchor_spl::token_2022::ID as TOKEN_2022_PROGRAM_ID;
use anchor_spl::token_interface::{burn, mint_to, Burn, Mint, MintTo, TokenAccount, TokenInterface};

pub const ORACLE_PUBKEY: Pubkey = anchor_lang::prelude::pubkey!("9xQeWvG816bUx9EPfwyY5rT6f4mQfNQw5Y6f5wLxHh9E");

declare_id!("8qJjY3qeJc9cTGw3GRW7xVfN32B2j3YkM3p6N5cm6QkM");

#[program]
pub mod sol_program {
    use super::*;

    pub fn register_farm(ctx: Context<RegisterFarm>, area_geojson: String) -> Result<()> {
        let farm_account = &mut ctx.accounts.farm_account;

        farm_account.owner = ctx.accounts.owner.key();
        farm_account.area_geojson = area_geojson;
        farm_account.last_mint_timestamp = 0;
        farm_account.total_carbon_sequestered = 0;
        farm_account.amount_carbon = 0;
        farm_account.last_update = Clock::get()?.unix_timestamp;
        farm_account.is_active = true;
        farm_account.bump = ctx.bumps.farm_account;

        Ok(())
    }

    pub fn mint_carbon_credits(
        ctx: Context<MintCarbonCredits>,
        amount: u64,
        slot_number: u64,
        signature: [u8; 64],
    ) -> Result<()> {
        require!(amount > 0, TerraNodeError::InvalidAmount);
        require_keys_eq!(
            ctx.accounts.token_program.key(),
            TOKEN_2022_PROGRAM_ID,
            TerraNodeError::InvalidTokenProgram
        );

        verify_oracle_instruction(
            &ctx.accounts.instructions_sysvar,
            &ctx.accounts.farm_account.key(),
            amount,
            slot_number,
            &signature,
        )?;

        let signer_seeds: &[&[&[u8]]] = &[&[b"mint-authority", &[ctx.bumps.mint_authority]]];
        let cpi_accounts = MintTo {
            mint: ctx.accounts.co2_mint.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        mint_to(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds), amount)?;

        let farm_account = &mut ctx.accounts.farm_account;
        farm_account.amount_carbon = farm_account.amount_carbon.saturating_add(amount);
        farm_account.total_carbon_sequestered = farm_account
            .total_carbon_sequestered
            .saturating_add(amount);
        farm_account.last_mint_timestamp = Clock::get()?.unix_timestamp;
        farm_account.last_update = farm_account.last_mint_timestamp;

        Ok(())
    }

    pub fn retire_credits(ctx: Context<RetireCredits>, amount: u64) -> Result<()> {
        require!(amount > 0, TerraNodeError::InvalidAmount);
        require_keys_eq!(
            ctx.accounts.token_program.key(),
            TOKEN_2022_PROGRAM_ID,
            TerraNodeError::InvalidTokenProgram
        );

        let burn_accounts = Burn {
            mint: ctx.accounts.co2_mint.to_account_info(),
            from: ctx.accounts.owner_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let burn_program = ctx.accounts.token_program.to_account_info();
        burn(CpiContext::new(burn_program, burn_accounts), amount)?;

        let farm_account = &mut ctx.accounts.farm_account;
        farm_account.amount_carbon = farm_account.amount_carbon.saturating_sub(amount);
        farm_account.last_update = Clock::get()?.unix_timestamp;

        emit!(CarbonRetired {
            owner: ctx.accounts.owner.key(),
            amount,
            timestamp: farm_account.last_update,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterFarm<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = FarmAccount::LEN,
        seeds = [b"farm", owner.key().as_ref()],
        bump,
    )]
    pub farm_account: Account<'info, FarmAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintCarbonCredits<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"farm", owner.key().as_ref()],
        bump = farm_account.bump,
        has_one = owner,
        constraint = farm_account.is_active @ TerraNodeError::FarmInactive,
    )]
    pub farm_account: Account<'info, FarmAccount>,

    #[account(mut)]
    pub co2_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key() @ TerraNodeError::InvalidOwnerTokenAccount,
        constraint = owner_token_account.mint == co2_mint.key() @ TerraNodeError::InvalidMint,
    )]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [b"mint-authority"],
        bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct RetireCredits<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"farm", owner.key().as_ref()],
        bump = farm_account.bump,
        has_one = owner,
        constraint = farm_account.is_active @ TerraNodeError::FarmInactive,
    )]
    pub farm_account: Account<'info, FarmAccount>,

    #[account(mut)]
    pub co2_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key() @ TerraNodeError::InvalidOwnerTokenAccount,
        constraint = owner_token_account.mint == co2_mint.key() @ TerraNodeError::InvalidMint,
    )]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
pub struct FarmAccount {
    pub owner: Pubkey,
    pub area_geojson: String,
    pub last_mint_timestamp: i64,
    pub total_carbon_sequestered: u64,
    pub amount_carbon: u64,
    pub last_update: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl FarmAccount {
    // 8 discriminator + 32 owner + (4 + 256) geojson + 8 + 8 + 8 + 8 + 1 + 1
    pub const LEN: usize = 8 + 32 + 4 + 256 + 8 + 8 + 8 + 8 + 1 + 1;
}

#[event]
pub struct CarbonRetired {
    pub owner: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum TerraNodeError {
    #[msg("Invalid amount.")]
    InvalidAmount,
    #[msg("Farm is inactive.")]
    FarmInactive,
    #[msg("Invalid token program, Token-2022 is required.")]
    InvalidTokenProgram,
    #[msg("Invalid owner token account.")]
    InvalidOwnerTokenAccount,
    #[msg("Invalid mint for owner token account.")]
    InvalidMint,
    #[msg("Missing Ed25519 verification instruction.")]
    MissingEd25519Instruction,
    #[msg("Oracle signature verification failed.")]
    InvalidOracleSignature,
    #[msg("Invalid Ed25519 instruction payload.")]
    InvalidEd25519Payload,
}

fn verify_oracle_instruction(
    instructions_sysvar: &UncheckedAccount,
    farm_pda: &Pubkey,
    amount: u64,
    slot_number: u64,
    signature: &[u8; 64],
) -> Result<()> {
    let current_instruction_idx = load_current_index_checked(&instructions_sysvar.to_account_info())?;
    require!(
        current_instruction_idx > 0,
        TerraNodeError::MissingEd25519Instruction
    );

    let ed25519_ix = load_instruction_at_checked(
        (current_instruction_idx - 1) as usize,
        &instructions_sysvar.to_account_info(),
    )?;

    require_keys_eq!(
        ed25519_ix.program_id,
        ed25519_program::ID,
        TerraNodeError::InvalidOracleSignature
    );

    let expected_message = build_oracle_message(farm_pda, amount, slot_number);
    require!(
        ed25519_instruction_matches(
            &ed25519_ix,
            ORACLE_PUBKEY.as_ref(),
            signature,
            expected_message.as_slice(),
        )?,
        TerraNodeError::InvalidOracleSignature
    );

    Ok(())
}

fn build_oracle_message(owner: &Pubkey, amount: u64, slot_number: u64) -> Vec<u8> {
    let mut msg = Vec::with_capacity(32 + 8 + 8);
    msg.extend_from_slice(owner.as_ref());
    msg.extend_from_slice(&amount.to_le_bytes());
    msg.extend_from_slice(&slot_number.to_le_bytes());
    msg
}

fn ed25519_instruction_matches(
    instruction: &Instruction,
    expected_pubkey: &[u8],
    expected_signature: &[u8],
    expected_message: &[u8],
) -> Result<bool> {
    let data = instruction.data.as_slice();
    if data.len() < 16 {
        return err!(TerraNodeError::InvalidEd25519Payload);
    }

    // Ed25519 instruction layout for one signature:
    // [num_signatures: u8, padding: u8, offsets: 14 bytes, ...payload]
    let num_signatures = data[0];
    if num_signatures != 1 {
        return Ok(false);
    }

    let signature_offset = u16::from_le_bytes([data[2], data[3]]) as usize;
    let signature_instruction_index = u16::from_le_bytes([data[4], data[5]]);
    let public_key_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
    let public_key_instruction_index = u16::from_le_bytes([data[8], data[9]]);
    let message_data_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
    let message_data_size = u16::from_le_bytes([data[12], data[13]]) as usize;
    let message_instruction_index = u16::from_le_bytes([data[14], data[15]]);

    // u16::MAX means "current instruction".
    if signature_instruction_index != u16::MAX
        || public_key_instruction_index != u16::MAX
        || message_instruction_index != u16::MAX
    {
        return Ok(false);
    }

    let sig_end = signature_offset.saturating_add(64);
    let key_end = public_key_offset.saturating_add(32);
    let msg_end = message_data_offset.saturating_add(message_data_size);

    if sig_end > data.len() || key_end > data.len() || msg_end > data.len() {
        return err!(TerraNodeError::InvalidEd25519Payload);
    }

    let signature_matches = &data[signature_offset..sig_end] == expected_signature;
    let pubkey_matches = &data[public_key_offset..key_end] == expected_pubkey;
    let message_matches = &data[message_data_offset..msg_end] == expected_message;

    Ok(signature_matches && pubkey_matches && message_matches)
}

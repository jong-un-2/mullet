use crate::*;

#[error_code]
pub enum CustomError {
    #[msg("Admin address dismatch")]
    InvalidAdmin,

    #[msg("Admin can not be the orchestrator")]
    InvalidOrchestrator,

    #[msg("Orchestrator is not authorized")]
    IllegalOrchestrator,

    #[msg("Invalid withdraw amount")]
    InvalidAmount,

    #[msg("Need to rebalance")]
    NeedRebalance,

    #[msg("USDC balance should be increased after the swap")]
    SwapNotSuceed,

    #[msg("Instructions address is not correct")]
    InstructionsAddressMismatch,

    #[msg("Program address is not correct")]
    ProgramMismatch,

    #[msg("Instruction is unknown")]
    UnknownInstruction,

    // === 新增 Vault 相关错误 ===
    #[msg("Insufficient funds for deposit")]
    InsufficientFunds,

    #[msg("Insufficient shares for withdrawal")]
    InsufficientShares,

    #[msg("Invalid token mint")]
    InvalidMint,

    #[msg("Invalid token owner")]
    InvalidOwner,

    #[msg("No deposits found for user")]
    NoDepositsFound,

    #[msg("Slippage tolerance exceeded")]
    SlippageTooHigh,

    #[msg("Unsupported protocol")]
    UnsupportedProtocol,

    #[msg("Vault is paused")]
    VaultPaused,

    #[msg("Vault is closed")]
    VaultClosed,

    #[msg("Emergency mode activated")]
    EmergencyMode,

    #[msg("Invalid protocol configuration")]
    InvalidProtocolConfig,

    #[msg("Rebalance threshold not met")]
    RebalanceThresholdNotMet,

    #[msg("Invalid swap route")]
    InvalidSwapRoute,

    #[msg("Price oracle error")]
    PriceOracleError,

    #[msg("CPI call failed")]
    CpiCallFailed,

    #[msg("Invalid vault state")]
    InvalidVaultState,

    #[msg("Allocation limit exceeded")]
    AllocationLimitExceeded,

    #[msg("Invalid fee configuration")]
    InvalidFeeConfig,

    #[msg("Invalid parameter value")]
    InvalidParameter,

    #[msg("Incorrect repay address")]
    IncorrectRepay,

    #[msg("Can not borrow before repay")]
    CannotBorrowBeforeRepay,

    #[msg("Can not find repay instruction")]
    MissingRepay,

    #[msg("Order already exists")]
    OrderAlreadyExists,

    #[msg("Invalid order status")]
    InvalidOrderStatus,

    #[msg("Order deadline passed")]
    DeadlinePassed,

    #[msg("Order deadline not passed")]
    DeadlineNotPassed,

    #[msg("Authority already exists")]
    AuthorityAlreadyExists,

    #[msg("Authority does not exist")]
    AuthorityDoesNotExist,

    #[msg("Max authorities already set")]
    MaxAuthoritiesAlreadySet,

    #[msg("Invalid authority")]
    InvalidAuthority,

    #[msg("Global state is frozen")]
    GlobalStateFrozen,

    #[msg("Invalid order fill deadline")]
    InvalidOrderFillDeadline,

    #[msg("Invalid min amount out")]
    InvalidMinAmountOut,

    #[msg("The signer is not allowed to perform the given action")]
    UnauthorizedSigner,

    #[msg("Order not filled yet")]
    OrderNotFilled,

    #[msg("Invalid token out")]
    InvalidTokenOut,

    #[msg("Insufficient token out")]
    InsufficientTokenOut,

    #[msg("Insufficient fees")]
    InsufficientFees,

    #[msg("Stable coin price too low")]
    StableCoinPriceTooLow,

    #[msg("Stable coin price too high")]
    StableCoinPriceTooHigh,

    #[msg("Source and destination chain id should be different")]
    SameSourceAndDestinationChainIds,

    #[msg("Order amount should be greater than 0")]
    ZeroAmount,

    #[msg("Fee should be less than order amount")]
    ExcessFee,

    #[msg("Invalid trader for the given order")]
    InvalidTrader,

    #[msg("Token in should be same as stable coin")]
    InvalidTokenIn,

    #[msg("Order amount should be less than maximum order amount allowed")]
    MaxOrderAmountExceeded,

    #[msg("The length of the arrays should be greater than 0")]
    EmptyArray,

    #[msg("The length of the arrays: threshold_amounts and bps_fees should be the same")]
    FeeTiersLengthMismatched,

    #[msg("The length of the arrays: threshold_amounts and bps_fees should not be more than 10")]
    FeeTiersLengthExceeded,

    #[msg("The bps fee should be less than 10_000")]
    InvalidBpsFee,

    #[msg("The denominator should be greater than 0")]
    ZeroDenominator,

    #[msg("The length of the arrays: threshold_amounts and insurance_fees should be the same")]
    InsuranceFeeTiersLengthMismatched,

    #[msg("The length of the arrays: threshold_amounts and insurance_fees should not be more than 10")]
    InsuranceFeeTiersLengthExceeded,

    #[msg("The insurance fee should be less than 10_000")]
    InvalidInsuranceFee,

    #[msg("Orchestrator is not authorized to perform this action")]
    InvalidOrchestratorPermission,

    #[msg("Math operation overflow")]
    MathOverflow,

    #[msg("Only admin can perform this action")]
    OnlyAdmin,

    #[msg("Invalid token account data")]
    InvalidTokenAccount,

    #[msg("Platform fee account owner does not match configured platform fee wallet")]
    InvalidPlatformFeeAccount,
}

pub type MarsError = CustomError;

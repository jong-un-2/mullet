import { PublicKey } from "@solana/web3.js";

export const GLOBAL_STATE_SEED = "mars-global-state-seed";
export const TARGET_CHAIN_MIN_FEE_SEED = "mars-target-chain-min-fee";

export const VAULT_SEED = "mars-vault";

export const JUPITER_PROGRAM_ID = new PublicKey(
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
);

// USDC address of devnet
// export const USDC_ADDRESS = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// USDC address of mainnet
// export const USDC_ADDRESS = new PublicKey(
//   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
// );

// USDC address for localnet testing
export const USDC_ADDRESS = new PublicKey(
  "8ABauQYj9xkzk9b4NGxseDFvcXcXFb7ExdkxSstD2fus"
);

export const JUP_ENDPOINT = "https://quote-api.jup.ag/v6";

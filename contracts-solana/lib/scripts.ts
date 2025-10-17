import { BN, Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";
import {
  PublicKey,
  Connection,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  AddressLookupTableAccount,
} from "@solana/web3.js";

import {
  getAdressLookupTableAccounts,
  getAssociatedTokenAccount,
  getATokenAccountsNeedCreate,
  getQuote,
  getSwapIx,
  getUsdcChange,
  instructionDataToTransactionInstruction,
} from "./util";
import { GLOBAL_STATE_SEED, USDC_ADDRESS, VAULT_SEED } from "./constant";
import { Mars } from "../target/types/mars";
import { NATIVE_MINT } from "@solana/spl-token";

const hexStringToUint8Array = (hexString) => {
  // Pad the hex string to 64 characters (32 bytes) if it's shorter
  if (hexString.length < 64) {
    hexString = hexString.padStart(64, "0"); // Left-pad with zeros
  }

  // Validate that the hex string length is now 64 characters
  if (hexString.length !== 64) {
    throw new Error("Hex string must represent 32 bytes.");
  }

  // Convert the hex string to a buffer
  const buffer = Buffer.from(hexString, "hex");

  // Ensure the result is always a 32-byte Uint8Array
  const res = new Uint8Array(32);
  res.set(buffer); // Copy the buffer's data into the 32-byte Uint8Array
  return res;
};

const solanaStringtoUint8Array = (str: string): Uint8Array => {
  const decodedBuffer = bs58.decode(str);

  // Validate the buffer length
  if (decodedBuffer.length > 32) {
    throw new Error("Decoded buffer exceeds 32 bytes.");
  }

  // Create a Uint8Array of size 32 and copy the buffer into it
  const res = new Uint8Array(32);
  res.set(decodedBuffer, 32 - decodedBuffer.length); // Right-align the data (padding at the start)

  return res;
};

const stringToUint8Array = (hexString: string) => {
  // Remove the '0x' prefix if present
  if (hexString.startsWith("0x")) {
    hexString = hexString.slice(2);

    return hexStringToUint8Array(hexString);
  } else {
    return solanaStringtoUint8Array(hexString);
  }
};

export const createInitializeTx = async (
  admin: PublicKey,
  program: Program<Mars>
) => {
  const [globalState, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_STATE_SEED)],
    program.programId
  );
  console.log("globalState: ", globalState.toBase58());

  const [vault, _] = PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED)],
    program.programId
  );
  console.log("vault: ", vault.toBase58());

  const ataVault = getAssociatedTokenAccount(vault, USDC_ADDRESS);
  console.log("ataVault: ", ataVault.toBase58());

  const tx = new Transaction();

  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 }))
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 95_000 }))
    .add(
      await program.methods
        .initialize()
        .accounts({
          admin,
          usdcMint: USDC_ADDRESS,
        })
        .transaction()
    );

  tx.feePayer = admin;

  return tx;
};

export const changeAdminTx = async (
  admin: PublicKey,
  newAdminAddr: PublicKey,
  program: Program<Mars>
) => {
  const tx = new Transaction();
  console.log("changeAdminTx newAdminAddr: ", newAdminAddr.toBase58());

  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
  ).add(
    await program.methods
      .nominateAuthority(newAdminAddr)
      .accounts({
        admin,
      })
      .transaction()
  );

  tx.feePayer = admin;

  return tx;
};

export const acceptAuthorityTx = async (
  newAdminAddr: PublicKey,
  program: Program<Mars>
) => {
  const tx = new Transaction();
  console.log("changeAdminTx newAdminAddr: ", newAdminAddr.toBase58());

  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
  ).add(
    await program.methods
      .acceptAuthority()
      .accounts({
        newAdmin: newAdminAddr,
      })
      .transaction()
  );

  tx.feePayer = newAdminAddr;

  return tx;
};

export const updateGlobalStateParamsTx = async (
  admin: PublicKey,
  program: Program<Mars>,
  rebalanceThreshold?: number,
  crossChainFeeBps?: number,
  maxOrderAmount?: number
) => {
  const tx = await program.methods
    .updateGlobalStateParams(
      rebalanceThreshold,
      crossChainFeeBps,
      new BN(maxOrderAmount)
    )
    .accounts({
      admin,
    })
    .transaction();

  tx.feePayer = admin;

  return tx;
};

export const setFeeTiersTx = async (
  admin: PublicKey,
  program: Program<Mars>
) => {
  const thresholdAmounts = [
    new anchor.BN(0),
    new anchor.BN(100),
    new anchor.BN(1000),
  ];

  const bpsFees = [new anchor.BN(3), new anchor.BN(2), new anchor.BN(1)];
  const tx = await program.methods
    .setFeeTiers(thresholdAmounts, bpsFees)
    .accounts({ admin })
    .transaction();

  tx.feePayer = admin;

  return tx;
};

export const setInsuranceFeeTiersTx = async (
  admin: PublicKey,
  program: Program<Mars>
) => {
  const thresholdAmounts = [
    new anchor.BN(0),
    new anchor.BN(10000000),
    new anchor.BN(1000000000),
  ];

  const insuranceFees = [new anchor.BN(3), new anchor.BN(2), new anchor.BN(1)];
  const tx = await program.methods
    .setInsuranceFeeTiers(thresholdAmounts, insuranceFees)
    .accounts({ admin })
    .transaction();

  tx.feePayer = admin;

  return tx;
};

export const setProtocolFeeFractionTx = async (
  admin: PublicKey,
  program: Program<Mars>,
  numerator: number,
  denominator: number
) => {
  const tx = await program.methods
    .setProtocolFeeFraction(new BN(numerator), new BN(denominator))
    .accounts({ admin })
    .transaction();

  tx.feePayer = admin;

  return tx;
};

export const setTargetChainMinFeeTx = async (
  admin: PublicKey,
  program: Program<Mars>,
  destChainId: number,
  minFee: number
) => {
  const tx = new Transaction();
  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
  ).add(
    await program.methods
      .setTargetChainMinFee(destChainId, new BN(minFee))
      .accounts({ admin, usdcMint: USDC_ADDRESS })
      .transaction()
  );

  tx.feePayer = admin;

  return tx;
};

export const removeBridgeLiquidityTx = async (
  orchestrator: PublicKey,
  amount: number,
  program: Program<Mars>
) => {
  const ataOrchestrator = getAssociatedTokenAccount(orchestrator, USDC_ADDRESS);
  console.log("ataOrchestrator: ", ataOrchestrator.toBase58());

  const [globalState, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_STATE_SEED)],
    program.programId
  );
  console.log("globalState: ", globalState.toBase58());

  const [vault, _] = PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED)],
    program.programId
  );
  console.log("vault: ", vault.toBase58());

  const ataVault = getAssociatedTokenAccount(vault, USDC_ADDRESS);
  console.log("ataVault: ", ataVault.toBase58());

  const tx = await program.methods
    .removeBridgeLiquidity(new BN(amount * 1_000_000))
    .accounts({
      admin: orchestrator,
    })
    .transaction();

  tx.feePayer = orchestrator;

  return tx;
};

// export const createOrderTx = async (
//   user: PublicKey,
//   orchestrator: PublicKey,
//   amount: number,
//   seed: string,
//   orderHash: string,
//   receiver: string,
//   srcChainId: number,
//   destChainId: number,
//   tokenIn: string,
//   fee: number,
//   minAmountOut: number,
//   tokenOut: string,
//   program: Program<Mars>
// ) => {
//   const seedArray = stringToUint8Array(seed);
//   const orderHashArray = stringToUint8Array(orderHash);
//   const receiverArray = stringToUint8Array(receiver);
//   const tokenInArray = stringToUint8Array(tokenIn);
//   const tokenOutArray = stringToUint8Array(tokenOut);

//   const priceUpdate = new PublicKey(
//     "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX"
//   );

//   const [globalState, bump] = PublicKey.findProgramAddressSync(
//     [Buffer.from(GLOBAL_STATE_SEED)],
//     program.programId
//   );
//   console.log("globalState: ", globalState.toBase58());

//   const createOrderTx = new Transaction();
//   createOrderTx
//     .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 170_000 }))
//     .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 120_000 }))
//     .add(
//       await program.methods
//         .createOrder(
//           new BN(amount),
//           [...seedArray],
//           [...orderHashArray],
//           [...receiverArray],
//           srcChainId,
//           destChainId,
//           [...tokenInArray],
//           new BN(fee),
//           new BN(minAmountOut),
//           [...tokenOutArray]
//         )
//         .accounts({
//           trader: user,
//           usdcMint: USDC_ADDRESS,
//           priceUpdate,
//         })
//         .transaction()
//     );

//   createOrderTx.feePayer = orchestrator;

//   return createOrderTx;
// };

// export const fillOrderTx = async (
//   orchestrator: PublicKey,
//   amount: number,
//   seed: string,
//   orderHash: string,
//   trader: string,
//   receiver: PublicKey,
//   srcChainId: number,
//   destChainId: number,
//   tokenIn: string,
//   tokenOut: PublicKey,
//   fee: number,
//   minAmountOut: number,
//   program: Program<Mars>
// ) => {
//   console.log("withdrawAmount: ", amount);

//   const seedArray = stringToUint8Array(seed);
//   const orderHashArray = stringToUint8Array(orderHash);
//   const traderArray = stringToUint8Array(trader);
//   const tokenInArray = stringToUint8Array(tokenIn);

//   const fillOrderTx = new Transaction();
//   fillOrderTx
//     .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 170_000 }))
//     .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 120_000 }))
//     .add(
//       await program.methods
//         .fillOrder(
//           new BN(amount),
//           [...seedArray],
//           [...orderHashArray],
//           [...traderArray],
//           srcChainId,
//           destChainId,
//           [...tokenInArray],
//           new BN(fee),
//           new BN(minAmountOut)
//         )
//         .accounts({
//           orchestrator,
//           usdcMint: USDC_ADDRESS,
//           receiver: receiver,
//           tokenOut: tokenOut,
//         })
//         .transaction()
//     );

//   fillOrderTx.feePayer = orchestrator;

//   return fillOrderTx;
// };

/**
 * Admin can update vault platform fee rate
 * @param admin - admin public key
 * @param vaultMint - vault's base token mint (e.g., PYUSD)
 * @param newPlatformFeeBps - new platform fee in basis points (e.g., 2500 = 25%)
 * @param program - Mars program
 */
export const updateVaultPlatformFeeTx = async (
  admin: PublicKey,
  vaultMint: PublicKey,
  newPlatformFeeBps: number,
  program: Program<Mars>
) => {
  // Derive vault state PDA
  const [vaultState] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault-state"), vaultMint.toBuffer()],
    program.programId
  );

  console.log("Updating vault platform fee:");
  console.log("  Admin:", admin.toBase58());
  console.log("  Vault Mint:", vaultMint.toBase58());
  console.log("  Vault State:", vaultState.toBase58());
  console.log("  New Platform Fee:", newPlatformFeeBps, "bps (", newPlatformFeeBps / 100, "%)");

  const tx = new Transaction();
  
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }))
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }))
    .add(
      await program.methods
        .updateVaultPlatformFee(newPlatformFeeBps)
        .accountsPartial({
          admin: admin,
          vaultState: vaultState,
        })
        .instruction()
    );

  return tx;
};

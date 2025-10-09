import * as anchor from "@coral-xyz/anchor";
import { Program, Provider, web3 } from "@coral-xyz/anchor";
import fs from "fs";

import { PublicKey, Keypair, Connection } from "@solana/web3.js";

import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import { Mars } from "../target/types/mars";
import {
  acceptAuthorityTx,
  changeAdminTx,
  createInitializeTx,
  updateGlobalStateParamsTx,
  setTargetChainMinFeeTx,
  setFeeTiersTx,
  setInsuranceFeeTiersTx,
  setProtocolFeeFractionTx,
} from "../lib/scripts";
import { execTx, getUsdcChange, getVersionedTx } from "../lib/util";
import { bundle, jitoTipAccounts } from "../lib/executor";

let solConnection: Connection = null;
let program: Program<Mars> = null;
let provider: Provider = null;
let payer: NodeWallet = null;
let payerKp: Keypair = null;

/**
 * Set cluster, provider, program
 * If rpc != null use rpc, otherwise use cluster param
 * @param cluster - cluster ex. mainnet-beta, devnet ...
 * @param keypair - wallet keypair
 * @param rpc - rpc
 */
export const setClusterConfig = async (
  cluster: web3.Cluster,
  keypair: string,
  rpc?: string
) => {
  if (!rpc) {
    solConnection = new web3.Connection(web3.clusterApiUrl(cluster));
  } else {
    solConnection = new web3.Connection(rpc);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8"))),
    { skipValidation: true }
  );
  payerKp = walletKeypair;
  const wallet = new NodeWallet(walletKeypair);

  // Configure the client to use the local cluster.
  anchor.setProvider(
    new anchor.AnchorProvider(solConnection, wallet, {
      skipPreflight: true,
      commitment: "confirmed",
    })
  );
  payer = wallet;

  provider = anchor.getProvider();
  console.log("Wallet Address: ", wallet.publicKey.toBase58());

  // Generate the program client from IDL.
  program = anchor.workspace.Mars as Program<Mars>;

  console.log("ProgramId: ", program.programId.toBase58());
};

/**
 * Initialize program
 * Called by admin right after the program deployment
 * to initialize global state and vault accounts
 */
export const initProject = async () => {
  const tx = await createInitializeTx(payer.publicKey, program);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

/**
 * Admin can hand over the admin authority to other address
 * @param newAdminAddr - publicKey of the new admin wallet
 */
export const changeAdmin = async (newAdminAddr: PublicKey) => {
  console.log("changeAdmin newAdminAddr: ", newAdminAddr.toBase58());
  const tx = await changeAdminTx(payer.publicKey, newAdminAddr, program);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

/**
 * New admin can accept the admin authority role
 */
export const acceptAuthority = async () => {
  console.log("acceptAuthority payer: ", payer.publicKey.toBase58());
  const tx = await acceptAuthorityTx(payer.publicKey, program);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

/**
 * Admin can update the threshold amount of the program
 * @param rebalanceThreshold - new threshold amount
 * @param crossChainFeeBps - new cross chain fee bps
 */
export const updateGlobalStateParams = async (
  rebalanceThreshold?: number,
  crossChainFeeBps?: number,
  maxOrderAmount?: number
) => {
  const tx = await updateGlobalStateParamsTx(
    payer.publicKey,
    program,
    rebalanceThreshold,
    crossChainFeeBps,
    maxOrderAmount
  );

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

/**
 * Admin can update the threshold amount of the program
 * @param rebalanceThreshold - new threshold amount
 * @param crossChainFeeBps - new cross chain fee bps
 */
export const setFeeTiers = async () => {
  const tx = await setFeeTiersTx(payer.publicKey, program);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

export const setInsuranceFeeTiers = async () => {
  const tx = await setInsuranceFeeTiersTx(payer.publicKey, program);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

export const setProtocolFeeFraction = async (numerator: number, denominator: number) => {
  const tx = await setProtocolFeeFractionTx(payer.publicKey, program, numerator, denominator);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

/**
 * Admin can update the threshold amount of the program
 * @param rebalanceThreshold - new threshold amount
 * @param crossChainFeeBps - new cross chain fee bps
 */
export const setTargetChainMinFee = async (
  destChainId: number,
  minFee: number
) => {
  const tx = await setTargetChainMinFeeTx(
    payer.publicKey,
    program,
    destChainId,
    minFee
  );

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};



export const getJitoTip = async () => {
  //  get last transactions of all tip accounts
  const allPromises = jitoTipAccounts.map(async (account: string) => {
    return solConnection.getSignaturesForAddress(
      new PublicKey(account),
      { limit: 1 },
      "confirmed"
    );
  });

  try {
    //  get last tip amounts
    const tipAmounts: number[] = [];

    const allSigs = await Promise.all(allPromises);

    for (let i = 0; i < allSigs.length; i++) {
      for (let j = 0; j < allSigs[i].length; j++) {
        const txDetail = await solConnection.getTransaction(
          allSigs[i][j].signature,
          { commitment: "confirmed", maxSupportedTransactionVersion: 0 }
        );

        const tipAccountIdx =
          txDetail.transaction.message.staticAccountKeys.findIndex(
            (pk) => pk.toBase58() === jitoTipAccounts[i]
          );

        const tipAmount =
          txDetail.meta.postBalances[tipAccountIdx] -
          txDetail.meta.preBalances[tipAccountIdx];

        tipAmounts.push(tipAmount);
      }
    }

    //  calculate average amount excluding extremes
    if (tipAmounts.length <= 2) {
      throw new Error("Array must contain more than 2 elements");
    }

    const max_value = Math.max(...tipAmounts);
    const min_value = Math.min(...tipAmounts);
    const total = tipAmounts.reduce((sum, num) => sum + num, 0);

    // Calculate the adjusted sum excluding max and min values
    const adjusted_sum = total - max_value - min_value;

    // Calculate the average
    const average = adjusted_sum / (tipAmounts.length - 2);

    console.log("average: ", average);

    return average;
  } catch (error) {
    console.error("Error fetching signatures", error);
  }

  return process.env.JITO_FEE;
};

/**
 * Claim vault fees by type
 * @param vaultIdHex - vault id in hex format (32 bytes)
 * @param amount - amount to claim
 * @param feeType - fee type: deposit, withdraw, management, performance
 */
export const claimFees = async (
  vaultIdHex: string,
  amount: number,
  feeType: string
) => {
  try {
    // Convert hex vault_id to bytes
    const vaultIdBytes = Buffer.from(vaultIdHex, "hex");
    if (vaultIdBytes.length !== 32) {
      throw new Error("vault_id must be 32 bytes");
    }

    // Derive vault state PDA
    const [vaultStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-state"), vaultIdBytes],
      program.programId
    );

    // Derive vault treasury PDA
    const [vaultTreasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-treasury"), vaultIdBytes],
      program.programId
    );

    // Get vault state to get base token mint
    const vaultState = await program.account.vaultState.fetch(vaultStatePDA);

    // Get or create admin token account
    const adminTokenAccount = await anchor.utils.token.associatedAddress({
      mint: vaultState.baseTokenMint,
      owner: payer.publicKey,
    });

    // Map fee type string to enum
    const feeTypeMap = {
      deposit: { deposit: {} },
      withdraw: { withdraw: {} },
      management: { management: {} },
      performance: { performance: {} },
    };

    const feeTypeEnum = feeTypeMap[feeType.toLowerCase()];
    if (!feeTypeEnum) {
      throw new Error(
        "Invalid fee type. Must be: deposit, withdraw, management, or performance"
      );
    }

    console.log("\n💰 Claiming Vault Fees:");
    console.log("  Vault ID:", vaultIdHex);
    console.log("  Vault State:", vaultStatePDA.toBase58());
    console.log("  Amount:", amount);
    console.log("  Fee Type:", feeType);
    console.log("  Admin:", payer.publicKey.toBase58());

    const tx = await program.methods
      .claimFees(new anchor.BN(amount), feeTypeEnum)
      .accountsStrict({
        admin: payer.publicKey,
        vaultState: vaultStatePDA,
        vaultTreasury: vaultTreasuryPDA,
        adminTokenAccount: adminTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("\n✅ Fees claimed successfully!");
    console.log("Transaction:", tx);

    // Fetch updated vault state
    const updatedVaultState = await program.account.vaultState.fetch(
      vaultStatePDA
    );
    console.log("\n📊 Updated Fee Balances:");
    console.log(
      "  Unclaimed Deposit Fee:",
      updatedVaultState.unclaimedDepositFee.toString()
    );
    console.log(
      "  Unclaimed Withdraw Fee:",
      updatedVaultState.unclaimedWithdrawFee.toString()
    );
    console.log(
      "  Unclaimed Management Fee:",
      updatedVaultState.unclaimedManagementFee.toString()
    );
    console.log(
      "  Unclaimed Performance Fee:",
      updatedVaultState.unclaimedPerformanceFee.toString()
    );
  } catch (error) {
    console.error("Error claiming vault fees:", error);
    throw error;
  }
};

/**
 * Claim all vault fees at once
 * @param vaultIdHex - vault id in hex format (32 bytes)
 */
export const claimAllFees = async (vaultIdHex: string) => {
  try {
    // Convert hex vault_id to bytes
    const vaultIdBytes = Buffer.from(vaultIdHex, "hex");
    if (vaultIdBytes.length !== 32) {
      throw new Error("vault_id must be 32 bytes");
    }

    // Derive vault state PDA
    const [vaultStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-state"), vaultIdBytes],
      program.programId
    );

    // Derive vault treasury PDA
    const [vaultTreasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-treasury"), vaultIdBytes],
      program.programId
    );

    // Get vault state
    const vaultState = await program.account.vaultState.fetch(vaultStatePDA);

    // Get or create admin token account
    const adminTokenAccount = await anchor.utils.token.associatedAddress({
      mint: vaultState.baseTokenMint,
      owner: payer.publicKey,
    });

    console.log("\n💰 Claiming All Vault Fees:");
    console.log("  Vault ID:", vaultIdHex);
    console.log("  Vault State:", vaultStatePDA.toBase58());
    console.log("  Admin:", payer.publicKey.toBase58());
    console.log("\n📊 Current Fee Balances:");
    console.log(
      "  Unclaimed Deposit Fee:",
      vaultState.unclaimedDepositFee.toString()
    );
    console.log(
      "  Unclaimed Withdraw Fee:",
      vaultState.unclaimedWithdrawFee.toString()
    );
    console.log(
      "  Unclaimed Management Fee:",
      vaultState.unclaimedManagementFee.toString()
    );
    console.log(
      "  Unclaimed Performance Fee:",
      vaultState.unclaimedPerformanceFee.toString()
    );

    const totalFees = vaultState.unclaimedDepositFee
      .add(vaultState.unclaimedWithdrawFee)
      .add(vaultState.unclaimedManagementFee)
      .add(vaultState.unclaimedPerformanceFee);

    console.log("  Total Fees:", totalFees.toString());

    if (totalFees.isZero()) {
      console.log("\n⚠️  No fees to claim");
      return;
    }

    const tx = await program.methods
      .claimAllFees()
      .accounts({
        admin: payer.publicKey,
        vaultState: vaultStatePDA,
        vaultTreasury: vaultTreasuryPDA,
        adminTokenAccount: adminTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("\n✅ All fees claimed successfully!");
    console.log("Transaction:", tx);
    console.log("Total amount claimed:", totalFees.toString());
  } catch (error) {
    console.error("Error claiming all vault fees:", error);
    throw error;
  }
};

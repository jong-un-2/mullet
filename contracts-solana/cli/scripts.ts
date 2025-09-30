import * as anchor from "@coral-xyz/anchor";
import { Program, Provider, web3 } from "@coral-xyz/anchor";
import fs from "fs";

import { PublicKey, Keypair, Connection } from "@solana/web3.js";

import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import { Mars } from "../target/types/mars";
import {
  acceptAuthorityTx,
  addOrchestratorTx,
  changeAdminTx,
  createInitializeTx,
  removeBridgeLiquidityTx,
  removeOrchestratorTx,
  // createOrderTx,
  // fillOrderTx,
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

/**
 * Admin can add new orchestrators to the program
 * @param orchestrator - public key of the new orchestrator to be added
 */
export const addOrchestrator = async (orchestrator: PublicKey) => {
  const tx = await addOrchestratorTx(payer.publicKey, orchestrator, program);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

/**
 * Admin can remove orchestrators from the program
 * @param orchestrator - public key of the orchestrator to be removed
 */
export const removeOrchestrator = async (orchestrator: PublicKey) => {
  const tx = await removeOrchestratorTx(payer.publicKey, orchestrator, program);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};

/**
 * Orchestrator can remove bridge liquidity to the vault
 * @param amount - amount of USDC to be added
 */
export const removeBridgeLiquidity = async (amount: number) => {
  const tx = await removeBridgeLiquidityTx(payer.publicKey, amount, program);

  tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;

  await execTx(tx, solConnection, payer);
};


/**
 * User can deposit any type of the token
 * @param tokenIn - address of the source token
 * @param amount - amount of token to be swaped to USDC and deposited
 */
export const createOrder = async (
  user: string,
  amount: number,
  seed: string,
  orderHash: string,
  receiver: string,
  srcChainId: number,
  destChainId: number,
  tokenIn: string,
  fee: number,
  minAmountOut: number,
  tokenOut: string
) => {
  const userKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(user, "utf-8"))),
    { skipValidation: true }
  );
  const userWallet = new NodeWallet(userKp);

  //  here user is fee-payer
  //  payer is orchestrator
  // const tx = await createOrderTx(
  //   userKp.publicKey,
  //   payer.publicKey,
  //   amount,
  //   seed,
  //   orderHash,
  //   receiver,
  //   srcChainId,
  //   destChainId,
  //   tokenIn,
  //   fee,
  //   minAmountOut,
  //   tokenOut,
  //   program
  // );

  // tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;
  // await execTx(tx, solConnection, userWallet);
};

/**
 * User can withdraw to any type of the token
 * orchestrator signs transaction as well and sends the token to user wallet
 * @param user -  path to user Keypair file, should be changed to Wallet on frontend
 * @param tokenOut - addres of the output token
 * @param amount - amount of USDC to be withdrawed
 */
export const fillOrder = async (
  amount: number,
  seed: string,
  orderHash: string,
  trader: string,
  receiver: PublicKey,
  srcChainId: number,
  destChainId: number,
  tokenIn: string,
  tokenOut: PublicKey,
  fee: number,
  minAmountOut: number
) => {
  // const tx = await fillOrderTx(
  //   payer.publicKey,
  //   amount,
  //   seed,
  //   orderHash,
  //   trader,
  //   receiver,
  //   srcChainId,
  //   destChainId,
  //   tokenIn,
  //   tokenOut,
  //   fee,
  //   minAmountOut,
  //   program
  // );
  // tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;
  // await execTx(tx, solConnection, payer);
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

import {
  AddressLookupTableAccount,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  Transaction,
  Connection,
  SimulateTransactionConfig,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";

import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { JUP_ENDPOINT } from "./constant";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import BN from "bn.js";

export const getAssociatedTokenAccount = (
  ownerPubkey: PublicKey,
  mintPk: PublicKey
): PublicKey => {
  let associatedTokenAccountPubkey = PublicKey.findProgramAddressSync(
    [
      ownerPubkey.toBytes(),
      TOKEN_PROGRAM_ID.toBytes(),
      mintPk.toBytes(), // mint address
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];

  return associatedTokenAccountPubkey;
};

export const getAdressLookupTableAccounts = async (
  keys: string[],
  connection: Connection
): Promise<AddressLookupTableAccount[]> => {
  const addressLookupTableAccountInfos =
    await connection.getMultipleAccountsInfo(
      keys.map((key) => new PublicKey(key))
    );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
};

export const instructionDataToTransactionInstruction = (
  instructionPayload: any
) => {
  if (instructionPayload === null) {
    return null;
  }

  return new TransactionInstruction({
    programId: new PublicKey(instructionPayload.programId),
    keys: instructionPayload.accounts.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instructionPayload.data, "base64"),
  });
};

export const getQuote = async (
  fromMint: PublicKey,
  toMint: PublicKey,
  amount: number
) => {
  return fetch(
    `${JUP_ENDPOINT}/quote?outputMint=${toMint.toBase58()}&inputMint=${fromMint.toBase58()}&amount=${amount}&slippage=300&maxAccounts=24`
  ).then((response) => response.json());
};

export const getSwapIx = async (user: PublicKey, quote: any) => {
  const data = {
    quoteResponse: quote,
    userPublicKey: user.toBase58(),
    prioritizationFeeLamports: "auto",
  };

  return fetch(`${JUP_ENDPOINT}/swap-instructions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then((response: any) => response.json());
};

export const getVersionedTx = async (
  instructions: TransactionInstruction[],
  addressLookupTableAccounts: AddressLookupTableAccount[],
  payerKey: PublicKey,
  connection: Connection
): Promise<VersionedTransaction> => {
  const blockhash = await connection.getLatestBlockhash();

  //  make versioned transaction
  const messageV0 = new TransactionMessage({
    payerKey,
    recentBlockhash: blockhash.blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const transaction = new VersionedTransaction(messageV0);

  return transaction;
};

export const execTx = async (
  transaction: Transaction | VersionedTransaction,
  connection: Connection,
  payer: NodeWallet
) => {
  try {
    //  Add recent blockhash if it's not a versioned transaction
    if (transaction instanceof Transaction) {
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
    }

    console.log("payer pubkey: ", payer.publicKey.toBase58());

    //  Sign the transaction with payer wallet
    const signedTx = await payer.signTransaction(transaction);

    console.log(
      "accounts: ",
      (signedTx as Transaction).compileMessage().accountKeys.length
    );

    // Serialize, send and confirm the transaction
    const rawTransaction = signedTx.serialize();

    const result = await connection.simulateTransaction(
      transaction as Transaction
    );
    console.log("simulate result");
    console.log(result);

    if (result.value.err) return;

    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
      preflightCommitment: "processed",
    });
    console.log(`https://solscan.io/tx/${txid}`);

    const confirmed = await connection.confirmTransaction(txid, "confirmed");

    console.log("err ", confirmed.value.err);
  } catch (e) {
    console.log(e);
  }
};

//  simulate versioned tx and get USDC vault change

export const getUsdcChange = async (
  transaction: VersionedTransaction,
  connection: Connection,
  usdcVault: PublicKey
) => {
  try {
    const beforeInfo = await connection.getTokenAccountBalance(usdcVault);

    const accounts = [usdcVault.toBase58()];

    const config: SimulateTransactionConfig = {
      sigVerify: false,
      replaceRecentBlockhash: false,
      commitment: "processed",
      accounts: {
        encoding: "base64",
        addresses: accounts,
      },
    };

    const result = await connection.simulateTransaction(transaction, config);

    //  log simulation result
    console.log(result);

    if (result.value.err) return -1;

    const decoded = Buffer.from(result.value.accounts[0].data[0], "base64");
    const afterBalance = new BN(decoded.subarray(64, 72).reverse()).toNumber();

    return afterBalance - parseInt(beforeInfo.value.amount);
  } catch (e) {
    console.log(e);
  }
};

export const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: PublicKey
) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
};

export const getATokenAccountsNeedCreate = async (
  connection: Connection,
  walletAddress: PublicKey,
  owner: PublicKey,
  nfts: PublicKey[]
) => {
  const instructions = [];
  const destinationAccounts = [];
  for (const mint of nfts) {
    const destinationPubkey = getAssociatedTokenAccount(owner, mint);
    let response = await connection.getAccountInfo(destinationPubkey);
    if (!response) {
      const createATAIx = createAssociatedTokenAccountInstruction(
        destinationPubkey,
        walletAddress,
        owner,
        mint
      );
      instructions.push(createATAIx);
    }
    destinationAccounts.push(destinationPubkey);
    if (walletAddress != owner) {
      const userAccount = getAssociatedTokenAccount(walletAddress, mint);
      response = await connection.getAccountInfo(userAccount);
      if (!response) {
        const createATAIx = createAssociatedTokenAccountInstruction(
          userAccount,
          walletAddress,
          walletAddress,
          mint
        );
        instructions.push(createATAIx);
      }
    }
  }
  return {
    instructions,
    destinationAccounts,
  };
};

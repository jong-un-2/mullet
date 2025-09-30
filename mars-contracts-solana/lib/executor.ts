// Jito Bundling part
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Connection,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import axios, { AxiosError } from "axios";
import bs58 from "bs58";

import dotenv from "dotenv";
dotenv.config();

const JITO_FEE = process.env.JITO_FEE || "";

export const jitoTipAccounts = [
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
];

const getRandomValidatorKey = (): PublicKey => {
  const randomValidator =
    jitoTipAccounts[Math.floor(Math.random() * jitoTipAccounts.length)];
  return new PublicKey(randomValidator);
};

export const bundle = async (
  txs: VersionedTransaction[],
  keypair: Keypair,
  connection: Connection
) => {
  try {
    const txNum = Math.ceil(txs.length / 3);
    let successNum = 0;

    for (let i = 0; i < txNum; i++) {
      const upperIndex = (i + 1) * 3;
      const downIndex = i * 3;
      const newTxs = [];

      for (let j = downIndex; j < upperIndex; j++) {
        if (txs[j]) newTxs.push(txs[j]);
      }

      let success = await bull_dozer(newTxs, keypair, connection);

      if (success && success > 0) successNum += 1;
    }

    return successNum;
  } catch (error) {
    console.log(error);
  }
  return 0;
};

export const bull_dozer = async (
  txs: VersionedTransaction[],
  payer: Keypair,
  connection: Connection
) => {
  try {
    const jitoFeeWallet = getRandomValidatorKey();

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const jitTipTxFeeMessage = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: jitoFeeWallet,
          lamports: Number(JITO_FEE),
        }),
      ],
    }).compileToV0Message();

    const jitoFeeTx = new VersionedTransaction(jitTipTxFeeMessage);
    jitoFeeTx.sign([payer]);

    const jitoTxsignature = bs58.encode(jitoFeeTx.signatures[0]);

    // Serialize the transactions once here
    const serializedJitoFeeTx = bs58.encode(jitoFeeTx.serialize());
    const serializedTransactions = [
      serializedJitoFeeTx,
      ...txs.map((tx: VersionedTransaction) => bs58.encode(tx.serialize())),
    ];

    // https://jito-labs.gitbook.io/mev/searcher-resources/json-rpc-api-reference/url
    const endpoints = [
      "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
      "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
      "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
      "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
      "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
    ];

    const requests = endpoints.map((url) =>
      axios.post(url, {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [serializedTransactions],
      })
    );

    const results = await Promise.all(requests.map((p) => p.catch((e) => e)));

    const successfulResults = results.filter(
      (result) => !(result instanceof Error)
    );

    if (successfulResults.length > 0) {
      const confirmation = await connection.confirmTransaction(
        {
          signature: jitoTxsignature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) return 0;

      txs.map((tx) =>
        console.log(
          `TX Confirmed: https://solscan.io/tx/${bs58.encode(tx.signatures[0])}`
        )
      );
      return 1;
    } else {
      console.log(`No successful responses received for jito`);
    }

    return 0;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.log(
        { error: error.response?.data },
        "Failed to execute jito transaction"
      );
    }

    console.log("Error during transaction execution", error);
    return 0;
  }
};

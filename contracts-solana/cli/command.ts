import { program } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  acceptAuthority,
  changeAdmin,
  getJitoTip,
  initProject,
  setClusterConfig,
  updateGlobalStateParams,
  setTargetChainMinFee,
  setFeeTiers,
  setInsuranceFeeTiers,
  setProtocolFeeFraction,
} from "./scripts";

import { homedir } from "os"; // Import os module to get home directory
import { join } from "path"; // Import path to manage file paths

program.version("0.0.1");

programCommand("init").action(async (options) => {
  const { env, keypair, rpc } = options;

  console.log("Solana Cluster:", env);
  console.log("Keypair Path:", keypair);
  console.log("RPC URL:", rpc);

  await setClusterConfig(env, keypair, rpc);
  await initProject();
});

programCommand("change-admin")
  .option("-n, --new_admin <string>", "new admin address")
  .action(async (directory, cmd) => {
    const { env, keypair, rpc, new_admin } = cmd.opts();

    console.log("Solana Cluster:", env);
    console.log("Keypair Path:", keypair);
    console.log("RPC URL:", rpc);
    await setClusterConfig(env, keypair, rpc);

    if (new_admin === undefined) {
      console.log("Error new admin address");
      return;
    }

    //  update admin address
    await changeAdmin(new PublicKey(new_admin));
  });

programCommand("accept-authority").action(async (directory, cmd) => {
  const { env, keypair, rpc } = cmd.opts();

  console.log("Solana Cluster:", env);
  console.log("Keypair Path:", keypair);
  console.log("RPC URL:", rpc);

  await setClusterConfig(env, keypair, rpc);

  //  update admin address
  await acceptAuthority();
});

programCommand("update-global-state-params")
  .option("-rt, --rebalance_threshold <number>", "new rebalabce threshold")
  .option("-cfb, --cross_chain_fee_bps <number>", "new cross chain fee bps")
  .option("-moa, --max_order_amount <number>", "new max order amount")
  .action(async (directory, cmd) => {
    const {
      env,
      keypair,
      rpc,
      rebalance_threshold,
      cross_chain_fee_bps,
      max_order_amount,
    } = cmd.opts();

    console.log("Solana Cluster:", env);
    console.log("Keypair Path:", keypair);
    console.log("RPC URL:", rpc);
    await setClusterConfig(env, keypair, rpc);

    await updateGlobalStateParams(
      rebalance_threshold,
      cross_chain_fee_bps,
      max_order_amount
    );
  });

programCommand("set-fee-tiers").action(async (directory, cmd) => {
  const { env, keypair, rpc, dest_chain_id, min_fee } = cmd.opts();

  console.log("Solana Cluster:", env);
  console.log("Keypair Path:", keypair);
  console.log("RPC URL:", rpc);
  await setClusterConfig(env, keypair, rpc);

  await setFeeTiers();
});

programCommand("set-insurance-fee-tiers").action(async (directory, cmd) => {
  const { env, keypair, rpc, dest_chain_id, min_fee } = cmd.opts();

  console.log("Solana Cluster:", env);
  console.log("Keypair Path:", keypair);
  console.log("RPC URL:", rpc);
  await setClusterConfig(env, keypair, rpc);

  await setInsuranceFeeTiers();
});

programCommand("set-protocol-fee-fraction")
  .option("-n, --numerator <number>", "new numerator")
  .option("-d, --denominator <number>", "new denominator")
  .action(async (directory, cmd) => {
    const { env, keypair, rpc, numerator, denominator } = cmd.opts();

    console.log("Solana Cluster:", env);
    console.log("Keypair Path:", keypair);
    console.log("RPC URL:", rpc);
    await setClusterConfig(env, keypair, rpc);

    await setProtocolFeeFraction(numerator, denominator);
  });

programCommand("set-target-chain-min-fee")
  .option("-d, --dest_chain_id <number>", "dest chain id")
  .option("-f, --min_fee <number>", "min fee")
  .action(async (directory, cmd) => {
    const { env, keypair, rpc, dest_chain_id, min_fee } = cmd.opts();

    console.log("Solana Cluster:", env);
    console.log("Keypair Path:", keypair);
    console.log("RPC URL:", rpc);
    console.log("Dest Chain ID:", dest_chain_id);
    console.log("Min Fee:", min_fee);
    if (dest_chain_id === undefined) {
      console.log("Error dest chain id");
      return;
    }
    if (min_fee === undefined) {
      console.log("Error min fee");
      return;
    }
    await setClusterConfig(env, keypair, rpc);

    await setTargetChainMinFee(dest_chain_id, min_fee);
  });

programCommand("get-jito-tip").action(async (directory, cmd) => {
  const { env, keypair, rpc } = cmd.opts();

  console.log("Solana Cluster:", env);
  console.log("Keypair Path:", keypair);
  console.log("RPC URL:", rpc);
  await setClusterConfig(env, keypair, rpc);

  await getJitoTip();
});

programCommand("claim-fees")
  .option("-v, --vault_id <string>", "vault id (32 bytes hex)")
  .option("-a, --amount <number>", "amount to claim (in token units)")
  .option("-t, --fee_type <string>", "fee type: deposit, withdraw, management, performance")
  .action(async (directory, cmd) => {
    const { env, keypair, rpc, vault_id, amount, fee_type } = cmd.opts();

    console.log("Solana Cluster:", env);
    console.log("Keypair Path:", keypair);
    console.log("RPC URL:", rpc);
    await setClusterConfig(env, keypair, rpc);

    if (!vault_id || !amount || !fee_type) {
      console.log("Error: vault_id, amount, and fee_type are required");
      return;
    }

    const { claimFees } = await import("./scripts");
    await claimFees(vault_id, parseFloat(amount), fee_type);
  });

programCommand("claim-all-fees")
  .option("-v, --vault_id <string>", "vault id (32 bytes hex)")
  .action(async (directory, cmd) => {
    const { env, keypair, rpc, vault_id } = cmd.opts();

    console.log("Solana Cluster:", env);
    console.log("Keypair Path:", keypair);
    console.log("RPC URL:", rpc);
    await setClusterConfig(env, keypair, rpc);

    if (!vault_id) {
      console.log("Error: vault_id is required");
      return;
    }

    const { claimAllFees } = await import("./scripts");
    await claimAllFees(vault_id);
  });

function programCommand(name: string) {
  return program
    .command(name)
    .option(
      // mainnet-beta, testnet, devnet
      "-e, --env <string>",
      "Solana cluster env name",
      "mainnet-beta"
    )
    .option(
      "-k, --keypair <string>",
      "Solana wallet Keypair Path",
      join(homedir(), ".config/solana/mars-temp-admin.json") // Expand the home directory
    )
    .option(
      // mainnet-beta, testnet, devnet
      "-r, --rpc <string>",
      "Solana rpc url",
      "https://mainnet.helius-rpc.com/?api-key=e2ed9b0c-946c-4517-b414-360729bd6a77"
    );
  // .action((cmd) => {
  //   const { env, keypair } = cmd;

  //   // Set the RPC URL based on the environment selected
  //   let rpc: string;

  //   switch (env) {
  //     case "mainnet-beta":
  //       rpc =
  //         "https://mainnet.helius-rpc.com/?api-key=99c6d984-537e-4569-955b-5e4703b73c0d";
  //       break;
  //     case "testnet":
  //       rpc = "https://api.testnet.solana.com";
  //       break;
  //     case "devnet":
  //       rpc =
  //         "https://frequent-little-voice.solana-devnet.quiknode.pro/bce441b223ed620db7a1f9e2f718a45e6642d6ac";
  //       break;
  //     default:
  //       console.error("Unknown environment selected");
  //       process.exit(1);
  //   }

  //   console.log(`Using RPC: ${rpc}`);
  //   console.log(`Using Keypair Path: ${keypair}`);
  // });
}

program.parse(process.argv);

/*

yarn script init
yarn script change-admin -n A9WxRgrw9m3PMU7X3kgN9baSaBnLyNMpxnb3ENBzXaGr
yarn script accept-authority
yarn script update-global-state-params -rt 80 -cfb 5 -moa 110000000000
yarn script set-target-chain-min-fee -d 10 -f 1
yarn script set-fee-tiers
yarn script add-orchestrator -o F3cNzVaHEvrLwYNzWYvvQwZ7DtW6gcbFVE4Y5EiCpD7k
yarn script add-bridge-liquidity -a 100 -k ./user.json
yarn script remove-bridge-liquidity -a 10 -k ./user.json
yarn script migrate-asset

yarn script create-order -u /Users/satyamkumar/.config/solana/mars-temp-admin.json -a 30 -s 0xd5989bd90276a444016205e273b24260335717aac81676df8d53affd77bdb439 -oh 0xd5989bd90276a444016205e273b24260335717aac81676df8d53affd77bdb449 -rcv 0x8A1c0E832f60bf45bBB5DD777147706Ed5cB6602 -sid 1399811149 -did 10 -ti EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v -f 2 -m 1  -to 0x4200000000000000000000000000000000000042

yarn script fill-order -a 20 -s seed11 -tr 0x96A1fD6ae178a40ce6E8872d8d11465f1ED7eb9B -rcv F3cNzVaHEvrLwYNzWYvvQwZ7DtW6gcbFVE4Y5EiCpD7k -sid 1 -did 1399811149 -ti 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 -f 11 -m 1  -to EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v


yarn script swap-withdraw -u ../key/gnus.json -t So11111111111111111111111111111111111111112 -a 10000 -k ../key/uu.json
yarn script swap-withdraw -u ../key/gnus.json -t 27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4 -a 5000 -k ../key/uu.json
yarn script withdraw-stable-coin -u ../key/gnus.json -a 10000 -k ../key/uu.json

*/

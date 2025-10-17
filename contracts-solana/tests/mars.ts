import * as anchor from "@coral-xyz/anchor";
import {
  Program,
  BorshCoder,
  SystemCoder,
  EventParser,
  web3,
} from "@coral-xyz/anchor";
import { Mars } from "../target/types/mars";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { ComputeBudgetProgram, Keypair } from "@solana/web3.js";
import { assert } from "chai";
import bs58 from "bs58";

describe("mars", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Mars as Program<Mars>;

  const LAMPORTS_PER_SOL = 1_000_000_000;

  let provider = anchor.AnchorProvider.env();
  let wallet = anchor.AnchorProvider.env().wallet;
  let otherAdmin = Keypair.generate();
  let payer = Keypair.generate();
  const orchestrator = Keypair.generate();
  const otherOrchestrator = Keypair.generate();
  let orchestratorAta;
  let user = Keypair.generate();
  let userAta;

  let vault: anchor.web3.PublicKey;
  let vaultAta;

  let usdcMint: anchor.web3.PublicKey;
  let tokenOutMint: anchor.web3.PublicKey;

  const freezeAuthority = Keypair.generate();
  const otherFreezeAuthority = Keypair.generate();

  const thawAuthority = Keypair.generate();
  const otherThawAuthority = Keypair.generate();

  const amount = 1000;
  const trader = Keypair.generate();
  const receiver = Keypair.generate();
  let receiverTokenOutAta;
  const srcChainId = 1;
  const destChainId = 2;

  let timeNow;
  let timeLate;

  let tokenIn: anchor.web3.PublicKey;
  const fee = 100;
  let orderLate: anchor.web3.PublicKey;
  let orderBefore: anchor.web3.PublicKey;

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

  const uint8ArrayToHex = (uint8Array: Uint8Array) => {
    if (uint8Array.length !== 32) {
      throw new Error("Uint8Array must be 32 bytes long.");
    }

    // Convert the Uint8Array to a hex string and prepend '0x'
    const hexString =
      "0x" +
      Array.from(uint8Array)
        .map((byte) => byte.toString(16).padStart(2, "0")) // Convert each byte to a 2-character hex string
        .join(""); // Join all hex strings together

    return hexString;
  };

  const uint8ArrayToSolanaAddress = (arr: Uint8Array): string => {
    if (arr.length !== 32) {
      throw new Error("Uint8Array must be 32 bytes long.");
    }

    // Encode the Uint8Array into a Solana address string
    const solAddress = bs58.encode(arr);
    return solAddress;
  };

  const uint8ArrayToStr = (uint8Array: Uint8Array, isHex = true) => {
    if (isHex) {
      return uint8ArrayToHex(uint8Array);
    } else {
      return uint8ArrayToSolanaAddress(uint8Array);
    }
  };

  const seed = stringToUint8Array(
    "0xd5989bd90276a444016205e264b24250335617aac81676df8d53affd77bdb439"
  ); // Initialize the seed as an array of 32 bytes

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        wallet.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        otherAdmin.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        otherOrchestrator.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        orchestrator.publicKey,
        1000 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        payer.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        freezeAuthority.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        otherFreezeAuthority.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        thawAuthority.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        otherThawAuthority.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        receiver.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    usdcMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey, // Mint authority
      payer.publicKey, // Freeze authority
      6 // 6 decimal places for USDC
    );

    tokenIn = usdcMint;

    tokenOutMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey, // Mint authority
      payer.publicKey, // Freeze authority
      6 // 6 decimal places for USDC
    );

    let [marsVaultAdd, marsVaultB] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("mars-vault")],
        program.programId
      );
    vault = marsVaultAdd;

    vaultAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        usdcMint,
        vault,
        true
      )
    ).address;

    orchestratorAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        usdcMint,
        orchestrator.publicKey,
        true
      )
    ).address;

    userAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        usdcMint,
        user.publicKey,
        true
      )
    ).address;

    receiverTokenOutAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        tokenOutMint,
        receiver.publicKey,
        true
      )
    ).address;

    await mintTo(
      provider.connection,
      payer,
      usdcMint,
      vaultAta,
      payer,
      1000000
    );

    await mintTo(
      provider.connection,
      payer,
      usdcMint,
      orchestratorAta,
      payer,
      1000000
    );

    await mintTo(provider.connection, payer, usdcMint, userAta, payer, 1000000);
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .initialize()
      .accounts({
        admin: otherAdmin.publicKey,
        usdcMint,
      })
      .signers([otherAdmin])
      .rpc();
  });

  it("Nominate authority", async () => {
    const tx = await program.methods
      .nominateAuthority(wallet.publicKey)
      .accounts({
        admin: otherAdmin.publicKey,
      })
      .signers([otherAdmin])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Accept authority", async () => {
    const tx = await program.methods
      .acceptAuthority()
      .accounts({
        newAdmin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature)", tx);
  });

  it("Add other freeze authority", async () => {
    const tx = await program.methods
      .addFreezeAuthority(otherFreezeAuthority.publicKey)
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Remove other freeze authority", async () => {
    const tx = await program.methods
      .removeFreezeAuthority(otherFreezeAuthority.publicKey)
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Add freeze authority", async () => {
    const tx = await program.methods
      .addFreezeAuthority(freezeAuthority.publicKey)
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Add other thaw authority", async () => {
    const tx = await program.methods
      .addThawAuthority(otherThawAuthority.publicKey)
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Remove other thaw authority", async () => {
    const tx = await program.methods
      .removeThawAuthority(otherThawAuthority.publicKey)
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Add thaw authority", async () => {
    const tx = await program.methods
      .addThawAuthority(thawAuthority.publicKey)
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Freeze global state", async () => {
    const tx = await program.methods
      .freezeGlobalState()
      .accounts({
        signer: freezeAuthority.publicKey,
      })
      .signers([freezeAuthority])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Thaw global state", async () => {
    const tx = await program.methods
      .thawGlobalState()
      .accounts({
        signer: thawAuthority.publicKey,
      })
      .signers([thawAuthority])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  // Orchestrator 相关功能已删除
  // it("Add other orchestrator", async () => {
  //   const tx = await program.methods
  //     .addOrchestrator(true, true, true, true, true, true)
  //     .accounts({
  //       admin: wallet.publicKey,
  //       orchestrator: otherOrchestrator.publicKey,
  //     })
  //     .rpc();
  //   console.log("Your transaction signature", tx);
  // });

  // it("Remove other orchestrator", async () => {
  //   const tx = await program.methods
  //     .removeOrchestrator()
  //     .accounts({
  //       admin: wallet.publicKey,
  //       orchestrator: otherOrchestrator.publicKey,
  //     })
  //     .rpc();
  //   console.log("Your transaction signature", tx);
  // });

  // it("Add main orchestrator", async () => {
  //   const tx = await program.methods
  //     .addOrchestrator(true, true, true, true, true, true)
  //     .accounts({
  //       admin: wallet.publicKey,
  //       orchestrator: orchestrator.publicKey,
  //     })
  //     .rpc();
  //   console.log("Your transaction signature", tx);
  // });

  it("Set fee tiers", async () => {
    const tx = await program.methods
      .setFeeTiers(
        [
          new anchor.BN(0),
          new anchor.BN(1000000),
          new anchor.BN(10000000),
          new anchor.BN(100000000),
        ],
        [
          new anchor.BN(30),
          new anchor.BN(20),
          new anchor.BN(10),
          new anchor.BN(5),
        ]
      )
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();

    console.log("Set fee tiers tx sig", tx);
    let [feeTierAdd, feeTierb] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("fee-tiers-seed")],
      program.programId
    );

    const feeTiers = await program.account.feeTiers.fetch(feeTierAdd);

    for (const feeTier of feeTiers.feeTiers) {
      console.log("thresholdAmount", feeTier.thresholdAmount.toNumber());
      console.log("bpsFee", feeTier.bpsFee.toNumber());
    }

    console.log("Done");
  });

  it("Set fee tiers again", async () => {
    const tx = await program.methods
      .setFeeTiers(
        [
          new anchor.BN(0),
          new anchor.BN(200),
          new anchor.BN(500),
          new anchor.BN(800),
          new anchor.BN(1000),
        ],
        [
          new anchor.BN(40),
          new anchor.BN(30),
          new anchor.BN(20),
          new anchor.BN(10),
          new anchor.BN(5),
        ]
      )
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();

    console.log("Set fee tiers again tx sig", tx);
    let [feeTierAdd, feeTierb] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("fee-tiers-seed")],
      program.programId
    );

    const feeTiers = await program.account.feeTiers.fetch(feeTierAdd);

    for (const feeTier of feeTiers.feeTiers) {
      console.log("thresholdAmount", feeTier.thresholdAmount.toNumber());
      console.log("bpsFee", feeTier.bpsFee.toNumber());
    }

    console.log("Done");
  });

  it("Set insurance fee tiers", async () => {
    const tx = await program.methods
      .setInsuranceFeeTiers(
        [
          new anchor.BN(0),
          new anchor.BN(200),
          new anchor.BN(500),
          new anchor.BN(800),
          new anchor.BN(1000),
        ],
        [
          new anchor.BN(11),
          new anchor.BN(10),
          new anchor.BN(9),
          new anchor.BN(8),
          new anchor.BN(7),
        ]
      )
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();

    console.log("Set insurance fee tiers tx sig", tx);
    let [feeTierAdd, feeTierb] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("insurance-fee-tiers-seed")],
      program.programId
    );

    const insuranceFeeTiers = await program.account.insuranceFeeTiers.fetch(
      feeTierAdd
    );

    for (const feeTier of insuranceFeeTiers.insuranceFeeTiers) {
      console.log("thresholdAmount", feeTier.thresholdAmount.toNumber());
      console.log("insuranceFee", feeTier.insuranceFee.toNumber());
    }

    console.log("Done");
  });

  it("Set target chain min fee", async () => {
    const tx = await program.methods
      .setTargetChainMinFee(destChainId, new anchor.BN(10))
      .accounts({
        admin: wallet.publicKey,
        usdcMint,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("update global state params", async () => {
    const tx = await program.methods
      .updateGlobalStateParams(80, 30, new anchor.BN(110_000_000_000))
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Set protocol fee fraction", async () => {
    const tx = await program.methods
      .setProtocolFeeFraction(new anchor.BN(1), new anchor.BN(10))
      .accounts({
        admin: wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  // Order 相关功能已删除 (createOrder, fillOrder, revertOrder 等)
  // it("create order", async () => {
  //   const userPubkeyBytes = user.publicKey.toBytes();

  //   provider.connection.onLogs(program.programId, async (logs, ctx) => {
  //     if (logs.err) {
  //       console.error("Transaction failed:", logs.err);
  //       return;
  //     }

  //     for (const log of logs.logs) {
  //       if (log.startsWith("Program log: OrderCreated:")) {
  //         const eventLog = log.replace("Program log: OrderCreated: ", "");
  //         const eventData = JSON.parse(eventLog);

  //         console.log("Order Created Event:", eventData);
  //         // Example: Access specific event data
  //         console.log("Seed:", eventData.seed);
  //         console.log("Trader:", eventData.trader);
  //         console.log("Amount In:", eventData.amount_in);
  //         console.log("Source Chain ID:", eventData.src_chain_id);
  //         console.log("Destination Chain ID:", eventData.dest_chain_id);
  //         console.log("Fee:", eventData.fee);
  //         console.log("Min amount out:", eventData.min_amount_out);
  //       }
  //     }
  //   });

  //   const tx = await program.methods
  //     .createOrder(
  //       new anchor.BN(amount),
  //       [...seed],
  //       [...seed],
  //       Array.from(receiver.publicKey.toBytes()),
  //       srcChainId,
  //       destChainId,
  //       Array.from(tokenIn.toBytes()),
  //       new anchor.BN(fee),
  //       "122233334443000000000000000000",
  //       Array.from(tokenOutMint.toBytes())
  //     )
  //     .accounts({
  //       trader: orchestrator.publicKey,
  //       usdcMint: usdcMint,
  //     })
  //     .signers([orchestrator])
  //     .rpc();

  //   console.log("Your transaction signature", tx);

  //   await new Promise((resolve) => setTimeout(resolve, 5000));

  //   let [orderAdd, orderStateb] =
  //     await anchor.web3.PublicKey.findProgramAddress(
  //       [Buffer.from(seed), Buffer.from("mars-order")],
  //       program.programId
  //     );
  //   orderLate = orderAdd;

  //   const orderState = await program.account.order.fetch(orderLate);

  //   console.log("Order state", orderState);

  //   assert.equal(orderState.amountIn.toNumber(), amount);
  //   assert.deepEqual(orderState.seed, Array.from(seed));
  //   assert.deepEqual(
  //     orderState.trader,
  //     Array.from(orchestrator.publicKey.toBuffer())
  //   );
  //   assert.deepEqual(
  //     orderState.receiver,
  //     Array.from(receiver.publicKey.toBuffer())
  //   );
  //   assert.deepEqual(orderState.tokenIn, Array.from(usdcMint.toBuffer()));
  //   assert.deepEqual(orderState.tokenOut, Array.from(tokenOutMint.toBuffer()));
  //   assert.ok(orderState.status.created);
  // });

  // const seed2 = stringToUint8Array(
  //   "0x4200000000000000000000000000000000000042"
  // ); // Initialize the seed as an array of 32 bytes
  // it("fill order", async () => {
  //   await mintTo(provider.connection, payer, usdcMint, vaultAta, payer, 11000);

  //   const tx = await program.methods
  //     .fillOrder(
  //       new anchor.BN(amount),
  //       [...seed2],
  //       [...seed2],
  //       Array.from(user.publicKey.toBytes()),
  //       srcChainId,
  //       destChainId,
  //       Array.from(tokenIn.toBytes()),
  //       new anchor.BN(fee),
  //       "122233334444"
  //     )
  //     .accounts({
  //       orchestrator: orchestrator.publicKey,
  //       usdcMint: usdcMint,
  //       receiver: receiver.publicKey,
  //       tokenOut: tokenOutMint,
  //     })
  //     .signers([orchestrator])
  //     .rpc();

  //   console.log("Your transaction signature", tx);

  //   let [orderAdd, orderStateb] =
  //     await anchor.web3.PublicKey.findProgramAddress(
  //       [Buffer.from(seed2), Buffer.from("mars-order")],
  //       program.programId
  //     );
  //   orderLate = orderAdd;

  //   const orderState = await program.account.order.fetch(orderLate);

  //   assert.equal(orderState.amountIn.toNumber(), amount);
  //   assert.deepEqual(orderState.seed, [...Buffer.from(seed2)]);
  //   assert.deepEqual(orderState.trader, Array.from(user.publicKey.toBuffer()));
  //   assert.deepEqual(
  //     orderState.receiver,
  //     Array.from(receiver.publicKey.toBuffer())
  //   );
  //   assert.deepEqual(orderState.tokenIn, Array.from(usdcMint.toBuffer()));
  //   assert.deepEqual(orderState.tokenOut, Array.from(tokenOutMint.toBuffer()));
  //   assert.ok(orderState.status.filled);
  // });

  // claimFees 现在需要 admin 权限,并且参数格式已更改
  // it("claim fees", async () => {
  //   const tx = await program.methods
  //     .claimFees(new anchor.BN(10), { base: {} })
  //     .accounts({
  //       orchestrator: orchestrator.publicKey,
  //       usdcMint: usdcMint,
  //     })
  //     .signers([orchestrator])
  //     .rpc();

  //   console.log("Your transaction signature", tx);
  // });

  // removeBridgeLiquidity 现在需要 admin 权限
  // it("remove bridge liquidity", async () => {
  //   const tx = await program.methods
  //     .removeBridgeLiquidity(new anchor.BN(100))
  //     .accounts({
  //       orchestrator: orchestrator.publicKey,
  //       usdcMint: usdcMint,
  //     })
  //     .signers([orchestrator])
  //     .rpc();

  //   console.log("Your transaction signature", tx);
  // });

  // const seedUser = stringToUint8Array(
  //   "0x8A1c0E832f60bf45bBB5DD777147706Ed5cB6602"
  // ); // Initialize the seed as an array of 32 bytes
  // it("create order by user", async () => {
  //   const tx = await program.methods
  //     .createOrder(
  //       new anchor.BN(amount),
  //       [...Buffer.from(seedUser)],
  //       [...Buffer.from(seedUser)],
  //       Array.from(receiver.publicKey.toBytes()),
  //       srcChainId,
  //       destChainId,
  //       Array.from(tokenIn.toBytes()),
  //       new anchor.BN(fee),
  //       "122233334445",
  //       Array.from(tokenOutMint.toBytes())
  //     )
  //     .accounts({
  //       trader: user.publicKey,
  //       usdcMint: usdcMint,
  //     })
  //     .signers([user])
  //     .rpc();

  //   console.log("Your transaction signature", tx);

  //   // let [orderAdd, orderStateb] =
  //   //   await anchor.web3.PublicKey.findProgramAddress(
  //   //     [Buffer.from(seedUser), Buffer.from("mars-order")],
  //   //     program.programId
  //   //   );
  //   // orderLate = orderAdd;

  //   // const orderState = await program.account.order.fetch(orderLate);

  //   // assert.equal(orderState.amountIn.toNumber(), amount);
  //   // assert.deepEqual(orderState.seed, [...Buffer.from(seedUser)]);
  //   // assert.ok(orderState.status.created);
  // });

  // it("revert order", async () => {
  //   const tx = await program.methods
  //     .revertOrder([...Buffer.from(seedUser)])
  //     .accounts({
  //       orchestrator: orchestrator.publicKey,
  //       trader: user.publicKey,
  //       usdcMint: usdcMint,
  //     })
  //     .signers([orchestrator])
  //     .rpc();

  //   console.log("Your transaction signature", tx);

  //   let [orderAdd, orderStateb] =
  //     await anchor.web3.PublicKey.findProgramAddress(
  //       [Buffer.from(seedUser), Buffer.from("mars-order")],
  //       program.programId
  //     );
  //   orderLate = orderAdd;

  //   const orderState = await program.account.order.fetch(orderLate);

  //   assert.equal(orderState.amountIn.toNumber(), amount);
  //   assert.deepEqual(orderState.seed, [...Buffer.from(seedUser)]);
  //   assert.ok(orderState.status.reverted);
  // });

  // it("fill order token transfer passes", async () => {
  //   const orchestratorPreBalance =
  //     await program.provider.connection.getTokenAccountBalance(orchestratorAta);
  //   const userPreBalance =
  //     await program.provider.connection.getTokenAccountBalance(userAta);
  //   console.log("userPreBalance", userPreBalance.value.amount);

  //   const preBalanceValueStr = orchestratorPreBalance.value.amount;
  //   const preBalanceValueBN = new anchor.BN(preBalanceValueStr).sub(
  //     new anchor.BN(200)
  //   );

  //   const tx = await program.methods
  //     .fillOrderTokenTransfer(new anchor.BN(100), preBalanceValueBN)
  //     .accounts({
  //       receiver: user.publicKey,
  //       tokenOut: usdcMint,
  //       orchestrator: orchestrator.publicKey,
  //     })
  //     .signers([orchestrator])
  //     .rpc();

  //   const userPostBalance =
  //     await program.provider.connection.getTokenAccountBalance(userAta);
  //   console.log("userPostBalance", userPostBalance.value.amount);

  //   console.log("Your transaction signature", tx);
  // });

  // it("fill order token transfer fails", async () => {
  //   const orchestratorPreBalance =
  //     await program.provider.connection.getTokenAccountBalance(orchestratorAta);
  //   const userPreBalance =
  //     await program.provider.connection.getTokenAccountBalance(orchestratorAta);
  //   console.log("userPreBalance", userPreBalance.value.amount);

  //   const preBalanceValueStr = orchestratorPreBalance.value.amount;
  //   const preBalanceValueBN = new anchor.BN(preBalanceValueStr).sub(
  //     new anchor.BN(200)
  //   );

  //   try {
  //     await program.methods
  //       .fillOrderTokenTransfer(new anchor.BN(100), preBalanceValueBN)
  //       .accounts({
  //         receiver: user.publicKey,
  //         tokenOut: usdcMint,
  //         orchestrator: orchestrator.publicKey,
  //       })
  //       .signers([orchestrator])
  //       .rpc();

  //     // If the transaction doesn't throw, the test should fail
  //     console.error("Test failed: transaction did not throw as expected");
  //     assert.fail("Expected transaction to fail but it succeeded");
  //   } catch (err) {
  //     console.log("Test passed: transaction failed as expected");
  //   }
  // });

  // const seed3 = stringToUint8Array(
  //   "0x4200000000000000000000000000000000000043"
  // ); // Initialize the seed as an array of 32 bytes
  // it("create order with tokenIn other than stablecoin fails", async () => {
  //   try {
  //     const tx = await program.methods
  //       .createOrder(
  //         new anchor.BN(amount),
  //         [...seed3],
  //         [...seed3],
  //         Array.from(receiver.publicKey.toBytes()),
  //         srcChainId,
  //         destChainId,
  //         Array.from(tokenOutMint.toBytes()),
  //         new anchor.BN(fee),
  //         "122233334446",
  //         Array.from(tokenIn.toBytes())
  //       )
  //       .accounts({
  //         trader: orchestrator.publicKey,
  //         usdcMint: usdcMint,
  //       })
  //       .signers([orchestrator])
  //       .rpc();

  //     // If the transaction doesn't throw, the test should fail
  //     console.error("Test failed: transaction did not throw as expected");
  //     assert.fail("Expected transaction to fail but it succeeded");
  //   } catch (err) {
  //     console.log("Test passed: transaction failed as expected");
  //   }
  // });
});

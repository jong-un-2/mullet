import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export interface GlobalState {
  admin: PublicKey;
  totalAssets: anchor.BN;
  rebalanceThreshold: number;
}

export interface OrchestratorState {
  orchestrator: PublicKey;
  authorized: number;
}

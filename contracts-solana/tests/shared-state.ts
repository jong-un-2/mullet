/**
 * 共享测试状态
 * 
 * 这个文件存储由 0-setup.test.ts 初始化的全局资源
 * 其他测试文件可以导入并使用这些资源
 */

import { PublicKey } from "@solana/web3.js";

export class SharedTestState {
  private static _usdcMint: PublicKey | null = null;
  private static _globalState: PublicKey | null = null;
  private static _asset: PublicKey | null = null;
  private static _vault: PublicKey | null = null;
  private static _vaultAta: PublicKey | null = null;

  // Setters - 由 setup.test.ts 调用
  static setUsdcMint(mint: PublicKey) {
    this._usdcMint = mint;
  }

  static setGlobalState(state: PublicKey) {
    this._globalState = state;
  }

  static setAsset(asset: PublicKey) {
    this._asset = asset;
  }

  static setVault(vault: PublicKey) {
    this._vault = vault;
  }

  static setVaultAta(ata: PublicKey) {
    this._vaultAta = ata;
  }

  // Getters - 由其他测试文件调用
  static get usdcMint(): PublicKey {
    if (!this._usdcMint) {
      throw new Error("USDC Mint not initialized. Make sure 0-setup.test.ts runs first.");
    }
    return this._usdcMint;
  }

  static get globalState(): PublicKey {
    if (!this._globalState) {
      throw new Error("Global State not initialized. Make sure 0-setup.test.ts runs first.");
    }
    return this._globalState;
  }

  static get asset(): PublicKey {
    if (!this._asset) {
      throw new Error("Asset not initialized. Make sure 0-setup.test.ts runs first.");
    }
    return this._asset;
  }

  static get vault(): PublicKey {
    if (!this._vault) {
      throw new Error("Vault not initialized. Make sure 0-setup.test.ts runs first.");
    }
    return this._vault;
  }

  static get vaultAta(): PublicKey {
    if (!this._vaultAta) {
      throw new Error("Vault ATA not initialized. Make sure 0-setup.test.ts runs first.");
    }
    return this._vaultAta;
  }
}

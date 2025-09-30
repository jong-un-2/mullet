/**
 * Wallet Connection Manager
 * 管理用户钱包连接记录
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, SQL } from 'drizzle-orm';
import { walletConnections } from '../../database/schema';
import type { Env } from '../../index';

export interface WalletConnectionData {
  walletAddress: string;
  walletType: 'privy' | 'metamask' | 'phantom' | 'solflare' | 'backpack' | 'trust' | 'coinbase' | 'rainbow' | 'other';
  chainType: 'ethereum' | 'solana' | 'multi-chain';
  networkId?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  
  // Privy 特有信息
  privyUserId?: string;
  privyEmail?: string;
  privyAuthMethod?: string;
}

export interface WalletDisconnectionData {
  walletAddress: string;
  sessionId?: string;
}

export class WalletConnectionManager {
  private db: ReturnType<typeof drizzle>;

  constructor(env: Env) {
    this.db = drizzle(env.D1_DATABASE!);
  }

  /**
   * 记录钱包连接
   */
  async recordConnection(data: WalletConnectionData): Promise<void> {
    try {
      const currentTime = new Date();
      
      // 先检查是否已有活跃连接
      const existingConnections = await this.db
        .select()
        .from(walletConnections)
        .where(
          and(
            eq(walletConnections.walletAddress, data.walletAddress),
            eq(walletConnections.isConnected, true)
          )
        );

      // 如果已有活跃连接，先断开所有旧连接
      if (existingConnections.length > 0) {
        for (const connection of existingConnections) {
          await this.db
            .update(walletConnections)
            .set({
              isConnected: 0 as any,
              disconnectedAt: currentTime,
              updatedAt: currentTime,
            })
            .where(eq(walletConnections.id, connection.id));
        }
      }

      // 创建新的连接记录
      await this.db.insert(walletConnections).values({
        walletAddress: data.walletAddress,
        walletType: data.walletType as any,
        chainType: data.chainType as any,
        networkId: data.networkId || null,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        sessionId: data.sessionId || null,
        privyUserId: data.privyUserId || null,
        privyEmail: data.privyEmail || null,
        privyAuthMethod: data.privyAuthMethod || null,
        isConnected: 1 as any,
        connectedAt: currentTime,
        lastActiveAt: currentTime,
        createdAt: currentTime,
        updatedAt: currentTime,
      } as any);

      console.log('✅ Wallet connection recorded:', {
        address: data.walletAddress,
        type: data.walletType,
        chain: data.chainType
      });

    } catch (error) {
      console.error('❌ Failed to record wallet connection:', error);
      throw new Error(`Database connection recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 记录钱包断开连接
   */
  async recordDisconnection(data: WalletDisconnectionData): Promise<void> {
    try {
      const currentTime = new Date();
      let whereConditions: SQL<unknown>[] = [
        eq(walletConnections.walletAddress, data.walletAddress),
        eq(walletConnections.isConnected, true)
      ];
      
      // 如果提供了 sessionId，添加到条件中
      if (data.sessionId) {
        whereConditions.push(eq(walletConnections.sessionId, data.sessionId));
      }

      await this.db
        .update(walletConnections)
        .set({
          isConnected: 0 as any,
          disconnectedAt: currentTime,
          updatedAt: currentTime,
        })
        .where(and(...whereConditions));

      console.log('✅ Wallet disconnection recorded:', {
        address: data.walletAddress,
        sessionId: data.sessionId
      });

    } catch (error) {
      console.error('❌ Failed to record wallet disconnection:', error);
      throw new Error(`Database disconnection recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 更新用户活跃时间
   */
  async updateLastActive(walletAddress: string, sessionId?: string): Promise<void> {
    try {
      const currentTime = new Date();
      let whereConditions: SQL<unknown>[] = [
        eq(walletConnections.walletAddress, walletAddress),
        eq(walletConnections.isConnected, true)
      ];
      
      if (sessionId) {
        whereConditions.push(eq(walletConnections.sessionId, sessionId));
      }

      await this.db
        .update(walletConnections)
        .set({
          lastActiveAt: currentTime,
          updatedAt: currentTime,
        })
        .where(and(...whereConditions));

    } catch (error) {
      console.error('❌ Failed to update last active time:', error);
    }
  }

  /**
   * 获取用户连接历史
   */
  async getConnectionHistory(walletAddress: string, limit: number = 10): Promise<any[]> {
    try {
      return await this.db
        .select()
        .from(walletConnections)
        .where(eq(walletConnections.walletAddress, walletAddress))
        .orderBy(desc(walletConnections.connectedAt))
        .limit(limit);

    } catch (error) {
      console.error('❌ Failed to get connection history:', error);
      return [];
    }
  }

  /**
   * 获取活跃连接
   */
  async getActiveConnection(walletAddress: string): Promise<any | null> {
    try {
      const result = await this.db
        .select()
        .from(walletConnections)
        .where(
          and(
            eq(walletConnections.walletAddress, walletAddress),
            eq(walletConnections.isConnected, true)
          )
        )
        .orderBy(desc(walletConnections.connectedAt))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;

    } catch (error) {
      console.error('❌ Failed to get active connection:', error);
      return null;
    }
  }
}

export function createWalletConnectionManager(env: Env): WalletConnectionManager {
  return new WalletConnectionManager(env);
}
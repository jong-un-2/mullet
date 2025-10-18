// API 代理配置 - 用于开发环境
// 在生产环境中，这应该调用真实的后端API

export default {
  // 支持值为 Object 和 Array
  'POST /api/neon/query': async (req: any, res: any) => {
    const { projectId, databaseName, sql, params } = req.body;
    
    try {
      // 这里应该调用真实的Neon数据库
      // 由于在mock环境中无法直接连接数据库，我们返回基于真实数据结构的样本数据
      
      // 模拟数据库查询结果
      let mockResult: any = [];
      
      if (sql.includes('COUNT(*) as "totalTransactions"')) {
        // 统计查询
        mockResult = [{
          totalTransactions: 2,
          totalFee: 0.006344,
          avgFee: 0.003172,
          activeUsers: 1
        }];
      } else if (sql.includes('GROUP BY "user"')) {
        // 用户统计查询
        mockResult = [
          {
            user: 'A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6',
            totalFee: 0.006344,
            transactionCount: 2,
            lastTransaction: '2025-10-18T08:27:19.000Z',
          }
        ];
      } else if (sql.includes('TO_CHAR(_block_timestamp_')) {
        // 趋势数据查询
        mockResult = [
          {
            date: '2025-10-18',
            totalFee: 0.006344,
            transactionCount: 2,
            avgFee: 0.003172,
          }
        ];
      } else {
        // 记录列表查询
        mockResult = [
          {
            blockNumber: 374147014,
            blockTimestamp: '2025-10-18T08:27:19.000Z',
            user: 'A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6',
            vaultMint: 'PYUSD Token-2022',
            farmState: 'Farm1',
            rewardMint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
            rewardAmount: 0.003636,
            totalRewardsClaimed: 0.001212,
            platformFee: 0.001212,
            status: 'success',
          },
          {
            blockNumber: 374147014,
            blockTimestamp: '2025-10-18T08:27:19.000Z',
            user: 'A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6',
            vaultMint: 'PYUSD Token-2022',
            farmState: 'Farm1',
            rewardMint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
            rewardAmount: 0.015396,
            totalRewardsClaimed: 0.005132,
            platformFee: 0.005132,
            status: 'success',
          }
        ];
      }
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 200));
      
      res.json({
        success: true,
        data: mockResult,
        total: mockResult.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '数据库查询失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};
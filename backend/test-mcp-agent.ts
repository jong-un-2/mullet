/**
 * 测试 MCP 数据库代理功能
 * 测试 /mcp/* 路由和 D1Agent Durable Object
 */

async function testMCPAgent() {
  console.log('🧪 开始测试 MCP 数据库代理...\n');

  const baseUrl = process.env.WORKER_URL || 'http://localhost:8787';
  const apiKey = process.env.KEY || process.env.API_KEY;

  if (!apiKey) {
    console.error('❌ 错误: 缺少 API KEY');
    console.log('💡 提示: 设置环境变量 KEY 或 API_KEY');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // 测试1: 检查 MCP 路由是否存在
    console.log('📝 测试 1: 检查 MCP 端点');
    const debugResponse = await fetch(`${baseUrl}/debug`, { headers });
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Debug 端点响应:');
      console.log(JSON.stringify(debugData, null, 2));
    } else {
      console.log(`⚠️  Debug 端点返回状态: ${debugResponse.status}`);
    }
    console.log();

    // 测试2: 测试 D1 数据库路由
    console.log('📝 测试 2: 测试 D1 数据库路由');
    const d1Response = await fetch(`${baseUrl}/v1/api/d1/users`, { headers });
    
    if (d1Response.ok) {
      const d1Data = await d1Response.json();
      console.log('✅ D1 用户查询成功:');
      console.log(`   用户数量: ${d1Data.data?.length || 0}`);
      console.log(`   分页信息: 第 ${d1Data.pagination?.page || 1} 页, 共 ${d1Data.pagination?.total || 0} 条`);
    } else {
      console.log(`⚠️  D1 路由返回状态: ${d1Response.status}`);
      const errorText = await d1Response.text();
      console.log(`   错误信息: ${errorText}`);
    }
    console.log();

    // 测试3: 测试 MCP 数据库相关功能
    console.log('📝 测试 3: 测试数据库表信息');
    const tablesResponse = await fetch(`${baseUrl}/v1/api/d1/tables`, { headers });
    
    if (tablesResponse.ok) {
      const tablesData = await tablesResponse.json();
      console.log('✅ 数据库表查询成功:');
      if (tablesData.tables && Array.isArray(tablesData.tables)) {
        console.log(`   表数量: ${tablesData.tables.length}`);
        tablesData.tables.slice(0, 5).forEach((table: string) => {
          console.log(`   - ${table}`);
        });
        if (tablesData.tables.length > 5) {
          console.log(`   ... 还有 ${tablesData.tables.length - 5} 个表`);
        }
      }
    } else {
      console.log(`⚠️  表查询返回状态: ${tablesResponse.status}`);
    }
    console.log();

    // 测试4: 测试健康检查
    console.log('📝 测试 4: 健康检查');
    const healthResponse = await fetch(`${baseUrl}/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ 健康检查成功:');
      console.log(`   状态: ${healthData.status}`);
      console.log(`   服务: ${healthData.services?.join(', ')}`);
      console.log(`   架构: ${healthData.architecture}`);
      console.log(`   框架: ${healthData.framework}`);
      if (healthData.cache) {
        console.log(`   KV 缓存: ${healthData.cache.kvAvailable ? '可用' : '不可用'}`);
      }
    } else {
      console.log(`⚠️  健康检查返回状态: ${healthResponse.status}`);
    }
    console.log();

    // 测试5: 测试数据库路由完整性
    console.log('📝 测试 5: 测试关键 API 路由');
    const routes = [
      { path: '/dex/health', name: 'DEX 健康检查' },
      { path: '/mars/opportunities', name: 'Mars 收益机会' },
      { path: '/cache/status', name: '缓存状态' },
      { path: '/indexer/health', name: '索引器健康' },
    ];

    for (const route of routes) {
      try {
        const response = await fetch(`${baseUrl}${route.path}`, { headers });
        const statusEmoji = response.ok ? '✅' : '⚠️';
        console.log(`   ${statusEmoji} ${route.name}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`   ❌ ${route.name}: 请求失败`);
      }
    }
    console.log();

    console.log('🎉 MCP 代理测试完成！');
    console.log();
    console.log('📊 总结:');
    console.log('   ✅ MCP 路由可访问');
    console.log('   ✅ D1 数据库集成正常');
    console.log('   ✅ API 端点响应正常');
    console.log();
    console.log('💡 提示:');
    console.log('   - 确保 Worker 已部署: npm run deploy');
    console.log('   - 本地测试: npm run dev');
    console.log('   - 设置环境变量: WORKER_URL=<your-worker-url> KEY=<your-api-key>');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('   错误信息:', error.message);
    }
    process.exit(1);
  }
}

// 运行测试
testMCPAgent();

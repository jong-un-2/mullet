#!/usr/bin/env node

/**
 * Mars Liquid - IPFS 部署脚本
 * 使用 Pinata SDK 上传整个 dist 文件夹
 */

import { PinataSDK, uploadFileArray } from "pinata";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

// 加载环境变量
dotenv.config();

const DIST_DIR = path.join(__dirname, 'dist');
const PROJECT_NAME = 'mars-liquid';

// 递归获取所有文件
async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory()) {
      arrayOfFiles = await getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }

  return arrayOfFiles;
}

// 根据文件扩展名获取 Content-Type
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.wasm': 'application/wasm'
  };
  return types[ext] || 'application/octet-stream';
}

async function main() {
  console.log('\n===================================');
  console.log('  Mars Liquid - IPFS 部署工具');
  console.log('  使用 Pinata SDK + Folder Upload');
  console.log('===================================\n');

  // 检查环境变量
  if (!process.env.PINATA_JWT) {
    log.error('PINATA_JWT 环境变量未设置');
    log.info('请按以下步骤配置:');
    console.log('  1. 复制 .env.example 为 .env');
    console.log('     cp .env.example .env');
    console.log('  2. 访问 https://www.pinata.cloud/ 注册账户');
    console.log('  3. 在 Dashboard -> API Keys 创建新的 JWT Token');
    console.log('  4. 编辑 .env 文件，填入 PINATA_JWT 值');
    process.exit(1);
  }

  // 检查 dist 目录
  try {
    await fs.access(DIST_DIR);
  } catch {
    log.error(`构建目录 '${DIST_DIR}' 不存在`);
    log.info('正在构建项目...');
    const { execSync } = await import('child_process');
    execSync('npm run build', { stdio: 'inherit' });
  }

  try {
    // 初始化 Pinata SDK
    log.info('初始化 Pinata SDK...');
    const pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT
    });

    // 测试连接
    await pinata.testAuthentication();
    log.success('Pinata 认证成功！');

    // 读取所有文件
    log.info(`读取文件夹: ${DIST_DIR}`);
    const files = await getAllFiles(DIST_DIR);
    log.info(`找到 ${files.length} 个文件`);

    // 创建 File 对象数组
    const fileObjects = [];
    for (const filePath of files) {
      const content = await fs.readFile(filePath);
      const relativePath = path.relative(DIST_DIR, filePath);
      const file = new File([content], relativePath, {
        type: getContentType(relativePath)
      });
      fileObjects.push(file);
    }

    // 上传文件数组
    log.info('开始上传到 Pinata...');
    log.info('这可能需要几分钟，请耐心等待...');

    const config = {
      pinataJwt: process.env.PINATA_JWT
    };

    const upload = await uploadFileArray(config, fileObjects, "public", {
      groupId: undefined
    });

    const cid = upload.cid || upload.IpfsHash || upload.ipfs_hash;
    
    if (!cid) {
      throw new Error('No CID returned from Pinata');
    }
    log.success('上传成功！');
    log.success(`CID: ${cid}`);
    console.log('');

    // 显示访问链接（使用支持 HTML 的公共 Gateway）
    log.info('📍 通过公共 IPFS Gateway 访问:');
    console.log('');
    console.log(`   🌟 Dweb.link (推荐): https://${cid}.ipfs.dweb.link/`);
    console.log(`   🌐 IPFS.io:          https://${cid}.ipfs.cf-ipfs.com/`);
    console.log(`   🔗 Cloudflare:       https://cloudflare-ipfs.com/ipfs/${cid}`);
    console.log('');
    
    log.info('💡 提示:');
    console.log('   - 子域名格式 (推荐): 更好的安全性和隔离性');
    console.log('   - 首次访问可能需要 1-2 分钟加载（IPFS 网络传播）');
    console.log('   - 建议使用自定义域名 + DNSLink 获得更好的用户体验');
    console.log('');

    // 保存 CID
    await fs.writeFile('.latest-cid', cid);
    log.success('CID 已保存到 .latest-cid 文件');

    // 保存部署历史
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const historyEntry = `${timestamp} | ${cid} | Pinata SDK\n`;
    await fs.appendFile('.deployment-history', historyEntry);

    console.log('');
    log.success('✅ 部署完成！');
    console.log('');
    log.info('💡 提示: 首次访问可能需要等待 1-2 分钟让内容在 IPFS 网络传播');
    console.log('');
    log.info('📝 下一步 (可选):');
    console.log('  1. 运行 npm run ipfs:verify 验证部署');
    console.log('  2. 配置自定义域名 + DNSLink');
    console.log('  3. 运行 ./update-dnslink.sh 自动更新域名解析');
    console.log('');

  } catch (error) {
    console.log('');
    log.error('❌ 部署失败');
    console.log('');
    console.error(error);
    console.log('');
    log.info('请检查:');
    console.log('  1. PINATA_JWT 是否正确配置在 .env');
    console.log('  2. 网络连接是否正常');
    console.log('  3. Pinata 账户是否有足够的配额');
    console.log('');
    process.exit(1);
  }
}

main();

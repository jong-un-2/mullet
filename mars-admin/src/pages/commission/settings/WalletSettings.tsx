import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message, Form, InputNumber, Input, Typography, Divider, Alert, Modal, Spin } from 'antd';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PageContainer } from '@ant-design/pro-components';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import MarsIDL from '@/idl/mars.json';

const { Title, Text, Paragraph } = Typography;

// 智能合约常量
const PROGRAM_ID = new PublicKey('Dfr6zir7nV2DWduqhtHNdkJn4mMxHf9G8muQSatiZ1k9');
const VAULT_ID = new PublicKey('A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK'); // Kamino PYUSD Vault
const PYUSD_MINT = new PublicKey('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo');

const WalletSettings: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [feeForm] = Form.useForm();
  const [walletForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [txSignature, setTxSignature] = useState<string>('');
  const [currentPlatformFee, setCurrentPlatformFee] = useState<number | null>(null);
  const [currentFeeWallet, setCurrentFeeWallet] = useState<string>('');

  // 从链上读取当前配置
  const fetchOnChainData = async () => {
    try {
      setFetchingData(true);
      
      // 创建 Provider（不需要钱包签名）
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      );
      
      const program = new Program(MarsIDL as any, provider);
      
      // 派生 vault state PDA
      const [vaultStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault-state'), VAULT_ID.toBuffer()],
        PROGRAM_ID
      );
      
      // 派生 global state PDA
      const [globalStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('mars-global-state-seed')],
        PROGRAM_ID
      );
      
      // 读取 vault state
      const vaultState = await program.account.vaultState.fetch(vaultStatePDA);
      const platformFeeBps = vaultState.platformFeeBps as number;
      const platformFeePercent = platformFeeBps / 100;
      
      setCurrentPlatformFee(platformFeePercent);
      feeForm.setFieldsValue({ platformFeeRate: platformFeePercent });
      
      // 读取 global state
      const globalState = await program.account.globalState.fetch(globalStatePDA);
      const feeWallet = globalState.platformFeeWallet.toBase58();
      
      setCurrentFeeWallet(feeWallet);
      walletForm.setFieldsValue({ newFeeWallet: feeWallet });
      
      console.log('链上数据:', {
        platformFeeBps,
        platformFeePercent,
        feeWallet
      });
      
    } catch (error: any) {
      console.error('读取链上数据失败:', error);
      message.warning('无法读取链上配置，请检查网络连接');
    } finally {
      setFetchingData(false);
    }
  };
  
  // 组件加载时读取链上数据
  useEffect(() => {
    fetchOnChainData();
  }, []);

  // 更新平台费率
  const handleUpdatePlatformFee = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      message.error('请先连接钱包');
      return;
    }

    try {
      setLoading(true);
      const values = await feeForm.validateFields();
      const feeBps = Math.round(values.platformFeeRate * 100); // 转换为基点

      // 验证费率范围
      if (feeBps < 0 || feeBps > 10000) {
        message.error('费率必须在 0-100% 之间');
        return;
      }

      // 派生 vault state PDA - 使用 VAULT_ID 而不是 PYUSD_MINT
      const [vaultStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault-state'), VAULT_ID.toBuffer()],
        PROGRAM_ID
      );

      // 创建 Anchor Provider
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      // 加载程序 - 正确的参数顺序是 (IDL, Provider)
      const program = new Program(MarsIDL as any, provider);

      message.loading({ content: '正在构建交易...', key: 'tx' });

      // 构建并发送交易 - 使用 accountsPartial 而不是 accounts
      const tx = await program.methods
        .updateVaultPlatformFee(new BN(feeBps))
        .accountsPartial({
          admin: wallet.publicKey,
          vaultState: vaultStatePDA,
        })
        .rpc();

      setTxSignature(tx);
      message.success({ content: `平台费率已更新为 ${values.platformFeeRate}%`, key: 'tx' });
      
      // 重新读取链上数据
      await fetchOnChainData();
      
      // 显示交易链接
      Modal.success({
        title: '交易成功',
        content: (
          <div>
            <p>平台费率已成功更新为 {values.platformFeeRate}%</p>
            <p>交易签名:</p>
            <a 
              href={`https://solscan.io/tx/${tx}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ wordBreak: 'break-all' }}
            >
              {tx}
            </a>
          </div>
        ),
      });
      
    } catch (error: any) {
      console.error('更新失败:', error);
      message.error({ content: `更新失败: ${error.message}`, key: 'tx' });
    } finally {
      setLoading(false);
    }
  };

  // 更新平台费用钱包
  const handleUpdateFeeWallet = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      message.error('请先连接钱包');
      return;
    }

    try {
      setLoading(true);
      const values = await walletForm.validateFields();
      
      // 验证地址格式
      let newWallet: PublicKey;
      try {
        newWallet = new PublicKey(values.feeWallet);
      } catch {
        message.error('无效的 Solana 地址格式');
        return;
      }

      // 派生 global state PDA
      const [globalStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('mars-global-state-seed')],
        PROGRAM_ID
      );

      // 创建 Anchor Provider
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      // 加载程序
      const program = new Program(MarsIDL as any, provider);

      message.loading({ content: '正在构建交易...', key: 'tx' });

      // 构建并发送交易 - 钱包地址作为方法参数传递，使用 accountsPartial
      const tx = await program.methods
        .updatePlatformFeeWallet(newWallet)
        .accountsPartial({
          admin: wallet.publicKey,
          globalState: globalStatePDA,
        })
        .rpc();

      setTxSignature(tx);
      message.success({ content: '平台费用钱包已更新', key: 'tx' });
      
      // 显示交易链接
      Modal.success({
        title: '交易成功',
        content: (
          <div>
            <p>平台费用钱包已成功更新</p>
            <p>新钱包地址: {values.feeWallet}</p>
            <p>交易签名:</p>
            <a 
              href={`https://solscan.io/tx/${tx}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ wordBreak: 'break-all' }}
            >
              {tx}
            </a>
          </div>
        ),
      });
      
      // 重新读取链上数据
      await fetchOnChainData();
      
    } catch (error: any) {
      console.error('更新失败:', error);
      message.error({ content: `更新失败: ${error.message}`, key: 'tx' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: '区块链设置',
        subTitle: 'Solana 链上配置管理',
        extra: <WalletMultiButton />,
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 提示信息 */}
        <Alert
          message="功能说明"
          description="您可以通过连接 Solana 钱包直接在管理后台执行链上交易。所有操作都会在区块链上记录，确保透明和可追溯。"
          type="info"
          showIcon
        />

        {/* 钱包连接状态 */}
        <Card title="钱包连接状态">
          {wallet.connected ? (
            <Space direction="vertical" size="small">
              <Space>
                <Text strong>状态:</Text>
                <Text style={{ color: '#52c41a' }}>✅ 已连接</Text>
              </Space>
              <Space>
                <Text strong>钱包类型:</Text>
                <Text>{wallet.wallet?.adapter.name || '未知'}</Text>
              </Space>
              <Space>
                <Text strong>地址:</Text>
                <Text code copyable>
                  {wallet.publicKey?.toBase58()}
                </Text>
              </Space>
            </Space>
          ) : (
            <Space direction="vertical">
              <Text>❌ 未连接钱包</Text>
              <Paragraph type="secondary">
                请点击右上角的"Select Wallet"按钮连接您的 Phantom 或 Solflare 钱包。
              </Paragraph>
            </Space>
          )}
        </Card>

        <Divider />

        {/* 平台费率设置 */}
        <Card 
          title="平台费率设置"
          extra={
            currentPlatformFee !== null ? (
              <Text type="secondary">
                链上当前费率: {currentPlatformFee}% ({Math.round(currentPlatformFee * 100)} BPS)
              </Text>
            ) : (
              <Spin size="small" />
            )
          }
        >
          {fetchingData && (
            <Alert
              message="正在从链上读取当前配置..."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Form 
            form={feeForm} 
            layout="vertical"
          >
            <Form.Item
              label="平台费率 (%)"
              name="platformFeeRate"
              rules={[
                { required: true, message: '请输入费率' },
                { type: 'number', min: 0, max: 100, message: '费率范围: 0-100%' }
              ]}
              extra="输入百分比，例如 25 表示 25%。系统会自动转换为基点 (BPS)"
            >
              <InputNumber
                style={{ width: 200 }}
                precision={2}
                step={0.01}
                addonAfter="%"
                disabled={!wallet.connected}
              />
            </Form.Item>

            <Alert
              message="备用方案：CLI 命令"
              description={
                <code style={{ display: 'block', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  cd contracts-solana && yarn script update-vault-platform-fee -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo -f 2500
                </code>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Button 
              type="primary" 
              onClick={handleUpdatePlatformFee}
              loading={loading}
              disabled={!wallet.connected}
            >
              更新平台费率
            </Button>
          </Form>
        </Card>

        <Divider />

        {/* 平台费用钱包设置 */}
        <Card 
          title="平台费用钱包"
          extra={
            currentFeeWallet ? (
              <Text type="secondary">
                当前钱包: {currentFeeWallet.slice(0, 8)}...{currentFeeWallet.slice(-6)}
              </Text>
            ) : (
              <Spin size="small" />
            )
          }
        >
          <Form form={walletForm} layout="vertical">
            <Form.Item
              label="新钱包地址"
              name="feeWallet"
              rules={[
                { required: true, message: '请输入钱包地址' },
                { 
                  validator: async (_, value) => {
                    if (!value) return;
                    try {
                      new PublicKey(value);
                    } catch {
                      throw new Error('无效的 Solana 地址格式');
                    }
                  }
                }
              ]}
              extra={
                currentFeeWallet ? (
                  <Space direction="vertical" size="small" style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      当前钱包地址: 
                      <Text code copyable style={{ marginLeft: 8 }}>
                        {currentFeeWallet}
                      </Text>
                    </Text>
                  </Space>
                ) : null
              }
            >
              <Input
                placeholder="输入新的 Solana 钱包地址"
                disabled={!wallet.connected}
              />
            </Form.Item>

            <Alert
              message="备用方案：CLI 命令"
              description={
                <code style={{ display: 'block', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  cd contracts-solana && yarn script update-platform-fee-wallet -w YOUR_NEW_WALLET_ADDRESS
                </code>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Button 
              type="primary" 
              onClick={handleUpdateFeeWallet}
              loading={loading}
              disabled={!wallet.connected}
            >
              更新费用钱包
            </Button>
          </Form>
        </Card>

        <Divider />

        {/* 说明文档 */}
        <Card title="使用说明">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5}>1. 连接钱包</Title>
              <Paragraph>
                点击右上角的"Select Wallet"按钮，选择 Phantom 或 Solflare 钱包进行连接。
                确保您的钱包地址是合约的管理员地址，否则交易会失败。
              </Paragraph>
            </div>

            <div>
              <Title level={5}>2. 更新平台费率</Title>
              <Paragraph>
                输入新的费率百分比（0-100%），点击更新按钮。钱包会弹出确认窗口，确认后交易将提交到链上。
                交易确认后，新的费率将立即生效。
              </Paragraph>
            </div>

            <div>
              <Title level={5}>3. 更新费用钱包</Title>
              <Paragraph>
                输入新的 Solana 钱包地址，系统会验证地址格式。确认无误后点击更新按钮，
                在钱包中确认交易。所有平台费用将发送到新的钱包地址。
              </Paragraph>
            </div>

            <div>
              <Title level={5}>4. 权限说明</Title>
              <Paragraph type="warning">
                ⚠️ 只有智能合约的管理员地址可以执行这些操作。如果您使用非管理员地址，
                交易将失败并消耗 gas 费用。请确保使用正确的管理员钱包。
              </Paragraph>
            </div>

            <div>
              <Title level={5}>5. 备用方案</Title>
              <Paragraph>
                如果您遇到钱包连接问题或需要批量操作，可以使用 contracts-solana 项目中的 CLI 工具。
                请参考上方卡片中的 CLI 命令示例。
              </Paragraph>
            </div>
          </Space>
        </Card>
      </Space>
    </PageContainer>
  );
};

export default WalletSettings;

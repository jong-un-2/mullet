import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, InputNumber, Button, Space, message, Divider, Switch, Alert, Input } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';

interface CommissionSettings {
  platformFeeRate: number;
  minimumFee: number;
  maximumFee: number;
  feeWallet: string;
  autoCollection: boolean;
  collectionInterval: number;
}

const CommissionSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<CommissionSettings>({
    platformFeeRate: 25, // 25%
    minimumFee: 0.000001,
    maximumFee: 1000,
    feeWallet: 'A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6',
    autoCollection: true,
    collectionInterval: 300, // 5分钟
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // TODO: 调用API保存设置
      setSettings(values);
      message.success('设置保存成功');
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      message.error('保存失败，请检查输入');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(settings);
    message.info('设置已重置');
  };

  useEffect(() => {
    form.setFieldsValue(settings);
  }, [form, settings]);

  return (
    <PageContainer
      header={{
        title: '佣金费率设置',
        breadcrumb: {
          routes: [
            { path: '/', breadcrumbName: '首页' },
            { path: '/commission', breadcrumbName: '佣金费用' },
            { path: '/commission/settings', breadcrumbName: '费率设置' },
          ],
        },
      }}
    >
      <Card title="平台费率配置">
        <Alert
          message="重要提示"
          description="修改费率设置将影响所有新的奖励领取交易。请谨慎操作，确认无误后再保存。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="平台费率 (%)"
            name="platformFeeRate"
            rules={[
              { required: true, message: '请输入平台费率' },
              { type: 'number', min: 0, max: 100, message: '费率必须在0-100之间' },
            ]}
            extra="当前设置为25%，即用户领取奖励时，25%作为平台费用"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              addonAfter="%"
            />
          </Form.Item>

          <Form.Item
            label="最小费用 (PYUSD)"
            name="minimumFee"
            rules={[
              { required: true, message: '请输入最小费用' },
              { type: 'number', min: 0, message: '最小费用不能为负数' },
            ]}
            extra="单笔交易的最小平台费用"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={6}
              stringMode
            />
          </Form.Item>

          <Form.Item
            label="最大费用 (PYUSD)"
            name="maximumFee"
            rules={[
              { required: true, message: '请输入最大费用' },
              { type: 'number', min: 0, message: '最大费用不能为负数' },
            ]}
            extra="单笔交易的最大平台费用上限"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={6}
              stringMode
            />
          </Form.Item>

          <Divider orientation="left">费用收集设置</Divider>

          <Form.Item
            label="平台费用钱包地址"
            name="feeWallet"
            rules={[
              { required: true, message: '请输入费用收集钱包地址' },
              { len: 44, message: '钱包地址长度必须为44位' },
            ]}
            extra="所有平台费用将发送到此钱包地址"
          >
            <Input
              placeholder="请输入Solana钱包地址"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            label="自动收集"
            name="autoCollection"
            valuePropName="checked"
            extra="启用后系统将自动收集平台费用"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="收集间隔 (秒)"
            name="collectionInterval"
            rules={[
              { required: true, message: '请输入收集间隔' },
              { type: 'number', min: 60, message: '收集间隔不能少于60秒' },
            ]}
            extra="自动收集的时间间隔，建议不少于5分钟"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={60}
              max={86400} // 24小时
              addonAfter="秒"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSave}
              >
                保存设置
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="当前费率信息" style={{ marginTop: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ color: '#666', marginBottom: 4 }}>当前费率</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              {settings.platformFeeRate}%
            </div>
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: 4 }}>费用范围</div>
            <div style={{ fontSize: 16 }}>
              {settings.minimumFee} - {settings.maximumFee} PYUSD
            </div>
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: 4 }}>收集状态</div>
            <div style={{ fontSize: 16, color: settings.autoCollection ? '#52c41a' : '#faad14' }}>
              {settings.autoCollection ? '自动收集' : '手动收集'}
            </div>
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: 4 }}>收集间隔</div>
            <div style={{ fontSize: 16 }}>
              {Math.floor(settings.collectionInterval / 60)} 分钟
            </div>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default CommissionSettings;
import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Table, DatePicker, Space, message } from 'antd';
import { DollarCircleOutlined, TrophyOutlined, UserOutlined, TransactionOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getCommissionRecords, getCommissionStatistics, type CommissionRecord as ApiCommissionRecord, type CommissionStatistics } from '@/services/commission/api';

const { RangePicker } = DatePicker;

const CommissionOverview: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const [data, setData] = useState<ApiCommissionRecord[]>([]);
  const [statistics, setStatistics] = useState<CommissionStatistics>({
    totalFee: 0,
    totalTransactions: 0,
    avgFee: 0,
    activeUsers: 0,
    currentFeeRate: 25,
  });

  const columns: ColumnsType<ApiCommissionRecord> = [
    {
      title: '时间',
      dataIndex: 'blockTimestamp',
      key: 'blockTimestamp',
      width: 180,
      render: (timestamp: string) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '用户地址',
      dataIndex: 'user',
      key: 'user',
      ellipsis: true,
      render: (text: string) => (
        <span title={text} style={{ fontFamily: 'monospace' }}>
          {text.slice(0, 8)}...{text.slice(-8)}
        </span>
      ),
    },
    {
      title: '奖励金额 (PYUSD)',
      dataIndex: 'rewardAmount',
      key: 'rewardAmount',
      align: 'right',
      render: (value: number) => (
        <span style={{ fontFamily: 'monospace' }}>
          {typeof value === 'number' ? value.toFixed(6) : '0.000000'}
        </span>
      ),
    },
    {
      title: '费率 (%)',
      key: 'commissionRate',
      align: 'right',
      render: () => `${statistics.currentFeeRate}%`,
    },
    {
      title: '平台费用 (PYUSD)',
      dataIndex: 'platformFee',
      key: 'platformFee',
      align: 'right',
      render: (value: number) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold', fontFamily: 'monospace' }}>
          {typeof value === 'number' ? value.toFixed(6) : '0.000000'}
        </span>
      ),
    },
    {
      title: '交易区块',
      dataIndex: 'blockNumber',
      key: 'blockNumber',
      render: (blockNumber: number) => (
        <a 
          href={`https://solscan.io/block/${blockNumber}`} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          {blockNumber}
        </a>
      ),
    },
  ];

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, statsRes] = await Promise.all([
        getCommissionRecords({
          startDate: dateRange[0].toISOString(),
          endDate: dateRange[1].toISOString(),
          pageSize: 10,
        }),
        getCommissionStatistics({
          startDate: dateRange[0].toISOString(),
          endDate: dateRange[1].toISOString(),
        })
      ]);

      if (recordsRes.success) {
        setData(recordsRes.data);
      } else {
        message.error('获取佣金记录失败');
      }

      setStatistics(statsRes);
    } catch (error) {
      message.error('加载数据失败');
      console.error('加载数据错误:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  return (
    <PageContainer
      header={{
        title: '佣金费用总览',
        breadcrumb: {
          routes: [
            { path: '/', breadcrumbName: '首页' },
            { path: '/commission', breadcrumbName: '佣金费用' },
            { path: '/commission/overview', breadcrumbName: '费用总览' },
          ],
        },
      }}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总平台费用"
              value={statistics.totalFee}
              precision={6}
              valueStyle={{ color: '#3f8600' }}
              prefix={<DollarCircleOutlined />}
              suffix="PYUSD"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="交易笔数"
              value={statistics.totalTransactions}
              valueStyle={{ color: '#1890ff' }}
              prefix={<TransactionOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均费用"
              value={statistics.avgFee}
              precision={6}
              valueStyle={{ color: '#722ed1' }}
              prefix={<TrophyOutlined />}
              suffix="PYUSD"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="当前费率"
              value={statistics.currentFeeRate}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<UserOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="最新费用记录" 
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
            />
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
          }}
        />
      </Card>
    </PageContainer>
  );
};

export default CommissionOverview;
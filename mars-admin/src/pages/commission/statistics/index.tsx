import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, DatePicker, Select, Table, Button, Space, message } from 'antd';
import { Column, Pie, Line } from '@ant-design/charts';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { 
  getCommissionStatistics, 
  getUserStatistics, 
  getTrendData,
  type CommissionStatistics,
  type UserStatistics,
  type TrendData 
} from '@/services/commission/api';
import { getCurrentFeeRate } from '@/config/fee';

const { RangePicker } = DatePicker;
const { Option } = Select;

const CommissionStatistics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [timeUnit, setTimeUnit] = useState<'day' | 'week' | 'month'>('day');
  const [chartData, setChartData] = useState<TrendData[]>([]);
  const [topUsers, setTopUsers] = useState<UserStatistics[]>([]);
  const [statistics, setStatistics] = useState<CommissionStatistics>({
    totalFee: 0,
    totalTransactions: 0,
    avgFee: 0,
    activeUsers: 0,
    currentFeeRate: getCurrentFeeRate(),
  });

  // 动态计算饼图数据
  const pieData = [
    { 
      type: 'PYUSD奖励', 
      value: statistics.totalFee * (100 - statistics.currentFeeRate) / statistics.currentFeeRate,
      percentage: 100 - statistics.currentFeeRate 
    },
    { 
      type: '平台费用', 
      value: statistics.totalFee, 
      percentage: statistics.currentFeeRate 
    },
  ];

  const userColumns: ColumnsType<UserStatistics> = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => index + 1,
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
      title: '总费用 (PYUSD)',
      dataIndex: 'totalFee',
      key: 'totalFee',
      align: 'right',
      render: (value: number) => (
        <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
          {typeof value === 'number' ? value.toFixed(6) : '0.000000'}
        </span>
      ),
      sorter: (a, b) => a.totalFee - b.totalFee,
    },
    {
      title: '交易次数',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      align: 'right',
      sorter: (a, b) => a.transactionCount - b.transactionCount,
    },
    {
      title: '最后交易',
      dataIndex: 'lastTransaction',
      key: 'lastTransaction',
      render: (timestamp: string) => dayjs(timestamp).format('MM-DD HH:mm'),
    },
  ];

  const columnConfig = {
    data: chartData,
    xField: 'date',
    yField: 'totalFee',
    meta: {
      totalFee: { alias: '平台费用 (PYUSD)' },
      date: { alias: '日期' },
    },
    label: {
      position: 'middle' as const,
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
  };

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer' as const,
      content: '{name}: {percentage}%',
    },
    interactions: [{ type: 'element-active' as const }],
  };

  const lineConfig = {
    data: chartData,
    xField: 'date',
    yField: 'transactionCount',
    point: {
      size: 5,
      shape: 'diamond' as const,
    },
    meta: {
      transactionCount: { alias: '交易数量' },
      date: { alias: '日期' },
    },
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
      };

      const [statsRes, usersRes, trendRes] = await Promise.all([
        getCommissionStatistics(params),
        getUserStatistics({ ...params, limit: 10 }),
        getTrendData({ ...params, timeUnit })
      ]);

      setStatistics(statsRes);
      setTopUsers(usersRes);
      setChartData(trendRes);
    } catch (error) {
      message.error('加载统计数据失败');
      console.error('加载统计数据错误:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, timeUnit]);

  const handleExport = () => {
    // TODO: 实现导出功能
    console.log('导出统计数据');
  };

  return (
    <PageContainer
      header={{
        title: '佣金费用统计',
        breadcrumb: {
          routes: [
            { path: '/', breadcrumbName: '首页' },
            { path: '/commission', breadcrumbName: '佣金费用' },
            { path: '/commission/statistics', breadcrumbName: '统计报表' },
          ],
        },
      }}
    >
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
          />
          <Select value={timeUnit} onChange={setTimeUnit} style={{ width: 100 }}>
            <Option value="day">按天</Option>
            <Option value="week">按周</Option>
            <Option value="month">按月</Option>
          </Select>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出报表
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="平台费用趋势" loading={loading}>
            <Column {...columnConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="费用占比分析" loading={loading}>
            <Pie {...pieConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="交易数量趋势" loading={loading}>
            <Line {...lineConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="用户费用排行榜" loading={loading}>
            <Table
              columns={userColumns}
              dataSource={topUsers}
              rowKey="user"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Card title="统计摘要" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                {typeof statistics.totalFee === 'number' ? statistics.totalFee.toFixed(6) : '0.000000'}
              </div>
              <div style={{ color: '#666' }}>总平台费用 (PYUSD)</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {statistics.totalTransactions}
              </div>
              <div style={{ color: '#666' }}>总交易数量</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                {statistics.activeUsers}
              </div>
              <div style={{ color: '#666' }}>活跃用户数</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                {statistics.currentFeeRate}%
              </div>
              <div style={{ color: '#666' }}>当前费率</div>
            </div>
          </Col>
        </Row>
      </Card>
    </PageContainer>
  );
};

export default CommissionStatistics;
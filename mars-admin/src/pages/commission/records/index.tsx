import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import { Card, Table, Button, Space, DatePicker, Input, Select, Tag, Modal, Descriptions, message } from 'antd';
import { SearchOutlined, EyeOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getCommissionRecords, type CommissionRecord } from '@/services/commission/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const CommissionRecords: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CommissionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<CommissionRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const columns: ColumnsType<CommissionRecord> = [
    {
      title: '区块号',
      dataIndex: 'blockNumber',
      key: 'blockNumber',
      width: 120,
      sorter: (a, b) => a.blockNumber - b.blockNumber,
    },
    {
      title: '时间',
      dataIndex: 'blockTimestamp',
      key: 'blockTimestamp',
      width: 180,
      render: (timestamp: string) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.blockTimestamp).unix() - dayjs(b.blockTimestamp).unix(),
    },
    {
      title: '用户地址',
      dataIndex: 'user',
      key: 'user',
      width: 200,
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
      width: 150,
      align: 'right',
      render: (value: number) => (
        <span style={{ fontFamily: 'monospace' }}>
          {value.toFixed(6)}
        </span>
      ),
      sorter: (a, b) => a.rewardAmount - b.rewardAmount,
    },
    {
      title: '平台费用 (PYUSD)',
      dataIndex: 'platformFee',
      key: 'platformFee',
      width: 150,
      align: 'right',
      render: (value: number) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold', fontFamily: 'monospace' }}>
          {value.toFixed(6)}
        </span>
      ),
      sorter: (a, b) => a.platformFee - b.platformFee,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          success: { color: 'success', text: '成功' },
          pending: { color: 'processing', text: '处理中' },
          failed: { color: 'error', text: '失败' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: '成功', value: 'success' },
        { text: '处理中', value: 'pending' },
        { text: '失败', value: 'failed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: CommissionRecord) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedRecord(record);
              setModalVisible(true);
            }}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  // 加载数据
  const loadData = async (params?: any) => {
    setLoading(true);
    try {
      const queryParams: any = {
        current: params?.current || pagination.current,
        pageSize: params?.pageSize || pagination.pageSize,
      };

      if (dateRange) {
        queryParams.startDate = dateRange[0].toISOString();
        queryParams.endDate = dateRange[1].toISOString();
      }

      if (searchText) {
        queryParams.user = searchText;
      }

      if (statusFilter && statusFilter !== 'all') {
        queryParams.status = statusFilter;
      }

      const response = await getCommissionRecords(queryParams);
      
      if (response.success) {
        setData(response.data);
        setPagination(prev => ({
          ...prev,
          current: queryParams.current,
          pageSize: queryParams.pageSize,
          total: response.total,
        }));
      } else {
        message.error('获取佣金记录失败');
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error('加载数据错误:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, searchText, statusFilter]);

  const handleTableChange = (paginationParams: any) => {
    loadData({
      current: paginationParams.current,
      pageSize: paginationParams.pageSize,
    });
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadData({ current: 1, pageSize: pagination.pageSize });
  };

  const handleExport = () => {
    // TODO: 实现导出功能
    console.log('导出数据');
  };

  return (
    <PageContainer
      header={{
        title: '佣金费用记录',
        breadcrumb: {
          routes: [
            { path: '/', breadcrumbName: '首页' },
            { path: '/commission', breadcrumbName: '佣金费用' },
            { path: '/commission/records', breadcrumbName: '费用记录' },
          ],
        },
      }}
    >
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索用户地址"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
          >
            <Option value="all">全部状态</Option>
            <Option value="success">成功</Option>
            <Option value="pending">处理中</Option>
            <Option value="failed">失败</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              } else {
                setDateRange(null);
              }
            }}
            showTime
          />
          <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={data}
          rowKey={(record) => `${record.blockNumber}_${record.user}_${record.blockTimestamp}`}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title="佣金费用记录详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedRecord && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="区块号">
              {selectedRecord.blockNumber}
            </Descriptions.Item>
            <Descriptions.Item label="区块时间">
              {dayjs(selectedRecord.blockTimestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="用户地址" span={2}>
              <span style={{ fontFamily: 'monospace' }}>{selectedRecord.user}</span>
            </Descriptions.Item>
            <Descriptions.Item label="金库代币">
              {selectedRecord.vaultMint}
            </Descriptions.Item>
            <Descriptions.Item label="农场状态">
              {selectedRecord.farmState}
            </Descriptions.Item>
            <Descriptions.Item label="奖励代币" span={2}>
              <span style={{ fontFamily: 'monospace' }}>{selectedRecord.rewardMint}</span>
            </Descriptions.Item>
            <Descriptions.Item label="奖励金额">
              <span style={{ fontFamily: 'monospace' }}>
                {selectedRecord.rewardAmount.toFixed(6)} PYUSD
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="总已领取奖励">
              <span style={{ fontFamily: 'monospace' }}>
                {selectedRecord.totalRewardsClaimed.toFixed(6)} PYUSD
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="平台费用">
              <span style={{ color: '#52c41a', fontWeight: 'bold', fontFamily: 'monospace' }}>
                {selectedRecord.platformFee.toFixed(6)} PYUSD
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="交易状态">
              <Tag color="success">成功</Tag>
            </Descriptions.Item>
            {selectedRecord.transactionSignature && (
              <Descriptions.Item label="交易签名" span={2}>
                <span style={{ fontFamily: 'monospace' }}>
                  {selectedRecord.transactionSignature}
                </span>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
};

export default CommissionRecords;
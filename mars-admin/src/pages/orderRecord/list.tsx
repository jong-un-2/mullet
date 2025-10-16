import type { ProColumns } from '@ant-design/pro-components';
import {
  EditableProTable,
  ProCard,
  ProFormField,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  PageContainer,
  ModalForm,
} from '@ant-design/pro-components';
import React, { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import FileSaver from 'file-saver';

import { Table, Button, Input, Select, Modal, message, Pagination, DatePicker, Image } from "antd";
import { request } from '@umijs/max';
import { addWallet, budan, budanexportIn, budanList, editWalletTime, exportIn, getbudanIndetails, getIndetails, getpayList, getWallet, updateStatus } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
  }, [])
  const [list, setList] = useState([])
  const [searchP, setSearchP] = useState({
    trcNet: '',
    orderId: '',
    status: '',
    fromWalletAddress: '',
    inWalletAddress: '',
    email: '',
    hashId: '',
    type: '',
    startTime: '',
    endTime: ''

  })
  const [data, setData] = useState({})
  const [chakan, setChakan] = useState({})
  const [details, setDetails] = useState({})
  const [email, setEmail] = useState('')
  const [remark, setRemark] = useState('')
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
      ...searchP
    }
    const rep = await budanList(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
        status: item.status == 0 ? '已补单' : item.status == 1 ? '挂帐' : '超时',
        trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOL' : 'BTC',
      }));
      setList(processedData)
      setData(rep.data)
    }
    // console.log('xxxx',rep)
  }



  const columns = [
    {
      title: '入金补单号',
      dataIndex: 'orderLaterId',
      key: 'orderLaterId',
    },
    {
      title: '关联入金单号',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: '用户账号',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '订单生成时间',
      dataIndex: 'oldOrderTime',
      key: 'oldOrderTime',
    },
    {
      title: '主网名称',
      dataIndex: 'trcNet',
      key: 'trcNet',
    },
    // {
    //   title: '入金钱包地址',
    //   dataIndex: 'fromWalletAddress',
    //   key: 'fromWalletAddress',
    // },
    {
      title: '收款钱包昵称',
      dataIndex: 'inWalletName',
      key: 'inWalletName',
    },
    {
      title: '收款钱包地址',
      dataIndex: 'inWalletAddress',
      key: 'inWalletAddress',
    },
    {
      title: '订单Hash',
      dataIndex: 'hashId',
      key: 'hashId',
    },
    {
      title: '入金数量',
      dataIndex: 'money',
      key: 'money',
    },
    {
      title: '转入币种',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
    },
    {
      title: '补单时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <a onClick={() => { setModalOpen(true); setChakan(record); getDetails(record.id) }}>查看</a>
      </>,
    },
  ];
  const exportList = async () => {
    const rep = await budanexportIn(searchP)
    // 创建 Blob 对象
    const blob = new Blob([rep], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    // 使用 file-saver 下载文件
    FileSaver.saveAs(blob, 'data.xlsx');  // 保存文件，data.xlsx 是下载的文件名
  }
  const getDetails = async (id) => {
    const rep = await getbudanIndetails(id)
    if (rep.code == 200) {
      setDetails(rep.data)
    }
  }
  return (
    <PageContainer>
      <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            入金主网
          </div>
          <Select
            defaultValue="全部"
            style={{
              width: 120,
            }}
            value={searchP.trcNet}
            onChange={value => setSearchP({ ...searchP, trcNet: value })}
            options={[
              {
                value: '0',
                label: 'TRC20',
              },
              {
                value: '1',
                label: 'Solana',
              },
              {
                value: '2',
                label: 'BTC',
              },
              {
                value: '',
                label: '全部',
              },
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            入金单号
          </div>
          <Input placeholder="入金单号" value={searchP.orderId} onChange={t => setSearchP({ ...searchP, orderId: t.target.value })} />
        </div>
        {/* <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            入金钱包地址
          </div>
          <Input placeholder="入金钱包地址" value={searchP.fromWalletAddress} onChange={t => setSearchP({ ...searchP, fromWalletAddress: t.target.value })} />
        </div> */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            用户账号
          </div>
          <Input placeholder="用户账号" value={searchP.email} onChange={t => setSearchP({ ...searchP, email: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            收款钱包地址
          </div>
          <Input placeholder="请输入钱包地址" value={searchP.inWalletAddress} onChange={t => setSearchP({ ...searchP, inWalletAddress: t.target.value })} />
        </div>
        <Button
          type="primary"
          key="primary"
          onClick={() => {
            getList(1)
          }}
        >
          查询
        </Button>
        <Button
          type="primary"
          key="primary"
          style={{ marginLeft: 10 }}
          onClick={() => {
            setSearchP({
              trcNet: '',
              orderId: '',
              status: '',
              fromWalletAddress: '',
              inWalletAddress: '',
              email: '',
              hashId: '',
              type: '',
              startTime: '',
              endTime: ''
            })
          }}
        >
          重置
        </Button>
      </div>
      <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            订单Hash
          </div>
          <Input placeholder="订单Hash" value={searchP.hashId} onChange={t => setSearchP({ ...searchP, hashId: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            入金币种
          </div>
          <Select
            defaultValue="全部"
            style={{
              width: 120,
            }}
            value={searchP.type}
            onChange={value => setSearchP({ ...searchP, type: value })}
            options={[
              {
                value: '0',
                label: 'USDT',
              },
              {
                value: '1',
                label: 'SOL',
              },
              {
                value: '2',
                label: 'BTC',
              },
              {
                value: '',
                label: '全部',
              },
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            订单状态
          </div>
          <Select
            defaultValue="全部"
            style={{
              width: 120,
            }}
            value={searchP.status}
            onChange={value => setSearchP({ ...searchP, status: value })}
            options={[
              {
                value: '0',
                label: '已完成',
              },
              {
                value: '1',
                label: '挂账',
              },
              {
                value: '2',
                label: '超时',
              },
              {
                value: '',
                label: '全部',
              },
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            创建时间
          </div>
          <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, startTime: dateString })} placeholder={'开始时间'} name="date" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            结束时间
          </div>
          <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, endTime: dateString })} placeholder={'结束时间'} name="date" />
        </div>
        <Button
          type="primary"
          key="primary"
          onClick={exportList}
        >
          导出表格
        </Button>
      </div>
      <Table dataSource={list} scroll={{ x: 3000 }} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={'用户补单'}
        width="800px"
        open={ModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => setModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            补单单号
          </div>
          <Input placeholder="补单单号" value={chakan.orderId} disabled />
        </div>
        {
          details?.urls?.map((itx, idx) => (
            <Image
              key={idx + 'aooqpwe'}
              width={200}
              src={itx}
            />
          ))
        }

      </Modal>
    </PageContainer>
  );
}

export default App;
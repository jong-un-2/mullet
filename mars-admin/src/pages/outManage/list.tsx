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
import { addWallet, budan, chakanoutCommission, chujinexportIn, chujinhuizong, editWalletTime, exportIn, getIndetails, getoutList, getpayList, getWallet, outCommission, shenhechujin, updateStatus } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
    gethuizong()
  }, [])
  const [list, setList] = useState([])
  const [searchP, setSearchP] = useState({
    trcNet: '',
    orderId: '',
    status: '',
    email: '',
    hashId: '',
    type: '',
    startTime: '',
    endTime: ''

  })
  const [data, setData] = useState({})
  const [chakan, setChakan] = useState({})
  const [shouxufei, setshouxufei] = useState('')
  const [remark, setRemark] = useState('')
  const [hash, setHash] = useState('')
  const [shoukuan, setshoukuan] = useState('')
  const [ckshouxufei, setckshouxufei] = useState([])
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
  const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
  const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
  const [ModalOpen4, setModalOpen4] = useState<boolean>(false);
  const [totalAmount, settotalAmount] = useState(0)
  const [zhouqiArr, setZhouqiArr] = useState([{ trcNet: '0', type: '0', sum: '', single: '', low: '', min: '', max: '' },{ trcNet: '0', type: '0', sum: '', single: '', low: '', min: '', max: '' }, { trcNet: '0', type: '0', sum: '', single: '', low: '', min: '', max: '' }, { trcNet: '0', type: '0', sum: '', single: '', low: '', min: '', max: '' },])
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
      ...searchP
    }
    const rep = await getoutList(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
        status: item.status == 0 ? '已完成' : item.status == 1 ? '审核中' : item.status == 2 ? '拒绝' : '客户手动取消',
        trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOLANA' : 'BTC',
      }));
      setList(processedData)
      setData(rep.data)
    }
    // console.log('xxxx',rep)
  }
  const gethuizong = async () => {
    const p = {
      ...searchP
    }
    const rep = await chujinhuizong(p)
    if (rep.code == 200) {
      settotalAmount(rep.data?.totalAmount)
    }
    // console.log('xxxxx',rep)
  }
  const columns = [
    {
      title: '出金订单号',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: '订单生成时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '用户账号',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '出金主网',
      dataIndex: 'trcNet',
      key: 'trcNet',
    },
    {
      title: '收款钱包地址',
      dataIndex: 'inWalletAddress',
      key: 'inWalletAddress',
    },
    {
      title: '出金币种',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '出金数量',
      dataIndex: 'money',
      key: 'money',
    },
    {
      title: '提币手续费',
      dataIndex: 'free',
      key: 'free',
    },
    {
      title: 'Gas费用',
      dataIndex: 'gas',
      key: 'gas',
    },
    {
      title: '到账数量',
      dataIndex: 'arriveMoney',
      key: 'arriveMoney',
    },
    {
      title: '订单Hash',
      dataIndex: 'hashId',
      key: 'hashId',
    },
    {
      title: '第三方流水号',
      dataIndex: 'cregisId',
      key: 'cregisId',
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
      title: '操作人',
      dataIndex: 'operatorName',
      key: 'operatorName',
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        {
          record.status == '审核中' && !record.cregisId ?
            <>
              <a onClick={() => { setModalOpen1(true); setChakan(record); }}>{'拒绝'}</a>
              <a onClick={() => { setModalOpen(true); setChakan(record); }} style={{ marginLeft: 10 }}>{'通过'}</a>
            </>
            :
            <a onClick={() => { setModalOpen2(true); setChakan(record); }}>{'查看'}</a>
        }

      </>,
    },
  ];
  const exportList = async () => {
    const rep = await chujinexportIn(searchP)
    // 创建 Blob 对象
    const blob = new Blob([rep], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    // 使用 file-saver 下载文件
    FileSaver.saveAs(blob, 'data.xlsx');  // 保存文件，data.xlsx 是下载的文件名
  }
  const updateOrder = async () => {
    const p = {
      "id": chakan.id,
      // "hashId": hash,
      "remark": remark,
      "status": 0 //0审核通过 2审核拒绝
    }
    const rep = await shenhechujin(p)
    if (rep.code == 200) {
      getList(1)
      message.success('操作成功')
      setModalOpen(false)
    } else {
      message.error(rep.msg)
    }
  }
  const updateOrder1 = async () => {
    const p = {
      "id": chakan.id,
      "hashId": '',
      "remark": remark,
      "status": 2  //0审核通过 2审核拒绝
    }
    const rep = await shenhechujin(p)
    if (rep.code == 200) {
      getList(1)
      message.success('操作成功')
      setZhouqiArr([{ trcNet: '0', type: '0', sum: '', single: '', low: '', min: '', max: '' },{ trcNet: '0', type: '0', sum: '', single: '', low: '', min: '', max: '' }, { trcNet: '0', type: '0', sum: '', single: '', low: '', min: '', max: '' }, { trcNet: '0', type: '0', sum: '', single: '', low: '', min: '', max: '' },])
      setModalOpen1(false)
    } else {
      message.error(rep.msg)

    }
  }
  // 更新周期数组的特定字段值
  const handleInputChange = (index, field, value) => {
    const updatedArr = [...zhouqiArr]; // 创建数组的副本
    updatedArr[index] = { ...updatedArr[index], [field]: value }; // 更新特定索引的对象
    setZhouqiArr(updatedArr); // 更新状态
  };
  const item = (i, idx) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }} key={idx}>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Select
            defaultValue="0"
            onChange={value => handleInputChange(idx, 'trcNet', value)}
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
            ]}
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Select
            defaultValue="0"
            onChange={value => handleInputChange(idx, 'type', value)}
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
            ]}
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="总额"
            style={{ width: 120 }}
            onChange={e => handleInputChange(idx, 'sum', e.target.value)} // 更新 revenue 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="单笔"
            style={{ width: 120 }}
            onChange={e => handleInputChange(idx, 'single', e.target.value)} // 更新 revenue 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="最低收取"
            style={{ width: 120 }}
            onChange={e => handleInputChange(idx, 'low', e.target.value)} // 更新 revenue 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2, display: 'flex' }}>
          <Input
            placeholder="最小范围"
            style={{ width: 120 }}
            onChange={e => handleInputChange(idx, 'min', e.target.value)} // 更新 investorsMin 字段
          />
          <Input
            style={{ width: 120, marginLeft: 10 }}
            placeholder="最大范围"
            onChange={e => handleInputChange(idx, 'max', e.target.value)} // 更新 investorsMax 字段
          />
        </div>
      </div>
    )
  }
  const item1 = (i, idx) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }} key={idx + 'xxooll'}>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Select
            defaultValue={i.trcNet + ''}
            disabled
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
            ]}
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Select
            defaultValue={i.type + ''}
            disabled
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
            ]}
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="总额"
            value={i.sum}
            disabled
            style={{ width: 120 }}
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="单笔"
            disabled
            style={{ width: 120 }}
            value={i.single}
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="最低收取"
            style={{ width: 120 }}
            value={i.low}
            disabled
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2, display: 'flex' }}>
          <Input
            placeholder="最小范围"
            style={{ width: 120 }}
            value={i.min}
            disabled
          />
          <Input
            style={{ width: 120, marginLeft: 10 }}
            placeholder="最大范围"
            value={i.max}
            disabled
          />
        </div>
      </div>
    )
  }
  const peizhi = async () => {
    const filteredArr = zhouqiArr.filter(item =>
      Object.values(item).every(value => value !== '')
    );
    const p = {
      "free": shouxufei, //免手续费占比
      "recDto": filteredArr,
    }
    const rep = await outCommission(p)
    if (rep.code == 200) {
      setModalOpen3(false)
      message.success('配置成功')
    } else {
      message.error(rep.msg)
    }
  }
  const chakanshouxufei = async () => {
    const rep = await chakanoutCommission()
    if (rep.code == 200) {
      setckshouxufei(rep.data)
      setModalOpen4(true)
    }
  }
  return (
    <PageContainer>
      <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金主网
          </div>
          <Select
            defaultValue="全部"
            style={{
              width: 120,
            }}
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
            出金单号
          </div>
          <Input placeholder="出金单号" onChange={t => setSearchP({ ...searchP, orderId: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            订单Hash
          </div>
          <Input placeholder="订单Hash" onChange={t => setSearchP({ ...searchP, hashId: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            用户账号
          </div>
          <Input placeholder="用户账号" onChange={t => setSearchP({ ...searchP, email: t.target.value })} />
        </div>
        <Button
          type="primary"
          key="primary"
          onClick={() => {
            getList(1)
            gethuizong()
          }}
        >
          查询
        </Button>
      </div>
      <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金币种
          </div>
          <Select
            defaultValue="全部"
            style={{
              width: 120,
            }}
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
            onChange={value => setSearchP({ ...searchP, status: value })}
            options={[
              {
                value: '0',
                label: '已完成',
              },
              {
                value: '1',
                label: '审核中',
              },
              {
                value: '2',
                label: '拒绝',
              },
              {
                value: '3',
                label: '取消',
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
      <Button
        type="primary"
        key="primary"
        onClick={() => setModalOpen3(true)}
        style={{ marginBottom: 10 }}
      >
        配置出金手续费
      </Button>
      <Button
        type="primary"
        key="primary"
        onClick={chakanshouxufei}
        style={{ marginBottom: 10, marginLeft: 10 }}
      >
        查看出金手续费
      </Button>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 30, marginTop: 30 }}>
        出金总资金：{totalAmount} USDT
      </div>
      <Table dataSource={list} scroll={{ x: 3000 }} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={chakan.status == '已完成' ? '审核通过' : chakan.status == '客户手动取消' ? '客户手动取消' : '审核拒绝'}
        width="800px"
        open={ModalOpen2}
        onCancel={() => setModalOpen2(false)}
        onOk={() => setModalOpen2(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金单号
          </div>
          <Input placeholder="" value={chakan.orderId} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            用户账号
          </div>
          <Input placeholder="" value={chakan.email} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金主网
          </div>
          <Input placeholder="" value={chakan.trcNet} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金币种
          </div>
          <Input placeholder="" value={chakan.type} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金数量
          </div>
          <Input placeholder="" disable value={chakan.money} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转账数量（财务转账金额）
          </div>
          <Input disabled value={chakan.arriveMoney} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            客户收款地址
          </div>
          <Input placeholder="客户收款地址" disabled value={chakan.inWalletAddress} onChange={(e) => setshoukuan(e.target.value)} />
        </div>
        {
          chakan.status == '已完成' ?
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                转账Hash
              </div>
              <Input placeholder="请输入转账Hash" disabled value={chakan.hash} />
            </div>
            :
            null

        }
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            备注
          </div>
          <Input placeholder="请输入备注" disabled value={chakan.remark} />
        </div>
      </Modal>
      <Modal
        okText='提交出金请求'
        title={'审批通过'}
        width="800px"
        open={ModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={updateOrder}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金单号
          </div>
          <Input placeholder="" value={chakan.orderId} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            用户账号
          </div>
          <Input placeholder="" value={chakan.email} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金主网
          </div>
          <Input placeholder="" value={chakan.trcNet} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金币种
          </div>
          <Input placeholder="" value={chakan.type} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金数量
          </div>
          <Input placeholder="" value={chakan.money} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转账数量（财务转账金额）
          </div>
          <Input disabled value={chakan.arriveMoney} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            客户收款地址
          </div>
          <Input placeholder="客户收款地址" disabled value={chakan.inWalletAddress} onChange={(e) => setshoukuan(e.target.value)} />
        </div>
        {/* <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转账Hash
          </div>
          <Input placeholder="请输入转账Hash" value={hash} onChange={(e) => setHash(e.target.value)} />
        </div> */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            备注
          </div>
          <Input placeholder="请输入备注" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
      </Modal>
      <Modal
        title={'拒绝出金'}
        okText={'拒绝出金'}
        width="800px"
        open={ModalOpen1}
        onCancel={() => setModalOpen1(false)}
        onOk={updateOrder1}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金单号
          </div>
          <Input placeholder="" value={chakan.orderId} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            用户账号
          </div>
          <Input placeholder="" value={chakan.email} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金主网
          </div>
          <Input placeholder="" value={chakan.trcNet} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金币种
          </div>
          <Input placeholder="" value={chakan.type} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出金数量
          </div>
          <Input placeholder="" disable value={chakan.money} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转账数量（财务转账金额）
          </div>
          <Input disabled value={chakan.arriveMoney} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            客户收款地址
          </div>
          <Input placeholder="客户收款地址" disabled value={chakan.inWalletAddress} onChange={(e) => setshoukuan(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            备注
          </div>
          <Input placeholder="请输入备注" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
      </Modal>
      <Modal
        title={'出金手续费配置'}
        width="1000px"
        open={ModalOpen3}
        onCancel={() => setModalOpen3(false)}
        onOk={peizhi}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            免手续费要求
          </div>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            交易占充值金额百分比
          </div>
          <Input placeholder="不填则不考虑免手续费条件" value={shouxufei} onChange={(e) => setshouxufei(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            常规收费
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
              配置投资周期
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                主网
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                币种
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                总额%
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                单笔
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                最低收取
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                单笔提现限制
              </div>
            </div>
            {
              zhouqiArr.map((it, idx) => (item(it, idx)))
            }
          </div>
        </div>

      </Modal>
      <Modal
        title={'当前出金手续费'}
        width="1000px"
        open={ModalOpen4}
        onCancel={() => setModalOpen4(false)}
        onOk={() => setModalOpen4(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            免手续费要求
          </div>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            交易占充值金额百分比
          </div>
          <Input placeholder="不填则不考虑免手续费条件" disabled value={ckshouxufei[0]?.commission} onChange={(e) => setshouxufei(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            常规收费
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
              配置投资周期
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                主网
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                币种
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                总额%
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                单笔
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                最低收取
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                单笔提现限制
              </div>
            </div>
            {
              ckshouxufei.map((it, idx) => (item1(it, idx)))
            }
          </div>
        </div>

      </Modal>
    </PageContainer>
  );
}

export default App;
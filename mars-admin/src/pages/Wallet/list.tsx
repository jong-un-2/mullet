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

import { Table, Button, Input, Select, Modal, message, Pagination } from "antd";
import { request } from '@umijs/max';
import { addWallet, editWalletTime, getWallet, updateStatus } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
  }, [])
  const [list, setList] = useState([])
  const [type, setType] = useState(0)
  const [addaddress, setaddaddress] = useState('')
  const [addname, setaddname] = useState('')
  const [addtrcnet, setaddtrcnet] = useState(0)
  const [addenable, setaddenable] = useState(0)
  const [adduse, setadduse] = useState(0)
  const [chakan, setChakan] = useState({})
  const [searchP, setSearchP] = useState({
    trcNet: '',
    enable: '',
    status: '',
    address: '',
    type: '',
  })
  const [time, setTime] = useState('')
  const [data, setData] = useState({})
  const [createModalOpen, handleModalOpen] = useState<boolean>(false);
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
      ...searchP
    }
    const rep = await getWallet(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        enable: item.enable == 0 ? '启用' : '停止',
        status: item.status == 0 ? '未占用' : '占用',
        walletUse: item.walletUse == 0 ? '收款' : '付款',
      }));
      setList(processedData)
      setData(rep.data)
    }
    // console.log('xxxx',rep)
  }
  const addwallet = async () => {
    const p = {
      "name": addname,
      "walletUse": adduse, //钱包用途 0收款 1付款
      "trcNet": addtrcnet, //网络主链
      "enable": addenable, //是否启用 0 启用 1停止
      "address": addaddress, //钱包地址
      "type": type //钱包类型 0 USDT 1 SOL
    }
    const rep = await addWallet(p)
    if (rep.code == 200) {
      handleModalOpen(false)
      message.success('新建成功')
      getList(1)
    } else {
      handleModalOpen(false)
      message.error(rep.msg)
    }
    // console.log('xxxx',rep)
  }



  const columns = [
    {
      title: '钱包昵称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '钱包用途',
      dataIndex: 'walletUse',
      key: 'walletUse',
    },
    {
      title: '钱包主链',
      dataIndex: 'trcNetDesc',
      key: 'trcNetDesc',
    },
    {
      title: '钱包地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '币种类型',
      dataIndex: 'type',
      key: 'type',
      render: (_, record) => <>
        <div>{record.type == 0 ? 'USDT' : record.type == 1 ? 'SOL' : record.type == 2 ? 'BTC' : null}</div>
      </>
    },
    {
      title: '是否启用',
      dataIndex: 'enable',
      key: 'enable',
    },
    {
      title: '占用状态',
      dataIndex: 'status',
      key: 'status',
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
        <a onClick={() => { setChakan(record); setModalOpen(true) }}>查看</a>
        <a style={{ marginLeft: 10 }}
          onClick={async () => {
            const p = {
              "id": record.id,
              "enable": record.enable == '启用' ? 1 : 0
            }
            const rep = await updateStatus(p)
            if (rep.code == 200) {
              getList(1)
              message.success(record.enable == '启用' ? '停用成功' : '启用成功')
            } else {
              message.error(rep.msg)
            }
          }}>{record.enable == '启用' ? '停用' : '启用'}</a>
      </>,
    },
  ];

  const editTime = async () => {

    const rep = await editWalletTime(time)
    if (rep.code == 200) {
      message.success('修改成功')
    } else {
      message.error(rep.msg)
    }
    // console.log('xxxx',rep)
  }
  return (
    <PageContainer>
      <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包主链
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
            是否启用
          </div>
          <Select
            defaultValue="全部"
            style={{
              width: 120,
            }}
            onChange={value => setSearchP({ ...searchP, enable: value })}
            options={[
              {
                value: '0',
                label: '启用',
              },
              {
                value: '1',
                label: '停用',
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
            钱包状态
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
                label: '空闲',
              },
              {
                value: '1',
                label: '占用',
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
            钱包地址
          </div>
          <Input placeholder="请输入钱包地址" onChange={t => setSearchP({ ...searchP, address: t.target.value })} />
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
      </div>
      <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end' }}>
        <Button
          type="primary"
          key="primary"
          style={{ marginRight: 10 }}
          onClick={() => {
            handleModalOpen(true);
          }}
        >
          <PlusOutlined /> 新建钱包
        </Button>
        <div style={{ display: 'flex', alignItems: 'flex-end', }}>
          <Input placeholder="请输入钱包占用时间（min）" onChange={t => setTime(t.target.value)} value={time} style={{ width: 230 }} />
          <Button
            type="primary"
            key="primary"
            style={{ marginLeft: 10 }}
            onClick={() => {
              editTime()
            }}
          >
            修改
          </Button>
        </div>
      </div>
      <Table dataSource={list} scroll={{ x: 1400 }} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={'新建钱包'}
        width="400px"
        open={createModalOpen}
        onCancel={() => handleModalOpen(false)}
        onOk={addwallet}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包昵称
          </div>
          <Input placeholder="请输入钱包昵称" value={addname} onChange={e => setaddname(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包主链
          </div>
          <Select
            defaultValue="TRC20"
            style={{
              width: 120,
            }}
            onChange={e => setaddtrcnet(e)}
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
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            币种类型
          </div>
          <Select
            defaultValue="USDT"
            style={{
              width: 120,
            }}
            onChange={e => setType(e)}
            options={[
              {
                value: 0,
                label: 'USDT',
              },
              {
                value: 1,
                label: 'SOL',
              },
              {
                value: 2,
                label: 'BTC',
              },

            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包地址
          </div>
          <Input placeholder="请输入钱包地址" value={addaddress} onChange={e => setaddaddress(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包用途
          </div>
          <Select
            defaultValue="收款"
            style={{
              width: 120,
            }}
            onChange={e => setadduse(e)}
            options={[
              {
                value: '0',
                label: '收款',
              },
              {
                value: '1',
                label: '付款',
              },
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            是否启用
          </div>
          <Select
            defaultValue="启用"
            style={{
              width: 120,
            }}
            onChange={e => setaddenable(e)}
            options={[
              {
                value: '0',
                label: '启用',
              },
              {
                value: '1',
                label: '停用',
              },
            ]}
          />
        </div>
      </Modal>
      <Modal
        title={'查看钱包'}
        width="400px"
        open={ModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => setModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包昵称
          </div>
          <Input placeholder="请输入钱包昵称" disabled value={chakan?.name} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包主链
          </div>
          <Select
            defaultValue={chakan?.trcNetDesc}
            style={{
              width: 120,
            }}
            disabled
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            币种类型
          </div>
          <Select
            defaultValue={chakan?.type}
            style={{
              width: 120,
            }}
            disabled
            options={[
              {
                value: 0,
                label: 'USDT',
              },
              {
                value: 1,
                label: 'SOL',
              },
              {
                value: 2,
                label: 'BTC',
              },

            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包地址
          </div>
          <Input placeholder="请输入钱包地址" disabled value={chakan?.address} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            钱包用途
          </div>
          <Select
            defaultValue={chakan?.walletUse}
            disabled
            style={{
              width: 120,
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            是否启用
          </div>
          <Select
            defaultValue={chakan?.enable}
            style={{
              width: 120,
            }}
            disabled
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222' }}>
            钱包二维码
          </div>
          <img src={`data:image/png;base64,${chakan?.imgUrl}`} style={{ height: 150, width: 150 }} />
        </div>
      </Modal>
    </PageContainer>
  );
}

export default App;
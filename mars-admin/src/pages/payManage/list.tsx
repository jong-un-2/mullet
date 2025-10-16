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
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import FileSaver from 'file-saver';

import { Table, Button, Input, Select, Modal, message, Pagination, DatePicker, Image, Upload } from "antd";
import { request } from '@umijs/max';
import { addWallet, budan, editWalletTime, exportIn, getIndetails, getpayList, getWallet, rujinhuizong, updateStatus } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
    gethuizong()
  }, [])
  const [list, setList] = useState([])
  const [searchP, setSearchP] = useState({
    trcNet: '',
    orderId: '',
    status: '0',
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
  const [loading, setLoading] = useState(false);
  const [remark, setRemark] = useState('')
  const [imageUrl, setImageUrl] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const [totalAmount, settotalAmount] = useState(0)
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
      ...searchP
    }
    const rep = await getpayList(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
        status: item.status == 0 ? '已完成' : item.status == 1 ? '挂帐' : item.status == 2 ? '超时' : '待支付',
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
    const rep = await rujinhuizong(p)
    if (rep.code == 200) {
      settotalAmount(rep.data?.totalAmount)
    }
    // console.log('xxxxx',rep)
  }


  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('You can only upload JPG/PNG file!');
    }
    // const isLt2M = file.size / 1024 / 1024 < 2;
    // if (!isLt2M) {
    //   message.error('Image must smaller than 2MB!');
    // }
    return isJpgOrPng;
  };
  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );
  const handleChange = (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      // Get this url from response in real world.
      getBase64(info.file.originFileObj, (url) => {
        setLoading(false);
        setImageUrl(url);
      });
      if (info.file.response.code == 200) {
        setImgUrl(info.file.response.data)
      }
    }

    // console.log('xxxx', info)
  };
  const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
  };
  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '用户账号',
      dataIndex: 'email',
      key: 'email',
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
      title: '主网名称',
      dataIndex: 'trcNet',
      key: 'trcNet',
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
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <a onClick={() => { setModalOpen(true); setChakan(record); getDetails(record.id) }}>{record.status == '挂帐' ? '创建补单' : '查看'}</a>
      </>,
    },
  ];
  const exportList = async () => {
    const rep = await exportIn(searchP)
    // 创建 Blob 对象
    const blob = new Blob([rep], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    // 使用 file-saver 下载文件
    FileSaver.saveAs(blob, 'data.xlsx');  // 保存文件，data.xlsx 是下载的文件名
  }
  const updateOrder = async () => {
    if (chakan.status != '挂帐') {
      setModalOpen(false)
      return
    }
    const p = {
      id: chakan.id,
      email: email,
      remark: remark,
      credentialsUrl: [imgUrl]
    }
    const rep = await budan(p)
    if (rep.code == 200) {
      message.success('提交成功')
      setModalOpen(false)
      getList(1)
    } else {
      message.error(rep.msg)
    }
  }
  const getDetails = async (id) => {
    const rep = await getIndetails(id)
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
            gethuizong()
          }}
        >
          查询
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
            value={searchP.status}
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
                label: '挂账',
              },
              {
                value: '2',
                label: '超时',
              },
              {
                value: '3',
                label: '待支付',
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
          onClick={() => {
            setSearchP(
              {
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
              }
            )
          }}
        >
          重置
        </Button>
        <Button
          type="primary"
          key="primary"
          onClick={exportList}
        >
          导出表格
        </Button>
      </div>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 30, marginTop: 30 }}>
        入金总资金：{totalAmount} USDT
      </div>
      <Table dataSource={list} scroll={{ x: 3000 }} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={chakan.status == '挂帐' ? '用户补单' : '订单详情'}
        width="800px"
        height={'auto'}
        open={ModalOpen}
        onCancel={() => { setModalOpen(false); setImageUrl(''); setImgUrl('') }}
        onOk={updateOrder}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            入金单号
          </div>
          <Input placeholder="入金单号" value={chakan.orderId} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转入主网
          </div>
          <Input placeholder="转入主网" value={chakan.trcNet} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转入币种
          </div>
          <Input placeholder="转入币种" value={chakan.type} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转入金额
          </div>
          <Input placeholder="转入金额" value={details.money} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            关联入金用户
          </div>
          <Input placeholder="关联入金用户" disabled={chakan.status != '挂帐'} value={chakan.status == '挂帐' ? email : chakan.email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            补单备注
          </div>
          <Input placeholder="请输入备注" disabled={chakan.status != '挂帐'} value={chakan.status == '挂帐' ? remark : chakan.remark} onChange={(e) => setRemark(e.target.value)} />
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
        {
          chakan.status == '挂帐' ?
            <Upload
              name="file"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              action="/api/sys/upload/file"
              beforeUpload={beforeUpload}
              data={{ type: 0 }}
              onChange={handleChange}
              headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
            >
              {imageUrl ? <img src={imageUrl} alt="file" style={{ width: 150, marginTop: 50, height: 180 }} /> : uploadButton}
            </Upload>
            :
            null
        }

      </Modal>
    </PageContainer >
  );
}

export default App;
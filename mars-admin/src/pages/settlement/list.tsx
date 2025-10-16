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

import { Table, Button, Input, Select, Modal, message, Pagination, DatePicker, Image, Upload, Radio } from "antd";
import { request } from '@umijs/max';
import { addWallet, budan, budanexportIn, budanList, chakanchujin, editWalletTime, exportIn, getbudanIndetails, getIndetails, getpayList, getWallet, jiesuanDetails, jiesuanexport, jiesuanhuizong, jiesuanList, querenjiesuan, updateStatus } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
    gethuizong()
  }, [])
  const [list, setList] = useState([])
  const [searchP, setSearchP] = useState({
    "trcNet": "",
    "fromWalletAddress": "", //出入金钱包地址
    "hashId": "",
    "type": "",
    "startOrderTime": "", //结算时间
    "endOrderTime": "",
    "startCreateTime": "", //创建时间
    "endCreateTime": "",
    "flag": ""
  })
  const [data, setData] = useState({})
  const [details, setDetails] = useState({})
  const [chakanData, setChakanData] = useState({})
  const [hash, setHash] = useState('')
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
  const [totalAmount, settotalAmount] = useState(0)
  const [flag, setFlag] = useState(0)
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
      ...searchP
    }
    const rep = await jiesuanList(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : item.type == 2 ? 'BTC' : '',
        status: item.status = '结算完成',
        trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOL' : item.trcNet == 2 ? 'BTC' : '',
      }));
      setList(processedData)
      setData(rep.data)
    }
    // console.log('xxxx',rep)
  }
  const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
  };

  const gethuizong = async () => {
    const p = {
      ...searchP
    }
    const rep = await jiesuanhuizong(p)
    if (rep.code == 200) {
      settotalAmount(rep.data?.totalAmount)
    }
    // console.log('xxxxx',rep)
  }
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
  };

  const columns = [
    {
      title: '结算单号',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: '结算时间',
      dataIndex: 'orderTime',
      key: 'orderTime',
    },
    {
      title: '出入金钱包昵称',
      dataIndex: 'fromWalletName',
      key: 'fromWalletName',
    },
    {
      title: '出入金钱包地址',
      dataIndex: 'fromWalletAddress',
      key: 'fromWalletAddress',
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
      title: '主网',
      dataIndex: 'trcNet',
      key: 'trcNet',
    },
    {
      title: '出入金币种',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '结算类型',
      dataIndex: 'flag',
      key: 'flag',
      render: (_, record) => <>
        <div>{record.flag == 0 ? '出金' : '入金'}</div>
      </>,
    },
    {
      title: '出入金数量',
      dataIndex: 'money',
      key: 'money',
      render: (_, record) => <>
        <div>{record.flag == 0 ? '-' : '+'}{record.money}</div>
      </>,
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
      title: '订单创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <a onClick={() => { setModalOpen1(true); chakan(record.id) }}>查看</a>
      </>,
    },
  ];
  const exportList = async () => {
    const rep = await jiesuanexport(searchP)
    // 创建 Blob 对象
    const blob = new Blob([rep], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    // 使用 file-saver 下载文件
    FileSaver.saveAs(blob, 'data.xlsx');  // 保存文件，data.xlsx 是下载的文件名
  }
  const getDetails = async () => {
    const p = {
      hashId: hash
    }
    const rep = await jiesuanDetails(p)
    if (rep.code == 200) {
      setDetails(rep.data)
    } else {
      message.error(rep.msg)
    }
  }
  const chakan = async (id) => {
    const rep = await chakanchujin(id)
    if (rep.code == 200) {
      setModalOpen1(true)
      setChakanData(rep.data)
    } else {
      message.error(rep.code)
    }
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
  const submit = async () => {
    const p = {
      "orderTime": details.time,
      "fromWalletAddress": details.fromAddress,
      "inWalletAddress": details.toAddress,
      "money": details.amout,
      "gasNum": details.gas,
      "hashId": hash,
      "remark": remark,
      "type": details.type,
      "trcNet": details.trcNet,
      "flag": flag,
      "urlList": [
        imgUrl
      ]
    }
    const rep = await querenjiesuan(p)
    setLoading(false)
    if (rep.code == 200) {
      setModalOpen(false)
      getList(1)
      message.success('结算成功')
    } else {
      message.error(rep.msg)
    }
  }
  return (
    <PageContainer>
      <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出入金主网
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
            出入金钱包地址
          </div>
          <Input placeholder="出入金钱包地址" value={searchP.fromWalletAddress} onChange={t => setSearchP({ ...searchP, fromWalletAddress: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            订单Hash
          </div>
          <Input placeholder="订单Hash" value={searchP.hashId} onChange={t => setSearchP({ ...searchP, hashId: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出入金币种
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
            结算类型
          </div>
          <Select
            defaultValue="全部"
            style={{
              width: 120,
            }}
            value={searchP.flag}
            onChange={value => setSearchP({ ...searchP, flag: value })}
            options={[
              {
                value: 0,
                label: '出金',
              },
              {
                value: 1,
                label: '入金',
              },
              {
                value: '',
                label: '全部',
              },
            ]}
          />
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
        <Button
          type="primary"
          key="primary"
          style={{ marginLeft: 10 }}
          onClick={() => {
            setSearchP({
              "trcNet": "",
              "fromWalletAddress": "", //出入金钱包地址
              "hashId": "",
              "type": "",
              "startOrderTime": "", //结算时间
              "endOrderTime": "",
              "startCreateTime": "", //创建时间
              "endCreateTime": "",
              "flag": ""
            })
          }}
        >
          重置
        </Button>
      </div>
      <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            结算时间
          </div>
          <div style={{ display: 'flex' }}>
            <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, startOrderTime: dateString })} placeholder={'开始时间'} name="date" />
            <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, endOrderTime: dateString })} style={{ marginLeft: 10 }} placeholder={'结束时间'} name="date" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            创建时间
          </div>
          <div style={{ display: 'flex' }}>
            <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, startCreateTime: dateString })} placeholder={'开始时间'} name="date" />
            <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, endCreateTime: dateString })} style={{ marginLeft: 10 }} placeholder={'结束时间'} name="date" />
          </div>
        </div>
        <Button
          type="primary"
          key="primary"
          onClick={() => setModalOpen(true)}
        >
          新建结算单
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
        结算总资金：{totalAmount} USDT
      </div>
      <Table dataSource={list} scroll={{ x: 3000 }} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={'结算单'}
        width="800px"
        open={ModalOpen}
        onCancel={() => { setModalOpen(false); setImageUrl(''); setImgUrl('') }}
        onOk={submit}
        okText="确定结算"
      >

        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转账Hash
          </div>
          <div style={{ display: 'flex' }}>
            <Input placeholder="请输入hash地址" value={hash} onChange={(e) => setHash(e.target.value)} />
            <Button
              type="primary"
              key="primary"
              style={{ marginLeft: 10 }}
              onClick={() => getDetails()}
            >
              获取订单信息
            </Button>
          </div>
        </div>
        <Radio.Group
          name="radiogroup"
          defaultValue={0}
          style={{ marginBottom: 10 }}
          onChange={t => setFlag(t.target.value)}
          options={[
            {
              value: 0,
              label: '出金',
            },
            {
              value: 1,
              label: '入金',
            }
          ]}
        />
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转出钱包地址
          </div>
          <Input value={details.fromAddress} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出入金币种
          </div>
          <Input value={details.type == 0 ? 'USDT' : details.type == 1 ? 'SOL' : details.type == 2 ? 'BTC' : ''} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出入金数量
          </div>
          <Input value={details.amout} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            Gas数量
          </div>
          <Input value={details.gas} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            收款钱包
          </div>
          <Input value={details.toAddress} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            结算时间
          </div>
          <Input value={details.time} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            备注
          </div>
          <Input placeholder="请输入备注" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
        <Upload
          name="file"
          listType="picture-card"
          className="avatar-uploader"
          showUploadList={false}
          action="/api/sys/upload/file"
          data={{ type: 1 }}
          beforeUpload={beforeUpload}
          onChange={handleChange}
          headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
        >
          {imageUrl ? <img src={imageUrl} alt="avatar" style={{ height: 180, width: 150 }} /> : uploadButton}
        </Upload>
      </Modal>
      <Modal
        title={'查看结算单'}
        width="800px"
        open={ModalOpen1}
        onCancel={() => { setModalOpen1(false); }}
        onOk={() => { setModalOpen1(false); }}
        okText="确定"
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转账Hash
          </div>
          <div style={{ display: 'flex' }}>
            <Input placeholder="请输入hash地址" disabled value={chakanData?.hashId} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            转出钱包地址
          </div>
          <Input value={chakanData?.fromWalletAddress} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出入金币种
          </div>
          <Input value={chakanData?.type == 0 ? 'USDT' : chakanData?.type == 1 ? 'SOL' : chakanData?.type == 2 ? 'BTC' : ''} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            出入金数量
          </div>
          <Input value={chakanData?.money} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            Gas数量
          </div>
          <Input value={chakanData?.gasNum} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            收款钱包
          </div>
          <Input value={chakanData?.inWalletAddress} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            结算时间
          </div>
          <Input value={chakanData?.updateTime} disabled />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            备注
          </div>
          <Input placeholder="请输入备注" value={chakanData?.remark} disabled />
        </div>
        <Image
          width={200}
          height={200}
          src={chakanData.urls}
        />
      </Modal>
    </PageContainer>
  );
}

export default App;
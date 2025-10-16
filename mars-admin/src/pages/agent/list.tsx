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
import { addWallet, budan, budanexportIn, budanList, dailiDetails, dailidingdanDetails, dailidingdanDetails1, dailifanyong, dailiList, editWalletTime, exportIn, getbudanIndetails, getIndetails, getpayList, getWallet, jiesuanDetails, jiesuanexport, jiesuanList, querenjiesuan, shangjidaili, tianjiadaili, updateStatus, xiajidaili } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
  }, [])
  const [list, setList] = useState([])
  const [searchP, setSearchP] = useState({
    "email": "",
    "invitationCode": "",
    level: ''
  })
  const [data, setData] = useState({})
  const [details, setDetails] = useState([])
  const [title, setTitle] = useState('')
  const [yonghu, setyonghu] = useState('')
  const [shangji, setshangji] = useState('')
  const [orderDetails, setOrderDetails] = useState([])
  const [order, setOrder] = useState({})
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
  const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
  const [ModalOpen4, setModalOpen4] = useState<boolean>(false);
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
      ...searchP
    }
    const rep = await dailiList(p)
    if (rep.code == 200) {
      setList(rep.data.records)
      setData(rep.data)
    }
    // console.log('xxxx',rep)
  }
  const columns = [
    {
      title: '用户账号',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
    },
    {
      title: '代理编号',
      dataIndex: 'invitationCode',
      key: 'invitationCode',
    },
    {
      title: '代理级别',
      dataIndex: 'level',
      key: 'level',
    },
    {
      title: '注册时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <a onClick={() => { setModalOpen(true); getDetails(record.userId, 'low'); setTitle('名下代理') }}>名下代理</a>
        <a onClick={() => { setModalOpen(true); getDetails(record.userId, 'upper'); setTitle('上级代理') }} style={{ marginLeft: 10 }}>上级代理</a>
      </>,
    },
  ];
  const getDetails = async (id, type) => {
    const p = {
      "userId": id,
      "hierarchy": type  //upper 上级代理 low
    }
    const rep = await dailiDetails(p)
    if (rep.code == 200) {
      setDetails(rep.data)
    } else {
      message.error(rep.msg)
    }
  }
  const getorderDetails = async (userid, orderid) => {
    const p = {
      "userId": userid,
      "firstUserId": orderid
    }
    const rep = await dailidingdanDetails(p)
    if (rep.code == 200) {
      setOrderDetails(rep.data)
    } else {
      message.error(rep.msg)
    }
  }
  const getorderDetails1 = async (userid, orderid) => {
    const p = {
      "id": userid,
      "firstUserId": orderid
    }
    const rep = await dailidingdanDetails1(p)
    if (rep.code == 200) {
      setOrder(rep.data)
    } else {
      message.error(rep.msg)
    }
  }
  const adddaili = async () => {
    const p = {
      "parentUserId": shangji,//上级账号
      "childUserId": yonghu //用户账号
    }
    const rep = await tianjiadaili(p)
    if (rep.code == 200) {
      setOrder(rep.data)
      getList(1)
      setModalOpen4(false)
      setyonghu('')
      setshangji('')
      message.success('操作成功')
    } else {
      message.error(rep.msg)
    }
  }
  const item = (i, idx) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }} key={idx + 'uiwoqowei'}>
        <div style={{ fontSize: 14, color: '#222', flex: 3 }}>
          {i.userId}
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          {i.email}
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          {i.invitationCode}
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          {i.level}
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          {i.createTime}
        </div>
        {/* <a onClick={() => { setModalOpen1(true); getDetails(i.userId) }}>明细</a> */}
        <a onClick={() => { setModalOpen2(true); getorderDetails(i.userId, i.firstUserId) }}>明细</a>
      </div>
    )
  }
  const item2 = (i, idx) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }} key={idx + 'uisdfwwoqoweiwowoep'}>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          {i.orderId}
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          {i.orderName}
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          {i.type == 0 ? 'USDT' : i.type == 1 ? 'SOL' : 'BTC'}
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 4 }}>
          {i.startTime} - {i.endTime}
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          {i.totalCommissions}
        </div>
        <a onClick={() => { setModalOpen3(true); getorderDetails1(i.id, i.firstUserId) }}>订单详情</a>
      </div>
    )
  }
  return (
    <PageContainer>
      <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            用户账号
          </div>
          <Input placeholder="用户账号" value={searchP.email} onChange={t => setSearchP({ ...searchP, email: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            代理编号
          </div>
          <Input placeholder="代理编号" value={searchP.invitationCode} onChange={t => setSearchP({ ...searchP, invitationCode: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            代理级别
          </div>
          <Input placeholder="代理级别" value={searchP.level} onChange={t => setSearchP({ ...searchP, level: t.target.value })} />
        </div>
        <Button
          type="primary"
          key="primary"
          onClick={() => {
            setModalOpen4(true)
          }}
        >
          添加代理
        </Button>
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
              "email": "",
              "invitationCode": "",
              level: ''
            })
          }}
        >
          重置
        </Button>
      </div>
      <Table dataSource={list} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={title}
        width="1000px"
        open={ModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => setModalOpen(false)}
      >
        <div style={{ display: 'flex', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', flex: 3 }}>
            用户ID
          </div>
          <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
            用户账号
          </div>
          <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
            用户编码
          </div>
          <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
            代理等级
          </div>
          <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
            注册时间
          </div>
          <div style={{ fontSize: 14, color: '#222' }}>
            操作
          </div>
        </div>
        {
          details.map((it, idx) => (
            item(it, idx)
          ))
        }
      </Modal>
      <Modal
        title={`我的${title}产品明细`}
        width="1200px"
        open={ModalOpen2}
        onCancel={() => setModalOpen2(false)}
        onOk={() => setModalOpen2(false)}
        okText={'返回'}
      >
        <div style={{ display: 'flex' }}>
          <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
            订单号
          </div>
          <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
            质押产品
          </div>
          <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
            质押币种
          </div>
          <div style={{ fontSize: 14, color: '#222', flex: 4 }}>
            质押时间
          </div>
          <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
            总返佣
          </div>
          <div style={{ fontSize: 14, color: '#222' }}>
            操作
          </div>
        </div>
        {
          orderDetails.map((it, idx) => (
            item2(it, idx)
          ))
        }
      </Modal>
      <Modal
        title={'订单详情'}
        open={ModalOpen3}
        onCancel={() => setModalOpen3(false)}
        onOk={() => setModalOpen3(false)}
      >
        <div style={{ fontSize: 14, color: '#222' }}>
          用户：{order.email}
        </div>
        {/* <div style={{ fontSize: 14, color: '#222' }}>
          代理编号：{order.invitationCode}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          代理级别：{order.level}
        </div> */}
        <div style={{ fontSize: 14, color: '#222' }}>
          订单号：{order.orderId}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          订单状态：{order.status == 0 ? '进行中' : order.status == 1 ? '已完成' : '未达成'}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          质押产品日期：{order.startTime} - {order.endTime}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          投入金额：{order.investAmount}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          周期：{order.day}天
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          收益率：{order.revenue} + {order.speedRevenue}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          到账总收益：{order.totalEevenue}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          上级代理编号：{order.upperInvitationCode}
        </div>
        {/* <div style={{ fontSize: 14, color: '#222' }}>
          返佣给上级：{order.rebate}
        </div> */}
      </Modal>
      <Modal
        title={'添加代理'}
        open={ModalOpen4}
        onCancel={() => setModalOpen4(false)}
        onOk={() => adddaili()}
      >
        <div style={{ fontSize: 14, color: '#222' }}>
          用户帐号
        </div>
        <Input placeholder="用户帐号" value={yonghu} onChange={t => setyonghu(t.target.value)} />
        <div style={{ fontSize: 14, color: '#222', marginTop: 10 }}>
          上级代理用户帐号
        </div>
        <Input placeholder="上级代理用户帐号" value={shangji} onChange={t => setshangji(t.target.value)} />
      </Modal>
    </PageContainer>
  );
}

export default App;
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
import { addWallet, budan, budanexportIn, budanList, dailiDetails, dailidingdanDetails, dailidingdanDetails1, dailifanyong, dailiList, dailimeibiList, dailimeibiListDetails, editWalletTime, exportIn, getbudanIndetails, getIndetails, getpayList, getWallet, jiesuanDetails, jiesuanexport, jiesuanList, querenjiesuan, shangjidaili, updateStatus, xiajidaili } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
  }, [])
  const [list, setList] = useState([])
  const [data, setData] = useState({})
  const [order, setOrder] = useState({proxyList: []})
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
    }
    const rep = await dailimeibiList(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        status: item.status == 0 ? '进行中' : item.status == 1 ? '已完成' : '未达成',
      }));
      setList(processedData)
      setData(rep.data)
    }
    // console.log('xxxx',rep)
  }
  const getDetails = async (id) => {
    const rep = await dailimeibiListDetails(id)
    if (rep.code == 200) {
      setOrder(rep.data)
    } else {
      message.error(rep.msg)
    }
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
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: '质押产品',
      dataIndex: 'orderName',
      key: 'orderName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <a onClick={() => { setModalOpen(true); getDetails(record.id) }}>详情</a>
      </>,
    },
  ];


  return (
    <PageContainer>
      <Table dataSource={list} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={'详情'}
        open={ModalOpen}
        width={1000}
        onCancel={() => setModalOpen(false)}
        onOk={() => setModalOpen(false)}
      >
        <div style={{ fontSize: 14, color: '#222' }}>
          用户：{order.email}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          代理编号：{order.invitationCode}
        </div>
        <div style={{ fontSize: 14, color: '#222' }}>
          代理级别：{order.level}
        </div>
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
          预计总收益：{order.totalEevenue}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, color: '#222' }}>
            代理关系：
          </div>
          {
            order?.proxyList[2]?.upperInvitationCode ?
              <div style={{ fontSize: 14, color: '#222' }}>
                上级代理：{order?.proxyList[2].upperInvitationCode}
              </div>
              :
              null
          }
          {
            order?.proxyList[1]?.upperInvitationCode ?
              <div style={{ fontSize: 14, color: '#222' }}>
                上上级代理：{order?.proxyList[1].upperInvitationCode}
              </div>
              :
              null
          }
          {
            order?.proxyList[0]?.upperInvitationCode ?
              <div style={{ fontSize: 14, color: '#222' }}>
                上上上级代理：{order?.proxyList[0].upperInvitationCode}
              </div>
              :
              null
          }
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, color: '#222' }}>
            返佣给上级：
          </div>
          {
            order?.proxyList[2]?.rebate ?
              <div style={{ fontSize: 14, color: '#222' }}>
                上级代理：{order?.proxyList[2].rebate}
              </div>
              :
              null
          }
          {
            order?.proxyList[1]?.rebate ?
              <div style={{ fontSize: 14, color: '#222' }}>
                上上级代理：{order?.proxyList[1].rebate}
              </div>
              :
              null
          }
          {
            order?.proxyList[0]?.rebate ?
              <div style={{ fontSize: 14, color: '#222' }}>
                上上上级代理：{order?.proxyList[0].rebate}
              </div>
              :
              null
          }
        </div>

      </Modal>
    </PageContainer>
  );
}

export default App;
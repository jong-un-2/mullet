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
import { Link, request } from '@umijs/max';
import { addWallet, budan, budanexportIn, budanList, editWalletTime, exportIn, getbudanIndetails, getIndetails, getpayList, getWallet, updateStatus, userList } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
  }, [])
  const [list, setList] = useState([])
  const [searchP, setSearchP] = useState({
    "email": "",
    "createDate": "",
    "invitationCode": "",
    "startDate": "",
    "endDate": "",
    "userStatus": "" //用户类型 A代表入金用户 N代表未入金
  })
  const [data, setData] = useState({})
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
      ...searchP
    }
    const rep = await userList(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        userStatus: item.userStatus == 'N' ? '未入金' : '已入金'
      }));
      setList(processedData)
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
      title: '注册时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '用户类型',
      dataIndex: 'userStatus',
      key: 'userStatus',
    },
    {
      title: '首入时间',
      dataIndex: 'inDate',
      key: 'inDate',
    },
    {
      title: '渠道号',
      dataIndex: 'invitationCode',
      key: 'invitationCode',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: '媒介',
      dataIndex: 'bridge',
      key: 'bridge',
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <Link to={`/userManage/details${record.id}`} >详情</Link>
      </>,
    },
  ];
  return (
    <PageContainer>
      <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            邮箱
          </div>
          <Input placeholder="邮箱" value={searchP.email} onChange={t => setSearchP({ ...searchP, email: t.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            注册时间
          </div>
          <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, createDate: dateString })} placeholder={'注册时间'} name="date" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            渠道号
          </div>
          <Input placeholder="渠道号" value={searchP.invitationCode} onChange={t => setSearchP({ ...searchP, invitationCode: t.target.value })} />
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
              fromTrcNet: '',
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
      <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            创建时间
          </div>
          <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, startDate: dateString })} placeholder={'开始时间'} name="date" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            结束时间
          </div>
          <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, endDate: dateString })} placeholder={'结束时间'} name="date" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            用户类型
          </div>
          <Select
            defaultValue="全部"
            style={{
              width: 120,
            }}
            value={searchP.userStatus}
            onChange={value => setSearchP({ ...searchP, userStatus: value })}
            options={[
              {
                value: 'A',
                label: '入金用户',
              },
              {
                value: 'N',
                label: '未入金',
              },
              {
                value: '',
                label: '全部',
              },
            ]}
          />
        </div>
      </div>
      <Table dataSource={list} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
    </PageContainer>
  );
}

export default App;
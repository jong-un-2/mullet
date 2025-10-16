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
import Zijin from './component/userzijinDetails'
import Zhiya from './component/userzhiyaDetails'
import Daili from './component/userDailiDetails'
import { Table, Button, Input, Select, Modal, message, Pagination, DatePicker, Image, Upload, Menu } from "antd";
import { request, useParams, history } from '@umijs/max';
import { getgroupdetails, groupdetailsadd, groupdetailsdelete, userDetails, xiajidaili } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
  }, [])
  const { id } = useParams();

  useEffect(() => {
    if (id == ':id') {
      message.error('未传递用户组别ID');
      history.push('/userManage/group'); // 如果没有传递 id，重定向回用户列表页
    }
  }, [id, history]);
  const [list, setList] = useState([])
  const [data, setData] = useState({})
  const [user, setUser] = useState({})
  const [email, setEmail] = useState('')
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
  const getList = async (page) => {
    const p = {
      "groupId": id, //组别id
      "pageNum": page,
      "pageSize": 10
    }
    const rep = await getgroupdetails(p)
    if (rep.code == 200) {
      setData(rep.data)
      setList(rep.data.records)
    } else {
      message.error(rep.msg)
    }
  }
  const add = async () => {
    const p = {
      "groupId": id,
      "email": email
    }
    const rep = await groupdetailsadd(p)
    if (rep.code == 200) {
      message.success('添加成功');
      getList(1)
      setModalOpen(false)
    } else {
      message.error(rep.msg)
    }
  }
  const deleteuser = async (userid) => {
    const p = {
      "groupId": id,
      "userId": userid
    }
    const rep = await groupdetailsdelete(p)
    if (rep.code == 200) {
      message.success('删除成功');
      getList(1)
      setModalOpen1(false)
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
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <a onClick={() => { setModalOpen1(true); setUser(record) }}>从该组别删除</a>
      </>,
    },
  ];

  return (
    <PageContainer>
      <Button
        type="primary"
        key="primary"
        onClick={() => {
          setModalOpen(true);
        }}
        style={{ marginBottom: 30 }}
      >
        添加用户
      </Button>
      <Table dataSource={list} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={'添加用户'}
        width="400px"
        open={ModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => add()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            用户帐号
          </div>
          <Input placeholder="请输入用户帐号" onChange={t => setEmail(t.target.value)} value={email} />
        </div>
      </Modal>
      <Modal
        title={'删除用户'}
        width="400px"
        open={ModalOpen1}
        onCancel={() => setModalOpen1(false)}
        onOk={() => deleteuser(user.userId)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            确定从该组别删除用户：{user.email}
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}

export default App;
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
import { addWallet, budan, budanexportIn, budanList, editWalletTime, exportIn, getbudanIndetails, getIndetails, getpayList, getusergroup, getWallet, updateStatus, usergroupadd, usergroupdelete, usergroupedit, userList } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
  }, [])
  const [list, setList] = useState([])
  const [data, setData] = useState({})
  const [name, setName] = useState('')
  const [group, setgroup] = useState({})
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
  const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
    }
    const rep = await getusergroup(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        // userStatus: item.userStatus == 'N' ? '未入金' : '已入金'
      }));
      setList(processedData)
      setData(rep.data)
    }
    // console.log('xxxx',rep)
  }
  const add = async () => {
    const p = {
      groupName: name
    }
    const rep = await usergroupadd(p)
    if (rep.code == 200) {
      message.success('新建成功')
      getList(1)
      setModalOpen(false)
    } else {
      message.error(rep.msg)
    }
  }
  const edit = async () => {
    const p = {
      "id": group.id,
      "groupName": group.groupName  //组别名称
    }
    const rep = await usergroupedit(p)
    if (rep.code == 200) {
      message.success('修改成功')
      getList(1)
      setModalOpen2(false)
    } else {
      message.error(rep.msg)
    }
  }
  const deletegroup = async (id) => {
    const rep = await usergroupdelete(id)
    if (rep.code == 200) {
      message.success('删除成功')
      getList(1)
      setModalOpen1(false)
    } else {
      message.error(rep.msg)
    }
  }
  const columns = [
    {
      title: '组别名称',
      dataIndex: 'groupName',
      key: 'groupName',
    },
    {
      title: '组别下总人数',
      dataIndex: 'userCount',
      key: 'userCount',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <Link to={`/userManage/group-details${record.id}`} >详情</Link>
        <a style={{ marginLeft: 30 }} onClick={() => { setgroup(record); setModalOpen1(true) }}>删除组别</a>
        <a style={{ marginLeft: 30 }} onClick={() => { setgroup(record); setModalOpen2(true) }}>修改组别</a>
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
        新建组别
      </Button>
      <Table dataSource={list} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={'新建组别'}
        width="400px"
        open={ModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => add()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            组别名称
          </div>
          <Input placeholder="请输入组别名称" onChange={t => setName(t.target.value)} value={name} />
        </div>
      </Modal>
      <Modal
        title={'修改组别'}
        width="400px"
        open={ModalOpen2}
        onCancel={() => setModalOpen2(false)}
        onOk={() => edit()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            组别名称
          </div>
          <Input placeholder="请输入组别名称" onChange={t => setgroup({ ...group, groupName: t.target.value })} value={group.groupName} />
        </div>
      </Modal>
      <Modal
        title={'删除组别'}
        width="400px"
        open={ModalOpen1}
        onCancel={() => setModalOpen1(false)}
        onOk={() => deletegroup(group?.id)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            确定删除该 {group?.groupName} 组别吗？
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}

export default App;
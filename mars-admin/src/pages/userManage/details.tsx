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
import { userDetails, xiajidaili } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getDetails()
  }, [])
  const { id } = useParams();

  useEffect(() => {
    if (id == ':id') {
      message.error('未传递用户ID');
      history.push('/userManage/list'); // 如果没有传递 id，重定向回用户列表页
    }
  }, [id, history]);
  const [current, setCurrent] = useState('用户资料');
  const [uDetails, setuDetails] = useState({});
  const getDetails = async () => {
    const rep = await userDetails(id)
    if (rep.code == 200) {
      setuDetails(rep.data)
    } else {
      message.error(rep.msg)
    }
  }
  const onClick = (e) => {
    console.log('click ', e);
    setCurrent(e.key);
  };
  const items = [
    {
      label: '用户资料',
      key: '用户资料',
    },
    {
      label: '资金详情',
      key: '资金详情',
    },
    {
      label: '质押详情',
      key: '质押详情',
    },
    {
      label: '代理详情',
      key: '代理详情',
    },
    {
      label: '活动详情',
      key: '活动详情',
    },

  ];

  return (
    <PageContainer>
      <Menu onClick={onClick} selectedKeys={[current]} mode="horizontal" items={items} />;
      {
        current === '用户资料' ?
          <div style={{ background: '#fff', padding: 30 }}>
            <div style={{ display: 'flex', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                邮箱：{uDetails?.email}
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                测试用户标识：{uDetails?.userFlag == 0 ? '正常用户' : '测试用户'}
              </div>
            </div>
            <div style={{ display: 'flex', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                ID：{uDetails?.id}
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                推广人编号：{uDetails?.invitationCode}
              </div>
            </div>
            <div style={{ display: 'flex', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                注册时间：{uDetails?.createTime}
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                用户类型：{uDetails?.userStatus == 'N' ? '未入金' : '已入金'}
              </div>
            </div>
            <div style={{ display: 'flex', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                首入时间：{uDetails?.inDate}
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                来源：{uDetails?.source}
              </div>
            </div>
            <div style={{ display: 'flex', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                开户渠道：{uDetails?.accountOpeningChannels}
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                媒介：{uDetails?.bridge}
              </div>
            </div>
            <div style={{ display: 'flex', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                开户设备：{uDetails?.accountOpeningDevices}
              </div>
              <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                IP：{uDetails?.ipAddress}
              </div>
            </div>
            <div style={{ display: 'flex', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222',flex: 1 }}>
                区域：{uDetails?.region}
              </div>
              <div style={{ fontSize: 14, color: '#222',flex: 1 }}>
                组别：{uDetails?.groupName}
              </div>
            </div>
          </div>
          :
          current === '资金详情' ?
            <Zijin id={id} userName={uDetails.email} />
            :
            current === '质押详情' ?
              <Zhiya id={id} userName={uDetails.email} />
              :
              current === '代理详情' ?
                <Daili id={id} userName={uDetails.email} />
                :
                null

      }

    </PageContainer>
  );
}

export default App;
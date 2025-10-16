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
import { addWallet, budan, budanexportIn, budanList, chakanfanyongshezhi, dailiDetails, dailidingdanDetails, dailidingdanDetails1, dailifanyong, dailiList, editWalletTime, exportIn, getbudanIndetails, getIndetails, getpayList, getWallet, jiesuanDetails, jiesuanexport, jiesuanList, querenjiesuan, shangjidaili, updateStatus, xiajidaili } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getfanyong()
  }, [])
  const [rate, setRate] = useState([
    {
      "level": 1,
      "rate": ""
    },
    {
      "level": 2,
      "rate": ""
    },
    {
      "level": 3,
      "rate": ""
    }
  ])

  const [data, setData] = useState([
    {
      "level": 1,
      "rate": ""
    },
    {
      "level": 2,
      "rate": ""
    },
    {
      "level": 3,
      "rate": ""
    }
  ])

  const handleRateChange = (index, value) => {
    const updatedRate = [...rate]; // 创建数组的浅拷贝
    updatedRate[index].rate = value; // 修改指定索引的 rate 值
    setRate(updatedRate); // 更新 state
  };
  const submit = async () => {
    const rep = await dailifanyong(rate)
    if (rep.code == 200) {
      message.success('设置成功')
      getfanyong()
    } else {
      message.error(rep.msg)
    }
  }
  const getfanyong = async () => {
    const rep = await chakanfanyongshezhi()
    if(rep.code == 200) {
      setData(rep.data)
    } 
  }
  return (
    <PageContainer>
      <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            一级 当前返佣{data[0]?.rate}%
          </div>
          <Input placeholder="请设置返佣率" value={rate[0].rate} onChange={t => handleRateChange(0, t.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            二级 当前返佣{data[1]?.rate}%
          </div>
          <Input placeholder="请设置返佣率" value={rate[1].rate} onChange={t => handleRateChange(1, t.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            三级 当前返佣{data[2]?.rate}%
          </div>
          <Input placeholder="请设置返佣率" value={rate[2].rate} onChange={t => handleRateChange(2, t.target.value)} />
        </div>
        <Button
          type="primary"
          key="primary"
          onClick={submit}
        >
          确定
        </Button>
      </div>
    </PageContainer>
  );
}

export default App;
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
  ProFormDatePicker
} from '@ant-design/pro-components';
import React, { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { Table, Button, Input, Select, Modal, message, Pagination, DatePicker, Checkbox, Col, Row } from "antd";
import { request } from '@umijs/max';
import { addProduct, addWallet, editProduct, editWalletTime, getgroupall, getPName, getProductList, getWallet, updateStatus, updownProduct, zhiyaDetails } from '@/services/ant-design-pro/api';
const App = () => {
  useEffect(() => {
    getList(1)
    getName()
    getgroup()
  }, [])
  const [list, setList] = useState([])
  const [addsumMoney, setaddsumMoney] = useState('')
  const [addpenalty, setaddpenalty] = useState('')
  const [addname, setaddname] = useState('')
  const [addtype, setaddtype] = useState('0')
  const [rewardMethod, setrewardMethod] = useState('0')
  const [virQuota, setvirQuota] = useState('')
  const [chakan, setChakan] = useState({})
  const [selectName, setSelectName] = useState([])
  const [scoreList, setscoreList] = useState([])
  const [groupList, setgroupList] = useState([])
  const [addstartDete, setaddStartDate] = useState('')
  const [addendDete, setaddendDate] = useState('')
  const [group, setGroup] = useState([])
  const [zhouqiArr, setZhouqiArr] = useState([{ day: '', revenue: '', investorsMin: '', investorsMax: '' }, { day: '', revenue: '', investorsMin: '', investorsMax: '' }, { day: '', revenue: '', investorsMin: '', investorsMax: '' }, { day: '', revenue: '', investorsMin: '', investorsMax: '' }, { day: '', revenue: '', investorsMin: '', investorsMax: '' }])
  const [xuniArr, setXuniArr] = useState([{ day: '', revenue: '', experienceAmount: '', targetUserGroup: '0', maxPurchases: '' }])
  const [speedList, setspeedList] = useState([{ conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }])
  const [searchP, setSearchP] = useState({
    name: '',
    type: '',
    status: '',
    productType: ''
  })
  const [data, setData] = useState({})
  const [createModalOpen, handleModalOpen] = useState<boolean>(false);
  const [ModalOpen, setModalOpen] = useState<boolean>(false);
  const getList = async (page) => {
    const p = {
      "pageNum": page,
      "pageSize": 10,
      ...searchP
    }
    const rep = await getProductList(p)
    if (rep.code == 200) {
      const processedData = rep.data.records.map((item: any) => ({
        ...item,
        productType: item.productType == 0 ? '常规' : '体验金',
        // status: item.status === 0 ? '已上架' : '已下架',
      }));
      setList(processedData)
      setData(rep.data)
    } else {
      message.error(rep.msg)
    }
    // console.log('xxxx',rep)
  }
  const onChange = (checkedValues) => {
    // console.log('checked = ', checkedValues);
    setscoreList(checkedValues)
  };
  const onChange1 = (checkedValues) => {
    // console.log('checked = ', checkedValues);
    setgroupList(checkedValues)
  };
  const getgroup = async () => {
    const rep = await getgroupall({})
    if (rep.code == 200) {
      setGroup(rep.data)
    }
  }
  const getName = async () => {
    const rep = await getPName()
    if (rep.code == 200) {
      const arr = []
      rep.data.map(item => {
        arr.push({ label: item.productName, value: item.productName })
      })
      setSelectName(arr)
    }
  }
  useEffect(() => {
    setaddname('')
    setaddsumMoney('')
    setaddpenalty('')
    setaddtype('0')
    setZhouqiArr([{ day: '', revenue: '', investorsMin: '', investorsMax: '' }, { day: '', revenue: '', investorsMin: '', investorsMax: '' }, { day: '', revenue: '', investorsMin: '', investorsMax: '' }, { day: '', revenue: '', investorsMin: '', investorsMax: '' }, { day: '', revenue: '', investorsMin: '', investorsMax: '' }])
    setXuniArr([{ day: '', revenue: '', experienceAmount: '', targetUserGroup: '0', maxPurchases: '' }])
    setspeedList([{ conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' },
    { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' },
    { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' },
    { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }, { conditionType: '0', rangeStart: '', rangeEnd: '', increasePercentage: '' }
    ])
    setvirQuota('')
    setrewardMethod('0')
  }, [createModalOpen])
  const addP = async () => {
    const filteredArr = zhouqiArr.filter(item =>
      Object.values(item).every(value => value !== '')
    );
    const filteredArr1 = xuniArr.filter(item =>
      Object.values(item).every(value => value !== '')
    );
    const filteredArr2 = speedList.filter(item =>
      Object.values(item).every(value => value !== '')
    );
    const p = {
      name: addname,
      type: addname.split('-')[1] == 'USDT' ? 0 : addname.split('-')[1] == 'SOL' ? 1 : 2,
      sumMoney: addsumMoney,
      penalty: addpenalty,
      shelveTime: addstartDete,
      downTime: addendDete,
      cyclicalities: addtype == 0 ? filteredArr : filteredArr1,
      virQuota: virQuota,
      productType: addtype,
      rewardMethod: rewardMethod,
      speedList: addtype == 0 ? filteredArr2 : [],
      scoreList: scoreList,
      groupTypeList: groupList
    }
    // console.log('xxxx',p)
    const rep = await addProduct(p)
    if (rep.code == 200) {
      getList(1)
      message.success('新增成功')
      handleModalOpen(false)
      // console.log('xxxx', rep)
    } else {
      message.error(rep.msg)
    }
  }
  const edtiP = async () => {
    const p = {
      ...chakan,
    }
    // console.log('xxxx',p)
    const rep = await editProduct(p)
    if (rep.code == 200) {
      getList(1)
      message.success('修改成功')
      setModalOpen(false)
      // console.log('xxxx', rep)
    } else {
      message.error(rep.msg)
    }
  }
  const updownP = async (id, status) => {
    const p = {
      id: id,
      status: status
    }
    // console.log('xxxx',p)
    const rep = await updownProduct(p)
    if (rep.code == 200) {
      getList(1)
      message.success('修改成功')
      setModalOpen(false)
      // console.log('xxxx', rep)
    } else {
      message.error(rep.msg)
    }
  }
  const chakanzhiya = async (id) => {
    const rep = await zhiyaDetails(id)
    if (rep.code == 200) {
      setChakan(rep.data)
    }
  }
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '质押类型',
      dataIndex: 'productType',
      key: 'productType',
    },
    {
      title: '币种',
      dataIndex: 'typeDesc',
      key: 'typeDesc',
    },
    {
      title: '收益率（%）',
      dataIndex: 'revenueRate',
      key: 'revenueRate',
    },
    {
      title: '周期（天）',
      dataIndex: 'dayRate',
      key: 'dayRate',
    },
    {
      title: '投资赠额',
      dataIndex: 'experienceAmount',
      key: 'experienceAmount',
    },
    {
      title: '发布时间',
      dataIndex: 'shelveTime',
      key: 'shelveTime',
    },
    {
      title: '下架时间',
      dataIndex: 'downTime',
      key: 'downTime',
    },
    {
      title: '投资范围',
      dataIndex: 'investorsRate',
      key: 'investorsRate',
    },
    {
      title: '投资总额',
      dataIndex: 'sumMoney',
      key: 'sumMoney',
    },
    {
      title: '已投金额（真实）',
      dataIndex: 'amountInvested',
      key: 'amountInvested',
    },
    {
      title: '已投金额（虚拟）',
      dataIndex: 'virInvested',
      key: 'virInvested',
    },
    {
      title: '已投人数',
      dataIndex: 'numberOfInvestors',
      key: 'numberOfInvestors',
      sorter: (a, b) => a.numberOfInvestors - b.numberOfInvestors,
    },
    {
      title: '已投笔数',
      dataIndex: 'amountNum',
      key: 'amountNum',
    },
    {
      title: '状态',
      dataIndex: 'statusDesc',
      key: 'statusDesc',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record) => <>
        <a onClick={() => { chakanzhiya(record.id); setModalOpen(true) }}>修改</a>
        <a onClick={() => { updownP(record.id, 0) }} style={{ marginLeft: 10 }}>上架</a>
        <a onClick={() => { updownP(record.id, 1) }} style={{ marginLeft: 10 }}>下架</a>
      </>,
    },
  ];
  // 更新周期数组的特定字段值
  const handleInputChange = (index, field, value) => {
    const updatedArr = [...zhouqiArr]; // 创建数组的副本
    updatedArr[index] = { ...updatedArr[index], [field]: value }; // 更新特定索引的对象
    setZhouqiArr(updatedArr); // 更新状态
  };
  // 更新周期数组的特定字段值
  const handleInputChange1 = (index, field, value) => {
    const updatedArr = [...xuniArr]; // 创建数组的副本
    updatedArr[index] = { ...updatedArr[index], [field]: value }; // 更新特定索引的对象
    setXuniArr(updatedArr); // 更新状态
  };
  // 更新周期数组的特定字段值
  const handleInputChange2 = (index, field, value) => {
    const updatedArr = [...speedList]; // 创建数组的副本
    updatedArr[index] = { ...updatedArr[index], [field]: value }; // 更新特定索引的对象
    setspeedList(updatedArr); // 更新状态
  };
  const item = (i, idx, flag) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }} key={idx}>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="投资周期"
            style={{ width: 120 }}
            value={i.day}
            disabled={flag}
            onChange={e => handleInputChange(idx, 'day', e.target.value)} // 更新 day 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="请设置收益率"
            style={{ width: 120 }}
            value={i.revenue}
            disabled={flag}
            onChange={e => handleInputChange(idx, 'revenue', e.target.value)} // 更新 revenue 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
          <Input
            style={{ width: 120 }}
            placeholder="最小范围"
            value={i.investorsMin}
            disabled={flag}
            onChange={e => handleInputChange(idx, 'investorsMin', e.target.value)} // 更新 investorsMin 字段
          />
          <Input
            style={{ width: 120, marginLeft: 10 }}
            placeholder="最大范围"
            disabled={flag}
            value={i.investorsMax}
            onChange={e => handleInputChange(idx, 'investorsMax', e.target.value)} // 更新 investorsMax 字段
          />
        </div>
      </div>
    )
  }
  const item1 = (i, idx, flag) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }} key={idx}>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="投资周期"
            style={{ width: 120 }}
            value={i.day}
            disabled={flag}
            onChange={e => handleInputChange1(idx, 'day', e.target.value)} // 更新 day 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            placeholder="请设置收益率"
            style={{ width: 120 }}
            value={i.revenue}
            disabled={flag}
            onChange={e => handleInputChange1(idx, 'revenue', e.target.value)} // 更新 revenue 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            style={{ width: 120 }}
            placeholder="体验金额"
            value={i.experienceAmount}
            disabled={flag}
            onChange={e => handleInputChange1(idx, 'experienceAmount', e.target.value)} // 更新 investorsMin 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Select
            value={i.targetUserGroup + ''}
            style={{
              width: 120,
            }}
            disabled={flag}
            onChange={value => handleInputChange1(idx, 'targetUserGroup', value)}
            options={[{ label: '首充用户', value: '0' }]}
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            style={{ width: 120 }}
            disabled={flag}
            placeholder="可购买次数"
            value={i.maxPurchases}
            onChange={e => handleInputChange1(idx, 'maxPurchases', e.target.value)} // 更新 investorsMin 字段
          />
        </div>
      </div>
    )
  }
  const item2 = (i, idx, flag) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }} key={idx}>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Select
            value={i.conditionType + ''}
            style={{
              width: 120,
            }}
            disabled={flag}
            onChange={value => handleInputChange2(idx, 'conditionType', value)}
            options={[{ label: '质押周期', value: '0' }, { label: '质押金额', value: '1' }]}
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 2, display: 'flex', alignItems: 'center' }}>
          <Input
            placeholder="阈值开始"
            style={{ width: 120 }}
            value={i.rangeStart}
            disabled={flag}
            onChange={e => handleInputChange2(idx, 'rangeStart', e.target.value)} // 更新 revenue 字段
          />
          <div style={{ margin: 10 }}>-</div>
          <Input
            placeholder="阈值结束"
            style={{ width: 120 }}
            value={i.rangeEnd}
            disabled={flag}
            onChange={e => handleInputChange2(idx, 'rangeEnd', e.target.value)} // 更新 revenue 字段
          />
        </div>
        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
          <Input
            style={{ width: 120 }}
            placeholder="年化收益增加率"
            disabled={flag}
            value={i.increasePercentage}
            onChange={e => handleInputChange2(idx, 'increasePercentage', e.target.value)} // 更新 investorsMin 字段
          />
        </div>
      </div>
    )
  }

  return (
    <PageContainer>
      <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            产品名称
          </div>
          {/* <Input placeholder="请输入产品名称" value={searchP.name} onChange={t => setSearchP({ ...searchP, name: t.target.value })} /> */}
          <Select
            defaultValue={searchP.name}
            value={searchP.name}
            style={{
              width: 200,
            }}
            onChange={value => setSearchP({ ...searchP, name: value })}
            options={[{ label: '全部', value: '' }].concat(selectName)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            币种
          </div>
          <Select
            defaultValue={searchP.type}
            value={searchP.type}
            style={{
              width: 120,
            }}
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
            产品状态
          </div>
          <Select
            value={searchP.status}
            defaultValue={searchP.status}
            style={{
              width: 120,
            }}
            onChange={value => setSearchP({ ...searchP, status: value })}
            options={[
              {
                value: '0',
                label: '已上架',
              },
              {
                value: '1',
                label: '已下架',
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
            质押类型
          </div>
          <Select
            value={searchP.productType}
            defaultValue={searchP.productType}
            style={{
              width: 120,
            }}
            onChange={value => setSearchP({ ...searchP, productType: value })}
            options={[
              {
                value: '1',
                label: '体验金',
              },
              {
                value: '0',
                label: '常规',
              },
              {
                value: '',
                label: '全部',
              },
            ]}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="primary"
            key="primary"
            style={{ marginRight: 10 }}
            onClick={() => {
              setSearchP({
                name: '',
                type: '',
                status: ''
              })
            }}
          >
            重置
          </Button>
          <Button
            type="primary"
            key="primary1"
            onClick={() => {
              getList(1)
            }}
          >
            查询
          </Button>
        </div>
      </div>
      <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end' }}>
        <Button
          type="primary"
          key="primary2"
          style={{ marginRight: 10 }}
          onClick={() => {
            handleModalOpen(true);
          }}
        >
          <PlusOutlined /> 新建产品
        </Button>
      </div>
      <Table scroll={{ x: 2000 }} dataSource={list} columns={columns} pagination={false} />
      <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
      <Modal
        title={'新建产品'}
        width="800px"
        open={createModalOpen}
        onCancel={() => handleModalOpen(false)}
        onOk={addP}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            产品名称
          </div>
          <Select
            value={addname}
            style={{
              width: 120,
            }}
            onChange={value => setaddname(value)}
            options={selectName}
          />
        </div>
        <Checkbox.Group
          style={{
            width: '100%',
          }}
          onChange={onChange}
        >
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            来源：
          </div>
          <Row style={{ background: '#201D25', padding: 12 }}>
            <Col span={8}>
              <Checkbox value="1"><img src='/images/1.svg' /></Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="2"><img src='/images/2.svg' /></Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="3"><img src='/images/3.svg' /></Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="4"><img src='/images/4.svg' /></Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="5"><img src='/images/5.svg' /></Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="6"><img src='/images/6.svg' /></Checkbox>
            </Col>
          </Row>
        </Checkbox.Group>
        {
          group.length ?
            <Checkbox.Group
              style={{
                width: '100%',
                marginTop: 20
              }}
              onChange={onChange1}
            >
              <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                组别：
              </div>
              <Row>
                {
                  group.map((itx, idx) => (
                    <Col span={8} key={idx + 'oweijlkslm,jj'}>
                      <Checkbox value={itx.id}><div>{itx.groupName}</div></Checkbox>
                    </Col>
                  ))
                }
              </Row>
            </Checkbox.Group>
            :
            null
        }

        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            质押产品币种
          </div>
          <Input disabled value={addname.split('-')[1]} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            质押产品类型
          </div>
          <Select
            value={addtype}
            style={{
              width: 120,
            }}
            onChange={value => setaddtype(value)}
            options={[
              { label: '常规', value: '0' },
              { label: '体验金', value: '1' }
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            投资总额
          </div>
          <Input placeholder="请输入投资总额" value={addsumMoney} onChange={e => setaddsumMoney(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            虚拟增长基数
          </div>
          <Input placeholder="虚拟增长基数" value={virQuota} onChange={e => setvirQuota(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            违约金
          </div>
          <Input placeholder="请输入违约金" value={addpenalty} onChange={e => setaddpenalty(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            上架时间
          </div>
          <DatePicker onChange={(date, dateString) => setaddStartDate(dateString)} showTime placeholder={'开始时间'} name="date" />
          <DatePicker placeholder={'结束时间'} name="date" style={{ marginTop: 10 }} showTime onChange={(date, dateString) => setaddendDate(dateString)} />
        </div>
        {
          addtype == 0 ?
            <>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                  配置投资周期
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    投资周期（天）
                  </div>
                  <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    单笔收益率%
                  </div>
                  <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                    单笔投资限额范围
                  </div>
                </div>
                {
                  zhouqiArr.map((it, idx) => (item(it, idx)))
                }
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10, marginTop: 10 }}>
                <div style={{ fontSize: 14, color: '#222', marginBottom: 10, display: 'flex', alignItems: 'center' }}>
                  <div>配置收益加速条件</div>
                  <div style={{ marginLeft: 10 }}>周期/金额奖励是否叠加</div>
                  <Select
                    value={rewardMethod}
                    style={{
                      width: 120,
                      marginLeft: 10
                    }}
                    onChange={value => setrewardMethod(value)}
                    options={[
                      { label: '叠加', value: '0' },
                      { label: '取最高', value: '1' }
                    ]}
                  />
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    加速条件
                  </div>
                  <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                    阈值范围
                  </div>
                  <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    年化收益增加率%
                  </div>
                </div>
                {
                  speedList.map((it, idx) => (item2(it, idx)))
                }
              </div>
            </>

            :
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                配置投资周期
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  投资周期（天）
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  单笔收益率%
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  体验金额
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  用户群体
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  可购买次数
                </div>
              </div>
              {
                xuniArr.map((it, idx) => (item1(it, idx)))
              }
            </div>

        }
      </Modal>
      <Modal
        title={'修改产品'}
        width="800px"
        open={ModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={edtiP}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            产品名称
          </div>
          <Select
            value={chakan.name}
            style={{
              width: 200,
            }}
            disabled
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            质押产品币种
          </div>
          <Input disabled value={chakan.type == 0 ? 'USDT' : chakan.type == 1 ? 'SOL' : 'BTC'} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            质押产品类型
          </div>
          <Select
            value={chakan.productType + ''}
            style={{
              width: 120,
            }}
            disabled
            options={[
              { label: '常规', value: '0' },
              { label: '体验金', value: '1' }
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            投资总额
          </div>
          <Input placeholder="请输入投资总额" value={chakan.sumMoney} onChange={e => setChakan({ ...chakan, sumMoney: e.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            虚拟增长基数
          </div>
          <Input placeholder="虚拟增长基数" value={chakan.virQuota} onChange={e => setChakan({ ...chakan, virQuota: e.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            违约金
          </div>
          <Input placeholder="请输入违约金" value={chakan.penalty} onChange={e => setChakan({ ...chakan, penalty: e.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
            上架时间
          </div>
          <DatePicker onChange={(date, dateString) => setChakan({ ...chakan, shelveTime: dateString })} showTime placeholder={chakan.shelveTime} name="date" />
          <DatePicker placeholder={chakan.downTime} name="date" style={{ marginTop: 10 }} showTime onChange={(date, dateString) => setChakan({ ...chakan, downTime: dateString })} />
        </div>
        {
          chakan?.productType == 0 ?
            <>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                  配置投资周期
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    投资周期（天）
                  </div>
                  <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    单笔收益率%
                  </div>
                  <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                    单笔投资限额范围
                  </div>
                </div>
                {
                  chakan?.cyclicalityist?.map((it, idx) => (item(it, idx, true)))
                }
              </div>
              {
                chakan?.speedList.length ?
                  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10, marginTop: 10 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10, display: 'flex', alignItems: 'center' }}>
                      <div>配置收益加速条件</div>
                      <div style={{ marginLeft: 10 }}>周期/金额奖励是否叠加</div>
                      <Select
                        value={chakan.speedList[0].rewardMethod + ''}
                        style={{
                          width: 120,
                          marginLeft: 10
                        }}
                        disabled
                        options={[
                          { label: '叠加', value: '0' },
                          { label: '取最高', value: '1' }
                        ]}
                      />
                    </div>
                    <div style={{ display: 'flex' }}>
                      <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                        加速条件
                      </div>
                      <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                        阈值范围
                      </div>
                      <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                        年化收益增加率%
                      </div>
                    </div>
                    {
                      chakan?.speedList?.map((it, idx) => (item2(it, idx, true)))
                    }
                  </div>
                  :
                  null
              }
            </>

            :
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                配置投资周期
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  投资周期（天）
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  单笔收益率%
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  体验金额
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  用户群体
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                  可购买次数
                </div>
              </div>
              {
                chakan?.cyclicalityist?.map((it, idx) => (item1(it, idx, true)))
              }
            </div>

        }

      </Modal>
    </PageContainer>
  );
}

export default App;
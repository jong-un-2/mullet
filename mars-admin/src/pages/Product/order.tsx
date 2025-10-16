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

import { Table, Button, Input, Select, Modal, message, Pagination, DatePicker } from "antd";
import { request } from '@umijs/max';
import { addProduct, addWallet, editProduct, editWalletTime, getmyorder, getProductList, getWallet, updateStatus, updownProduct, zhiyahuizong } from '@/services/ant-design-pro/api';
const App = () => {
    useEffect(() => {
        getList(1)
        gethuizong()
    }, [])
    const [list, setList] = useState([])
    const [totalAmount,settotalAmount] = useState(0)
    const [searchP, setSearchP] = useState({
        orderId: '',
        email: '',
        status: 0,
        startDepositTime: "",
        productType: "",
        endDepositTime: "",
        startSettlementTime: "",
        endSettlementTime: ""
    })
    const [data, setData] = useState({})
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            ...searchP
        }
        const rep = await getmyorder(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                type: item.type === 0 ? 'USDT' : item.type === 1 ? 'SOL' : 'BTC',
                status: item.status == 0 ? '进行中' : item.status == 1 ? '已达成' : '未达成',
                productType: item.productType == 0 ? '常规' : '体验金'
            }));
            setList(processedData)
            setData(rep.data)
        } else {
            message.error(rep.msg)
        }
        // console.log('xxxx',rep)
    }
    const gethuizong = async () => {
        const p = {
            ...searchP
        }
        const rep = await zhiyahuizong(p)
        if(rep.code == 200) {
            settotalAmount(rep.data?.totalAmount)
        }
        // console.log('xxxxx',rep)
    }
    const columns = [
        {
            title: '质押单号',
            dataIndex: 'orderId',
            key: 'orderId',
        },
        {
            title: '质押币种',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: '订单类型',
            dataIndex: 'productType',
            key: 'productType',
        },
        {
            title: '用户账号',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: '投入金额',
            dataIndex: 'investAmount',
            key: 'investAmount',
        },
        {
            title: '质押周期（天）',
            dataIndex: 'day',
            key: 'day',
        },
        {
            title: '收益率%',
            dataIndex: 'revenue',
            key: 'revenue',
        },
        {
            title: '加速收益率%',
            dataIndex: 'speedRevenue',
            key: 'speedRevenue',
        },
        {
            title: '起投时间',
            dataIndex: 'startTime',
            key: 'startTime',
        },
        {
            title: '结算时间',
            dataIndex: 'endTime',
            key: 'endTime',
        },
        {
            title: '已投天数',
            dataIndex: 'haveDay',
            key: 'haveDay',
        },
        {
            title: '当前收益',
            dataIndex: 'currentProfit',
            key: 'currentProfit',
        },
        {
            title: '当前收益(USDT)',
            dataIndex: 'currentProfitUsdt',
            key: 'currentProfitUsdt',
        },
        {
            title: '订单状态',
            dataIndex: 'status',
            key: 'status',
        },
    ];
    return (
        <PageContainer>
            <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        质押单号
                    </div>
                    <Input placeholder="请输入产品名称" value={searchP.orderId} onChange={t => setSearchP({ ...searchP, orderId: t.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        用户账号
                    </div>
                    <Input placeholder="请输入用户账号" value={searchP.email} onChange={t => setSearchP({ ...searchP, email: t.target.value })} />
                </div>
                {/* <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        起投时间
                    </div>
                    <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, startDepositTime: dateString })} placeholder={'起投时间'} name="date" />
                </div> */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        订单类型
                    </div>
                    <Select
                        defaultValue={searchP.productType}
                        value={searchP.productType}
                        style={{
                            width: 120,
                        }}
                        onChange={value => setSearchP({ ...searchP, productType: value })}
                        options={[
                            {
                                value: '',
                                label: '全部',
                            },
                            {
                                value: 0,
                                label: '常规',
                            },
                            {
                                value: 1,
                                label: '体验金',
                            },
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        状态
                    </div>
                    <Select
                        defaultValue={searchP.status}
                        value={searchP.status}
                        style={{
                            width: 120,
                        }}
                        onChange={value => setSearchP({ ...searchP, status: value })}
                        options={[
                            {
                                value: '',
                                label: '全部',
                            },
                            {
                                value: 0,
                                label: '进行中',
                            },
                            {
                                value: 1,
                                label: '已达成',
                            },
                            {
                                value: 2,
                                label: '未达成',
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
                                orderId: '',
                                email: '',
                                status: '',
                                startDepositTime: "",
                                productType: "",
                                endDepositTime: "",
                                startSettlementTime: "",
                                endSettlementTime: ""
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
                            gethuizong()
                        }}
                    >
                        查询
                    </Button>
                </div>
            </div>
            <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column',marginRight: 30 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        起投开始时间
                    </div>
                    <DatePicker value={searchP.startDepositTime ? dayjs(searchP.startDepositTime, 'YYYY-MM-DD') : null} onChange={(date, dateString) => setSearchP({ ...searchP, startDepositTime: dateString })} placeholder={'开始时间'} name="date" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column',marginRight: 30 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        起投结束时间
                    </div>
                    <DatePicker value={searchP.endDepositTime ? dayjs(searchP.endDepositTime, 'YYYY-MM-DD') : null} onChange={(date, dateString) => setSearchP({ ...searchP, endDepositTime: dateString })} placeholder={'结束时间'} name="date" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column',marginRight: 30 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        结算开始时间
                    </div>
                    <DatePicker value={searchP.startSettlementTime ? dayjs(searchP.startSettlementTime, 'YYYY-MM-DD') : null} onChange={(date, dateString) => setSearchP({ ...searchP, startSettlementTime: dateString })} placeholder={'起投时间'} name="date" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        结算结束时间
                    </div>
                    <DatePicker value={searchP.endSettlementTime ? dayjs(searchP.endSettlementTime, 'YYYY-MM-DD') : null} onChange={(date, dateString) => setSearchP({ ...searchP, endSettlementTime: dateString })} placeholder={'起投时间'} name="date" />
                </div>
            </div>
            <div style={{ fontSize: 20,fontWeight: 'bold',marginBottom: 30,marginTop: 30 }}>
                质押总资金：{totalAmount} USDT
            </div>
            <Table scroll={{ x: 2000 }} dataSource={list} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
        </PageContainer>
    );
}

export default App;
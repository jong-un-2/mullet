import { exportuser, getBase, getChat, getcjmingxi, getgqmingxi, getjsmingxi, getrujinmingxi, getusertongji, zijinliushui } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Select, Button, Table, Pagination, Input, Modal, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';
import { Renderer as SVGRenderer } from '@antv/g-svg';
import * as echarts from "echarts";
import dayjs from 'dayjs';
import FileSaver from 'file-saver';

/**
 * 每个单独的卡片，为了复用样式抽成了组件
 * @param param0
 * @returns
 */
const App = () => {
    useEffect(() => {
        getList(1)
    }, [])
    const [rjdata, setrjData] = useState({})
    const [rjlist, setrjList] = useState([])
    const [rjId, setRujinId] = useState([])

    const [gqdata, setgqdata] = useState({})
    const [gqlist, setgqlist] = useState([])
    const [gqid, setgqid] = useState([])

    const [cjdata, setcjdata] = useState({})
    const [cjlist, setcjlist] = useState([])
    const [cjid, setcjid] = useState([])


    const [jsdata, setjsdata] = useState({})
    const [jslist, setjslist] = useState([])
    const [jsid, setjsid] = useState([])

    const [data, setData] = useState({})
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(false)
    const [show1, setshow1] = useState(false)
    const [gqshow, setgqshow] = useState(false)
    const [cjshow, setcjshow] = useState(false)
    const [jsshow, setjsshow] = useState(false)
    const [searchP, setSearchP] = useState({
        trcNet: '',
        type: '',
        walletAddress: '',
        startDate: '',
        endDate: ''
    })
    const getList = async (page = 1) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            ...searchP
            // "trcNet": 1, //主网 0TRC20 1Solana 2Bitcoin
            // "type": 1, //货币类型 0usdt 1sol 2btc
            // "walletAddress": "demoData", //钱包地址
            // "startDate": "2024-11-22", //开始时间
            // "endDate": "2024-11-23" //结束时间
        }
        setLoading(true)
        const rep = await zijinliushui(p)
        setLoading(false)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
                trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'Solana' : 'BTC',
                // status: item.status === 0 ? '已上架' : '已下架',
            }));
            setList(processedData)
            setData(rep.data)
        }
    }
    const getrujin = async (page = 1, id = []) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            'ids': id
            // "trcNet": 1, //主网 0TRC20 1Solana 2Bitcoin
            // "type": 1, //货币类型 0usdt 1sol 2btc
            // "walletAddress": "demoData", //钱包地址
            // "startDate": "2024-11-22", //开始时间
            // "endDate": "2024-11-23" //结束时间
        }
        const rep = await getrujinmingxi(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
                trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOLANA' : 'BTC',
            }));
            setrjList(processedData)
            setrjData(rep.data)
        } else {
            message.error(rep.msg)
        }

    }
    const getgq = async (page = 1, id = []) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            'ids': id
            // "trcNet": 1, //主网 0TRC20 1Solana 2Bitcoin
            // "type": 1, //货币类型 0usdt 1sol 2btc
            // "walletAddress": "demoData", //钱包地址
            // "startDate": "2024-11-22", //开始时间
            // "endDate": "2024-11-23" //结束时间
        }
        const rep = await getgqmingxi(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : item.type == 2 ? 'BTC' : '',
                trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOLANA' : item.trcNet == 2 ? 'BTC' : '',
            }));
            setgqlist(processedData)
            setgqdata(rep.data)
        } else {
            message.error(rep.msg)
        }

    }
    const getcj = async (page = 1, id = []) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            'ids': id
            // "trcNet": 1, //主网 0TRC20 1Solana 2Bitcoin
            // "type": 1, //货币类型 0usdt 1sol 2btc
            // "walletAddress": "demoData", //钱包地址
            // "startDate": "2024-11-22", //开始时间
            // "endDate": "2024-11-23" //结束时间
        }
        const rep = await getcjmingxi(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
                status: item.status == 0 ? '已完成' : item.status == 1 ? '审核中' : item.status == 2 ? '拒绝' : '客户手动取消',
                trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOLANA' : 'BTC',
            }));
            setcjlist(processedData)
            setcjdata(rep.data)
        } else {
            message.error(rep.msg)
        }

    }
    const getjs = async (page = 1, id = []) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            'ids': id
            // "trcNet": 1, //主网 0TRC20 1Solana 2Bitcoin
            // "type": 1, //货币类型 0usdt 1sol 2btc
            // "walletAddress": "demoData", //钱包地址
            // "startDate": "2024-11-22", //开始时间
            // "endDate": "2024-11-23" //结束时间
        }
        const rep = await getjsmingxi(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : item.type == 2 ? 'BTC' : '',
                status: item.status = '结算完成',
                trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOL' : item.trcNet == 2 ? 'BTC' : '',
            }));
            setjslist(processedData)
            setjsdata(rep.data)
        } else {
            message.error(rep.msg)
        }

    }
    const columns = [
        {
            title: '日期',
            dataIndex: 'dateStr',
            key: 'dateStr',
        },
        {
            title: '主网名称',
            dataIndex: 'trcNet',
            key: 'trcNet',
        },
        {
            title: '钱包昵称',
            dataIndex: 'walletName',
            key: 'walletName',
        },
        {
            title: '钱包地址',
            dataIndex: 'walletAddress',
            key: 'walletAddress',
             render: (_, record) => (
                <Tooltip placement="topLeft" title={record.walletAddress}>
                    {record.walletAddress.substring(0,10) }
                </Tooltip>
            ),
        },
        {
            title: '币种',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: (
                <Tooltip placement="top" title="平台当前合计=入金数量+挂起数量-出金数量+客户手续费-结算数量">
                    平台当前合计
                </Tooltip>
            ),
            dataIndex: 'platformBalance',
            key: 'platformBalance',
        },
        {
            title: (
                <Tooltip placement="top" title="当日0时该钱包平台结余">
                    平台期初结余
                </Tooltip>
            ),
            dataIndex: 'platformStartBalance',
            key: 'platformStartBalance',
        },
        {
            title: (
                <Tooltip placement="top" title="当日0时该钱包主网结余">
                    主网期初结余
                </Tooltip>
            ),
            dataIndex: 'netStartBalance',
            key: 'netStartBalance',
        },
        {
            title: (
                <Tooltip placement="top" title="平台期末结余=平台当前合计+平台期初结余">
                    平台期末结余
                </Tooltip>
            ),
            dataIndex: 'platformEndBalance',
            key: 'platformEndBalance',
        },
        {
            title: (
                <Tooltip placement="top" title="成功入金和挂帐合计">
                    入金笔数
                </Tooltip>
            ),
            dataIndex: 'completedDepositsCount',
            key: 'completedDepositsCount',
            ellipsis: {
                showTitle: false,
            },
            // render: () => (
            //     <Tooltip placement="topLeft" title={'：' }>
            //         { '成功入金和挂帐合计'}
            //     </Tooltip>
            // ),
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { setshow1(true); getrujin(1, record.completedDepositIds); setRujinId(record.completedDepositIds) }}>{record.completedDepositsCount}</a>
            </>,
        },
        {
            title: (
                <Tooltip placement="top" title="成功入金和挂单入金合计">
                    入金数量
                </Tooltip>
            ),
            dataIndex: 'completedDepositsAmount',
            key: 'completedDepositsAmount',
        },
        {
            title: (
                <Tooltip placement="top" title="挂帐订单数">
                    挂帐笔数
                </Tooltip>
            ),
            dataIndex: 'pendingDepositsCount',
            key: 'pendingDepositsCount',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { setgqshow(true); setgqid(record.pendingDepositIds); getgq(1, record.pendingDepositIds) }}>{record.pendingDepositsCount}</a>
            </>,
        },
        {
            title: (
                <Tooltip placement="top" title="挂帐订单合计数量">
                    挂帐数量
                </Tooltip>
            ),
            dataIndex: 'pendingDepositsAmount',
            key: 'pendingDepositsAmount',
        },
        {
            title: (
                <Tooltip placement="top" title="出金成功笔数">
                    出金笔数
                </Tooltip>
            ),
            dataIndex: 'completedWithdrawalsCount',
            key: 'completedWithdrawalsCount',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { setcjshow(true); setcjid(record.completedWithdrawalsIds); getcj(1, record.completedWithdrawalsIds) }}>{record.completedWithdrawalsCount}</a>
            </>,
        },
        {
            title: (
                <Tooltip placement="top" title="出金数量">
                    出金数量
                </Tooltip>
            ),
            dataIndex: 'completedWithdrawalsAmount',
            key: 'completedWithdrawalsAmount',
        },
        {
            title: (
                <Tooltip placement="top" title="收取客户手续费">
                    出金手续费
                </Tooltip>
            ),
            dataIndex: 'completedWithdrawalsFee',
            key: 'completedWithdrawalsFee',
        },
        {
            title: (
                <Tooltip placement="top" title="该钱包结算笔数">
                    结算笔数
                </Tooltip>
            ),
            dataIndex: 'manageWithdrawalsCount',
            key: 'manageWithdrawalsCount',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { setjsshow(true); setjsid(record.manageWithdrawalsIds); getjs(1, record.manageWithdrawalsIds) }}>{record.manageWithdrawalsCount}</a>
            </>,
        },
        {
            title: (
                <Tooltip placement="top" title="结算数量">
                    结算数量
                </Tooltip>
            ),
            dataIndex: 'manageWithdrawalsAmount',
            key: 'manageWithdrawalsAmount',
        },
    ];
    const rujincolumns = [
        {
            title: '订单号',
            dataIndex: 'orderId',
            key: 'orderId',
        },
        {
            title: '创建时间',
            dataIndex: 'createTime',
            key: 'createTime',
        },
        {
            title: '用户账号',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: '收款钱包昵称',
            dataIndex: 'inWalletName',
            key: 'inWalletName',
        },
        {
            title: '收款钱包地址',
            dataIndex: 'inWalletAddress',
            key: 'inWalletAddress',
        },
        {
            title: '主网名称',
            dataIndex: 'trcNet',
            key: 'trcNet',
        },
        {
            title: '订单Hash',
            dataIndex: 'hashId',
            key: 'hashId',
        },
        {
            title: '入金数量',
            dataIndex: 'money',
            key: 'money',
        },
        {
            title: '转入币种',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: '备注',
            dataIndex: 'remark',
            key: 'remark',
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
    ];
    const chujincolumns = [
        {
            title: '出金订单号',
            dataIndex: 'orderId',
            key: 'orderId',
        },
        {
            title: '订单生成时间',
            dataIndex: 'createTime',
            key: 'createTime',
        },
        {
            title: '用户账号',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: '出金主网',
            dataIndex: 'trcNet',
            key: 'trcNet',
        },
        {
            title: '收款钱包地址',
            dataIndex: 'inWalletAddress',
            key: 'inWalletAddress',
        },
        {
            title: '出金币种',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: '出金数量',
            dataIndex: 'money',
            key: 'money',
        },
        {
            title: '提币手续费',
            dataIndex: 'free',
            key: 'free',
        },
        {
            title: 'Gas费用',
            dataIndex: 'gas',
            key: 'gas',
        },
        {
            title: '到账数量',
            dataIndex: 'arriveMoney',
            key: 'arriveMoney',
        },
        {
            title: '订单Hash',
            dataIndex: 'hashId',
            key: 'hashId',
        },
        {
            title: '第三方流水号',
            dataIndex: 'cregisId',
            key: 'cregisId',
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
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
    ]
    const jscolumns = [
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
            title: '出金钱包昵称',
            dataIndex: 'fromWalletName',
            key: 'fromWalletName',
        },
        {
            title: '出金钱包地址',
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
            title: '出金币种',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: '出金数量',
            dataIndex: 'money',
            key: 'money',
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
    ]
    return (
        <PageContainer>
            <div style={{ display: 'flex' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        查询主网
                    </div>
                    {/* <Input placeholder="请输入产品名称" value={searchP.name} onChange={t => setSearchP({ ...searchP, name: t.target.value })} /> */}
                    <Select
                        defaultValue={searchP.trcNet}
                        value={searchP.trcNet}
                        style={{
                            width: 120,
                        }}
                        onChange={value => setSearchP({ ...searchP, trcNet: value })}
                        options={[{ label: '全部', value: '' }, { label: 'TRC20', value: '0' }, { label: 'Solana', value: '1' }, { label: 'BTC', value: '2' }]}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 10 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 10 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        钱包地址
                    </div>
                    <Input placeholder='钱包地址' style={{ width: 500 }} value={searchP.walletAddress} onChange={t => setSearchP({ ...searchP, walletAddress: t.target.value })} />
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 20, marginBottom: 30 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        到账时间
                    </div>
                    <div style={{ display: 'flex' }}>
                        <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, startDate: dateString })} placeholder={'开始时间'} name="date" />
                        <DatePicker placeholder={'结束时间'} name="date" style={{ marginLeft: 10 }} onChange={(date, dateString) => setSearchP({ ...searchP, endDate: dateString })} />
                    </div>
                </div>
                {/* <Button
                    type="primary"
                    key="primary"
                    onClick={exportList}
                    style={{ marginLeft: 20 }}
                >
                    导出
                </Button> */}
                <Button
                    type="primary"
                    key="primary"
                    onClick={() => getList(1)}
                    style={{ marginLeft: 20 }}
                >
                    查询
                </Button>
                <Button
                    type="primary"
                    key="primary"
                    onClick={() => {
                        setSearchP({
                            trcNet: '',
                            type: '',
                            walletAddress: '',
                            startDate: '',
                            endDate: ''
                        })
                    }}
                    style={{ marginLeft: 20 }}
                >
                    重置
                </Button>
            </div>

            <Table loading={loading} dataSource={list} scroll={{ x: 2500 }} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'入金明细'}
                open={show1}
                width={1200}
                onCancel={() => setshow1(false)}
                onOk={() => setshow1(false)}
            >
                <Table dataSource={rjlist} scroll={{ x: 2500 }} columns={rujincolumns} pagination={false} />
                <Pagination total={rjdata?.total} style={{ marginTop: 10 }} pageSize={rjdata?.size} current={rjdata?.current} onChange={(e) => getrujin(e, rjId)} />
            </Modal>
            <Modal
                title={'挂帐明细'}
                open={gqshow}
                width={1200}
                onCancel={() => setgqshow(false)}
                onOk={() => setgqshow(false)}
            >
                <Table dataSource={gqlist} scroll={{ x: 2500 }} columns={rujincolumns} pagination={false} />
                <Pagination total={gqdata?.total} style={{ marginTop: 10 }} pageSize={gqdata?.size} current={gqdata?.current} onChange={(e) => getgq(e, gqid)} />
            </Modal>
            <Modal
                title={'出金明细'}
                open={cjshow}
                width={1200}
                onCancel={() => setcjshow(false)}
                onOk={() => setcjshow(false)}
            >
                <Table dataSource={cjlist} scroll={{ x: 2500 }} columns={chujincolumns} pagination={false} />
                <Pagination total={cjdata?.total} style={{ marginTop: 10 }} pageSize={cjdata?.size} current={cjdata?.current} onChange={(e) => getcj(e, cjid)} />
            </Modal>
            <Modal
                title={'结算明细'}
                open={jsshow}
                width={1200}
                onCancel={() => setjsshow(false)}
                onOk={() => setjsshow(false)}
            >
                <Table dataSource={jslist} scroll={{ x: 2500 }} columns={jscolumns} pagination={false} />
                <Pagination total={jsdata?.total} style={{ marginTop: 10 }} pageSize={jsdata?.size} current={jsdata?.current} onChange={(e) => getjs(e, jsid)} />
            </Modal>
        </PageContainer>
    );
};

export default App;

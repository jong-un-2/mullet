import { getuseroutList, getuserpayList, userTotal } from "@/services/ant-design-pro/api"
import { Button, DatePicker, Input, message, Pagination, Select, Table } from "antd"
import { useEffect, useState } from "react"

const App = (props) => {
    useEffect(() => {
        gettotal()
        getList(1)
        getList1(1)
    }, [])
    const [total, setTotal] = useState({})
    const [list, setList] = useState([])
    const [data, setData] = useState([])
    const [list1, setList1] = useState([])
    const [data1, setData1] = useState([])
    const [searchP, setSearchP] = useState({
        trcNet: '',
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
    const [searchP1, setSearchP1] = useState({
        trcNet: '',
        orderId: '',
        status: '',
        email: '',
        hashId: '',
        type: '',
        startTime: '',
        endTime: ''

    })
    const gettotal = async () => {
        const rep = await userTotal(props.id)
        if (rep.code == 200) {
            setTotal(rep.data)
        } else {
            message.error(rep.msg)
        }
    }
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            userId: props.id,
            ...searchP
        }
        const rep = await getuserpayList(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
                status: item.status == 0 ? '已完成' : item.status == 1 ? '挂帐' : '超时',
                trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOL' : 'BTC',
            }));
            setList(processedData)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const getList1 = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            userId: props.id,
            ...searchP1
        }
        const rep = await getuseroutList(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
                status: item.status == 0 ? '已完成' : item.status == 1 ? '审核中' : item.status == 2 ? '拒绝' : '客户手动取消',
                trcNet: item.trcNet == 0 ? 'TRC20' : item.trcNet == 1 ? 'SOL' : 'BTC',
            }));
            setList1(processedData)
            setData1(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const columns = [
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
            title: '入金钱包地址',
            dataIndex: 'fromWalletAddress',
            key: 'fromWalletAddress',
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
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
    ];
    const columns1 = [
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
    ];

    return (
        <div style={{ background: '#fff', padding: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, color: '#222', }}>
                    用户账号：{props.userName}
                </div>
                <div style={{ fontSize: 14, color: '#222', }}>
                    入金总额：{total?.inTotal}
                </div>
                <div style={{ fontSize: 14, color: '#222', }}>
                    出金总额：{total?.outTotal}
                </div>
                <div style={{ fontSize: 14, color: '#222', }}>
                    净入金：{total?.inTotal - total?.outTotal}
                </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginTop: 20 }}>
                入金
            </div>
            <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        入金主网
                    </div>
                    <Select
                        defaultValue="全部"
                        style={{
                            width: 120,
                        }}
                        onChange={value => setSearchP({ ...searchP, trcNet: value })}
                        options={[
                            {
                                value: '0',
                                label: 'TRC20',
                            },
                            {
                                value: '1',
                                label: 'Solana',
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
                        入金单号
                    </div>
                    <Input placeholder="入金单号" onChange={t => setSearchP({ ...searchP, orderId: t.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        入金钱包地址
                    </div>
                    <Input placeholder="入金钱包地址" onChange={t => setSearchP({ ...searchP, fromWalletAddress: t.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        用户账号
                    </div>
                    <Input placeholder="用户账号" onChange={t => setSearchP({ ...searchP, email: t.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        收款钱包地址
                    </div>
                    <Input placeholder="请输入钱包地址" onChange={t => setSearchP({ ...searchP, inWalletAddress: t.target.value })} />
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
            </div>
            <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        订单Hash
                    </div>
                    <Input placeholder="订单Hash" onChange={t => setSearchP({ ...searchP, hashId: t.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        入金币种
                    </div>
                    <Select
                        defaultValue="全部"
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
                        订单状态
                    </div>
                    <Select
                        defaultValue="全部"
                        style={{
                            width: 120,
                        }}
                        onChange={value => setSearchP({ ...searchP, status: value })}
                        options={[
                            {
                                value: '0',
                                label: '已完成',
                            },
                            {
                                value: '1',
                                label: '挂账',
                            },
                            {
                                value: '2',
                                label: '超时',
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
                        创建时间
                    </div>
                    <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, startTime: dateString })} placeholder={'开始时间'} name="date" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        结束时间
                    </div>
                    <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, endTime: dateString })} placeholder={'结束时间'} name="date" />
                </div>
            </div>
            <Table dataSource={list} scroll={{ x: 3000 }} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginTop: 20 }}>
                出金
            </div>
            <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        出金主网
                    </div>
                    <Select
                        defaultValue="全部"
                        style={{
                            width: 120,
                        }}
                        onChange={value => setSearchP1({ ...searchP1, trcNet: value })}
                        options={[
                            {
                                value: '0',
                                label: 'TRC20',
                            },
                            {
                                value: '1',
                                label: 'Solana',
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
                        出金单号
                    </div>
                    <Input placeholder="出金单号" onChange={t => setSearchP1({ ...searchP1, orderId: t.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        订单Hash
                    </div>
                    <Input placeholder="订单Hash" onChange={t => setSearchP1({ ...searchP1, hashId: t.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        用户账号
                    </div>
                    <Input placeholder="用户账号" onChange={t => setSearchP1({ ...searchP1, email: t.target.value })} />
                </div>
                <Button
                    type="primary"
                    key="primary"
                    onClick={() => {
                        getList1(1)
                    }}
                >
                    查询
                </Button>
            </div>
            <div style={{ display: 'flex', marginBottom: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        出金币种
                    </div>
                    <Select
                        defaultValue="全部"
                        style={{
                            width: 120,
                        }}
                        onChange={value => setSearchP1({ ...searchP1, type: value })}
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
                        订单状态
                    </div>
                    <Select
                        defaultValue="全部"
                        style={{
                            width: 120,
                        }}
                        onChange={value => setSearchP1({ ...searchP1, status: value })}
                        options={[
                            {
                                value: '0',
                                label: '已完成',
                            },
                            {
                                value: '1',
                                label: '审核中',
                            },
                            {
                                value: '2',
                                label: '拒绝',
                            },
                            {
                                value: '3',
                                label: '取消',
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
                        创建时间
                    </div>
                    <DatePicker onChange={(date, dateString) => setSearchP1({ ...searchP1, startTime: dateString })} placeholder={'开始时间'} name="date" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        结束时间
                    </div>
                    <DatePicker onChange={(date, dateString) => setSearchP1({ ...searchP1, endTime: dateString })} placeholder={'结束时间'} name="date" />
                </div>
            </div>
            <Table dataSource={list1} scroll={{ x: 3000 }} columns={columns1} pagination={false} />
            <Pagination total={data1?.total} style={{ marginTop: 10 }} pageSize={data1?.size} current={data1?.current} onChange={(e) => getList1(e)} />
        </div>
    )
}

export default App
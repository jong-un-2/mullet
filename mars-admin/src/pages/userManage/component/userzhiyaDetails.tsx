import { getuseroutList, getuserpayList, userOrderList, userTotal, userzhiyaDetails } from "@/services/ant-design-pro/api"
import { Button, DatePicker, Input, message, Pagination, Select, Table } from "antd"
import { useEffect, useState } from "react"

const App = (props) => {
    useEffect(() => {
        gettotal()
        getList(1)
    }, [])
    const [total, setTotal] = useState({})
    const [list, setList] = useState([])
    const [data, setData] = useState([])
    const [searchP, setSearchP] = useState({
        "orderId": "",
        "createTime": "",
        "status": ''  //0进行中，1已完成，2未完成
    })
    const gettotal = async () => {
        const rep = await userzhiyaDetails(props.id)
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
        const rep = await userOrderList(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                status: item.status == 0 ? '进行中' : item.status == 1 ? '已完成' : '未完成',
            }));
            setList(processedData)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const columns = [
        {
            title: '质押订单号',
            dataIndex: 'orderId',
            key: 'orderId',
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
            title: '收益率（%）',
            dataIndex: 'revenue',
            key: 'revenue',
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
            title: '订单状态',
            dataIndex: 'status',
            key: 'status',
        },
    ];

    return (
        <div style={{ background: '#fff', padding: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, color: '#222', }}>
                    用户账号：{props.userName}
                </div>
                <div style={{ fontSize: 14, color: '#222', }}>
                    质押总收益：{total?.totalEvent}
                </div>
                <div style={{ fontSize: 14, color: '#222', }}>
                    质押净收益：{total?.netProfit}
                </div>
            </div>
            <div style={{ display: 'flex', marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        状态
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
                                label: '进行中',
                            },
                            {
                                value: '1',
                                label: '已完成',
                            },
                            {
                                value: '2',
                                label: '未达成',
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
                        质押单号
                    </div>
                    <Input placeholder="质押单号" onChange={t => setSearchP({ ...searchP, orderId: t.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        创建时间
                    </div>
                    <DatePicker onChange={(date, dateString) => setSearchP({ ...searchP, createTime: dateString })} placeholder={'开始时间'} name="date" />
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

            <Table dataSource={list} scroll={{ x: 2000 }} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
        </div>
    )
}

export default App
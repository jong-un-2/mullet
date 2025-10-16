import { addHuodong, addtgHuodong, deletetgHuodong, exportuser, getBase, getChat, gethuodongList, gettghuodong, getusertongji, updateHuodong } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Select, Button, Table, Pagination, Modal, Input } from 'antd';
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
    const [data, setData] = useState({})
    const [list, setList] = useState([])
    const [addStartDate, setaddStartDate] = useState('')
    const [time, settime] = useState('')
    const [email, setEmail] = useState('')
    const [aemail, setaEmail] = useState('')
    const [money, setmoney] = useState('')
    const [type, setType] = useState('0')
    const [chakan, setChakan] = useState({})
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            email: email,
            time: addStartDate
        }
        const rep = await gettghuodong(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                // activityType: item.activityType == 0 ? '首充赠送' : '',
                // targetUsers: '未充值用户',
                // status: item.status == 0 ? '启用' : '停用'
                type: item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : 'BTC',
                status: item.status == 0 ? '未发放' : '已发放' // status 0-未发放 1-已发放

            }));
            setList(processedData)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const columns = [
        {
            title: '用户邮箱',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: '发放数量',
            dataIndex: 'amount',
            key: 'amount',
        },
        {
            title: '发放币种',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: '发放日期',
            dataIndex: 'time',
            key: 'time',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => {
                record.status == '已发放' ?
                    null
                    :
                    <>
                        <a style={{ marginRight: 10 }} onClick={() => { setChakan(record); setModalOpen2(true) }}>删除</a>
                    </>
            },
        },

    ];
    const newActive = async () => {
        const p = {
            "email": aemail, //用户邮件
            "type": type, //0usdt 1sol 2btc
            "amount": money, //赠送金额
            "time": time
        }
        const rep = await addtgHuodong(p)
        if (rep.code == 200) {
            message.success('新建成功')
            getList(1)
            setModalOpen3(false)
        } else {
            message.error(rep.msg)
        }
    }
    const deletehuodong = async () => {
        const rep = await deletetgHuodong(chakan.id)
        if (rep.code == 200) {
            message.success('删除成功')
            getList(1)
            setModalOpen2(false)
        } else {
            message.error(rep.msg)
        }
    }
    return (
        <PageContainer>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            发放日期
                        </div>
                        <DatePicker onChange={(date, dateString) => setaddStartDate(dateString)} placeholder={'发放时间'} name="date" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 30 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            用户邮箱
                        </div>
                        <Input value={email} placeholder='用户邮箱' onChange={v => setEmail(v.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex' }}>
                    <Button
                        type="primary"
                        key="primary"
                        onClick={() => setModalOpen3(true)}
                    >
                        新增
                    </Button>
                    <Button
                        style={{ marginLeft: 10 }}
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

            <Table dataSource={list} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新建'}
                width="1000px"
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => { newActive() }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        发放币种
                    </div>
                    <Select
                        value={type}
                        style={{
                            width: 120,
                        }}
                        onChange={value => setType(value)}
                        options={[
                            { label: 'USDT', value: '0' },
                            { label: 'SOL', value: '1' },
                            { label: 'BTC', value: '2' }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10, width: 200 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        用户邮箱
                    </div>
                    <Input value={aemail} placeholder='用户邮箱' onChange={v => setaEmail(v.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10, width: 200 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        发放数量
                    </div>
                    <Input value={money} placeholder='发放数量' onChange={v => setmoney(v.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', width: 200 }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        发放日期
                    </div>
                    <DatePicker onChange={(date, dateString) => settime(dateString)} placeholder={'发放时间'} showTime name="date" />
                </div>
            </Modal>
            <Modal
                title={'确定删除'}
                open={ModalOpen2}
                onCancel={() => setModalOpen2(false)}
                onOk={() => deletehuodong()}
            >
                <div>
                    确定删除对{chakan.email}用户发放的{chakan.amount} {chakan.type}赠金吗？
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

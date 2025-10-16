import { addHuodong, exportuser, getBase, getChat, gethuodongList, getshouchongDetails, getusertongji, shouchongEdit, updateHuodong } from '@/services/ant-design-pro/api';
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
    const [chakanData, setchakanData] = useState({})
    const [list, setList] = useState([])
    const [sDate, setSdate] = useState('')
    const [eDate, setEdate] = useState('')
    const [activityName, setactivityName] = useState('')
    const [activityType, setactivityType] = useState(0)
    const [recoveryConditions, setrecoveryConditions] = useState(0)
    const [targetUsers, settargetUsers] = useState(0)
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
    const [zhouqiArr, setZhouqiArr] = useState([{ type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' }, { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' }, { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' }, { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' }, { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' }])
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
        }
        const rep = await gethuodongList(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                activityType: item.activityType == 0 ? '首充赠送' : '',
                targetUsers: '未充值用户',
                status: item.status == 0 ? '启用' : '停用'
            }));
            setList(processedData)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const columns = [
        {
            title: '活动编号',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: '活动名称',
            dataIndex: 'activityName',
            key: 'activityName',
        },
        {
            title: '活动类型',
            dataIndex: 'activityType',
            key: 'activityType',
        },
        {
            title: '开始时间',
            dataIndex: 'startTime',
            key: 'startTime',
        },
        {
            title: '结束时间',
            dataIndex: 'endTime',
            key: 'endTime',
        },
        {
            title: '目标用户',
            dataIndex: 'targetUsers',
            key: 'targetUsers',
        },
        {
            title: '累计参与人数',
            dataIndex: 'cumulativeParticipationCount',
            key: 'cumulativeParticipationCount',
        },
        {
            title: '累计触发次数',
            dataIndex: 'cumulativeTriggerCount',
            key: 'cumulativeTriggerCount',
        },
        {
            title: '累计赠送金额',
            dataIndex: 'totalGrantedAmount',
            key: 'totalGrantedAmount',
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
        {
            title: '活动状态',
            dataIndex: 'status',
            key: 'status',
        },
        {
            title: '操作人',
            dataIndex: 'operatorName',
            key: 'operatorName',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => chakan(record.id)}>查看</a>
                <a style={{ marginRight: 10 }} onClick={() => edit(record.id)}>修改</a>
                <a style={{ marginRight: 10 }} onClick={() => update(record.id, record.status)}>{record.status == '启用' ? '停用' : '启用'}</a>
            </>,
        },

    ];
    const update = async (id, status) => {
        const p = {
            "id": id,
            "status": status == '启用' ? 1 : 0//0启用，1停用
        }
        const rep = await updateHuodong(p)
        if (rep.code == 200) {
            message.success('更新成功')
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const newActive = async () => {
        const filteredArr = zhouqiArr.filter(item =>
            Object.values(item).every(value => value !== '')
        );
        const p = {
            "activityName": activityName,
            "activityType": activityType, // 活动类型 ，0首充赠送
            "startTime": sDate,// 活动开始的时间
            "endTime": eDate, //活动结束的时间
            "targetUsers": targetUsers, //目标用户群体 0 未充值用户
            "recoveryConditions": recoveryConditions, //赠金回收条件 /0 体现
            "activityList": filteredArr
        }
        const rep = await addHuodong(p)
        if (rep.code == 200) {
            message.success('新建成功')
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const chakan = async (id) => {
        const rep = await getshouchongDetails(id)
        if (rep.code == 200) {
            setModalOpen2(true)
            setchakanData(rep.data)
        } else {
            message.error(rep.msg)
        }
    }
    const edit = async (id) => {
        const rep = await getshouchongDetails(id)
        if (rep.code == 200) {
            setModalOpen1(true)
            setchakanData(rep.data)
            setactivityName(rep.data.activityName)
            setSdate(rep.data.startTime)
            setEdate(rep.data.endTime)
            setZhouqiArr(rep.data.activityList)
        } else {
            message.error(rep.msg)
        }
    }
    const submitEdit = async () => {
        const filteredArr = zhouqiArr.filter(item =>
            Object.values(item).every(value => value !== '')
        );
        const p = {
            'id': chakanData.id,
            "activityName": activityName,
            "activityType": activityType, // 活动类型 ，0首充赠送
            "startTime": sDate,// 活动开始的时间
            "endTime": eDate, //活动结束的时间
            "targetUsers": targetUsers, //目标用户群体 0 未充值用户
            "recoveryConditions": recoveryConditions, //赠金回收条件 /0 体现
            "activityList": filteredArr
        }
        const rep = await shouchongEdit(p)
        if (rep.code == 200) {
            setModalOpen1(false);
            message.success('修改成功')
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    // 更新周期数组的特定字段值
    const handleInputChange = (index, field, value) => {
        const updatedArr = [...zhouqiArr]; // 创建数组的副本
        updatedArr[index] = { ...updatedArr[index], [field]: value }; // 更新特定索引的对象
        setZhouqiArr(updatedArr); // 更新状态
    };
    const item = (i, idx) => {
        return (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }} key={idx + 'ppoolqos'}>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    <Select
                        // defaultValue={i.type + ''}
                        value={i.type + ''}
                        style={{ width: 120 }}
                        onChange={value => handleInputChange(idx, 'type', value)}
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
                        ]}
                    />
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 2, display: 'flex' }}>
                    <Input
                        placeholder="最小范围"
                        style={{ width: 120 }}
                        value={i.min}
                        onChange={e => handleInputChange(idx, 'min', e.target.value)} // 更新 investorsMin 字段
                    />
                    <Input
                        style={{ width: 120, marginLeft: 10 }}
                        placeholder="最大范围"
                        value={i.max}
                        onChange={e => handleInputChange(idx, 'max', e.target.value)} // 更新 investorsMax 字段
                    />
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    <Select
                        // defaultValue={i.grantedType + ''}
                        value={i.type + ''}
                        disabled
                        // onChange={value => handleInputChange(idx, 'grantedType', value)}
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
                        ]}
                    />
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    <Input
                        placeholder="赠送百分比"
                        style={{ width: 120 }}
                        value={i.grantedPercentage}
                        onChange={e => handleInputChange(idx, 'grantedPercentage', e.target.value)} // 更新 revenue 字段
                    />
                </div>

            </div>
        )
    }
    const item1 = (i, idx) => {
        return (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }} key={idx + 'ppoolqos1122'}>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    <Select
                        disabled
                        value={i.type + ''}
                        onChange={value => handleInputChange(idx, 'type', value)}
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
                        ]}
                    />
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 2, display: 'flex' }}>
                    <Input
                        placeholder="最小范围"
                        disabled
                        style={{ width: 120 }}
                        value={i.min}
                        onChange={e => handleInputChange(idx, 'min', e.target.value)} // 更新 investorsMin 字段
                    />
                    <Input
                        disabled
                        style={{ width: 120, marginLeft: 10 }}
                        placeholder="最大范围"
                        value={i.max}
                        onChange={e => handleInputChange(idx, 'max', e.target.value)} // 更新 investorsMax 字段
                    />
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    <Select
                        disabled
                        value={i.type + ''}
                        onChange={value => handleInputChange(idx, 'grantedType', value)}
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
                        ]}
                    />
                </div>
                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                    <Input
                        disabled
                        placeholder="赠送百分比"
                        style={{ width: 120 }}
                        value={i.grantedPercentage}
                        onChange={e => handleInputChange(idx, 'grantedPercentage', e.target.value)} // 更新 revenue 字段
                    />
                </div>
            </div>
        )
    }
    return (
        <PageContainer>
            <Button
                type="primary"
                key="primary"
                style={{ marginTop: 30, marginBottom: 30 }}
                onClick={() => {
                    setModalOpen3(true);
                    setactivityName('');
                    setSdate('');
                    setEdate('');
                    setZhouqiArr(
                        [
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                            { type: '0', min: '', max: '', grantedType: '0', grantedPercentage: '' },
                        ]
                    )
                    setchakanData({})
                }}
            >
                新增活动
            </Button>
            <Table dataSource={list} scroll={{ x: 2000 }} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新建活动'}
                width="1000px"
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => { newActive(); setModalOpen3(false) }}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动类型
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                defaultValue="0"
                                onChange={value => setactivityType(value)}
                                options={[
                                    {
                                        value: '0',
                                        label: '首充赠送',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            目标用户
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                defaultValue="0"
                                onChange={value => settargetUsers(value)}
                                options={[
                                    {
                                        value: '0',
                                        label: '未充值用户',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动名称
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="活动名称"
                            value={activityName}
                            onChange={e => setactivityName(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                赠金回收条件
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                <Select
                                    defaultValue="0"
                                    onChange={value => setrecoveryConditions(value)}
                                    options={[
                                        {
                                            value: '0',
                                            label: '提现',
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动开始时间
                        </div>
                        <DatePicker onChange={(date, dateString) => setSdate(dateString)} placeholder={'开始时间'} name="date" showTime />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                活动结束时间
                            </div>
                            <DatePicker onChange={(date, dateString) => setEdate(dateString)} placeholder={'结束时间'} name="date" showTime />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            配置赠送层级
                        </div>
                        <div style={{ display: 'flex' }}>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                充值币种
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                                单笔充值范围
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                赠送币种
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                赠送数量%
                            </div>
                        </div>
                        {
                            zhouqiArr.map((it, idx) => (item(it, idx)))
                        }
                    </div>
                </div>
            </Modal>
            <Modal
                title={'查看活动'}
                width="1000px"
                open={ModalOpen2}
                onCancel={() => setModalOpen2(false)}
                onOk={() => { setModalOpen2(false) }}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动类型
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                disabled
                                defaultValue="0"
                                onChange={value => setactivityType(value)}
                                options={[
                                    {
                                        value: '0',
                                        label: '首充赠送',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            目标用户
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                disabled
                                defaultValue="0"
                                onChange={value => settargetUsers(value)}
                                options={[
                                    {
                                        value: '0',
                                        label: '未充值用户',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动名称
                        </div>
                        <Input
                            disabled
                            style={{ width: 300 }}
                            placeholder="活动名称"
                            value={chakanData.activityName}
                            onChange={e => setactivityName(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                赠金回收条件
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                <Select
                                    defaultValue="0"
                                    disabled
                                    onChange={value => setrecoveryConditions(value)}
                                    options={[
                                        {
                                            value: '0',
                                            label: '提现',
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动开始时间
                        </div>
                        <Input
                            disabled
                            style={{ width: 300 }}
                            placeholder="活动名称"
                            value={chakanData.startTime}
                            onChange={e => setactivityName(e.target.value)}
                        />
                        {/* <DatePicker onChange={(date, dateString) => setSdate(dateString)} value={dayjs(chakanData.startTime).format('DD-MM-YYYY hh : mm : ss')} disabled placeholder={'开始时间'} name="date" showTime /> */}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                活动结束时间
                            </div>
                            <Input
                                disabled
                                style={{ width: 300 }}
                                placeholder="活动名称"
                                value={chakanData.endTime}
                                onChange={e => setactivityName(e.target.value)}
                            />
                            {/* <DatePicker onChange={(date, dateString) => setEdate(dateString)} disabled value={chakanData.endTime} placeholder={'结束时间'} name="date" showTime /> */}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            配置赠送层级
                        </div>
                        <div style={{ display: 'flex' }}>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                充值币种
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                                单笔充值范围
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                赠送币种
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                赠送数量%
                            </div>
                        </div>
                        {
                            chakanData?.activityList?.map((it, idx) => (item1(it, idx)))
                        }
                    </div>
                </div>

            </Modal>
            <Modal
                title={'修改活动'}
                width="1000px"
                open={ModalOpen1}
                onCancel={() => setModalOpen1(false)}
                onOk={() => { submitEdit() }}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动类型
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                defaultValue="0"
                                onChange={value => setactivityType(value)}
                                options={[
                                    {
                                        value: '0',
                                        label: '首充赠送',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            目标用户
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                defaultValue="0"
                                onChange={value => settargetUsers(value)}
                                options={[
                                    {
                                        value: '0',
                                        label: '未充值用户',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动名称
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="活动名称"
                            value={activityName}
                            onChange={e => setactivityName(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                赠金回收条件
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                <Select
                                    defaultValue="0"
                                    onChange={value => setrecoveryConditions(value)}
                                    options={[
                                        {
                                            value: '0',
                                            label: '提现',
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            活动开始时间
                        </div>
                        <DatePicker onChange={(date, dateString) => setSdate(dateString)} placeholder={sDate} name="date" showTime />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                活动结束时间
                            </div>
                            <DatePicker onChange={(date, dateString) => setEdate(dateString)} placeholder={eDate} name="date" showTime />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            配置赠送层级
                        </div>
                        <div style={{ display: 'flex' }}>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                充值币种
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 2 }}>
                                单笔充值范围
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                赠送币种
                            </div>
                            <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                赠送数量%
                            </div>
                        </div>
                        {
                            zhouqiArr.map((it, idx) => (item(it, idx)))
                        }
                    </div>
                </div>

            </Modal>
        </PageContainer>
    );
};

export default App;

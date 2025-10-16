import { addBanner, addchannel, addHuodong, addNotice, addTg, chakanNoticeDetails, chakanNoticeType, channelDelete, collegeadd, collegelist, collegetype, collegeupdate, deleteBanner, deletecollege, deletemsg, deleteNotice, deleteTg, editBanner, editNotice, editTg, exportuser, getBanner, getBase, getChat, gethuodongList, getNoticeList, getTg, getusertongji, msgadd, msgchannelList, msgEdit, msgList, msgTypexinzeng, statuscollege, statusmsg, updateChannel, updateHuodong, wangneng } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Form, Select, Button, Table, Pagination, Modal, Input, Upload, Radio, } from 'antd';
import React, { useEffect, useState } from 'react';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import { Renderer as SVGRenderer } from '@antv/g-svg';
import * as echarts from "echarts";
import dayjs from 'dayjs';
import FileSaver from 'file-saver';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * 每个单独的卡片，为了复用样式抽成了组件
 * @param param0
 * @returns
 */
const App = () => {
    useEffect(() => {
        getList(1)
    }, [])

    const [list, setList] = useState([])
    const [data, setData] = useState({})
    const [chakanData, setchakan] = useState({});
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
    const [addName, setAddName] = useState('')
    const [signature, setsignature] = useState('')
    const [sdkAppid, setsdkAppid] = useState('')
    const [sdkAppkey, setsdkAppkey] = useState('')
    const [apiUrl, setapiUrl] = useState('')
    const [secretId, setsecretId] = useState('')
    const [secretKey, setsecretKey] = useState('')
    const [channelFlag, setchannelFlag] = useState(0)
    const [category, setcategory] = useState(1)
    const [search, setsearch] = useState({
        "channelFlag": '', //0 国内 1国外
        "channelType": '', //1邮件 2短信
    })
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            ...search
        }
        const rep = await msgchannelList(p)
        if (rep.code == 200) {
            // const processedData = rep.data.records.map((item: any) => ({
            //     ...item,
            //     status: item.status == 0 ? '下架' : '上架',
            //     flag: item.flag == 0 ? '图片' : '视频',
            //     language: item.language == 'en' ? '英文' : item.language == 'zh-CN' ? '简体中文' : item.language == 'vi' ? '越南' : item.language == 'pt' ? '葡萄牙' : item.language == 'es' ? '西班牙' : null
            //     // targetUsers: '未充值用户',
            //     // status: item.status == 0 ? '启用' : '停用'
            // }));
            setList(rep.data.records)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }

    const columns = [
        // {
        //     title: 'ID',
        //     dataIndex: 'id',
        //     key: 'id',
        // },
        {
            title: '通道名称',
            dataIndex: 'channelName',
            key: 'channelName',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (_, record) => <>
                <div>
                    {record.status == 0 ? '关闭' : '开启'}
                </div>
            </>,
        },
        {
            title: '维护人',
            dataIndex: 'operatorName',
            key: 'operatorName',
        },
        {
            title: '最后检测时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setModalOpen2(true) }}>修改</a>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setModalOpen1(true) }}>删除</a>
            </>,
        },

    ];
    const edit = async () => {
        const p = {
            ...chakanData,
        }
        const rep = await updateChannel(p)
        if (rep.code == 200) {
            message.success('修改成功');
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const deletequn = async () => {
        const rep = await channelDelete(chakanData?.id)
        if (rep.code == 200) {
            message.success('删除成功')
            getList(1)
            setModalOpen1(false)
        } else {
            message.error(rep.msg)
        }
    }
    useEffect(() => {
        setchannelFlag(0)
        setcategory(1)
        setAddName('')
        setsignature('')
        setsdkAppid('')
        setsdkAppkey('')
        setapiUrl('')
        setsecretId('')
        setsecretKey('')
    }, [ModalOpen3])
    useEffect(() => {
    }, [ModalOpen2])
    const add = async () => {
        const p = {
            "channelFlag": channelFlag, //0 国内 1国外
            "channelType": category, //1邮件 2短信
            "channelName": addName, //名称
            "signature": signature, //签名
            "sdkAppid": sdkAppid,
            "sdkAppkey": sdkAppkey,
            "apiUrl": apiUrl,
            "secretId": secretId,
            "secretKey": secretKey
        }
        const rep = await addchannel(p)
        if (rep.code == 200) {
            setModalOpen3(false)
            message.success('新增成功')
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    return (
        <PageContainer>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 30, marginBottom: 30, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex' }}>
                    <Button
                        type="primary"
                        key="primary"
                        style={{}}
                        onClick={() => setModalOpen3(true)}
                    >
                        新增
                    </Button>
                </div>

                <div style={{ display: 'flex' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginRight: 30 }}>
                        <div style={{ fontSize: 14, color: '#222' }}>
                            国内/国外：
                        </div>
                        <Select
                            style={{ width: 120 }}
                            value={search.channelFlag}
                            onChange={value => setsearch({ ...search, channelFlag: value })}
                            options={[
                                {
                                    label: '国内',
                                    value: '0'
                                },
                                {
                                    label: '国外',
                                    value: '1'
                                },
                                {
                                    label: '全部',
                                    value: ''
                                }
                            ]}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontSize: 14, color: '#222' }}>
                            邮件/短信：
                        </div>
                        <Select
                            style={{ width: 120 }}
                            value={search.channelType}
                            onChange={value => setsearch({ ...search, channelType: value })}
                            options={[
                                {
                                    label: '邮件',
                                    value: '1'
                                },
                                {
                                    label: '短信',
                                    value: '2'
                                },
                                {
                                    label: '全部',
                                    value: ''
                                }
                            ]}
                        />
                    </div>

                    <Button
                        type="primary"
                        key="primary"
                        style={{ marginLeft: 10 }}
                        onClick={() => getList(1)}
                    >
                        查询
                    </Button>
                    <Button
                        type="primary"
                        key="primary"
                        style={{ marginLeft: 10 }}
                        onClick={() => {
                            setsearch({
                                "channelFlag": '', //0 国内 1国外
                                "channelType": '', //1邮件 2短信
                            })
                        }}
                    >
                        重置
                    </Button>
                </div>

            </div>

            <Table dataSource={list} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新增通道'}
                width="1000px"
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => add()}
            >
                <div style={{ display: 'flex' }}>
                    <div>
                        <Radio.Group
                            name="radiogroup"
                            style={{ marginBottom: 10 }}
                            value={channelFlag}
                            onChange={t => { setchannelFlag(t.target.value) }}
                            options={[
                                {
                                    value: 0,
                                    label: '国内',
                                },
                                {
                                    value: 1,
                                    label: '国外',
                                }
                            ]}
                        />
                        <Radio.Group
                            name="radiogroup"
                            value={category}
                            style={{ marginBottom: 10 }}
                            onChange={t => { setcategory(t.target.value) }}
                            options={[
                                {
                                    value: 1,
                                    label: '邮箱',
                                },
                                {
                                    value: 2,
                                    label: '短信',
                                }
                            ]}
                        />
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    名称
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="名称"
                                    value={addName}
                                    onChange={e => setAddName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    签名
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="签名"
                                    value={signature}
                                    onChange={e => setsignature(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    sdkAppid
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="sdkAppid"
                                    value={sdkAppid}
                                    onChange={e => setsdkAppid(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    sdkAppkey
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="sdkAppkey"
                                    value={sdkAppkey}
                                    onChange={e => setsdkAppkey(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    apiUrl
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="apiUrl"
                                    value={apiUrl}
                                    onChange={e => setapiUrl(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    secretId
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="secretId"
                                    value={secretId}
                                    onChange={e => setsecretId(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    secretKey
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="secretKey"
                                    value={secretKey}
                                    onChange={e => setsecretKey(e.target.value)}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </Modal>
            <Modal
                title={'修改通道'}
                width="1000px"
                open={ModalOpen2}
                onCancel={() => setModalOpen2(false)}
                onOk={() => edit()}
            >
                <div style={{ display: 'flex' }}>
                    <div>
                        <Radio.Group
                            name="radiogroup"
                            style={{ marginBottom: 10 }}
                            value={chakanData.channelFlag}
                            onChange={t => { setchakan({ ...chakanData, channelFlag: t.target.value }) }}
                            options={[
                                {
                                    value: 0,
                                    label: '国内',
                                },
                                {
                                    value: 1,
                                    label: '国外',
                                }
                            ]}
                        />
                        <Radio.Group
                            name="radiogroup"
                            value={chakanData.channelType}
                            style={{ marginBottom: 10 }}
                            onChange={t => { setchakan({ ...chakanData, channelType: t.target.value }) }}
                            options={[
                                {
                                    value: 1,
                                    label: '邮箱',
                                },
                                {
                                    value: 2,
                                    label: '短信',
                                }
                            ]}
                        />
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    名称
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="名称"
                                    value={chakanData.channelName}
                                    onChange={e => setchakan({ ...chakanData, channelName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    状态
                                </div>
                                <Radio.Group
                                    name="radiogroup"
                                    style={{ marginBottom: 10 }}
                                    value={chakanData.status}
                                    onChange={t => { setchakan({ ...chakanData, status: t.target.value }) }}
                                    options={[
                                        {
                                            value: 0,
                                            label: '停用',
                                        },
                                        {
                                            value: 1,
                                            label: '启用',
                                        }
                                    ]}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    签名
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="签名"
                                    value={chakanData.signature}
                                    onChange={e => setchakan({ ...chakanData, signature: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    sdkAppid
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="sdkAppid"
                                    value={chakanData.sdkAppid}
                                    onChange={e => setchakan({ ...chakanData, sdkAppid: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    sdkAppkey
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="sdkAppkey"
                                    value={chakanData.sdkAppkey}
                                    onChange={e => setchakan({ ...chakanData, sdkAppkey: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    apiUrl
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="apiUrl"
                                    value={chakanData.apiUrl}
                                    onChange={e => setchakan({ ...chakanData, apiUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    secretId
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="secretId"
                                    value={chakanData.secretId}
                                    onChange={e => setchakan({ ...chakanData, secretId: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    secretKey
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="secretKey"
                                    value={chakanData.secretKey}
                                    onChange={e => setchakan({ ...chakanData, secretKey: e.target.value })}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </Modal>
            <Modal
                title={'删除通道'}
                open={ModalOpen1}
                onCancel={() => setModalOpen1(false)}
                onOk={() => deletequn()}
            >
                <div>
                    是否删除该通道： <span style={{ fontWeight: 'bold' }}>{chakanData?.channelName}</span>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

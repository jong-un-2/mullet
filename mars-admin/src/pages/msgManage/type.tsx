import { addBanner, addHuodong, addmsgtype, addNotice, addTg, chakanNoticeDetails, chakanNoticeType, collegeTypeadd, collegeTypeedit, deleteBanner, deletecollegetype, deletemsgtype, deleteNotice, deleteTg, editBanner, editNotice, editTg, exportuser, getBanner, getBase, getChat, getcollegelist, gethuodongList, getleixingbianma, getNoticeList, getTg, getusertongji, msglistall, msgtypeupdate, updateHuodong } from '@/services/ant-design-pro/api';
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
        // getType()
    }, [])

    const [list, setList] = useState([])
    const [data, setData] = useState({})
    const [chakanData, setchakan] = useState({});
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
    const [addName, setAddName] = useState('')
    const [addimgurl, setaddimgurl] = useState('')
    const [imgurl, setimgurl] = useState('')
    const [addtype, setaddtype] = useState('')
    const [addstatus, setaddstatus] = useState('1')
    const [addjumpUrl, setaddjumpUrl] = useState('')
    const [addappjumpUrl, setaddappjumpUrl] = useState('')
    const [addjumpType, setaddjumpType] = useState('0')
    const [addsort, setaddsort] = useState('')
    const [addLang, setaddLang] = useState('')
    const [category, setcategory] = useState(1)
    const [leixingbianma, setleixingbianma] = useState([])
    const [bianma, setbianma] = useState('')
    const [search, setsearch] = useState({
        language: "",
        "typeName": "",
        "category": '', //1邮件 2手机
    })
    const [loading, setLoading] = useState(false);
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            ...search
        }
        const rep = await msglistall(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                // targetUsers: '未充值用户',
                // status: item.status == 0 ? '启用' : '停用'
            }));
            setList(processedData)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const getleixinbm = async (c = 1) => {
        const rep = await getleixingbianma(c)
        if (rep.code == 200) {
            const arr = []
            rep.data.map(item => {
                arr.push({
                    label: item,
                    value: item
                })
            })
            setleixingbianma(arr)
        }
    }
    const columns = [
        // {
        //     title: 'ID',
        //     dataIndex: 'id',
        //     key: 'id',
        // },
        {
            title: '语言',
            dataIndex: 'language',
            key: 'language',
            render: (_, record) =>
                <div>
                    {record.language == 'en' ? '英文' : record.language == 'zh-CN' ? '简体中文' : record.language == 'vi' ? '越南' : record.language == 'pt' ? '葡萄牙' : record.language == 'es' ? '西班牙' : null}
                </div>
        },
        {
            title: '发送类型',
            dataIndex: 'category',
            key: 'category',
            render: (_, record) =>
                <div>
                    {record.category == 1 ? '邮件' : '手机'}
                </div>
        },
        {
            title: '类型名称',
            dataIndex: 'typeName',
            key: 'typeName',
        },
        {
            title: '创建时间',
            dataIndex: 'createTime',
            key: 'createTime',
        },
        {
            title: '更新时间',
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
    const addqun = async () => {
        if (!addtype && !addLang) {
            message.warning('语言不能为空')
            return
        }
        const p = {
            "typeName": addName,
            "language": addLang,
            category: category, //1邮件 2手机
            "cacheKey": bianma
        }
        const rep = await addmsgtype(p)
        if (rep.code == 200) {
            message.success('新增成功')
            getList(1)
            setModalOpen3(false)
        } else {
            message.error(rep.msg)
        }
    }
    const edit = async () => {
        const p = {
            ...chakanData,
        }
        const rep = await msgtypeupdate(p)
        if (rep.code == 200) {
            message.success('修改成功');
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const deletequn = async () => {
        const rep = await deletemsgtype(chakanData?.id)
        if (rep.code == 200) {
            message.success('删除成功')
            getList(1)
            setModalOpen1(false)
        } else {
            message.error(rep.msg)
        }
    }
    useEffect(() => {
        setAddName('')
        setaddimgurl('')
        setimgurl('')
        setaddtype('')
        setaddjumpType('0')
        setaddjumpUrl('')
        setaddsort('')
        setaddstatus('1')
        setaddLang('')
        setbianma('')
        setcategory(1)

    }, [ModalOpen3])
    useEffect(() => {
        setimgurl('')
    }, [ModalOpen2])
    return (
        <PageContainer>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 30, marginBottom: 30, justifyContent: 'space-between' }}>
                <Button
                    type="primary"
                    key="primary"
                    style={{}}
                    onClick={() => { setModalOpen3(true); getleixinbm(1) }}
                >
                    新增类型
                </Button>
                <div style={{ display: 'flex' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontSize: 14, color: '#222' }}>
                            语言：
                        </div>
                        <Select
                            style={{ width: 120 }}
                            value={search.language}
                            onChange={value => setsearch({ ...search, language: value })}
                            options={[
                                {
                                    label: '简体中文',
                                    value: 'zh-CN'
                                },
                                {
                                    label: '西班牙语',
                                    value: 'es'
                                },
                                {
                                    label: '英文',
                                    value: 'en'
                                },
                                {
                                    label: '越南',
                                    value: 'vi'
                                },
                                {
                                    label: '葡萄牙',
                                    value: 'pt'
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
                </div>

            </div>

            <Table dataSource={list} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新增类型'}
                // width="1000px"
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => addqun()}
            >
                <Radio.Group
                    name="radiogroup"
                    defaultValue={''}
                    value={category}
                    style={{ marginBottom: 10 }}
                    onChange={t => { { setcategory(t.target.value); getleixinbm(t.target.value); setbianma('') } }}
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
                            类型编码
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 300 }}
                                value={bianma}
                                onChange={value => setbianma(value)}
                                options={leixingbianma}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex' }}>
                    <div style={{ display: 'flex', marginBottom: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                类型名称
                            </div>
                            <Input
                                style={{ width: 300 }}
                                placeholder="类型名称"
                                value={addName}
                                onChange={e => setAddName(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        语言
                    </div>
                    <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                        <Select
                            style={{ width: 120 }}
                            value={addLang}
                            onChange={value => setaddLang(value)}
                            options={[
                                {
                                    label: '简体中文',
                                    value: 'zh-CN'
                                },
                                {
                                    label: '西班牙语',
                                    value: 'es'
                                },
                                {
                                    label: '英文',
                                    value: 'en'
                                },
                                {
                                    label: '越南',
                                    value: 'vi'
                                },
                                {
                                    label: '葡萄牙',
                                    value: 'pt'
                                },
                            ]}
                        />
                    </div>
                </div>
            </Modal>
            <Modal
                title={'修改类型'}
                open={ModalOpen2}
                onCancel={() => setModalOpen2(false)}
                onOk={() => edit()}
            >
                {/* <Radio.Group
                    name="radiogroup"
                    defaultValue={''}
                    value={chakanData.category}
                    style={{ marginBottom: 10 }}
                    onChange={t => { setchakan({ ...chakanData, cacheKey: '', category: t.target.value }); getleixinbm(t.target.value) }}
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
                            类型编码
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 300 }}
                                value={chakanData.cacheKey}
                                onChange={value => setchakan({ ...chakanData, cacheKey: value })}
                                options={leixingbianma}
                            />
                        </div>
                    </div>
                </div> */}
                <div style={{ display: 'flex' }}>
                    <div style={{ display: 'flex', marginBottom: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                类型名称
                            </div>
                            <Input
                                style={{ width: 300 }}
                                placeholder="类型名称"
                                value={chakanData.typeName}
                                onChange={e => setchakan({ ...chakanData, typeName: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
                {/* <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        语言
                    </div>
                    <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                        <Select
                            style={{ width: 120 }}
                            value={chakanData.language}
                            onChange={value => setchakan({ ...chakanData, language: value })}
                            options={[
                                {
                                    label: '简体中文',
                                    value: 'zh-CN'
                                },
                                {
                                    label: '西班牙语',
                                    value: 'es'
                                },
                                {
                                    label: '英文',
                                    value: 'en'
                                },
                                {
                                    label: '越南',
                                    value: 'vi'
                                },
                                {
                                    label: '葡萄牙',
                                    value: 'pt'
                                },
                            ]}
                        />
                    </div>
                </div> */}

            </Modal>
            <Modal
                title={'删除类型'}
                open={ModalOpen1}
                onCancel={() => setModalOpen1(false)}
                onOk={() => deletequn()}
            >
                <div>
                    是否删除该类型： <span style={{ fontWeight: 'bold' }}>{chakanData?.typeName}</span>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

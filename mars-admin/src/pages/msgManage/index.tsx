import { addBanner, addHuodong, addNotice, addTg, chakanNoticeDetails, chakanNoticeType, collegeadd, collegelist, collegetype, collegeupdate, deleteBanner, deletecollege, deletemsg, deleteNotice, deleteTg, editBanner, editNotice, editTg, exportuser, getBanner, getBase, getChat, gethuodongList, getNoticeList, getTg, getusertongji, msgadd, msgEdit, msgList, msgTypexinzeng, statuscollege, statusmsg, updateHuodong, wangneng } from '@/services/ant-design-pro/api';
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
    const [ModalOpen4, setModalOpen4] = useState<boolean>(false);
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
    const [addName, setAddName] = useState('')
    const [addtype, setaddtype] = useState('')
    const [addLang, setaddLang] = useState('')
    const [addcontent, setaddcontent] = useState('')
    const [type, setType] = useState([])
    const [category, setcategory] = useState('')
    const [wangnnegcode, setwangnnegcode] = useState('')
    const [search, setsearch] = useState({
        "category": '', //1邮件 2手机
        "language": "",
        "status": '',  //状态 0关闭 1开启
        typeId: ''
    })
    const [loading, setLoading] = useState(false);
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            ...search
        }
        const rep = await msgList(p)
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
            title: '编码',
            dataIndex: 'cachekey',
            key: 'cachekey',
        },
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
            title: '种类',
            dataIndex: 'category',
            key: 'category',
            render: (_, record) =>
                <div>
                    {record.category == '1' ? '邮件' : '手机'}
                </div>
        },
        {
            title: '内容类型',
            dataIndex: 'typeName',
            key: 'typeName',
            // render: (_, record) => <>
            //     <div>
            //         {record.flag == 0 ? '图片' : '视频'}
            //     </div>
            // </>,
        },
        {
            title: '内容',
            dataIndex: 'content',
            key: 'content',
            // render: (_, record) => <>
            //     <div>
            //         {record.flag == 0 ? '图片' : '视频'}
            //     </div>
            // </>,
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
            title: '维护时间',
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
                <a onClick={() => { updatestatus(record.id, record.status == 0 ? 1 : 0) }} style={{ marginLeft: 10 }}>{record.status == 0 ? '开启' : '关闭'}</a>
            </>,
        },

    ];
    const edit = async () => {
        const p = {
            ...chakanData,
        }
        const rep = await msgEdit(p)
        if (rep.code == 200) {
            message.success('修改成功');
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const deletequn = async () => {
        const rep = await deletemsg(chakanData?.id)
        if (rep.code == 200) {
            message.success('删除成功')
            getList(1)
            setModalOpen1(false)
        } else {
            message.error(rep.msg)
        }
    }
    const updatestatus = async (id, s) => {
        const p = {
            "id": id,
            "status": s //0下架 1上架
        }
        const rep = await statusmsg(p)
        if (rep.code == 200) {
            message.success('更新成功')
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const getaddType = async (type = 1) => {
        const p = {
            "category": type, //1邮件 2手机
            "language": "zh-CN" //语言
        }
        const rep = await msgTypexinzeng(p)
        if (rep.code == 200) {
            const arr = []
            rep.data.map(item => {
                arr.push({
                    label: item.typeName,
                    value: item.id
                })
            })
            setType(arr)
        }
    }
    useEffect(() => {
        setAddName('')
        setaddtype('')
        setaddLang('')
        setaddcontent('')
    }, [ModalOpen3])
    useEffect(() => {
    }, [ModalOpen2])
    const add = async () => {
        const p = {
            "typeId": addtype, //内容类型id
            "content": addcontent, //内容
            "category": category, //1邮件 2手机
            "sign": addName, //签名 短信用
            title: addName,
            "language": addLang
        }
        const rep = await msgadd(p)
        if (rep.code == 200) {
            setModalOpen3(false)
            message.success('新增成功')
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const wn = async () => {
        const rep = await wangneng()
        if (rep.code == 200) {
            setModalOpen4(true)
            setwangnnegcode(rep.data)
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
                        内容发布
                    </Button>
                    <Button
                        type="primary"
                        key="primary"
                        style={{marginLeft: 20 }}
                        onClick={() => wn()}
                    >
                        万能验证码
                    </Button>
                </div>

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
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: 30 }}>
                        <div style={{ fontSize: 14, color: '#222' }}>
                            发布类型：
                        </div>
                        <Select
                            style={{ width: 120 }}
                            value={search.category}
                            onChange={value => setsearch({ ...search, category: value })}
                            options={[
                                {
                                    label: '邮件',
                                    value: '1'
                                },
                                {
                                    label: '手机',
                                    value: '2'
                                },
                                {
                                    label: '全部',
                                    value: ''
                                }
                            ]}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: 30 }}>
                        <div style={{ fontSize: 14, color: '#222' }}>
                            状态：
                        </div>
                        <Select
                            style={{ width: 120 }}
                            value={search.status}
                            onChange={value => setsearch({ ...search, status: value })}
                            options={[
                                {
                                    label: '启用',
                                    value: '1'
                                },
                                {
                                    label: '关闭',
                                    value: '0'
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
                                language: '',
                                status: '',
                                category: '',
                                typeId: ''
                            })
                        }}
                    >
                        重置
                    </Button>
                </div>

            </div>

            <Table dataSource={list} scroll={{ x: 1700 }} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新增内容'}
                width="1000px"
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => add()}
            >
                <div style={{ display: 'flex' }}>
                    <div>
                        <Radio.Group
                            name="radiogroup"
                            defaultValue={''}
                            style={{ marginBottom: 10 }}
                            onChange={t => { getaddType(t.target.value); setcategory(t.target.value) }}
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
                        {
                            category ?
                                category == 1 ?
                                    <div style={{ display: 'flex', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                                标题
                                            </div>
                                            <Input
                                                style={{ width: 300 }}
                                                placeholder="标题"
                                                value={addName}
                                                onChange={e => setAddName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    :
                                    <div style={{ display: 'flex', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                                签名
                                            </div>
                                            <Input
                                                style={{ width: 300 }}
                                                placeholder="签名"
                                                value={addName}
                                                onChange={e => setAddName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                :
                                null
                        }

                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    类型名称
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 200 }}
                                        value={addtype}
                                        onChange={value => setaddtype(value)}
                                        options={type}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    内容
                                </div>
                                <Input.TextArea
                                    style={{ width: 300 }}
                                    placeholder="内容"
                                    value={addcontent}
                                    onChange={e => setaddcontent(e.target.value)}
                                />
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
                    </div>
                </div>
            </Modal>
            <Modal
                title={'修改内容'}
                width="1000px"
                open={ModalOpen2}
                onCancel={() => setModalOpen2(false)}
                onOk={() => edit()}
            >
                <div style={{ display: 'flex' }}>
                    <div>
                        <Radio.Group
                            name="radiogroup"
                            defaultValue={chakanData.category}
                            value={chakanData.category}
                            style={{ marginBottom: 10 }}
                            onChange={t => { getaddType(t.target.value); setchakan({ ...chakanData, category: t.target.value }) }}
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
                        {
                            chakanData.category ?
                                category == 1 ?
                                    <div style={{ display: 'flex', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                                标题
                                            </div>
                                            <Input
                                                style={{ width: 300 }}
                                                placeholder="标题"
                                                value={chakanData.title}
                                                onChange={e => setchakan({ ...chakanData, title: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    :
                                    <div style={{ display: 'flex', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                                签名
                                            </div>
                                            <Input
                                                style={{ width: 300 }}
                                                placeholder="签名"
                                                value={chakanData.sign}
                                                onChange={e => setchakan({ ...chakanData, sign: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                :
                                null
                        }

                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    类型名称
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 200 }}
                                        value={chakanData.typeName}
                                        onChange={value => setchakan({ ...chakanData, typeName: value })}
                                        options={type}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    内容
                                </div>
                                <Input.TextArea
                                    style={{ width: 300 }}
                                    placeholder="内容"
                                    value={chakanData.content}
                                    onChange={e => setchakan({ ...chakanData, content: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal
                title={'删除短信/邮件'}
                open={ModalOpen1}
                onCancel={() => setModalOpen1(false)}
                onOk={() => deletequn()}
            >
                <div>
                    是否删除该短信/邮件内容： <span style={{ fontWeight: 'bold' }}>{chakanData?.content}</span>
                </div>
            </Modal>
            <Modal
                title={'万能验证码'}
                open={ModalOpen4}
                onCancel={() => setModalOpen4(false)}
                onOk={() => setModalOpen4(false)}
            >
                <div>
                    生成成功： 验证码为：<span style={{ fontWeight: 'bold' }}>{wangnnegcode}</span>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

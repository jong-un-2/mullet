import { addHuodong, addNotice, chakanNoticeDetails, chakanNoticeType, deleteNotice, editNotice, exportuser, getBase, getChat, gethuodongList, getNoticeList, getusertongji, updateHuodong } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Form, Select, Button, Table, Pagination, Modal, Input } from 'antd';
import React, { useEffect, useState } from 'react';
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

    const [data, setData] = useState({})
    const [list, setList] = useState([])
    const [activityName, setactivityName] = useState('')
    const [fuwenben, setfuwenben] = useState('')
    const [type, setType] = useState('')
    const [typeList, settypeList] = useState([])
    const [istop, setIsTop] = useState('0')
    const [isShow, setisShow] = useState('0')
    const [brandLine, setbrandLine] = useState('0')
    const [content, setContent] = useState('');
    const [language, setlanguage] = useState('');
    const [chakanData, setchakan] = useState({});
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
        }
        const rep = await getNoticeList(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                isTop: item.isTop == 0 ? '否' : '置顶',
                language: item.language == 'en' ? '英文' : item.language == 'zh-CN' ? '简体中文' : item.language == 'vi' ? '越南' : item.language == 'pt' ? '葡萄牙' : item.language == 'es' ? '西班牙' : null
                // targetUsers: '未充值用户',
                // status: item.status == 0 ? '启用' : '停用'
            }));
            setList(processedData)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const getType = async () => {
        const rep = await chakanNoticeType(language)
        const arr = []
        if (rep.code == 200) {
            rep.data.map(item => {
                arr.push({ value: item.announcementTypeId, label: item.actDesc })
            })
            settypeList(arr)
        }
        // console.log('xxxx',rep)
    }
    const handleContentChange = (value) => {
        setContent(value);
    };
    const chakan = async (id) => {
        const rep = await chakanNoticeDetails(id)
        if (rep.code == 200) {
            setContent(rep.data.content)
            setisShow(rep.data.isShow)
            setIsTop(rep.data.isTop)
            setbrandLine(rep.data.brandLine)
            setactivityName(rep.data.title)
            setType(rep.data.announcementTypeId + '')
            setModalOpen2(true)
            setfuwenben(rep.data.keywords)
            setlanguage(rep.data.language)
        } else {
            message.error(rep.msg)
        }
    }
    useEffect(() => {
        getType()
    }, [language])
    const columns = [
        {
            title: '公告标题',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: '语言',
            dataIndex: 'language',
            key: 'language',
        },
        {
            title: '置顶',
            dataIndex: 'isTop',
            key: 'isTop',
        },
        {
            title: '品牌线',
            dataIndex: 'brandLine',
            key: 'brandLine',
        },
        {
            title: '最近维护时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); chakan(record.id) }}>查看</a>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setModalOpen1(true) }}>删除</a>
            </>,
        },

    ];
    const newActive = async () => {
        const p = {
            "announcementTypeId": type, //公告类型id 10.2返回值
            "title": activityName,
            "content": content,
            "isShow": isShow, //是否首页显示(0 为不展示，1 为展示)
            "isTop": istop, //是否置顶(0 为不置顶，1 为置顶)
            "keywords": fuwenben,//关键词
            "brandLine": brandLine, //品牌
            "language": language
        }
        // console.log('xxxx', p)
        const rep = await addNotice(p)
        if (rep.code == 200) {
            message.success('新增成功')
            getList(1)
            setModalOpen3(false)
        } else {
            message.error(rep.msg)
        }
    }
    const editActive = async () => {
        const p = {
            "id": chakanData.id,
            "announcementTypeId": type, //公告类型id 10.2返回值
            "title": activityName,
            "content": content,
            "isShow": isShow, //是否首页显示(0 为不展示，1 为展示)
            "isTop": istop, //是否置顶(0 为不置顶，1 为置顶)
            "keywords": fuwenben,//关键词
            "brandLine": brandLine, //品牌
        }
        // console.log('xxxx', p)
        const rep = await editNotice(p)
        if (rep.code == 200) {
            message.success('修改成功')
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const deletegonggao = async () => {
        const rep = await deleteNotice(chakanData.id)
        if (rep.code == 200) {
            message.success('删除成功')
            getList(1)
            setModalOpen1(false)
        } else {
            message.error(rep.msg)
        }
    }
    useEffect(() => {
        if (ModalOpen2 == false && ModalOpen3 == false) {
            setisShow('0')
            setIsTop('0')
            setactivityName('')
            setType('')
            setbrandLine('0')
            setContent('')
            setfuwenben('')
        }
    }, [ModalOpen2, ModalOpen3])
    return (
        <PageContainer>
            <Button
                type="primary"
                key="primary"
                style={{ marginTop: 30, marginBottom: 30 }}
                onClick={() => setModalOpen3(true)}
            >
                新增公告
            </Button>
            <Table dataSource={list} scroll={{ x: 1500 }} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新增公告'}
                width="1000px"
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => { newActive() }}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            所属品牌线
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                value={brandLine}
                                style={{ width: 120 }}
                                onChange={value => setbrandLine(value)}
                                options={[
                                    {
                                        value: '0',
                                        label: '全部',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            请选择语言
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                value={language}
                                onChange={value => { setlanguage(value); setType('') }}
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
                                    }
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            公告类型
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 200 }}
                                value={type}
                                onChange={value => setType(value)}
                                options={typeList}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            公告标题
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="公告标题"
                            value={activityName}
                            onChange={e => setactivityName(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            关键字
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="关键字"
                            value={fuwenben}
                            onChange={e => setfuwenben(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10, marginTop: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            是否置顶
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                value={istop}
                                onChange={value => setIsTop(value)}
                                options={[
                                    {
                                        value: '1',
                                        label: '是',
                                    },
                                    {
                                        value: '0',
                                        label: '否',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10, marginTop: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            是否显示首页
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                value={isShow}
                                onChange={value => setisShow(value)}
                                options={[
                                    {
                                        value: '1',
                                        label: '是',
                                    },
                                    {
                                        value: '0',
                                        label: '否',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <Form layout="vertical" style={{ marginBottom: 100 }}>
                    <Form.Item label="内容编辑">
                        <ReactQuill
                            value={content}
                            onChange={handleContentChange}
                            placeholder="请输入内容..."
                            style={{ height: 200 }}
                        />
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title={'查看公告'}
                width="1000px"
                open={ModalOpen2}
                onCancel={() => setModalOpen2(false)}
                onOk={() => { editActive() }}
                okText="修改"
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            所属品牌线
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                value={brandLine + ''}
                                style={{ width: 120 }}
                                onChange={value => setbrandLine(value)}
                                options={[
                                    {
                                        value: '0',
                                        label: '全部',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            请选择语言
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                value={language}
                                onChange={value => { setlanguage(value); setType('') }}
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
                                    }
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            公告类型
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 200 }}
                                value={type}
                                onChange={value => setType(value)}
                                options={typeList}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            公告标题
                        </div>
                        <Input
                            value={activityName}
                            style={{ width: 300 }}
                            placeholder={'公告标题'}
                            onChange={e => setactivityName(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            关键字
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="关键字"
                            value={fuwenben}
                            onChange={e => setfuwenben(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10, marginTop: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            是否置顶
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                value={istop + ''}
                                onChange={value => setIsTop(value)}
                                options={[
                                    {
                                        value: '1',
                                        label: '是',
                                    },
                                    {
                                        value: '0',
                                        label: '否',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10, marginTop: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            是否显示首页
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                value={isShow + ''}
                                onChange={value => setisShow(value)}
                                options={[
                                    {
                                        value: '1',
                                        label: '是',
                                    },
                                    {
                                        value: '0',
                                        label: '否',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <Form layout="vertical" style={{ marginBottom: 100 }}>
                    <Form.Item label="内容编辑">
                        <ReactQuill
                            value={content}
                            onChange={handleContentChange}
                            placeholder={'请输入内容...'}
                            style={{ height: 200 }}
                        />
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title={'删除公告'}
                open={ModalOpen1}
                onCancel={() => setModalOpen1(false)}
                onOk={deletegonggao}
            >
                <div>
                    是否删除该条公告： <span style={{ fontWeight: 'bold' }}>{chakanData.title}</span>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

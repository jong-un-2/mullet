import { addBanner, addHuodong, addNotice, addTg, chakanNoticeDetails, chakanNoticeType, collegeadd, collegelist, collegetype, collegeupdate, deleteBanner, deletecollege, deleteNotice, deleteTg, editBanner, editNotice, editTg, exportuser, getBanner, getBase, getChat, gethuodongList, getNoticeList, getTg, getusertongji, statuscollege, updateHuodong } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Form, Select, Button, Table, Pagination, Modal, Input, Upload, } from 'antd';
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
        gettype()
    }, [])

    const [list, setList] = useState([])
    const [data, setData] = useState({})
    const [chakanData, setchakan] = useState({});
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
    const [addName, setAddName] = useState('')
    const [imgurl, setimgurl] = useState('')
    const [imgurl1, setimgurl1] = useState('')
    const [addtype, setaddtype] = useState('')
    const [addsort, setaddsort] = useState('')
    const [addLang, setaddLang] = useState('')
    const [addcontent, setaddcontent] = useState('')
    const [viewCount, setviewCount] = useState('')
    const [type, setType] = useState([])
    const [flag, setFlag] = useState('0')
    const [addurl, setaddurl] = useState('')
    const [addfmurl, setaddfmurl] = useState('')
    const [search, setsearch] = useState({
        language: "",
        "collegeTypeId": "", //分类id
        "status": ""
    })
    const [loading, setLoading] = useState(false);
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            ...search
        }
        const rep = await collegelist(p)
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
    const gettype = async () => {
        const rep = await collegetype()
        if (rep.code == 200) {
            const arr = [{
                label: '全部',
                value: ''
            }]
            rep.data.map(item => {
                arr.push({
                    label: item.typeName,
                    value: item.id
                })
            })
            setType(arr)
        }
    }
    const columns = [
        // {
        //     title: 'ID',
        //     dataIndex: 'id',
        //     key: 'id',
        // },
        {
            title: '学院ID',
            dataIndex: 'id',
            key: 'id',
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
            title: '学院类型',
            dataIndex: 'collegeTypeName',
            key: 'collegeTypeName',
        },
        {
            title: '图片/视频',
            dataIndex: 'flag',
            key: 'flag',
            render: (_, record) => <>
                <div>
                    {record.flag == 0 ? '图片' : '视频'}
                </div>
            </>,
        },
        {
            title: '学院内容',
            dataIndex: 'content',
            key: 'content',
            render: (_, record) => <>
                <div>
                    {record.content.substring(0, 30)}...
                </div>
            </>,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (_, record) => <>
                <div>
                    {record.status == 0 ? '下架' : '上架'}
                </div>
            </>,
        },
        {
            title: '发布时间',
            dataIndex: 'createTime',
            key: 'createTime',
            sorter: (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
        },
        {
            title: '浏览量',
            dataIndex: 'viewCount',
            key: 'viewCount',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setModalOpen2(true) }}>修改</a>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setModalOpen1(true) }}>删除</a>
                <a onClick={() => { updatestatus(record.id, record.status == 0 ? 1 : 0) }} style={{ marginLeft: 10 }}>{record.status == 0 ? '上架' : '下架'}</a>
            </>,
        },

    ];
    const edit = async () => {
        const p = {
            ...chakanData,
        }
        const rep = await collegeupdate(p)
        if (rep.code == 200) {
            message.success('修改成功');
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const deletequn = async () => {
        const rep = await deletecollege(chakanData?.id)
        if (rep.code == 200) {
            message.success('删除成功')
            getList(1)
            setModalOpen1(false)
        } else {
            message.error(rep.msg)
        }
    }
    const getBase64 = (img, callback) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    };
    const beforeUpload = (file) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('只能上传jpg/png图片');
        }
        // const isLt2M = file.size / 1024 / 1024 < 2;
        // if (!isLt2M) {
        //     message.error('Image must smaller than 2MB!');
        // }
        return isJpgOrPng;
    };
    const uploadButton = (
        <button style={{ border: 0, background: 'none' }} type="button">
            {loading ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 8 }}>Upload</div>
        </button>
    );
    const updatestatus = async (id, s) => {
        const p = {
            "id": id,
            "status": s //0下架 1上架
        }
        const rep = await statuscollege(p)
        if (rep.code == 200) {
            message.success('更新成功')
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const handleChange = (info) => {
        if (info.file.status === 'uploading') {
            setLoading(true);
            return;
        }
        if (info.file.status === 'done') {
            // Get this url from response in real world.
            if (info.file.response.code == 200) {
                setaddfmurl(info.file.response.data);
                setLoading(false);
                getBase64(info.file.originFileObj, (url) => {
                    setimgurl(url);
                });
                message.success('上传成功')
            } else {
                message.error(info.file.response.msg)
            }
            // console.log('xxxx',info.file)

            // if (info.file.response.code == 200) {
            //     setaddimgurl(info.file.response.data)
            // }
        }

        // console.log('xxxx', info)
    };
    const handleChange2 = (info) => {
        if (info.file.status === 'uploading') {
            setLoading(true);
            return;
        }
        if (info.file.status === 'done') {
            // Get this url from response in real world.
            if (info.file.response.code == 200) {
                setaddurl(info.file.response.data);
                setLoading(false);
                getBase64(info.file.originFileObj, (url) => {
                    setimgurl1(url);
                });
                message.success('上传成功')
            } else {
                message.error(info.file.response.msg)
            }
            // console.log('xxxx',info.file)

            // if (info.file.response.code == 200) {
            //     setaddimgurl(info.file.response.data)
            // }
        }

        // console.log('xxxx', info)
    };
    const handleChange1 = (info) => {
        if (info.file.status === 'uploading') {
            setLoading(true);
            return;
        }
        if (info.file.status === 'done') {
            // Get this url from response in real world.
            if (info.file.response.code == 200) {
                setchakan({ ...chakanData, coverImageUrl: info.file.response.data });
                setLoading(false);
                getBase64(info.file.originFileObj, (url) => {
                    setimgurl(url);
                });
                message.success('上传成功')
            } else {
                message.error(info.file.response.msg)
            }
            // console.log('xxxx',info.file)

            // if (info.file.response.code == 200) {
            //     setaddimgurl(info.file.response.data)
            // }
        }

        // console.log('xxxx', info)
    };
    const handleChange3 = (info) => {
        if (info.file.status === 'uploading') {
            setLoading(true);
            return;
        }
        if (info.file.status === 'done') {
            // Get this url from response in real world.
            if (info.file.response.code == 200) {
                setchakan({ ...chakanData, contentUrl: info.file.response.data });
                setLoading(false);
                getBase64(info.file.originFileObj, (url) => {
                    setimgurl1(url);
                });
                message.success('上传成功')
            } else {
                message.error(info.file.response.msg)
            }
            // console.log('xxxx',info.file)

            // if (info.file.response.code == 200) {
            //     setaddimgurl(info.file.response.data)
            // }
        }

        // console.log('xxxx', info)
    };
    useEffect(() => {
        setAddName('')
        setimgurl('')
        setaddtype('')
        setaddsort('')
        setaddLang('')
        setaddcontent('')
        setviewCount('')
        setaddurl('')
        setaddfmurl('')
        setFlag('0')
    }, [ModalOpen3])
    useEffect(() => {
        setimgurl('')
        setimgurl1('')
    }, [ModalOpen2])
    const add = async () => {
        const p = {
            "title": addName,  //标题
            "collegeTypeId": addtype, //类型id
            "content": addcontent,//正文内容
            "contentUrl": addurl,//正文图片、视频地址
            "coverImageUrl": addfmurl,//封面地址
            "language": addLang,//语言
            "viewCount": viewCount,//浏览量
            "sort": addsort, //排序
            flag: flag
        }
        const rep = await collegeadd(p)
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
                <Button
                    type="primary"
                    key="primary"
                    style={{}}
                    onClick={() => setModalOpen3(true)}
                >
                    内容发布
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
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: 30 }}>
                        <div style={{ fontSize: 14, color: '#222' }}>
                            发布类型：
                        </div>
                        <Select
                            style={{ width: 120 }}
                            value={search.collegeTypeId}
                            onChange={value => setsearch({ ...search, collegeTypeId: value })}
                            options={type}
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
                                    label: '上架',
                                    value: '1'
                                },
                                {
                                    label: '下架',
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
                            setsearch({ language: '', status: '', collegeTypeId: '' })
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
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    标题
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
                                    图片/视频
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={flag}
                                        onChange={value => setFlag(value)}
                                        options={[{
                                            label: '图片',
                                            value: '0'
                                        }, {
                                            label: '视频',
                                            value: '1'
                                        }]}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    学院类型
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={addtype}
                                        onChange={value => setaddtype(value)}
                                        options={type.slice(1, type.length)}
                                    />
                                </div>
                            </div>
                        </div>
                        {
                            flag == 0 ?
                                <div style={{ display: 'flex', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                            学院内容
                                        </div>
                                        <Input.TextArea
                                            style={{ width: 300 }}
                                            placeholder="内容"
                                            value={addcontent}
                                            onChange={e => setaddcontent(e.target.value)}
                                        />
                                    </div>
                                </div>
                                :
                                null
                        }
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    浏览量
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="浏览量"
                                    value={viewCount}
                                    onChange={e => setviewCount(e.target.value)}
                                />
                            </div>
                        </div>
                        {/* <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    排序
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="排序"
                                    value={addsort}
                                    onChange={e => setaddsort(e.target.value)}
                                />
                            </div>
                        </div> */}
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
                    <div style={{ marginLeft: 50 }}>
                        封面图片：（不支持视频）
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            // action="https://admin.liquiditymars.com/api/sys/upload/file"
                            action="/api/sys/upload/file"
                            beforeUpload={beforeUpload}
                            data={{ type: 3 }}
                            onChange={handleChange}
                            headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
                        >
                            {addfmurl ? <img src={imgurl} alt="file" style={{ width: 150, marginTop: 50, height: 180 }} /> : uploadButton}
                        </Upload>
                        <div style={{ marginTop: 10 }}>内容图片/视频：</div>
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            // action="https://admin.liquiditymars.com/api/sys/upload/file"
                            // beforeUpload={beforeUpload}
                            action="/api/sys/upload/file"
                            data={{ type: 3 }}
                            onChange={handleChange2}
                            headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
                        >
                            {addurl ? <img src={imgurl1} alt="file" style={{ width: 150, marginTop: 50, height: 180 }} /> : uploadButton}
                        </Upload>
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
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    图片/视频
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={chakanData.flag + ''}
                                        onChange={value => setchakan({ ...chakanData, flag: value })}
                                        options={[{
                                            label: '图片',
                                            value: '0'
                                        }, {
                                            label: '视频',
                                            value: '1'
                                        }]}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    学院类型
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={chakanData.collegeTypeName}
                                        onChange={value => setchakan({ ...chakanData, collegeTypeId: value })}
                                        options={type.slice(1, type.length)}
                                    />
                                </div>
                            </div>
                        </div>
                        {
                            chakanData.flag == 0 ?
                                <div style={{ display: 'flex', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                            学院内容
                                        </div>
                                        <Input.TextArea
                                            style={{ width: 300 }}
                                            placeholder="内容"
                                            value={chakanData.content}
                                            onChange={e => setchakan({ ...chakanData, content: e.target.value })}
                                        />
                                    </div>
                                </div>
                                :
                                null
                        }
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    浏览量
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="浏览量"
                                    value={chakanData.viewCount}
                                    onChange={e => setchakan({ ...chakanData, viewCount: e.target.value })}
                                />
                            </div>
                        </div>
                        {/* <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    排序
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="排序"
                                    value={chakanData.}
                                    onChange={e => setaddsort(e.target.value)}
                                />
                            </div>
                        </div> */}
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
                    <div style={{ marginLeft: 50 }}>
                        封面图片：（不支持视频）
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            // action="https://admin.liquiditymars.com/api/sys/upload/file"
                            action="/api/sys/upload/file"
                            beforeUpload={beforeUpload}
                            data={{ type: 3 }}
                            onChange={handleChange1}
                            headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
                        >
                            {imgurl ? <img src={imgurl} alt="file" style={{ width: 150, marginTop: 50, height: 180 }} /> : uploadButton}
                        </Upload>
                        <div style={{ marginTop: 10 }}>内容图片/视频：</div>
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            // action="https://admin.liquiditymars.com/api/sys/upload/file"
                            // beforeUpload={beforeUpload}
                            action="/api/sys/upload/file"
                            data={{ type: 3 }}
                            onChange={handleChange3}
                            headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
                        >
                            {imgurl1 ? <img src={imgurl1} alt="file" style={{ width: 150, marginTop: 50, height: 180 }} /> : uploadButton}
                        </Upload>
                    </div>
                    {/* <div style={{ marginLeft: 50 }}>
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            action="/api/sys/upload/file"
                            // beforeUpload={beforeUpload}
                            data={{ type: 3 }}
                            onChange={handleChange1}
                            headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
                        >
                            {imgurl || chakanData.contentUrl ? <img src={imgurl || chakanData.contentUrl} alt="file" style={{ width: 150, marginTop: 50, height: 180 }} /> : uploadButton}
                        </Upload>
                    </div> */}
                </div>
            </Modal>
            <Modal
                title={'删除学院'}
                open={ModalOpen1}
                onCancel={() => setModalOpen1(false)}
                onOk={() => deletequn()}
            >
                <div>
                    是否删除该学院内容： <span style={{ fontWeight: 'bold' }}>{chakanData?.content}</span>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

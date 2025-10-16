import { addBanner, addHuodong, addNotice, addTg, chakanNoticeDetails, chakanNoticeType, deleteBanner, deleteNotice, deleteTg, editBanner, editNotice, editTg, exportuser, getBanner, getBase, getChat, gethuodongList, getNoticeList, getTg, getusertongji, updateHuodong } from '@/services/ant-design-pro/api';
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
    const [search, setsearch] = useState({
        bannerName: "",
        language: "",
        position: ""
    })
    const [loading, setLoading] = useState(false);
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            ...search
        }
        const rep = await getBanner(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                status: item.status == 0 ? '不启用' : '启用',
                jumpType: item.jumpType == 0 ? '新窗口' : '内部跳转',
                position: item.position == 1 ? '首页' : item.position == 2 ? '充值页' : item.position == 3 ? '活动中心' : null,
                language: item.language == 'en' ? '英文' : item.language == 'zh-CN' ? '简体中文' : item.language == 'vi' ? '越南' : item.language == 'pt' ? '葡萄牙' : item.language == 'es' ? '西班牙' : null
                // targetUsers: '未充值用户',
                // status: item.status == 0 ? '启用' : '停用'
            }));
            setList(processedData)
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
            title: '语言',
            dataIndex: 'language',
            key: 'language',
        },
        {
            title: '名称',
            dataIndex: 'bannerName',
            key: 'bannerName',
        },
        {
            title: '位置',
            dataIndex: 'position',
            key: 'position',
        },
        {
            title: '跳转类型',
            dataIndex: 'jumpType',
            key: 'jumpType',
        },
        {
            title: '跳转链接',
            dataIndex: 'jumpUrl',
            key: 'jumpUrl',
        },
        {
            title: 'app跳转链接',
            dataIndex: 'appJumpUrl',
            key: 'appJumpUrl',
        },
        {
            title: '排序',
            dataIndex: 'sort',
            key: 'sort',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
        },

        {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
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
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setModalOpen2(true) }}>修改</a>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setModalOpen1(true) }}>删除</a>
            </>,
        },

    ];
    const addqun = async () => {
        if (!addtype && !addLang) {
            message.warning('语言或者位置不能为空')
            return
        }
        const p = {
            "bannerName": addName, //名称
            "bannerUrl": addimgurl, //图片地址 调用上传图片接口拿 上传图片接口type传2
            "position": addtype,
            "jumpType": addjumpType, //0新tab打开 1当前tab
            "jumpUrl": addjumpUrl,//跳转地址
            "sort": addsort, //排序
            "status": addstatus, //是否启用 0-未启用 1-启用
            "language": addLang,
            appJumpUrl: addappjumpUrl
        }
        const rep = await addBanner(p)
        if (rep.code == 200) {
            message.success('新建成功')
            getList(1)
            setModalOpen3(false)
        } else {
            message.error(rep.msg)
        }
    }
    const edit = async () => {
        const p = {
            ...chakanData,
            jumpType: chakanData.jumpType == '新窗口' ? 0 : chakanData.jumpType == '内部跳转' ? 1 : chakanData.jumpType,
            status: chakanData.status == '不启用' ? 0 : chakanData.status == '启用' ? 1 : chakanData.status,
            position: chakanData.position == '首页' ? 1 : chakanData.position == '充值页' ? 2 : chakanData.position == '活动中心' ? 3 : chakanData.position,
            language: chakanData.language == '英文' ? 'en' : chakanData.language == '简体中文' ? 'zh-CN' : chakanData.language == '葡萄牙' ? 'pt' : chakanData.language == '西班牙' ? 'es' : chakanData.language == '越南' ? 'vi' : chakanData.language,
        }
        const rep = await editBanner(p)
        if (rep.code == 200) {
            message.success('修改成功');
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const deletequn = async () => {
        const rep = await deleteBanner(chakanData?.id)
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
            message.error('You can only upload JPG/PNG file!');
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
    const handleChange = (info) => {
        if (info.file.status === 'uploading') {
            setLoading(true);
            return;
        }
        if (info.file.status === 'done') {
            // Get this url from response in real world.
            if (info.file.response.code == 200) {
                setaddimgurl(info.file.response.data);
                setLoading(false);
                getBase64(info.file.originFileObj, (url) => {
                    setimgurl(url);
                });
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
                setchakan({ ...chakanData, bannerUrl: info.file.response.data });
                setLoading(false);
                getBase64(info.file.originFileObj, (url) => {
                    setimgurl(url);
                });
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
        setaddimgurl('')
        setimgurl('')
        setaddtype('')
        setaddjumpType('0')
        setaddjumpUrl('')
        setaddsort('')
        setaddstatus('1')
        setaddLang('')
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
                    onClick={() => setModalOpen3(true)}
                >
                    新增Banner
                </Button>
                <div style={{ display: 'flex' }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: 400 }}>
                        <div style={{ fontSize: 14, color: '#222' }}>
                            Banner名称：
                        </div>
                        <Input placeholder="Banner名称" style={{ width: 300 }} value={search.bannerName} onChange={t => setsearch({ ...search, bannerName: t.target.value })} />
                    </div>
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
                            位置：
                        </div>
                        <Select
                            style={{ width: 120 }}
                            value={search.position}
                            onChange={value => setsearch({ ...search, position: value })}
                            options={[
                                {
                                    label: '首页',
                                    value: '1'
                                },
                                {
                                    label: '充值页面',
                                    value: '2'
                                },
                                {
                                    label: '活动中心',
                                    value: '3'
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

            <Table dataSource={list} scroll={{ x: 1700 }} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新增Banner'}
                width="1000px"
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => addqun()}
            >
                <div style={{ display: 'flex' }}>
                    <div>
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
                                    跳转类型
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={addjumpType}
                                        onChange={value => setaddjumpType(value)}
                                        options={[{
                                            label: '新窗口',
                                            value: '0'
                                        }, {
                                            label: '内部跳转',
                                            value: '1'
                                        }]}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    是否启用
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={addstatus}
                                        onChange={value => setaddstatus(value)}
                                        options={[{
                                            label: '启用',
                                            value: '1'
                                        }, {
                                            label: '不启用',
                                            value: '0'
                                        }]}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    跳转地址
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="跳转地址"
                                    value={addjumpUrl}
                                    onChange={e => setaddjumpUrl(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    app跳转地址
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="跳转地址"
                                    value={addjumpUrl}
                                    onChange={e => setaddappjumpUrl(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
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
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    位置
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={addtype}
                                        onChange={value => setaddtype(value)}
                                        options={[
                                            {
                                                label: '首页',
                                                value: '1'
                                            },
                                            {
                                                label: '充值页面',
                                                value: '2'
                                            },
                                            {
                                                label: '活动中心',
                                                value: '3'
                                            }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
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
                        {/* <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    Type
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="显示位置"
                                    value={addtype}
                                    onChange={e => setaddtype(e.target.value)}
                                />
                            </div>
                        </div> */}
                    </div>
                    <div style={{ marginLeft: 50 }}>
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            action="/api/sys/upload/file"
                            beforeUpload={beforeUpload}
                            data={{ type: 2 }}
                            onChange={handleChange}
                            headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
                        >
                            {imgurl ? <img src={imgurl} alt="file" style={{ width: 150, marginTop: 50, height: 180 }} /> : uploadButton}
                        </Upload>
                    </div>
                </div>
            </Modal>
            <Modal
                title={'修改Banner'}
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
                                    名称
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="名称"
                                    value={chakanData.bannerName}
                                    onChange={e => setchakan({ ...chakanData, bannerName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    跳转类型
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={chakanData.jumpType + ''}
                                        onChange={value => setchakan({ ...chakanData, jumpType: value })}
                                        options={[{
                                            label: '新窗口',
                                            value: '0'
                                        }, {
                                            label: '内部跳转',
                                            value: '1'
                                        }]}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    是否启用
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={chakanData.status + ''}
                                        onChange={value => setchakan({ ...chakanData, status: value })}
                                        options={[{
                                            label: '启用',
                                            value: '1'
                                        }, {
                                            label: '不启用',
                                            value: '0'
                                        }]}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    跳转地址
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="跳转地址"
                                    value={chakanData.jumpUrl}
                                    onChange={e => setchakan({ ...chakanData, jumpUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    app跳转地址
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="跳转地址"
                                    value={chakanData.appJumpUrl}
                                    onChange={e => setchakan({ ...chakanData, appJumpUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    排序
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="排序"
                                    value={chakanData.sort}
                                    onChange={e => setchakan({ ...chakanData, sort: e.target.value })}
                                />
                            </div>
                        </div>
                        {/* <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    Type
                                </div>
                                <Input
                                    style={{ width: 300 }}
                                    placeholder="显示位置"
                                    value={chakanData.position}
                                    onChange={e => setchakan({ ...chakanData, position: e.target.value })}
                                />
                            </div>
                        </div> */}
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    位置
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={chakanData.position + ''}
                                        onChange={value => setchakan({ ...chakanData, position: value })}
                                        options={[
                                            {
                                                label: '首页',
                                                value: '1'
                                            },
                                            {
                                                label: '充值页面',
                                                value: '2'
                                            },
                                            {
                                                label: '活动中心',
                                                value: '3'
                                            }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20 }}>
                                <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                                    语言
                                </div>
                                <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                                    <Select
                                        style={{ width: 120 }}
                                        value={chakanData.language + ''}
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
                                            }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ marginLeft: 50 }}>
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            action="/api/sys/upload/file"
                            beforeUpload={beforeUpload}
                            data={{ type: 2 }}
                            onChange={handleChange1}
                            headers={{ Authorization: JSON.parse(window.sessionStorage.getItem('userInfo'))?.token }}
                        >
                            {imgurl || chakanData.bannerUrl ? <img src={imgurl || chakanData.bannerUrl} alt="file" style={{ width: 150, marginTop: 50, height: 180 }} /> : uploadButton}
                        </Upload>
                    </div>
                </div>
            </Modal>
            <Modal
                title={'删除Banner'}
                open={ModalOpen1}
                onCancel={() => setModalOpen1(false)}
                onOk={() => deletequn()}
            >
                <div>
                    是否删除该Banner： <span style={{ fontWeight: 'bold' }}>{chakanData?.bannerName}</span>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

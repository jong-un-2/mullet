import { addHuodong, addNotice, addTg, chakanNoticeDetails, chakanNoticeType, deleteNotice, deleteTg, editNotice, editTg, exportuser, getBase, getChat, gethuodongList, getNoticeList, getTg, getusertongji, updateHuodong } from '@/services/ant-design-pro/api';
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
        // getType()
    }, [])

    const [list, setList] = useState([])
    const [groupLink, setgroupLink] = useState('')
    const [status, setstatus] = useState('0')
    const [remark, setremark] = useState('')
    const [egroupLink, setegroupLink] = useState('')
    const [estatus, setestatus] = useState('0')
    const [eremark, seteremark] = useState('0')
    const [data, setData] = useState({})
    const [chakanData, setchakan] = useState({});
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [ModalOpen1, setModalOpen1] = useState<boolean>(false);
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
        }
        const rep = await getTg(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                status: item.status == 0 ? '启用' : '禁用',
                // targetUsers: '未充值用户',
                // status: item.status == 0 ? '启用' : '停用'
            }));
            setList(processedData)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: '群链接',
            dataIndex: 'groupLink',
            key: 'groupLink',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
        },
        {
            title: '备注',
            dataIndex: 'remark',
            key: 'remark',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setegroupLink(record.groupLink); seteremark(record.remark); setestatus(record.status == '禁用' ? '1' : '0'); setModalOpen2(true) }}>修改</a>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); setModalOpen1(true) }}>删除</a>
            </>,
        },

    ];
    const addqun = async () => {
        const p = {
            "groupLink": groupLink,
            "status": status, //状态 0启用 1停止
            "remark": remark
        }
        const rep = await addTg(p)
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
            "groupLink": egroupLink,
            "status": estatus, //状态 0启用 1停止
            "remark": eremark,
            'id': chakanData.id
        }
        const rep = await editTg(p)
        if (rep.code == 200) {
            message.success('修改成功');
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const deletequn = async () => {
        const rep = await deleteTg(chakanData?.id)
        if (rep.code == 200) {
            message.success('删除成功')
            getList(1)
            setModalOpen1(false)
        } else {
            message.error(rep.msg)
        }
    }
    return (
        <PageContainer>
            <Button
                type="primary"
                key="primary"
                style={{ marginTop: 30, marginBottom: 30 }}
                onClick={() => setModalOpen3(true)}
            >
                新增TG群
            </Button>
            <Table dataSource={list} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新增TG群'}
                width="1000px"
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => addqun()}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            是否启用
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                defaultValue={status + ''}
                                onChange={value => setstatus(value)}
                                options={[{
                                    label: '启用',
                                    value: '0'
                                }, {
                                    label: '禁用',
                                    value: '1'
                                }]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            群链接
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="群链接"
                            value={groupLink}
                            onChange={e => setgroupLink(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            备注
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="备注"
                            value={remark}
                            onChange={e => setremark(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
            <Modal
                title={'修改TG群'}
                width="1000px"
                open={ModalOpen2}
                onCancel={() => setModalOpen2(false)}
                onOk={() => edit()}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            是否启用
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                defaultValue={estatus + ''}
                                onChange={value => setestatus(value)}
                                options={[{
                                    label: '启用',
                                    value: '0'
                                }, {
                                    label: '禁用',
                                    value: '1'
                                }]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            群链接
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="群链接"
                            value={egroupLink}
                            onChange={e => setegroupLink(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            备注
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="备注"
                            value={eremark}
                            onChange={e => seteremark(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
            <Modal
                title={'删除群'}
                open={ModalOpen1}
                onCancel={() => setModalOpen1(false)}
                onOk={() => deletequn()}
            >
                <div>
                    是否删除该群： <span style={{ fontWeight: 'bold' }}>{chakanData?.groupLink}</span>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

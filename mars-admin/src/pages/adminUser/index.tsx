import { addHuodong, addNotice, addTg, chakanNoticeDetails, chakanNoticeType, deleteNotice, deleteTg, editNotice, editTg, exportuser, getBase, getChat, gethuodongList, getNoticeList, getTg, getusertongji, houtaiadduser, houtaiedituser, houtairoleList, houtaiuser, updateHuodong } from '@/services/ant-design-pro/api';
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
    const [role, setrole] = useState([])
    const [addrole, setaddrole] = useState('')
    const [loginName, setloginName] = useState('')
    const [eloginName, seteloginName] = useState('')
    const [erole, seterole] = useState('')
    const [epwd, setePwd] = useState('')
    const [estatus, setestatus] = useState('0')
    const [pwd, setPwd] = useState('')
    const [status, setstatus] = useState('0')
    const [data, setData] = useState({})
    const [chakanData, setchakan] = useState({});
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [searchP, setSearchP] = useState({
        "loginName": "",
    })
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
            "loginName": searchP.loginName,
        }
        const rep = await houtaiuser(p)
        if (rep.code == 200) {
            const processedData = rep.data.records.map((item: any) => ({
                ...item,
                status: item.status == 0 ? '启用' : '停用',
                // targetUsers: '未充值用户',
                // status: item.status == 0 ? '启用' : '停用'
            }));
            setList(processedData)
            setData(rep.data)
        }
        // console.log('xxxx',rep)
    }
    const getroleList = async () => {
        const rep = await houtairoleList()
        if (rep.code == 200) {
            const processedData = rep.data.map((item: any) => ({
                ...item,
                value: item.id,
                label: item.roleName
                // targetUsers: '未充值用户',
                // status: item.status == 0 ? '启用' : '停用'
            }));
            setrole(processedData)
        }
        // console.log('xxxx',rep)
    }

    const columns = [
        {
            title: '帐号',
            dataIndex: 'loginName',
            key: 'loginName',
        },
        {
            title: '权限角色',
            dataIndex: 'roleName',
            key: 'roleName',
        },
        {
            title: '是否启用',
            dataIndex: 'status',
            key: 'status',
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
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); seteloginName(record.loginName); seterole(record.roleId); setestatus(record.status); setModalOpen2(true); getroleList(); }}>修改</a>
                <a style={{ marginRight: 10 }} onClick={() => { setchakan(record); update(record) }}> {record.status == '停用' ? '启用' : '停用'}</a>
            </>,
        },

    ];
    const addqun = async () => {
        const p = {
            "loginName": loginName, //账号
            "password": pwd, //密码
            "status": status, //状态 0启用 1停用
            "roleId": addrole
        }
        const rep = await houtaiadduser(p)
        if (rep.code == 200) {
            setModalOpen3(false)
            getList(1)
            message.success('新增成功')
        } else {
            message.error(rep.msg)
        }
    }
    const edit = async () => {
        const s = estatus == '停用' ? 1 : estatus == '启用' ? 0 : estatus
        const p = {
            "id": chakanData.id, //用户id
            "loginName": eloginName,
            "password": epwd,
            "status": s, //状态 0启用 1停用
            'roleId': erole
        }
        const rep = await houtaiedituser(p)
        // console.log('xxxxx', p)
        if (rep.code == 200) {
            message.success('修改成功')
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const update = async (data: any) => {
        const s = data.status == '停用' ? 0 : data.status == '启用' ? 1 : data.status
        const p = {
            "id": data.id, //用户id
            "loginName": data.loginName,
            "password": data.password,
            "status": s, //状态 0启用 1停用
            'roleId': data.roleId
        }
        const rep = await houtaiedituser(p)
        // console.log('xxxxx', p)
        if (rep.code == 200) {
            message.success('操作成功')
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    const deletequn = async () => {

    }
    useEffect(() => {
        setloginName('')
        setPwd('')
        setstatus('0')
        setaddrole('')
    }, [ModalOpen3])
    return (
        <PageContainer>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                    type="primary"
                    key="primary"
                    style={{ marginTop: 30, marginBottom: 30 }}
                    onClick={() => { getroleList(); setModalOpen3(true) }}
                >
                    新增帐户
                </Button>
                <Input placeholder="用户帐号" style={{ width: 200, marginLeft: 20, marginRight: 20 }} value={searchP.loginName} onChange={t => setSearchP({ ...searchP, loginName: t.target.value })} />
                <Button
                    type="primary"
                    key="primary"
                    style={{ marginTop: 30, marginBottom: 30 }}
                    onClick={() => getList(1)}
                >
                    查询
                </Button>
            </div>

            <Table dataSource={list} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新增用户'}
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => addqun()}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            用户帐号
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="用户帐号"
                            value={loginName}
                            onChange={e => setloginName(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            密码
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="密码"
                            value={pwd}
                            onChange={e => setPwd(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            是否启用
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                value={status + ''}
                                onChange={value => setstatus(value)}
                                options={[{
                                    label: '启用',
                                    value: '0'
                                }, {
                                    label: '停用',
                                    value: '1'
                                }]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            权限
                        </div>
                        <Select
                            style={{ width: 200 }}
                            value={addrole}
                            onChange={value => setaddrole(value)}
                            options={role}
                        />
                    </div>
                </div>
            </Modal>
            <Modal
                title={'修改用户'}
                open={ModalOpen2}
                onCancel={() => setModalOpen2(false)}
                onOk={() => edit()}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            用户帐号
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="用户帐号"
                            value={eloginName}
                            onChange={e => seteloginName(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            密码
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="不填则不修改密码"
                            value={epwd}
                            onChange={e => setePwd(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            是否启用
                        </div>
                        <div style={{ fontSize: 14, color: '#222', flex: 1 }}>
                            <Select
                                style={{ width: 120 }}
                                value={estatus + ''}
                                onChange={value => setestatus(value)}
                                options={[{
                                    label: '启用',
                                    value: '0'
                                }, {
                                    label: '停用',
                                    value: '1'
                                }]}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            权限
                        </div>
                        <Select
                            style={{ width: 200 }}
                            value={erole}
                            onChange={value => seterole(value)}
                            options={role}
                        />
                    </div>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

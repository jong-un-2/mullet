import { addHuodong, addjuese, addNotice, addTg, chakanjuese, chakanNoticeDetails, chakanNoticeType, deleteNotice, deleteTg, editNotice, editTg, exportuser, getBase, getChat, gethuodongList, getNoticeList, getTg, getusertongji, houtaiadduser, houtaiedituser, houtairoleList, houtaiuser, jueseupdateStatus, juesexiugai, updateHuodong, userquanxian } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Form, Select, Button, Table, Pagination, Modal, Input, TreeSelect } from 'antd';
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
const routes = [
    { path: '/welcome', name: '欢迎', component: './Welcome', id: 1 },
    {
        path: '/product',
        name: '质押管理',
        pid: null,
        // icon: 'product',
        id: 2,
        routes: [
            { path: '/product/list', pid: 2, name: '质押产品列表', component: './Product/list', id: '2-1' },
            { path: '/product/order', pid: 2, name: '订单列表', component: './Product/order', id: '2-2' },
        ],
    },
    {
        path: '/userManage',
        name: '用户管理',
        // icon: 'UsergroupAddOutlined',
        pid: null,
        id: 3,
        routes: [
            { path: '/userManage/list', pid: 3, name: '用户列表', component: './userManage/list', id: '3-1' },
            { path: '/userManage/group', pid: 3, name: '用户组别管理', component: './userManage/group', id: '3-2' },
            { path: '/userManage/statistics', pid: 3, name: '推广统计', component: './userManage/statistics', id: '3-5' },
        ],
    },
    {
        path: '/adminUser',
        name: '后台管理',
        pid: null,
        // icon: 'UsergroupAddOutlined',
        id: 4,
        routes: [
            { path: '/adminUser/index', pid: 4, name: '后台用户管理', id: '4-1', component: './adminUser/index' },
            { path: '/adminUser/role', pid: 4, name: '权限角色管理', id: '4-2', component: './adminUser/role' },
        ],
    },
    {
        path: '/agent',
        name: '代理管理',
        // icon: 'user',
        pid: null,
        id: 5,
        routes: [
            { path: '/agent/list', pid: 5, name: '客户结算（按代理）', component: './agent/list', id: '5-1' },
            { path: '/agent/customerSettlement', pid: 5, name: '客户结算（按每笔）', component: './agent/customerSettlement', id: '5-2' },
            { path: '/agent/setting', pid: 5, name: '佣金设置', component: './agent/setting', id: '5-3' },
        ],
    },
    {
        path: '/commission',
        name: '佣金费用',
        pid: null,
        id: 6,
        routes: [
            { path: '/commission/overview', pid: 6, name: '费用总览', component: './commission/overview', id: '6-1' },
            { path: '/commission/records', pid: 6, name: '费用记录', component: './commission/records', id: '6-2' },
            { path: '/commission/settings', pid: 6, name: '费率设置', component: './commission/settings', id: '6-3' },
            { path: '/commission/statistics', pid: 6, name: '费用统计', component: './commission/statistics', id: '6-4' },
        ],
    },
    {
        path: '/wallet',
        name: '钱包管理',
        // icon: 'crown',
        id: 7,
        component: './Wallet/list'
    },
    {
        path: '/inManaged',
        name: '入金管理',
        // icon: 'PayCircleOutlined',
        id: 8,
        component: './payManage/list'
    },
    {
        path: '/outManaged',
        name: '出金管理',
        // icon: 'RedEnvelopeOutlined',
        id: 9,
        component: './outManage/list'
    },
    {
        path: '/orderRecord',
        name: '入金补单记录',
        // icon: 'ProfileOutlined',
        id: 10,
        component: './orderRecord/list'
    },
    {
        path: '/settlement',
        name: '结算出入金管理',
        // icon: 'BorderOuterOutlined',
        id: 11,
        component: './settlement/list'
    },
    {
        path: '/financialStatements',
        name: '资金流水报表',
        // icon: 'FormOutlined',
        id: 12,
        component: './financialStatements/'
    },
    {
        path: '/fundSettlement',
        name: '资金结算报表',
        // icon: 'FormOutlined',
        component: './fundSettlement/'
    },
    {
        path: '/releaseFunds',
        name: '资金释放报表',
        id: 13,
        // icon: 'AlignRightOutlined',
        component: './releaseFunds/'
    },
    {
        path: '/active',
        name: '活动管理',
        id: 14,
        pid: null,
        // icon: 'DollarOutlined',
        routes: [
            { path: '/active/', pid: 14, name: '首充活动', component: './active/' },
            { path: '/active/tg', pid: 14, name: 'TG赠金发放', component: './active/tg' },
        ],
    },
    {
        path: '/banner',
        name: 'Banner管理',
        id: 15,
        // icon: 'FireOutlined',
        component: './banner/'
    },
    {
        path: '/college',
        name: '学院管理',
        // icon: 'FireOutlined',
        //  component: './college/'
        routes: [
            { path: '/college/', name: '内容管理', component: './college/' },
            { path: '/college/type', name: '类型管理', component: './college/type' },
        ],
        id: 16
    },
    {
        path: '/msgManage',
        name: '短信管理',
        // icon: 'FireOutlined',
        //  component: './college/'
        routes: [
            { path: '/msgManage/', name: '短信内容管理', component: './msgManage/' },
            { path: '/msgManage/type', name: '短信类型管理', component: './msgManage/type' },
            { path: '/msgManage/msgChannel', name: '短信通道管理', component: './msgManage/msgChannel' },
        ],
        id: 17
    },
    {
        path: '/notice',
        name: '公告管理',
        id: 18,
        // icon: 'MessageOutlined',
        component: './notice/'
    },
    {
        path: '/tgGroup',
        name: 'TG群管理',
        id: 19,
        // icon: 'WechatOutlined',
        component: './tgGroup/'
    },
    { path: '/', redirect: '/welcome', id: 20 },
    { path: '*', layout: false, component: './404' },
];
const treeData = [
    {
        value: '欢迎',
        title: '欢迎',
    },
    {
        value: '质押管理',
        title: '质押管理',
        children: [
            {
                value: `质押产品列表`,
                title: '质押产品列表',
            },
            {
                value: `订单列表`,
                title: '订单列表',
            },
        ],
    },
    {
        value: '用户管理',
        title: '用户管理',
        children: [
            {
                value: `用户列表`,
                title: '用户列表',
            },
            {
                value: `用户组别管理`,
                title: '用户组别管理',
            },
            {
                value: `推广统计`,
                title: '推广统计',
            },
        ],
    },
    {
        value: '后台管理',
        title: '后台管理',
        children: [
            {
                value: `后台用户管理`,
                title: '后台用户管理',
            },
            {
                value: `权限角色管理`,
                title: '权限角色管理',
            },
        ],
    },
    {
        value: '代理管理',
        title: '代理管理',
        children: [
            {
                value: `客户结算（按代理）`,
                title: '客户结算（按代理）',
            },
            {
                value: `客户结算（按每笔）`,
                title: '客户结算（按每笔）',
            },
            {
                value: `佣金设置`,
                title: '佣金设置',
            },
        ],
    },
    {
        value: '佣金费用',
        title: '佣金费用',
        children: [
            {
                value: `费用总览`,
                title: '费用总览',
            },
            {
                value: `费用记录`,
                title: '费用记录',
            },
            {
                value: `费率设置`,
                title: '费率设置',
            },
            {
                value: `费用统计`,
                title: '费用统计',
            },
        ],
    },
    {
        value: '钱包管理',
        title: '钱包管理',
    },
    {
        value: '入金管理',
        title: '入金管理',
    },
    {
        value: '入金补单记录',
        title: '入金补单记录',
    },
    {
        value: '出金管理',
        title: '出金管理',
    },
    {
        value: '结算出入金管理',
        title: '结算出入金管理',
    },
    {
        value: '资金流水报表',
        title: '资金流水报表',
    },
    {
        value: '资金结算报表',
        title: '资金结算报表',
    },
    {
        value: '资金释放报表',
        title: '资金释放报表',
    },
    {
        value: '活动管理',
        title: '活动管理',
        children: [
            {
                value: `首充活动`,
                title: '首充活动',
            },
            {
                value: `TG赠金发放`,
                title: 'TG赠金发放',
            }
        ],
    },
    {
        value: 'Banner管理',
        title: 'Banner管理',
    },
    {
        value: '学院管理',
        title: '学院管理',
        children: [
            {
                value: `内容管理`,
                title: '内容管理',
            },
            {
                value: `类型管理`,
                title: '类型管理',
            }
        ],
    },
    {
        value: '短信管理',
        title: '短信管理',
        children: [
            {
                value: `短信内容管理`,
                title: '短信内容管理',
            },
            {
                value: `短信类型管理`,
                title: '短信类型管理',
            },
            {
                value: `短信通道管理`,
                title: '短信通道管理',
            }
        ],
    },
    {
        value: '公告管理',
        title: '公告管理',
    },
    {
        value: 'TG群管理',
        title: 'TG群管理',
    },

];
// // 提取所有 name 的函数
// function extractNames(routes) {
//     const names = [];

//     function traverse(routes) {
//         routes.forEach(route => {
//             if (route.name) {
//                 names.push(route.name); // 提取当前路由的 name
//             }
//             if (route.routes) {
//                 traverse(route.routes); // 如果有子路由，递归提取
//             }
//         });
//     }

//     traverse(routes);
//     // console.log('xxxxx', names)
//     return names;
// }
// 提取本地菜单的所有子菜单
function extractLocalChildren(localMenu, parentName) {
    const parent = localMenu.find(item => item.value === parentName);
    return parent && parent.children ? parent.children.map(child => child.value) : [];
}

// 检查是否所有子菜单都存在
function allChildrenSelected(localChildren, serverChildren) {
    return serverChildren.every(child => localChildren.includes(child.name));
}

// 提取结果
function extractValidNames(localMenu, serverRoutes) {
    const names = [];

    function traverse(routes) {
        if (!routes || !Array.isArray(routes)) return; // Check if routes is valid

        routes.forEach(route => {
            if (route.routes) {
                // 父菜单有子菜单
                const localChildren = extractLocalChildren(localMenu, route.name);
                if (localChildren.length > 0 && allChildrenSelected(localChildren, route.routes)) {
                    // 如果本地菜单包含所有子菜单，则添加父菜单及其子菜单
                    names.push(route.name);
                    route.routes.forEach(child => names.push(child.name));
                } else {
                    // 如果不包含所有子菜单，则只检查子菜单
                    traverse(route.routes);
                }
            } else {
                // 没有子菜单，直接添加
                names.push(route.name);
            }
        });
    }

    traverse(serverRoutes);
    return names;
}

const App = (props: any) => {
    useEffect(() => {
        getList(1)
        // console.log(props, 'xxxxx')
        // getType()
    }, [])

    const [list, setList] = useState([])
    const [menuList, setmenuList] = useState([])
    const [menuList1, setmenuList1] = useState([])
    const [loginName, setloginName] = useState('')
    const [status, setstatus] = useState('0')
    const [data, setData] = useState({})
    const [chakanData, setchakan] = useState({});
    const [ModalOpen2, setModalOpen2] = useState<boolean>(false);
    const [ModalOpen3, setModalOpen3] = useState<boolean>(false);
    const [value, setValue] = useState([]);
    const [evalue, seteValue] = useState([]);

    // 筛选函数
    const filterRoutes = (routes, namesToKeep) => {
        return routes
            .map(route => {
                if (route.routes) {
                    const filteredChildren = filterRoutes(route.routes, namesToKeep);
                    if (filteredChildren.length) {
                        return { ...route, routes: filteredChildren };
                    }
                }
                // 如果当前路由名在筛选条件中，保留
                return namesToKeep.includes(route.name) ? route : null;
            })
            .filter(Boolean);  // 过滤掉 null
    };
    const onChange = (newValue: string) => {
        // console.log(newValue);
        setValue(newValue);
        const result = filterRoutes(routes, newValue);
        setmenuList(result)
    };
    const onChange1 = (newValue: string) => {
        // console.log(newValue);
        seteValue(newValue);
        const result = filterRoutes(routes, newValue);
        setmenuList1(result)
    };
    // const [searchP, setSearchP] = useState({
    //     "loginName": "",
    // })
    const getList = async (page) => {
        const p = {
            "pageNum": page,
            "pageSize": 10,
        }
        const rep = await userquanxian(p)
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
    // const getroleList = async () => {
    //     const rep = await houtairoleList()
    //     if (rep.code == 200) {
    //         const processedData = rep.data.map((item: any) => ({
    //             ...item,
    //             value: item.id,
    //             label: item.roleName
    //             // targetUsers: '未充值用户',
    //             // status: item.status == 0 ? '启用' : '停用'
    //         }));
    //         // setrole(processedData)
    //     }
    //     // console.log('xxxx',rep)
    // }
    const chakan = async (id) => {
        const rep = await chakanjuese(id)
        if (rep.code == 200) {
            setchakan(rep.data)
            // const r = getMissingRouteNames(routes, rep.data.routes)
            const r = extractValidNames(routes, rep.data.routes)
            // console.log('xxxxxx', r)
            seteValue(r)
            setModalOpen2(true)
        } else {
            message.error(rep.msg)
        }
    }

    const columns = [
        {
            title: '角色名称',
            dataIndex: 'roleName',
            key: 'roleName',
        },
        {
            title: '权限分配人数',
            dataIndex: 'count',
            key: 'count',
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
        {
            title: '是否启用',
            dataIndex: 'status',
            key: 'status',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => <>
                <a style={{ marginRight: 10 }} onClick={() => { chakan(record.id) }}>修改</a>
                <a style={{ marginRight: 10 }} onClick={() => { update(record) }}> {record.status == '停用' ? '启用' : '停用'}</a>
            </>,
        },

    ];
    const addqun = async () => {
        const p = {
            "roleName": loginName, //角色名称
            "status": status, //状态 0启用 1停用
            "routes": menuList
        }
        const rep = await addjuese(p)
        if (rep.code == 200) {
            setModalOpen3(false)
            getList(1)
            message.success('新增成功')
        } else {
            message.error(rep.msg)
        }
    }
    const edit = async () => {
        const p = {
            "id": chakanData.id,
            "roleName": chakanData.roleName, //角色名称
            "status": chakanData.status, //状态 0启用 1停用
            "routes": menuList1
        }
        const rep = await juesexiugai(p)
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
            "status": s,
        }
        const rep = await jueseupdateStatus(p)
        // console.log('xxxxx', p)
        if (rep.code == 200) {
            message.success('操作成功')
            setModalOpen2(false)
            getList(1)
        } else {
            message.error(rep.msg)
        }
    }
    useEffect(() => {
        setloginName('')
        setstatus('0')
        setValue([])
    }, [ModalOpen3])
    // useEffect(() => {
    //     seteValue([])
    // }, [ModalOpen2])

    return (
        <PageContainer>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                    type="primary"
                    key="primary"
                    style={{ marginTop: 30, marginBottom: 30 }}
                    onClick={() => { setModalOpen3(true) }}
                >
                    新增角色
                </Button>
                {/* <Input placeholder="用户帐号" style={{ width: 200, marginLeft: 20, marginRight: 20 }} value={searchP.loginName} onChange={t => setSearchP({ ...searchP, loginName: t.target.value })} />
                <Button
                    type="primary"
                    key="primary"
                    style={{ marginTop: 30, marginBottom: 30 }}
                    onClick={() => getList(1)}
                >
                    查询
                </Button> */}
            </div>

            <Table dataSource={list} columns={columns} pagination={false} />
            <Pagination total={data?.total} style={{ marginTop: 10 }} pageSize={data?.size} current={data?.current} onChange={(e) => getList(e)} />
            <Modal
                title={'新增角色'}
                open={ModalOpen3}
                onCancel={() => setModalOpen3(false)}
                onOk={() => addqun()}
            >
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                            角色名称
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="角色名称"
                            value={loginName}
                            onChange={e => setloginName(e.target.value)}
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        权限菜单
                    </div>
                    <TreeSelect
                        showSearch
                        style={{ width: '100%' }}
                        value={value}
                        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                        placeholder="请选择菜单"
                        allowClear
                        treeCheckable
                        multiple
                        showCheckedStrategy='SHOW_PARENT'
                        treeDefaultExpandAll
                        onChange={onChange}
                        treeData={treeData}
                    />
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
                            角色名称
                        </div>
                        <Input
                            style={{ width: 300 }}
                            placeholder="角色名称"
                            value={chakanData.roleName}
                            onChange={e => setchakan({ ...chakanData, roleName: e.target.value })}
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
                                value={chakanData.status + ''}
                                onChange={value => setchakan({ ...chakanData, status: value })}
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, color: '#222', marginBottom: 10 }}>
                        权限菜单
                    </div>
                    <TreeSelect
                        showSearch
                        style={{ width: '100%' }}
                        value={evalue}
                        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                        placeholder="请选择菜单"
                        allowClear
                        treeCheckable
                        multiple
                        showCheckedStrategy='SHOW_PARENT'
                        treeDefaultExpandAll
                        onChange={onChange1}
                        treeData={treeData}
                    />
                </div>
            </Modal>
        </PageContainer>
    );
};

export default App;

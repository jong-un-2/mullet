import { dailiDetails, shangjidaili, userDailiTotal, xiajidaili } from "@/services/ant-design-pro/api"
import { message, Menu, Table, Pagination } from "antd"
import { useEffect, useState } from "react"

const App = (props) => {
    useEffect(() => {
        getTotal()
        getList(current)
    }, [])
    const [total, setTotal] = useState({})
    const [data, setData] = useState({})
    const [list, setList] = useState([])
    const [current, setCurrent] = useState('下级代理');
    const getTotal = async () => {
        const rep = await userDailiTotal(props.id)
        if (rep.code == 200) {
            setTotal(rep.data)
        } else {
            message.error(rep.msg)
        }
    }
    const onClick = (e) => {
        // console.log('click ', e);
        setCurrent(e.key);
        getList(e.key)
    };
    const items = [
        {
            label: '下级代理',
            key: '下级代理',
        },
        {
            label: '上级代理',
            key: '上级代理',
        },

    ];
    const getList = async (key) => {
        const p = {
            "userId": props.id,
            "hierarchy": key == '下级代理' ? "low" : 'upper'  //upper 上级代理
        }
        const rep = await dailiDetails(p)
        if (rep.code == 200) {
            setList(rep.data)
        } else {
            message.error(rep.msg)
        }

    }
    const columns = [
        {
            title: '用户账号',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: '用户ID',
            dataIndex: 'userId',
            key: 'userId',
        },
        {
            title: '代理编号',
            dataIndex: 'invitationCode',
            key: 'invitationCode',
        },
        {
            title: '代理级别',
            dataIndex: 'level',
            key: 'level',
        },
        {
            title: '注册时间',
            dataIndex: 'createTime',
            key: 'createTime',
        },
        {
            title: '返佣贡献',
            dataIndex: 'totalCommissions',
            key: 'totalCommissions',
        },
    ];
    return (
        <div style={{ background: '#fff', padding: 30 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 20 }}>
                详情
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: '#222', }}>
                    用户账号：{props.userName}
                </div>
                <div style={{ fontSize: 14, color: '#222', marginLeft: 100 }}>
                    代理级别：{total?.level}
                </div>
                <div style={{ fontSize: 14, color: '#222', marginLeft: 100 }}>
                    代理编号：{total?.invitationCode}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: '#222', }}>
                    下级返佣总额：{total?.totalLowCommission}
                </div>
                <div style={{ fontSize: 14, color: '#222', marginLeft: 100 }}>
                    贡献返佣总额：{total?.totalUplineCommission}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: '#222', }}>
                    下级返佣净值：{total?.totalLowNetValue}
                </div>
                <div style={{ fontSize: 14, color: '#222', marginLeft: 100 }}>
                    贡献返佣净值：{total?.totalUplineNetValue}
                </div>
            </div>
            <Menu onClick={onClick} selectedKeys={[current]} mode="horizontal" items={items} />
            <Table dataSource={list} columns={columns} pagination={false} />
        </div>
    )
}
export default App
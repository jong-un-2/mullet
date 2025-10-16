import { exportuser, getBase, getChat, getusertongji } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Select, Button, Table } from 'antd';
import React, { useEffect, useState } from 'react';
import { Renderer as SVGRenderer } from '@antv/g-svg';
import * as echarts from "echarts";
import dayjs from 'dayjs';
import FileSaver from 'file-saver';

/**
 * 每个单独的卡片，为了复用样式抽成了组件
 * @param param0
 * @returns
 */
const { RangePicker } = DatePicker;
const getYearMonth = (date) => date.year() * 12 + date.month();

const disabled7DaysDate = (current, { from, type }) => {
    if (from) {
        const minDate = from.add(-30, 'days');
        const maxDate = from.add(30, 'days');
        switch (type) {
            case 'year':
                return current.year() < minDate.year() || current.year() > maxDate.year();
            case 'month':
                return (
                    getYearMonth(current) < getYearMonth(minDate) ||
                    getYearMonth(current) > getYearMonth(maxDate)
                );
            default:
                return Math.abs(current.diff(from, 'days')) >= 30;
        }
    }
    return false;
};
// 将日期格式化为 yyyy-mm-dd
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，+1后确保两位数
    const day = String(date.getDate()).padStart(2, '0'); // 确保两位数
    return `${year}-${month}-${day}`;
};
const App = () => {
    useEffect(() => {
        // initCharts()
        getChatData()
        getDateRange()
    }, [])
    const [data, setData] = useState({})
    const [list, setList] = useState([])
    const [modulus, setmodulus] = useState('register')
    const [startDate, setstartDate] = useState('')
    const [endDate, setendDate] = useState('')
    const getDateRange = async () => {
        const today = new Date(); // 获取当前日期
        const endDate1 = formatDate(today); // 结束日期为今天

        // 获取一个月前的日期
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1); // 设置为上个月
        const startDate1 = formatDate(lastMonth);

        // 设置日期范围
        setstartDate(startDate1);
        setendDate(endDate1)
        const p = {
            "startDate": startDate1,
            "endDate": endDate1,
        }
        const rep = await getusertongji(p)
        if (rep.code == 200) {
            setData(rep.data)
        } else {
            message.error(rep.msg)
        }
    };
    const exportList = async () => {
        const p = {
            "startDate": startDate,
            "endDate": endDate
        }
        const rep = await exportuser(p)
        // 创建 Blob 对象
        const blob = new Blob([rep], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        // 使用 file-saver 下载文件
        FileSaver.saveAs(blob, 'data.xlsx');  // 保存文件，data.xlsx 是下载的文件名
    }
    const getData = async () => {
        const p = {
            "startDate": startDate,
            "endDate": endDate,
        }
        const rep = await getusertongji(p)
        if (rep.code == 200) {
            setData(rep.data)
        } else {
            message.error(rep.msg)
        }
    }
    const initCharts = (x, y) => {
        let myChart = echarts.init(document.getElementById("myChart"));
        let option = {
            title: {
                text: "",
            },
            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "cross",
                    label: {
                        backgroundColor: "#6a7985",
                    },
                },
            },
            grid: {
                left: "3%",
                right: "4%",
                bottom: "3%",
                containLabel: true,
            },
            xAxis: [
                {
                    type: "category",
                    boundaryGap: false,
                    data: x,
                },
            ],
            yAxis: [
                {
                    type: "value",
                },
            ],
            series: [
                {
                    smooth: true,
                    type: 'line',
                    data: y,
                    markLine: {
                        data: [
                            { type: 'average', name: '平均值' }
                        ]
                    },
                    areaStyle: {}
                }
            ]
        };

        myChart.setOption(option);
        window.addEventListener("resize", function () {
            myChart.resize();
        });
    };

    const getChatData = async () => {
        const p = {
            "startDate": startDate,
            "endDate": endDate,
            "modulus": modulus  //必填 register 注册，firstCharge 首充，inTotal 入金，netValue 净值，visits 访问量
        }
        const rep = await getChat(p)
        if (rep.code == 200) {
            initCharts(rep.data.dates, rep.data.counts)
        } else {
            message.error(rep.msg)
        }
    }


    const columns = [
        {
            title: '日期',
            dataIndex: 'createDate',
            key: 'createDate',
        },
        {
            title: '访问人数',
            dataIndex: 'numberOfVisitorsCount',
            key: 'numberOfVisitorsCount',
        },
        {
            title: '咨询人数',
            dataIndex: 'numberOfInquiriesCount',
            key: 'numberOfInquiriesCount',
        },
        {
            title: '真实开户数',
            dataIndex: 'registerCount',
            key: 'registerCount',
        },
        {
            title: '首入人数',
            dataIndex: 'firstInCount',
            key: 'firstInCount',
        },
        {
            title: '质押产品数',
            dataIndex: 'pledgesCount',
            key: 'pledgesCount',
        },
    ];
    return (
        <PageContainer>
            <Row gutter={16} style={{ marginTop: 30 }}>
                <Col span={4}>
                    <Select
                        defaultValue="register"
                        style={{
                            width: 120,
                        }}
                        value={modulus}
                        onChange={value => setmodulus(value)}
                        options={[
                            {
                                value: 'register',
                                label: '注册',
                            },
                            {
                                value: 'firstCharge',
                                label: '首充',
                            },
                            {
                                value: 'inTotal',
                                label: '入金',
                            },
                            {
                                value: 'netValue',
                                label: '净值',
                            },
                            {
                                value: 'visits',
                                label: '访问量',
                            },
                        ]}
                    />
                </Col>
                {/* <Col span={4}>
                    <DatePicker value={startDate} onChange={(date, dateString) => setstartDate(dateString)} placeholder={'开始时间'} name="date" />
                </Col>
                <Col span={4}>
                    <DatePicker onChange={(date, dateString) => setendDate(dateString)} placeholder={'结束时间'} name="date" />
                </Col> */}
                <RangePicker disabledDate={disabled7DaysDate} onChange={(date, dateString) => {
                    setstartDate(dateString[0]);
                    setendDate(dateString[1])
                }} />

                <Button
                    type="primary"
                    key="primary"
                    onClick={() => {
                        getChatData()
                        getData()
                    }}
                    style={{ marginLeft: 30 }}
                >
                    查询
                </Button>
            </Row>
            <div id="myChart" style={{ width: "100%", height: "500px" }}></div>
            <Row gutter={16} style={{ marginTop: 30 }}>
                <Col span={4}>
                    <Card title="访问人数" bordered={false}>
                        {data?.totalNumberOfVisitorsCount}
                    </Card>
                </Col>
                <Col span={4}>
                    <Card title="咨询人数" bordered={false}>
                        {data.totalNumberOfInquiriesCount}
                    </Card>
                </Col>
                <Col span={4}>
                    <Card title="真实开户数" bordered={false}>
                        {data.totalRegisterCount}
                    </Card>
                </Col>
                <Col span={4}>
                    <Card title="首入人数" bordered={false}>
                        {data.totalFirstInCount}
                    </Card>
                </Col>
                <Col span={4}>
                    <Card title="质押产品数" bordered={false}>
                        {data.totalPledgesCount}
                    </Card>
                </Col>
            </Row>
            <Button
                type="primary"
                key="primary"
                style={{ marginTop: 30, marginBottom: 30 }}
                onClick={exportList}
            >
                导出
            </Button>
            <Table dataSource={data?.list} columns={columns} pagination={false} />
        </PageContainer>
    );
};

export default App;

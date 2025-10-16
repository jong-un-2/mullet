import { exportuser, getBase, getChat, getusertongji, zijinline, zijinpie } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Select, Button, Table } from 'antd';
import React, { useEffect, useState } from 'react';
import { Renderer as SVGRenderer } from '@antv/g-svg';
import * as echarts from "echarts";
import dayjs from 'dayjs';
import FileSaver from 'file-saver';
const { Meta } = Card;
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
        // getChatData()
        // getDateRange()
        getPie()
    }, [])

    const [type, setType] = useState(0)

    const [module, setmodule] = useState('0')
    const [pieData, setPieData] = useState([{}, {}, {}])
    useEffect(() => {
        // initCharts()
        // getChatData()
        // getDateRange()
        getLine(0)
    }, [type])
    // const getDateRange = async () => {
    //     const today = new Date(); // 获取当前日期
    //     const endDate1 = formatDate(today); // 结束日期为今天

    //     // 获取一个月前的日期
    //     const lastMonth = new Date();
    //     lastMonth.setMonth(today.getMonth() - 1); // 设置为上个月
    //     const startDate1 = formatDate(lastMonth);

    //     // 设置日期范围
    //     setstartDate(startDate1);
    //     setendDate(endDate1)
    //     const p = {
    //         "startDate": startDate1,
    //         "endDate": endDate1,
    //     }
    //     const rep = await getusertongji(p)
    //     if (rep.code == 200) {
    //         setData(rep.data)
    //     } else {
    //         message.error(rep.msg)
    //     }
    // };
    const initCharts = (total, zhiya, id) => {
        let myChart = echarts.init(document.getElementById(id));
        let option = {
            tooltip: {
                trigger: 'item', // 触发类型，'item' 表示数据项图形触发，'axis' 表示坐标轴触发
                formatter: '{b} : {c} ({d}%)' // 提示框文本格式器
            },
            series: [
                {
                    type: 'pie',
                    labelLine: {
                        show: false // 不显示标签的连线
                    },
                    radius: ['40%', '70%'], // 设置饼图的内半径和外半径，实现空心效果
                    data: [
                        { value: zhiya, name: '质押资金' },
                        { value: total - zhiya, name: '剩余资金' }
                    ],
                    itemStyle: {
                        normal: {
                            color: function (params) {
                                // 定制颜色，params.dataIndex 为当前数据项的索引
                                var colorList = ['#9535FF', '#00E1BA'];
                                return colorList[params.dataIndex % colorList.length];
                            }
                        }
                    },
                    label: {
                        normal: {
                            show: true,
                            position: 'center',
                            formatter: function (params) {
                                // 计算百分比并显示为居中文本
                                if (total == 0) {
                                    return `{b|总资金}\n{d|0}`;
                                }
                                let percent = ((zhiya / total) * 100).toFixed(2); // 保留两位小数
                                return `{b|质押资金}\n{d|${percent}%}`;
                            },
                            rich: {
                                b: {
                                    fontSize: 16,
                                    lineHeight: 22,
                                    color: '#333'
                                },
                                d: {
                                    fontSize: 16,
                                    lineHeight: 22,
                                    color: '#333'
                                }
                            }
                        }
                    },
                },
            ],
        };

        myChart.setOption(option);
        // window.addEventListener("resize", function () {
        //     myChart.resize();
        // });
    };
    const initCharts1 = (x, y, id) => {
        let myChart = echarts.init(document.getElementById(id));
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
                    // markLine: {
                    //     data: [
                    //         { type: 'average', name: '平均值' }
                    //     ]
                    // },
                    areaStyle: {}
                }
            ]
        };

        myChart.setOption(option);
        // window.addEventListener("resize", function () {
        //     myChart.resize();
        // });
    };
    const getLine = async (v) => {
        const p = {
            type: type,
            time: v == 0 ? 'month' : 'day'
        }
        const rep = await zijinline(p)
        if (rep.code == 200) {
            initCharts1(rep.data.months, rep.data.investData, 'myChart111')
            initCharts1(rep.data.months, rep.data.profitData, 'myChart222')
        } else {
            message.error(rep.msg)
        }
    }
    const getPie = async () => {
        const rep = await zijinpie({})
        if (rep.code == 200) {
            setPieData(rep.data)
            rep.data.map((item, idx) => {
                initCharts(item.totalAssets, item.totalPledgesAssets, "myChart" + idx)
            })
        } else {
            message.error(rep.msg)
        }
    }
    return (
        <PageContainer>
            <Row style={{ marginTop: 30 }} gutter={32}>
                {
                    pieData.length ?
                        pieData.map((item, id) => {
                            return (
                                <Col span={8} key={id + 'idxoqel'} onClick={() => setType(id)}>
                                    <Card
                                        hoverable
                                        style={{
                                            width: 300,
                                        }}
                                        cover={
                                            <div id={"myChart" + id} style={{ width: 300, height: "300px" }}></div>
                                        }
                                    >
                                        <Meta
                                            title={item.type == 0 ? 'USDT' : item.type == 1 ? 'SOL' : item.type == 2 ? 'BTC' : ''}
                                        />
                                        <div style={{ color: '#9c9c9c', marginTop: 10 }}>总资金： {item.totalAssets || 0}</div>
                                        <div style={{ color: '#9c9c9c', marginTop: 10 }}>闲置资金： {item.availableBalance || 0}</div>
                                        <div style={{ color: '#9c9c9c', marginTop: 10 }}>质押资金： {item.totalPledgesAssets || 0}</div>
                                        <div style={{ color: '#9c9c9c', marginTop: 10 }}>在押平均利率： {item.avgPledgesRevenue ? (item.avgPledgesRevenue * 100).toFixed(2) + '%' : 0}</div>
                                    </Card>
                                </Col>
                            )
                        })
                        :
                        null
                }
            </Row>
            <Select

                style={{
                    width: 200,
                    marginTop: 50
                }}
                value={module}
                onChange={value => { setmodule(value); getLine(value) }}
                options={[
                    {
                        value: '0',
                        label: '按月统计（未来12个月）',
                    },
                    {
                        value: '1',
                        label: '按日统计（未来180天）',
                    },
                ]}
            />
            <div style={{ marginTop: 50 }}>
                <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>{type == 0 ? 'USDT' : type == 1 ? 'SOL' : type == 2 ? 'BTC' : ''}{module == '0' ? '未来12月' : '未来180天'}预计释放本金</div>
                <div id="myChart111" style={{ width: "100%", height: "500px" }}></div>
            </div>
            <div style={{ marginTop: 50 }}>
                <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>{type == 0 ? 'USDT' : type == 1 ? 'SOL' : type == 2 ? 'BTC' : ''}{module == '0' ? '未来12月' : '未来180天'}预计释放利息</div>
                <div id="myChart222" style={{ width: "100%", height: "500px" }}></div>
            </div>
        </PageContainer>
    );
};

export default App;

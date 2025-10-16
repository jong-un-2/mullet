import { getBase, getChat } from '@/services/ant-design-pro/api';
import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useModel } from '@umijs/max';
import { Card, Col, DatePicker, message, Row, theme, Select, Button } from 'antd';
import React, { useEffect, useState } from 'react';
import { Renderer as SVGRenderer } from '@antv/g-svg';
import * as echarts from "echarts";
import dayjs from 'dayjs';

/**
 * 每个单独的卡片，为了复用样式抽成了组件
 * @param param0
 * @returns
 */

const App = () => {
  useEffect(() => {
    getData()
    // initCharts()
    getChatData()
  }, [])
  const [data, setData] = useState({})
  const [searchP, setSearchP] = useState({
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  })
  const [modulus, setmodulus] = useState('register')
  const [startDate, setstartDate] = useState('')
  const [endDate, setendDate] = useState('')
  const getData = async () => {
    const rep = await getBase(searchP)
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


  return (
    <PageContainer>
      <Row gutter={16}>
        <Col span={2}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>日期：</div>
        </Col>
        <Col span={4}>
          <DatePicker disabledDate={(current) => current && current > dayjs().endOf("day")} value={searchP.startDate ? dayjs(searchP.startDate, 'YYYY-MM-DD') : null} onChange={(date, dateString) => setSearchP({ ...searchP, startDate: dateString })} placeholder={'开始时间'} name="date" />
        </Col>
        <Col span={4}>
          <DatePicker disabledDate={(current) =>
            current && (current > dayjs().endOf("day") || (searchP.startDate && current < dayjs(searchP.startDate)))
          }
            value={searchP.endDate ? dayjs(searchP.endDate, 'YYYY-MM-DD') : null}
            onChange={(date, dateString) => setSearchP({ ...searchP, endDate: dateString })}
            placeholder={'结束时间'} name="date" />
        </Col>
        <Button
          type="primary"
          key="primary"
          onClick={() => {
            getData()
          }}
        >
          查询
        </Button>
        <Button
          style={{ marginLeft: 30 }}
          type="primary"
          key="primary"
          onClick={() => {
            setSearchP({
              startDate: '',
              endDate: ''
            })
          }}
        >
          重置
        </Button>
      </Row>
      <Row gutter={16} style={{ marginTop: 30 }}>
        <Col span={8}>
          <Card title="入金数" bordered={false} style={{ height: 180 }}>
            <Link to={`/inManaged/`} style={{ color: '#222' }}>
              <div style={{ color: '#4DBC72', fontWeight: 'bold', fontSize: 20 }}>
                ${data.totalDeposit}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                {
                  data?.depositDetails?.map((itx, idx) => {
                    if (itx.type === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#4DBC72', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>USDT {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 1) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#9065FF', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>SOL {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 2) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#F78A4A', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>BTC {itx.amount}</div>
                        </div>
                      )
                    }
                  })
                }
              </div>
            </Link>
            {/* {data?.regisCount} */}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="入金笔数" bordered={false} style={{ height: 180 }}>
            <div style={{ color: '#F78A4A', fontWeight: 'bold', fontSize: 20 }}>
              {data.depositCount}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="用户收益" bordered={false} style={{ height: 180 }}>
            <Link to={`/product/order/`} style={{ color: '#222' }}>
              <div style={{ color: '#F78A4A', fontWeight: 'bold', fontSize: 20 }}>
                {data.userRevenue}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                <div style={{ fontSize: 12, marginRight: 10 }}>用户利息：{data.userRate}</div>
                <div style={{ fontSize: 12 }}>代理收入：{data.agentRate}</div>
              </div>
            </Link>
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 30 }}>
        <Col span={8}>
          <Card title="出金数" bordered={false} style={{ height: 180 }}>
            <Link to={`/outManaged/`} style={{ color: '#222' }}>
              <div style={{ color: '#4DBC72', fontWeight: 'bold', fontSize: 20 }}>
                ${data.totalwithdrawal}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                {
                  data?.withdrawalDetails?.map((itx, idx) => {
                    if (itx.type === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#4DBC72', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>USDT {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 1) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#9065FF', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>SOL {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 2) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#F78A4A', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>BTC {itx.amount}</div>
                        </div>
                      )
                    }
                  })
                }

              </div>
            </Link>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="出金笔数" bordered={false} style={{ height: 180 }}>
            <div style={{ color: '#F78A4A', fontWeight: 'bold', fontSize: 20 }}>
              {data.withdrawalCount}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="开户人数" bordered={false} style={{ height: 180 }}>
            <div style={{ color: '#F78A4A', fontWeight: 'bold', fontSize: 20 }}>
              {data.totalNewAccounts}
            </div>
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 30 }}>
        <Col span={8}>
          <Card title="新增质押额" bordered={false} style={{ height: 180 }}>
            <Link to={`/product/order/`} style={{ color: '#222' }}>
              <div style={{ color: '#C74D4D', fontWeight: 'bold', fontSize: 20 }}>
                ${data.totalPledge}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                {
                  data?.pledgeDetails?.map((itx, idx) => {
                    if (itx.type === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#4DBC72', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>USDT {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 1) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#9065FF', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>SOL {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 2) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#F78A4A', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>BTC {itx.amount}</div>
                        </div>
                      )
                    }
                  })
                }

              </div>
            </Link>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="质押笔数" bordered={false} style={{ height: 180 }}>
            <div style={{ color: '#F78A4A', fontWeight: 'bold', fontSize: 20 }}>
              {data.pledgeCount}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="首A人数" bordered={false} style={{ height: 180 }}>
            <div style={{ color: '#F78A4A', fontWeight: 'bold', fontSize: 20 }}>
              {data.totalFirstADepositCount}
            </div>
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 30 }}>
        <Col span={8}>
          <Card title="结算总金额" bordered={false} style={{ height: 180 }}>
            <Link to={`/settlement/`} style={{ color: '#222' }}>
              <div style={{ color: '#222', fontWeight: 'bold', fontSize: 20 }}>
                ${data.settlementAmount}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                {
                  data?.settlementAmountDetails?.map((itx, idx) => {
                    if (itx.type === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#4DBC72', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>USDT {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 1) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#9065FF', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>SOL {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 2) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#F78A4A', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>BTC {itx.amount}</div>
                        </div>
                      )
                    }
                  })
                }

              </div>
            </Link>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="系统结余" bordered={false} style={{ height: 180 }}>
            <Link to={`/fundSettlement/`} style={{ color: '#222' }}>
              <div style={{ color: '#222', fontWeight: 'bold', fontSize: 20 }}>
                ${data.systemBalances}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                {
                  data?.systemBalancesDetails?.map((itx, idx) => {
                    if (itx.type === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#4DBC72', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>USDT {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 1) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#9065FF', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>SOL {itx.amount}</div>
                        </div>
                      )
                    }
                    if (itx.type === 2) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center' }} key={idx + 'asbfld'}>
                          <div style={{ height: 6, width: 6, background: '#F78A4A', borderRadius: 3, marginRight: 10 }}></div>
                          <div style={{ marginRight: 10 }}>BTC {itx.amount}</div>
                        </div>
                      )
                    }
                  })
                }

              </div>
            </Link>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 30 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>
          关键指标趋势图
        </div>
      </Row>
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
        <Col span={4}>
          <DatePicker onChange={(date, dateString) => setstartDate(dateString)} placeholder={'开始时间'} name="date" />
        </Col>
        <Col span={4}>
          <DatePicker onChange={(date, dateString) => setendDate(dateString)} placeholder={'结束时间'} name="date" />
        </Col>
        <Button
          type="primary"
          key="primary"
          onClick={() => {
            getChatData()
          }}
        >
          查询
        </Button>
      </Row>
      <div id="myChart" style={{ width: "100%", height: "500px" }}></div>
    </PageContainer>
  );
};

export default App;

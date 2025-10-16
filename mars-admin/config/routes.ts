export default [
  {
    path: '/user',
    layout: false,
    routes: [{ name: '登录', path: '/user/login', component: './User/Login' }],
  },
  { path: '/welcome', name: '欢迎',component: './Welcome' },
  // {
  //   path: '/admin',
  //   name: '管理页',
  //   icon: 'crown',
  //   access: 'canAdmin',
  //   routes: [
  //     { path: '/admin', redirect: '/admin/sub-page' },
  //     { path: '/admin/sub-page', name: '二级管理页', component: './Admin' },
  //   ],
  // },
  {
    path: '/product',
    name: '质押管理',
    // icon: 'product',
    routes: [
      { path: '/product/list', name: '质押产品列表', component: './Product/list' },
      { path: '/product/order', name: '订单列表', component: './Product/order' },
    ],
  },
  {
    path: '/userManage',
    name: '用户管理',
    // icon: 'UsergroupAddOutlined',
    routes: [
      { path: '/userManage/list', name: '用户列表', component: './userManage/list' },
      { path: '/userManage/group', name: '用户组别管理', component: './userManage/group' },
      { path: '/userManage/details:id', name: '用户详情',hideInMenu: true, component: './userManage/details' },
      { path: '/userManage/group-details:id', name: '组别详情',hideInMenu: true, component: './userManage/group-details' },
      { path: '/userManage/statistics', name: '推广统计', component: './userManage/statistics' },
    ],
  },
  {
    path: '/adminUser',
    name: '后台管理',
    // icon: 'UsergroupAddOutlined',
    routes: [
      { path: '/adminUser/index', name: '后台用户管理', component: './adminUser/index' },
      { path: '/adminUser/role', name: '权限角色管理', component: './adminUser/role' },
    ],
  },
  {
    path: '/agent',
    name: '代理管理',
    // icon: 'user',
    routes: [
      { path: '/agent/list', name: '客户结算（按代理）', component: './agent/list' },
      { path: '/agent/customerSettlement', name: '客户结算（按每笔）', component: './agent/customerSettlement' },
      { path: '/agent/setting', name: '佣金设置', component: './agent/setting' },
    ],
  },
  {
    path: '/wallet',
    name: '钱包管理',
    // icon: 'crown',
    component: './Wallet/list'
  },
  {
    path: '/inManaged',
    name: '入金管理',
    // icon: 'PayCircleOutlined',
    component: './payManage/list'
  },
  {
    path: '/outManaged',
    name: '出金管理',
    // icon: 'RedEnvelopeOutlined',
    component: './outManage/list'
  },
  {
    path: '/orderRecord',
    name: '入金补单记录',
    // icon: 'ProfileOutlined',
    component: './orderRecord/list'
  },
  {
    path: '/settlement',
    name: '结算出入金管理',
    // icon: 'BorderOuterOutlined',
    component: './settlement/list'
  },
  {
    path: '/financialStatements',
    name: '资金流水报表',
    // icon: 'FormOutlined',
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
    // icon: 'AlignRightOutlined',
    component: './releaseFunds/'
  },
  {
    path: '/active',
    name: '活动管理',
    // icon: 'DollarOutlined',
    routes: [
      { path: '/active/', name: '首充活动', component: './active/' },
      { path: '/active/tg', name: 'TG赠金发放', component: './active/tg' },
    ],
  },
  {
    path: '/banner',
    name: 'Banner管理',
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
  },
  {
    path: '/notice',
    name: '公告管理',
    // icon: 'MessageOutlined',
    component: './notice/'
  },
  {
    path: '/tgGroup',
    name: 'TG群管理',
    // icon: 'WechatOutlined',
    component: './tgGroup/'
  },
  { path: '/', redirect: '/welcome' },
  { path: '*', layout: false, component: './404' },
];

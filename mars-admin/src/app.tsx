import { AvatarDropdown, AvatarName, Footer, Question } from '@/components';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer, PageLoading } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import React from 'react';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { WalletContextProvider } from '@/contexts/WalletContext';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  // const fetchUserInfo = async () => {
  //   try {
  //     const msg = await queryCurrentUser({
  //       skipErrorHandler: true,
  //     });
  //     return msg.data;
  //   } catch (error) {
  //     history.push(loginPath);
  //   }
  //   return undefined;
  // };
  // 如果不是登录页面，执行
  const { location } = history;
  if (location.pathname !== loginPath) {
    const currentUser = JSON.parse(window.sessionStorage.getItem('userInfo'))
    // console.log('xxxx',currentUser)
    return {
      // fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    // fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  return {
    avatarProps: {
      src: '/icons/icon-128x128.png',
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    menu: {
      params: initialState,
      request: async (params) => {
        // console.log('yyyyy',params)
        const userRoles = params.currentUser.roles || [];
        
        // 添加佣金菜单到角色权限中 - 放在用户管理后面
        const commissionMenu = {
          path: '/commission',
          name: '佣金费用',
          routes: [
            { path: '/commission/overview', name: '费用总览', component: './commission/overview' },
            { path: '/commission/records', name: '费用记录', component: './commission/records' },
            { path: '/commission/settings', name: '费率设置', component: './commission/settings' },
            { path: '/commission/statistics', name: '费用统计', component: './commission/statistics' },
          ],
        };
        
        // 检查是否已存在佣金菜单
        const hasCommissionMenu = userRoles.some((role: any) => role.name === '佣金费用' || role.path === '/commission');
        
        if (!hasCommissionMenu) {
          // 找到用户管理菜单的位置，在其后插入佣金菜单
          const userManagementIndex = userRoles.findIndex((role: any) => role.name === '用户管理');
          if (userManagementIndex >= 0) {
            const newRoles = [...userRoles];
            newRoles.splice(userManagementIndex + 1, 0, commissionMenu);
            return newRoles;
          } else {
            // 如果找不到用户管理菜单，就添加到最后
            return [...userRoles, commissionMenu];
          }
        }
        
        return userRoles;
      }
    },
    // waterMarkProps: {
    //   content: initialState?.currentUser?.loginName,
    // },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      // console.log('xxxxx',window.sessionStorage.getItem('userInfo'),initialState)
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
        <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
          <LinkOutlined />
          <span>OpenAPI 文档</span>
        </Link>,
      ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          {/* {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )} */}
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = {
  ...errorConfig,
};

/**
 * @name rootContainer 配置
 * 用于包裹整个应用，添加全局上下文
 */
export function rootContainer(container: any) {
  return (
    <WalletContextProvider>
      {container}
    </WalletContextProvider>
  );
}

/**
 * 主应用入口
 */

const React = require('react');
const ReactDOM = require('react-dom');
const { useState, useEffect } = React;

// 导入组件
const Sidebar = require('./components/Sidebar');
const ProjectsPage = require('./components/ProjectsPage');
const WorkspacesPage = require('./components/WorkspacesPage');
const SettingsPage = require('./components/SettingsPage');
const DownloadsPage = require('./components/DownloadsPage');
const Notification = require('./components/Notification');
// HelpMenu组件已移除，功能已整合到F12快捷键中

// 导入服务
const gitlabService = require('./services/gitlab-service');
const workspaceService = require('./services/workspace-service');

function App() {
  // 状态管理
  const [currentPage, setCurrentPage] = useState('projects');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState(null);

  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 首先检查GitLab配置是否已完成
        const isConfigured = await gitlabService.isConfigured();
        
        if (!isConfigured) {
          console.log('GitLab配置未完成，请先设置GitLab地址和访问令牌');
          setCurrentPage('settings');
          setIsAuthenticated(false);
          return;
        }
        
        const token = await gitlabService.getToken();
        if (token) {
          const userData = await gitlabService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('认证检查失败:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // 显示通知
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 处理页面切换
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // 处理登录
  const handleLogin = async (token, url) => {
    try {
      await gitlabService.setToken(token);
      await gitlabService.setBaseUrl(url);
      const userData = await gitlabService.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
      showNotification('登录成功');
      setCurrentPage('projects');
    } catch (error) {
      console.error('登录失败:', error);
      showNotification('登录失败: ' + error.message, 'error');
    }
  };

  // 渲染当前页面
  const renderPage = () => {
    if (!isAuthenticated && currentPage !== 'settings') {
      setCurrentPage('settings');
      return React.createElement(SettingsPage, {
        onLogin: handleLogin,
        showNotification: showNotification
      });
    }

    switch (currentPage) {
      case 'projects':
        return React.createElement(ProjectsPage, {
          user: user,
          showNotification: showNotification
        });
      case 'workspaces':
        return React.createElement(WorkspacesPage, {
          user: user,
          showNotification: showNotification
        });
      case 'settings':
        return React.createElement(SettingsPage, {
          onLogin: handleLogin,
          isAuthenticated: isAuthenticated,
          user: user,
          showNotification: showNotification
        });
      case 'downloads':
        return React.createElement(DownloadsPage, {
          user: user,
          showNotification: showNotification
        });
      default:
        return React.createElement(ProjectsPage, {
          user: user,
          showNotification: showNotification
        });
    }
  };

  return React.createElement(
    'div',
    { className: 'app-container' },
    React.createElement(
      'div',
      { className: 'app-layout' },
      React.createElement(
        Sidebar,
        { 
          currentPage: currentPage, 
          onPageChange: handlePageChange, 
          isAuthenticated: isAuthenticated, 
          user: user 
        }
      ),
      React.createElement(
        'div',
        { className: 'main-content' },
        notification && React.createElement(
          Notification,
          { message: notification.message, type: notification.type }
        ),
        React.createElement(
          'main',
          { className: 'content-container' },
          renderPage()
        )
      )
    )
  );
}

// 渲染应用
document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(React.createElement(App), document.getElementById('root'));
});
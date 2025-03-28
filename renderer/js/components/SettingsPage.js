/**
 * 设置页面组件
 */

const React = require('react');
const { useState, useEffect } = React;
const gitlabService = require('../services/gitlab-service');

function SettingsPage({ onLogin, isAuthenticated, user, showNotification }) {
  const [token, setToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://gitlab.com');
  const [loading, setLoading] = useState(false);

  // 加载已保存的设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedToken = await gitlabService.getToken();
        const savedBaseUrl = await gitlabService.getBaseUrl();
        
        if (savedToken) setToken(savedToken);
        if (savedBaseUrl) setBaseUrl(savedBaseUrl);
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };
    
    loadSettings();
  }, []);

  // 处理登录
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token.trim()) {
      showNotification('请输入GitLab访问令牌', 'error');
      return;
    }
    
    if (!baseUrl.trim()) {
      showNotification('请输入GitLab URL', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      await onLogin(token, baseUrl);
    } catch (error) {
      console.error('登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { className: 'page-header' },
      React.createElement('h2', { className: 'page-title' }, '设置')
    ),
    
    React.createElement(
      'div',
      { className: 'card' },
      React.createElement(
        'div',
        { className: 'card-header' },
        React.createElement('h3', { className: 'card-title' }, 'GitLab连接设置')
      ),
      
      React.createElement(
        'form',
        { onSubmit: handleSubmit },
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'GitLab URL'),
          React.createElement('input', { 
            type: 'text', 
            className: 'form-control', 
            value: baseUrl, 
            onChange: (e) => setBaseUrl(e.target.value), 
            placeholder: '例如: https://gitlab.com', 
            disabled: loading
          })
        ),
        
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, '访问令牌'),
          React.createElement('input', { 
            type: 'password', 
            className: 'form-control', 
            value: token, 
            onChange: (e) => setToken(e.target.value), 
            placeholder: '输入您的GitLab个人访问令牌', 
            disabled: loading
          }),
          React.createElement(
            'small',
            { className: 'form-text text-muted' },
            '您可以在GitLab个人设置中创建访问令牌，需要授予api权限。'
          )
        ),
        
        React.createElement(
          'div',
          { className: 'form-actions' },
          React.createElement(
            'button',
            { 
              type: 'submit', 
              className: 'btn btn-primary', 
              disabled: loading
            },
            loading ? '连接中...' : '连接GitLab'
          )
        )
      )
    ),
    
    isAuthenticated && user && React.createElement(
      'div',
      { className: 'card mt-4' },
      React.createElement(
        'div',
        { className: 'card-header' },
        React.createElement('h3', { className: 'card-title' }, '工作空间设置')
      ),
      React.createElement(
        'div',
        { className: 'card-body' },
        React.createElement(WorkspaceSettings, { showNotification: showNotification })
      )
    )
  );
}

// 工作空间设置子组件
function WorkspaceSettings({ showNotification }) {
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 加载工作空间目录
  useEffect(() => {
    const loadDirectories = async () => {
      try {
        const workspaceService = require('../services/workspace-service');
        const dirs = await workspaceService.getDirectories();
        setDirectories(dirs || []);
      } catch (error) {
        console.error('加载工作空间目录失败:', error);
      }
    };
    
    loadDirectories();
  }, []);
  
  // 添加工作空间目录
  const handleAddDirectory = async () => {
    setLoading(true);
    
    try {
      const workspaceService = require('../services/workspace-service');
      const newDir = await workspaceService.addDirectory();
      
      if (newDir) {
        setDirectories(prev => [...prev, newDir]);
        showNotification(`已添加工作空间目录: ${newDir}`);
      }
    } catch (error) {
      console.error('添加工作空间目录失败:', error);
      showNotification('添加工作空间目录失败', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // 移除工作空间目录
  const handleRemoveDirectory = async (dirPath) => {
    try {
      const workspaceService = require('../services/workspace-service');
      await workspaceService.removeDirectory(dirPath);
      setDirectories(prev => prev.filter(dir => dir !== dirPath));
      showNotification(`已移除工作空间目录: ${dirPath}`);
    } catch (error) {
      console.error('移除工作空间目录失败:', error);
      showNotification('移除工作空间目录失败', 'error');
    }
  };
  
  return React.createElement(
    'div',
    null,
    React.createElement('p', null, '管理您的本地工作空间目录，这些目录将用于存放GitLab项目。'),
    
    React.createElement(
      'div',
      { className: 'directory-list' },
      directories.length === 0 ?
        React.createElement('div', { className: 'empty-state' }, '尚未添加任何工作空间目录') :
        React.createElement(
          'ul',
          { className: 'list-group' },
          directories.map((dir, index) =>
            React.createElement(
              'li',
              { 
                key: index, 
                className: 'list-group-item d-flex justify-content-between align-items-center'
              },
              React.createElement('span', { className: 'directory-path' }, dir),
              React.createElement(
                'button',
                {
                  className: 'btn btn-sm btn-danger',
                  onClick: () => handleRemoveDirectory(dir)
                },
                '移除'
              )
            )
          )
        )
    ),
    
    React.createElement(
      'div',
      { className: 'mt-3' },
      React.createElement(
        'button',
        {
          className: 'btn btn-secondary',
          onClick: handleAddDirectory,
          disabled: loading
        },
        loading ? '添加中...' : '添加工作空间目录'
      )
    )
  );
}

// 确保正确导出组件
module.exports = SettingsPage;
/**
 * 侧边栏组件
 */

const React = require('react');

function Sidebar({ currentPage, onPageChange, isAuthenticated, user }) {
  return React.createElement(
    'div',
    { className: 'sidebar' },
    React.createElement(
      'div',
      { className: 'sidebar-header' },
      React.createElement('h1', { className: 'app-title' }, 'GitLab工作空间')
    ),
    
    isAuthenticated && user && React.createElement(
      'div',
      { className: 'user-info' },
      React.createElement(
        'div',
        { className: 'user-avatar' },
        user.avatar_url ? 
          React.createElement('img', { src: user.avatar_url, alt: user.name }) :
          React.createElement(
            'div',
            { className: 'avatar-placeholder' },
            user.name.charAt(0).toUpperCase()
          )
      ),
      
      React.createElement(
        'div',
        { className: 'user-details' },
        React.createElement('div', { className: 'user-name' }, user.name),
        React.createElement('div', { className: 'user-username' }, `@${user.username}`)
      )
    ),
    
    React.createElement(
      'nav',
      { className: 'sidebar-nav' },
      React.createElement(
        'ul',
        { className: 'nav-list' },
        React.createElement(
          'li',
          { 
            className: `nav-item ${currentPage === 'projects' ? 'active' : ''}`,
            onClick: () => onPageChange('projects')
          },
          React.createElement('span', { className: 'nav-icon' }, '📁'),
          React.createElement('span', null, 'GitLab项目')
        ),
        
        React.createElement(
          'li',
          { 
            className: `nav-item ${currentPage === 'workspaces' ? 'active' : ''}`,
            onClick: () => onPageChange('workspaces')
          },
          React.createElement('span', { className: 'nav-icon' }, '💻'),
          React.createElement('span', null, '本地工作空间')
        ),
          
        React.createElement(
          'li',
          { 
            className: `nav-item ${currentPage === 'settings' ? 'active' : ''}`,
            onClick: () => onPageChange('settings')
          },
          React.createElement('span', { className: 'nav-icon' }, '⚙️'),
          React.createElement('span', null, '设置')
        )
      )
    ),
    
    React.createElement(
      'div',
      { className: 'sidebar-footer' },
      'GitLab工作空间管理工具 v1.0.0'
    )
  );
}

module.exports = Sidebar;
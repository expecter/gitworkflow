/**
 * Help菜单组件
 */

const React = require('react');
const { useState, useEffect, useRef } = React;
const { ipcRenderer } = require('electron');

function HelpMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // 切换菜单显示状态
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // 打开开发者工具
  const openDevTools = () => {
    ipcRenderer.send('app:openDevTools');
    setIsOpen(false);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return React.createElement(
    'div',
    { className: 'help-menu-container', ref: menuRef },
    React.createElement(
      'button',
      { 
        className: 'help-button', 
        onClick: toggleMenu 
      },
      '帮助'
    ),
    isOpen && React.createElement(
      'div',
      { className: 'help-menu' },
      React.createElement(
        'ul',
        { className: 'help-menu-list' },
        React.createElement(
          'li',
          { 
            className: 'help-menu-item',
            onClick: openDevTools
          },
          '打开开发者工具'
        ),
        React.createElement(
          'li',
          { 
            className: 'help-menu-item',
            onClick: () => {
              alert('GitLab工作空间管理工具 v1.0.0\n\n一个用于管理GitLab项目和本地工作空间的工具。');
              setIsOpen(false);
            }
          },
          '关于'
        )
      )
    )
  );
}

module.exports = HelpMenu;
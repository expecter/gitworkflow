/**
 * 下载页面组件
 */

const React = require('react');
const { useState } = React;
const browserService = require('../services/browser-service');

function DownloadsPage({ user, showNotification }) {
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  
  // 定义下载工具列表
  const downloadTools = [
    {
      id: 'python',
      name: 'Python',
      description: '这里提供各种版本的Python软件下载，包括Windows、Linux和MacOS平台。',
      url: 'http://10.21.211.160:9100/soft/python/'
    },
    {
      id: 'node',
      name: 'Node.js',
      description: '这里提供各种版本的Node.js软件下载，包括Windows、Linux和MacOS平台。',
      url: 'http://10.21.211.160:9100/soft/node/'
    }
  ];
  
  // 处理外部链接点击
  const handleExternalLinkClick = async (e, url) => {
    e.preventDefault();
    try {
      await browserService.openExternalUrl(url);
    } catch (error) {
      console.error('打开外部链接失败:', error);
      showNotification('打开外部链接失败: ' + error.message, 'error');
    }
  };
  
  // 处理工具选择
  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
  };
  
  // 获取当前选中的工具，默认为第一个
  const currentTool = selectedTool || downloadTools[0];

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { className: "page-header" },
      React.createElement('h2', { className: "page-title" }, '软件下载中心')
    ),
    
    React.createElement(
      'div',
      { className: "download-tabs-container" },
      React.createElement(
        'div',
        { className: "download-tabs" },
        downloadTools.map(tool => (
          React.createElement(
            'div',
            { 
              key: tool.id,
              className: `download-tab ${currentTool.id === tool.id ? 'active' : ''}`,
              onClick: () => handleToolSelect(tool)
            },
            React.createElement('span', { className: "tab-icon" }, tool.id === 'python' ? '🐍' : '📦'),
            React.createElement('span', { className: "tab-name" }, tool.name)
          )
        ))
      )
    ),
    
    React.createElement(
      'div',
      { className: "tools-container" },
      React.createElement(
        'div',
        { className: "tools-description" },
        React.createElement(
          'div',
          { className: "tool-info-card" },
          React.createElement('h3', null, currentTool.name),
          React.createElement('p', null, currentTool.description)
        )
      ),
      
      React.createElement(
        'div',
        { className: "tool-details" },
        React.createElement(
          'div',
          { className: "card" },
          React.createElement(
            'div',
            { className: "card-header" },
            React.createElement('h3', { className: "card-title" }, `${currentTool.name}软件资源`)
          ),
          React.createElement(
            'div',
            { className: "card-body" },
            React.createElement(
              'p',
              null,
              currentTool.description
            ),
            React.createElement(
              'div',
              { className: "download-actions" },
              React.createElement(
                'a',
                { 
                  href: currentTool.url,
                  className: "btn btn-primary",
                  onClick: (e) => handleExternalLinkClick(e, currentTool.url),
                  target: "_blank", 
                  rel: "noopener noreferrer" 
                },
                '打开下载页面'
              )
            )
          )
        ),
        
        React.createElement(
          'div',
          { className: "iframe-container" },
          React.createElement(
            'iframe',
            {
              src: currentTool.url,
              width: "100%",
              height: "600px",
              frameBorder: "0",
              title: `${currentTool.name}下载页面`
            }
          )
        )
      )
    )
  );
}

module.exports = DownloadsPage;
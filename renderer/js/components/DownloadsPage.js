/**
 * 下载页面组件
 */

const React = require('react');
const { useState, useRef, useEffect } = React;
const browserService = require('../services/browser-service');

function DownloadsPage({ user, showNotification }) {
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const iframeRef = useRef(null);
  
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
  
  // 处理返回上一页操作
  const handleGoBack = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.back();
      } catch (error) {
        console.error('返回上一页失败:', error);
        showNotification('返回上一页失败: ' + error.message, 'error');
      }
    }
  };
  
  // 监听iframe的加载事件，检查是否可以返回
  useEffect(() => {
    const checkBackHistory = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          // 尝试获取历史记录长度，如果大于1则可以返回
          const historyLength = iframeRef.current.contentWindow.history.length;
          setCanGoBack(historyLength > 1);
        } catch (error) {
          console.error('检查历史记录失败:', error);
          setCanGoBack(false);
        }
      }
    };
    
    // 添加iframe加载完成的事件监听
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', checkBackHistory);
      return () => {
        iframe.removeEventListener('load', checkBackHistory);
      };
    }
  }, [selectedTool]);

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
        { className: "tool-details" },
        
        React.createElement(
          'div',
          { className: "iframe-container" },
          React.createElement(
            'div',
            { className: "iframe-navigation" },
            React.createElement(
              'button',
              { 
                className: "back-button", 
                onClick: handleGoBack,
                disabled: !canGoBack,
                title: "返回上一页"
              },
              React.createElement('span', { className: "back-icon" }, '←'),
              "返回上一页"
            )
          ),
          React.createElement(
            'iframe',
            {
              ref: iframeRef,
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
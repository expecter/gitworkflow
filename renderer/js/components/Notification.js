/**
 * 通知组件
 */

const React = require('react');

function Notification({ message, type = 'success' }) {
  return React.createElement(
    'div',
    { className: `notification notification-${type}` },
    React.createElement(
      'div',
      { className: 'notification-content' },
      type === 'error' && React.createElement('span', { className: 'notification-icon icon-error' }),
      type === 'success' && React.createElement('span', { className: 'notification-icon icon-success' }),
      type === 'warning' && React.createElement('span', { className: 'notification-icon icon-warning' }),
      type === 'info' && React.createElement('span', { className: 'notification-icon icon-info' }),
      React.createElement('span', { className: 'notification-message' }, message)
    )
  );
}

module.exports = Notification;
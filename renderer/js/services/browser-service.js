/**
 * 浏览器服务
 * 负责处理URL打开和浏览器相关功能
 */

const { shell } = require('electron');

/**
 * 使用系统默认浏览器打开URL
 * @param {string} url - 要打开的URL
 * @returns {Promise<boolean>} 是否成功打开
 */
async function openExternalUrl(url) {
  try {
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error('打开URL失败:', error);
    return false;
  }
}

module.exports = {
  openExternalUrl
};
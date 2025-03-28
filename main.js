/**
 * Electron主进程
 * 负责创建窗口、处理IPC通信和管理应用生命周期
 */

const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// 初始化配置存储
const store = new Store();

// 保持对窗口对象的全局引用，避免JavaScript对象被垃圾回收时窗口关闭
let mainWindow;

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icons/icon.png')
  });

  // 加载应用的index.html
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // 开发环境下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 当Electron完成初始化并准备创建浏览器窗口时调用此方法
 */
app.whenReady().then(() => {
  createWindow();

  // 注册F12全局快捷键打开开发者工具和帮助菜单
  globalShortcut.register('F12', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      // 显示一个包含开发者工具和关于信息的菜单
      const options = ['打开开发者工具', '关于', '取消'];
      dialog.showMessageBox(focusedWindow, {
        title: '帮助菜单',
        message: '请选择一个选项：',
        buttons: options,
        cancelId: 2
      }).then(result => {
        const index = result.response;
        if (index === 0) {
          // 打开开发者工具
          focusedWindow.webContents.toggleDevTools();
        } else if (index === 1) {
          // 显示关于信息
          dialog.showMessageBox(focusedWindow, {
            type: 'info',
            title: '关于',
            message: 'GitLab工作空间管理工具 v1.0.0',
            detail: '一个用于管理GitLab项目和本地工作空间的工具。'
          });
        }
      });
    }
  });

  app.on('activate', () => {
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会在应用程序中重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * 当所有窗口关闭时退出应用
 */
app.on('window-all-closed', () => {
  // 在macOS上，除非用户使用Cmd + Q确定地退出，否则应用和菜单栏会保持活动状态
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前取消注册所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ================ IPC通信处理 ================

/**
 * 打开开发者工具
 */
ipcMain.on('app:openDevTools', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.openDevTools();
  }
});

/**
 * 获取GitLab令牌
 */
ipcMain.handle('gitlab:getToken', async () => {
  return store.get('gitlab.token');
});

/**
 * 设置GitLab令牌
 */
ipcMain.handle('gitlab:setToken', async (event, token) => {
  store.set('gitlab.token', token);
  return true;
});

/**
 * 获取GitLab基础URL
 */
ipcMain.handle('gitlab:getBaseUrl', async () => {
  return store.get('gitlab.baseUrl', 'https://gitlab.com');
});

/**
 * 设置GitLab基础URL
 */
ipcMain.handle('gitlab:setBaseUrl', async (event, url) => {
  store.set('gitlab.baseUrl', url);
  return true;
});

/**
 * 获取工作空间目录列表
 */
ipcMain.handle('workspace:getDirectories', async () => {
  return store.get('workspace.directories', []);
});

/**
 * 添加工作空间目录
 */
ipcMain.handle('workspace:addDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const newDir = result.filePaths[0];
    const dirs = store.get('workspace.directories', []);
    
    if (!dirs.includes(newDir)) {
      dirs.push(newDir);
      store.set('workspace.directories', dirs);
    }
    
    return newDir;
  }
  
  return null;
});

/**
 * 移除工作空间目录
 */
ipcMain.handle('workspace:removeDirectory', async (event, dirPath) => {
  const dirs = store.get('workspace.directories', []);
  const newDirs = dirs.filter(dir => dir !== dirPath);
  store.set('workspace.directories', newDirs);
  return true;
});

/**
 * 获取目录内容
 */
ipcMain.handle('workspace:getDirectoryContents', async (event, dirPath) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items.map(item => ({
      name: item.name,
      path: path.join(dirPath, item.name),
      isDirectory: item.isDirectory(),
      isGitRepository: item.isDirectory() && fs.existsSync(path.join(dirPath, item.name, '.git'))
    }));
  } catch (error) {
    console.error('读取目录内容失败:', error);
    return [];
  }
});
const { app, BrowserWindow, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('path');
const Store = require('electron-store');

// 初始化配置存储
const store = new Store();

let mainWindow;
let isDev = process.argv.includes('--dev');

function createMainWindow() {
  // 获取主屏幕信息
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1200, width * 0.8),
    height: Math.min(800, height * 0.8),
    x: Math.floor((width - 1200) / 2),
    y: Math.floor((height - 800) / 2),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'SliceView - 窗口区域选择工具',
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
    resizable: true,
    minimizable: true,
    maximizable: true,
    frame: true,
    transparent: false
  });

  // 加载主页面
  const startUrl = `file://${path.join(__dirname, '../renderer/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 防止窗口被意外关闭
  mainWindow.on('close', (event) => {
    if (app.isQuiting) {
      return;
    }
    
    event.preventDefault();
    mainWindow.hide();
  });
}

// 应用准备就绪
app.whenReady().then(() => {
  createMainWindow();

  // macOS 应用激活事件
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  app.isQuiting = true;
});

// IPC 事件处理
ipcMain.handle('get-windows', async () => {
  try {
    console.log('正在获取窗口列表...');
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 150, height: 150 }
    });
    
    console.log('获取到窗口数量:', sources.length);
    sources.forEach((source, index) => {
      console.log(`窗口 ${index + 1}:`, source.name, source.id);
    });
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('获取窗口列表失败:', error);
    return [];
  }
});

ipcMain.handle('get-screens', async () => {
  try {
    console.log('正在获取屏幕列表...');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 }
    });
    
    console.log('获取到屏幕数量:', sources.length);
    sources.forEach((source, index) => {
      console.log(`屏幕 ${index + 1}:`, source.name, source.id);
    });
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('获取屏幕列表失败:', error);
    return [];
  }
});

// 新增：开始捕获流程
ipcMain.handle('start-capture', async (event, windowId) => {
  try {
    console.log('开始捕获流程，目标窗口ID:', windowId);

    // 保存目标窗口ID供后续使用
    global.targetWindowId = windowId;

    // 隐藏主窗口
    if (mainWindow) {
      mainWindow.hide();
      console.log('主窗口已隐藏');
    }

    // 创建选择工具窗口
    const selectionWindow = new BrowserWindow({
      width: 800,
      height: 600,
      x: 100,
      y: 100,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'SliceView - 区域选择工具',
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false,
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      transparent: false,
      alwaysOnTop: true
    });

    // 加载选择工具页面
    const selectionUrl = `file://${path.join(__dirname, '../renderer/selection.html')}`;
    selectionWindow.loadURL(selectionUrl);

    // 等待页面加载完成后开始捕获内容
    selectionWindow.webContents.once('did-finish-load', async () => {
      try {
        // 获取目标窗口或屏幕的源
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
          thumbnailSize: { width: 1920, height: 1080 }
        });

        const targetSource = sources.find(source => source.id === windowId);
        if (targetSource) {
          // 传递源信息到选择工具窗口
          selectionWindow.webContents.send('target-window-data', {
            sourceId: targetSource.id,
            windowName: targetSource.name,
            sourceType: targetSource.id.startsWith('screen:') ? 'screen' : 'window'
          });
          
          selectionWindow.show();
          console.log('选择工具窗口已显示，目标窗口数据已传递');
        } else {
          throw new Error('无法找到目标窗口源');
        }
      } catch (error) {
        console.error('获取目标窗口源失败:', error);
        selectionWindow.webContents.send('target-window-error', error.message);
        selectionWindow.show();
      }
    });

    // 存储选择窗口引用
    global.selectionWindow = selectionWindow;

    return { success: true, message: '捕获流程已启动' };
  } catch (error) {
    console.error('启动捕获流程失败:', error);
    return { success: false, error: error.message };
  }
});

// 新增：完成选择并创建切片窗口
ipcMain.handle('complete-selection', async (event, selectionData) => {
  try {
    console.log('完成选择，数据:', selectionData);

    // 关闭选择工具窗口
    if (global.selectionWindow) {
      global.selectionWindow.close();
      global.selectionWindow = null;
    }

    // 获取目标窗口的源
    const targetWindowId = global.targetWindowId;
    if (!targetWindowId) {
      throw new Error('未找到目标窗口ID');
    }

    // 捕获目标窗口或屏幕的内容
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    const targetSource = sources.find(source => source.id === targetWindowId);
    if (!targetSource) {
      throw new Error('无法找到目标窗口源');
    }

    // 创建切片窗口（始终置顶）
    const sliceWindow = new BrowserWindow({
      width: selectionData.width || 400,
      height: selectionData.height || 300,
      x: selectionData.x || 100,
      y: selectionData.y || 100,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'SliceView - 内容切片',
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false,
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      transparent: false,
      alwaysOnTop: true
    });

    // 加载切片内容页面
    const sliceUrl = `file://${path.join(__dirname, '../renderer/slice.html')}`;
    sliceWindow.loadURL(sliceUrl);

    // 等待页面加载完成后再显示
    sliceWindow.webContents.once('did-finish-load', () => {
      // 传递捕获数据到切片窗口
      sliceWindow.webContents.send('slice-data', {
        sourceId: targetSource.id,
        selectionData: selectionData,
        windowInfo: {
          name: targetSource.name,
          id: targetSource.id
        }
      });
      
      sliceWindow.show();
      console.log('切片窗口已显示，数据已传递');
    });

    // 存储切片窗口引用
    if (!global.sliceWindows) {
      global.sliceWindows = [];
    }
    global.sliceWindows.push(sliceWindow);

    // 显示主窗口
    if (mainWindow) {
      mainWindow.show();
      console.log('主窗口已重新显示');
    }

    return { success: true, message: '切片窗口已创建' };
  } catch (error) {
    console.error('完成选择失败:', error);
    return { success: false, error: error.message };
  }
});

// 新增：取消选择
ipcMain.handle('cancel-selection', async () => {
  try {
    console.log('取消选择');
    
    // 关闭选择工具窗口
    if (global.selectionWindow) {
      global.selectionWindow.close();
      global.selectionWindow = null;
    }
    
    // 显示主窗口
    if (mainWindow) {
      mainWindow.show();
      console.log('主窗口已重新显示');
    }
    
    return { success: true, message: '选择已取消' };
  } catch (error) {
    console.error('取消选择失败:', error);
    return { success: false, error: error.message };
  }
});

// 新增：获取应用版本
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 新增：获取应用名称
ipcMain.handle('get-app-name', () => {
  return app.getName();
});

// 开发模式下的热重载
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '../../node_modules', '.bin', 'electron'),
    forceHardReset: true,
    hardResetMethod: 'exit'
  });
} 
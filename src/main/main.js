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

    // 获取主屏幕尺寸
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;

    // 创建选择工具窗口（全屏显示）
    const selectionWindow = new BrowserWindow({
      width: screenWidth,
      height: screenHeight,
      x: 0,
      y: 0,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'SliceView - 区域选择工具',
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      frame: false, // 无边框全屏
      transparent: false,
      alwaysOnTop: true,
      fullscreen: true // 全屏模式
    });

    // 加载选择工具页面
    const selectionUrl = `file://${path.join(__dirname, '../renderer/selection.html')}`;
    selectionWindow.loadURL(selectionUrl);

    // 等待页面加载完成后开始捕获内容
    selectionWindow.webContents.once('did-finish-load', async () => {
      try {
        // 获取目标窗口或屏幕的源 - 提高缩略图质量
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
          thumbnailSize: { width: 3840, height: 2160 }
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

    // 捕获目标窗口或屏幕的内容 - 提高缩略图质量
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 3840, height: 2160 }
    });

    const targetSource = sources.find(source => source.id === targetWindowId);
    if (!targetSource) {
      throw new Error('无法找到目标窗口源');
    }

    // 创建切片窗口（始终置顶）
    // 简化坐标计算，直接使用选择坐标
    const sliceWindow = new BrowserWindow({
      width: Math.round(selectionData.width),
      height: Math.round(selectionData.height),
      x: Math.round(selectionData.x),
      y: Math.round(selectionData.y),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'SliceView - 内容切片',
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false,
      resizable: false, // 禁用调整大小，确保尺寸固定
      minimizable: true,
      maximizable: false, // 禁用最大化
      frame: false, // 移除标题栏和菜单栏
      transparent: false,
      alwaysOnTop: true,
      skipTaskbar: false, // 暂时在任务栏显示，方便调试
      useContentSize: false // 确保使用窗口尺寸而不是内容尺寸
    });

    // 加载切片内容页面
    const sliceUrl = `file://${path.join(__dirname, '../renderer/slice.html')}`;
    sliceWindow.loadURL(sliceUrl);

    // 等待页面加载完成后再显示
    sliceWindow.webContents.once('did-finish-load', () => {
      console.log('切片窗口页面加载完成，准备传递数据');
      
      // 传递捕获数据到切片窗口
      const sliceData = {
        sourceId: targetSource.id,
        selectionData: {
          ...selectionData,
          sourceWidth: targetSource.thumbnail.getSize().width,
          sourceHeight: targetSource.thumbnail.getSize().height
        },
        windowInfo: {
          name: targetSource.name,
          id: targetSource.id
        }
      };
      
      console.log('准备发送的切片数据:', sliceData);
      
      // 立即显示窗口，然后发送数据
      sliceWindow.show();
      console.log('切片窗口已显示，窗口位置:', sliceWindow.getPosition());
      console.log('切片窗口尺寸:', sliceWindow.getSize());
      
      // 延迟发送数据，确保渲染进程已完全准备好
      setTimeout(() => {
        sliceWindow.webContents.send('slice-data', sliceData);
        console.log('切片数据已发送');
      }, 500);
    });
    
    // 添加错误处理
    sliceWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('切片窗口加载失败:', errorCode, errorDescription);
    });
    
    // 添加控制台消息监听
    sliceWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[切片窗口控制台] ${message}`);
    });
    
    // 添加窗口显示事件监听
    sliceWindow.on('show', () => {
      console.log('切片窗口显示事件触发');
    });
    
    sliceWindow.on('ready-to-show', () => {
      console.log('切片窗口准备显示');
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

// 新增：移动窗口
ipcMain.handle('move-window', (event, deltaX, deltaY) => {
  try {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      const [currentX, currentY] = window.getPosition();
      window.setPosition(currentX + deltaX, currentY + deltaY);
      return { success: true };
    }
    return { success: false, error: '未找到窗口' };
  } catch (error) {
    console.error('移动窗口失败:', error);
    return { success: false, error: error.message };
  }
});

// 开发模式下的热重载
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '../../node_modules', '.bin', 'electron'),
    forceHardReset: true,
    hardResetMethod: 'exit'
  });
}
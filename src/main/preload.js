const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 Electron API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 获取窗口列表
    getWindows: () => ipcRenderer.invoke('get-windows'),
    
    // 获取屏幕列表
    getScreens: () => ipcRenderer.invoke('get-screens'),
    
    // 开始捕获流程
    startCapture: (windowId) => ipcRenderer.invoke('start-capture', windowId),
    
    // 完成选择
    completeSelection: (selectionData) => ipcRenderer.invoke('complete-selection', selectionData),
    
    // 取消选择
    cancelSelection: () => ipcRenderer.invoke('cancel-selection'),
    
    // 获取应用信息
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppName: () => ipcRenderer.invoke('get-app-name'),
    
    // 移动窗口
    moveWindow: (deltaX, deltaY) => ipcRenderer.invoke('move-window', deltaX, deltaY),
    
    // 监听切片数据
    onSliceData: (callback) => {
        ipcRenderer.on('slice-data', (event, data) => callback(data));
    },
    
    // 监听目标窗口数据
    onTargetWindowData: (callback) => {
        ipcRenderer.on('target-window-data', (event, data) => callback(data));
    },
    
    // 监听目标窗口错误
    onTargetWindowError: (callback) => {
        ipcRenderer.on('target-window-error', (event, error) => callback(error));
    }
});

// 暴露工具函数
contextBridge.exposeInMainWorld('utils', {
    // 格式化文件大小
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // 防抖函数
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
});
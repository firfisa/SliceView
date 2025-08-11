/**
 * 窗口管理器
 * 负责管理窗口列表、选择和状态
 */

class WindowManager {
    constructor() {
        this.windows = [];
        this.screens = [];
        this.selectedWindow = null;
        this.selectedScreen = null;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        console.log('窗口管理器初始化');
    }

    async refreshWindows() {
        try {
            console.log('WindowManager: 开始刷新窗口列表...');
            this.isLoading = true;
            const windows = await window.electronAPI.getWindows();
            console.log('WindowManager: 获取到窗口数量:', windows.length);
            this.windows = windows;
            this.isLoading = false;
            return this.windows;
        } catch (error) {
            console.error('WindowManager: 刷新窗口列表失败:', error);
            this.isLoading = false;
            throw error;
        }
    }

    async refreshScreens() {
        try {
            console.log('WindowManager: 开始刷新屏幕列表...');
            this.isLoading = true;
            const screens = await window.electronAPI.getScreens();
            console.log('WindowManager: 获取到屏幕数量:', screens.length);
            this.screens = screens;
            this.isLoading = false;
            return this.screens;
        } catch (error) {
            console.error('WindowManager: 刷新屏幕列表失败:', error);
            this.isLoading = false;
            throw error;
        }
    }

    selectWindow(windowId) {
        this.selectedWindow = this.windows.find(w => w.id === windowId);
        return this.selectedWindow;
    }

    selectScreen(screenId) {
        this.selectedScreen = this.screens.find(s => s.id === screenId);
        return this.selectedScreen;
    }

    getSelectedWindow() {
        return this.selectedWindow;
    }

    getSelectedScreen() {
        return this.selectedScreen;
    }

    clearSelection() {
        this.selectedWindow = null;
        this.selectedScreen = null;
    }

    getWindowById(windowId) {
        return this.windows.find(w => w.id === windowId);
    }

    getScreenById(screenId) {
        return this.screens.find(s => s.id === screenId);
    }

    getWindowCount() {
        return this.windows.length;
    }

    getScreenCount() {
        return this.screens.length;
    }

    isLoading() {
        return this.isLoading;
    }
} 
/**
 * SliceView 主应用文件
 * 负责初始化应用和管理整体逻辑
 */

class SliceViewApp {
    constructor() {
        this.windowManager = null;
        this.selectionTool = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('正在初始化 SliceView 应用...');
            
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupApp());
            } else {
                this.setupApp();
            }
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('应用初始化失败', error.message);
        }
    }

    setupApp() {
        try {
            // 初始化各个管理器
            this.windowManager = new WindowManager();
            this.selectionTool = new SelectionTool();
            this.uiManager = new UIManager();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 初始化应用状态
            this.initializeAppState();
            
            // 加载窗口列表
            this.loadWindowList();
            
            this.isInitialized = true;
            console.log('SliceView 应用初始化完成');
            
            // 更新状态栏
            this.updateStatus('就绪');
            
        } catch (error) {
            console.error('应用设置失败:', error);
            this.showError('应用设置失败', error.message);
        }
    }

    setupEventListeners() {
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefresh());
        }

        // 捕获按钮
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.handleCapture());
        }

        // 标签页切换
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTabSwitch(e));
        });

        // 缩放控制按钮
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetZoomBtn = document.getElementById('resetZoomBtn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.handleZoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.handleZoomOut());
        }
        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', () => this.handleResetZoom());
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // 窗口大小变化
        window.addEventListener('resize', () => this.handleWindowResize());
    }

    async initializeAppState() {
        try {
            // 获取应用信息
            const appName = await window.electronAPI.getAppName();
            const appVersion = await window.electronAPI.getAppVersion();
            
            // 更新应用版本显示
            const versionElement = document.getElementById('appVersion');
            if (versionElement) {
                versionElement.textContent = `v${appVersion}`;
            }
            
            // 设置页面标题
            document.title = `${appName} - 窗口区域选择工具`;
            
            // 初始化内存监控
            this.startMemoryMonitoring();
            
        } catch (error) {
            console.error('初始化应用状态失败:', error);
        }
    }

    async loadWindowList() {
        try {
            console.log('SliceViewApp: 开始加载窗口列表...');
            this.updateStatus('正在加载窗口列表...');
            
            // 显示加载状态
            const windowList = document.getElementById('windowList');
            if (windowList) {
                windowList.innerHTML = `
                    <div class="loading-placeholder">
                        <div class="spinner"></div>
                        <p>正在加载窗口列表...</p>
                    </div>
                `;
            }
            
            // 使用WindowManager获取窗口列表
            console.log('SliceViewApp: 调用WindowManager.refreshWindows()...');
            const windows = await this.windowManager.refreshWindows();
            console.log('SliceViewApp: 从WindowManager获取到窗口数量:', windows.length);
            
            if (windows.length === 0) {
                console.log('SliceViewApp: 没有找到窗口，显示空状态');
                this.showEmptyWindowList();
            } else {
                console.log('SliceViewApp: 开始渲染窗口列表...');
                this.renderWindowList(windows);
            }
            
            this.updateStatus('就绪');
            
        } catch (error) {
            console.error('SliceViewApp: 加载窗口列表失败:', error);
            this.showError('加载窗口列表失败', error.message);
            this.updateStatus('加载失败');
        }
    }

    renderWindowList(windows) {
        const windowList = document.getElementById('windowList');
        if (!windowList) return;

        windowList.innerHTML = windows.map((window, index) => `
            <div class="window-item" data-window-id="${window.id}" data-index="${index}">
                <img src="${window.thumbnail}" alt="${window.name}" class="window-thumbnail">
                <div class="window-info">
                    <div class="window-name">${window.name}</div>
                    <div class="window-details">窗口 ID: ${window.id}</div>
                </div>
            </div>
        `).join('');

        // 添加点击事件
        const windowItems = windowList.querySelectorAll('.window-item');
        windowItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleWindowSelect(e));
        });
    }

    showEmptyWindowList() {
        const windowList = document.getElementById('windowList');
        if (windowList) {
            windowList.innerHTML = `
                <div class="empty-placeholder">
                    <p>未找到可用窗口</p>
                    <small>请确保有应用程序正在运行</small>
                </div>
            `;
        }
    }

    handleWindowSelect(event) {
        const windowItem = event.currentTarget;
        const windowId = windowItem.dataset.windowId;
        
        // 移除其他选中状态
        document.querySelectorAll('.window-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 添加选中状态
        windowItem.classList.add('selected');
        
        // 更新预览区域
        this.updatePreviewArea(windowId);
        
        // 启用捕获按钮
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.disabled = false;
        }
    }

    updatePreviewArea(windowId) {
        const previewContainer = document.getElementById('previewContainer');
        if (!previewContainer) return;

        previewContainer.innerHTML = `
            <div class="preview-placeholder">
                <div class="placeholder-icon">🎯</div>
                <h3>已选择窗口</h3>
                <p>窗口 ID: ${windowId}</p>
                <p>点击"开始捕获"按钮开始选择区域</p>
            </div>
        `;
    }

    handleTabSwitch(event) {
        const clickedTab = event.currentTarget;
        const tabType = clickedTab.dataset.tab;
        
        // 更新标签页状态
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');
        
        // 根据标签页类型加载不同内容
        if (tabType === 'windows') {
            this.loadWindowList();
        } else if (tabType === 'screens') {
            this.loadScreenList();
        }
    }

    async loadScreenList() {
        try {
            console.log('SliceViewApp: 开始加载屏幕列表...');
            this.updateStatus('正在加载屏幕列表...');
            
            const screenList = document.getElementById('windowList');
            if (screenList) {
                screenList.innerHTML = `
                    <div class="loading-placeholder">
                        <div class="spinner"></div>
                        <p>正在加载屏幕列表...</p>
                    </div>
                `;
            }
            
            console.log('SliceViewApp: 调用WindowManager.refreshScreens()...');
            const screens = await this.windowManager.refreshScreens();
            console.log('SliceViewApp: 从WindowManager获取到屏幕数量:', screens.length);
            
            if (screens.length === 0) {
                console.log('SliceViewApp: 没有找到屏幕，显示空状态');
                screenList.innerHTML = `
                    <div class="empty-placeholder">
                        <p>未找到可用屏幕</p>
                        <small>请检查显示器连接</small>
                    </div>
                `;
            } else {
                console.log('SliceViewApp: 开始渲染屏幕列表...');
                this.renderScreenList(screens);
            }
            
            this.updateStatus('就绪');
            
        } catch (error) {
            console.error('SliceViewApp: 加载屏幕列表失败:', error);
            this.showError('加载屏幕列表失败', error.message);
        }
    }

    renderScreenList(screens) {
        const screenList = document.getElementById('windowList');
        if (!screenList) return;

        screenList.innerHTML = screens.map((screen, index) => `
            <div class="window-item" data-screen-id="${screen.id}" data-index="${index}">
                <img src="${screen.thumbnail}" alt="${screen.name}" class="window-thumbnail">
                <div class="window-info">
                    <div class="window-name">${screen.name}</div>
                    <div class="window-details">屏幕 ID: ${screen.id}</div>
                </div>
            </div>
        `).join('');

        // 添加点击事件
        const screenItems = screenList.querySelectorAll('.window-item');
        screenItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleScreenSelect(e));
        });
    }

    handleScreenSelect(event) {
        const screenItem = event.currentTarget;
        const screenId = screenItem.dataset.screenId;
        
        // 移除其他选中状态
        document.querySelectorAll('.window-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 添加选中状态
        screenItem.classList.add('selected');
        
        // 更新预览区域
        this.updatePreviewArea(screenId);
        
        // 启用捕获按钮
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.disabled = false;
        }
    }

    handleRefresh() {
        this.loadWindowList();
        this.showNotification('已刷新窗口列表', 'success');
    }

    handleCapture() {
        const selectedWindow = document.querySelector('.window-item.selected');
        if (!selectedWindow) {
            this.showNotification('请先选择一个窗口或屏幕', 'warning');
            return;
        }

        const windowId = selectedWindow.dataset.windowId || selectedWindow.dataset.screenId;
        if (!windowId) {
            this.showNotification('无法获取窗口ID', 'error');
            return;
        }

        // 调用主进程开始捕获流程
        this.startCaptureProcess(windowId);
    }

    async startCaptureProcess(windowId) {
        try {
            this.updateStatus('正在启动捕获流程...');
            console.log('开始捕获流程，窗口ID:', windowId);
            
            const result = await window.electronAPI.startCapture(windowId);
            
            if (result.success) {
                console.log('捕获流程启动成功:', result.message);
                this.updateStatus('捕获流程已启动');
            } else {
                console.error('捕获流程启动失败:', result.error);
                this.showError('捕获失败', result.error);
                this.updateStatus('捕获失败');
            }
        } catch (error) {
            console.error('启动捕获流程时发生错误:', error);
            this.showError('捕获失败', error.message);
            this.updateStatus('捕获失败');
        }
    }

    handleZoomIn() {
        // 实现放大功能
        console.log('放大预览');
    }

    handleZoomOut() {
        // 实现缩小功能
        console.log('缩小预览');
    }

    handleResetZoom() {
        // 实现重置缩放功能
        console.log('重置缩放');
    }

    handleKeyboardShortcuts(event) {
        // Ctrl + R: 刷新
        if (event.ctrlKey && event.key === 'r') {
            event.preventDefault();
            this.handleRefresh();
        }
        
        // Ctrl + S: 开始捕获
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            this.handleCapture();
        }
        
        // Escape: 取消选择
        if (event.key === 'Escape') {
            this.selectionTool?.cancelSelection();
        }
    }

    handleWindowResize() {
        // 处理窗口大小变化
        console.log('窗口大小已变化');
    }

    updateStatus(message) {
        const statusElement = document.querySelector('.status-left .status-item');
        if (statusElement) {
            statusElement.innerHTML = `
                <span class="status-icon">📊</span>
                ${message}
            `;
        }
    }

    startMemoryMonitoring() {
        // 简单的内存监控（实际应用中可以使用更精确的方法）
        setInterval(() => {
            if (performance.memory) {
                const memoryUsage = window.utils.formatFileSize(performance.memory.usedJSHeapSize);
                const memoryElement = document.getElementById('memoryUsage');
                if (memoryElement) {
                    memoryElement.textContent = memoryUsage;
                }
            }
        }, 5000);
    }

    showNotification(message, type = 'info') {
        if (this.uiManager) {
            this.uiManager.showNotification(message, type);
        }
    }

    showError(title, message) {
        console.error(title, message);
        this.showNotification(message, 'error');
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    window.sliceViewApp = new SliceViewApp();
});

// 导出应用类（用于测试）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SliceViewApp;
} 
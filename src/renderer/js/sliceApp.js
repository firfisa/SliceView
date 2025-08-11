/**
 * 切片页面应用 - 重构版
 * 专注于内容显示，移除内容拖拽功能，增加窗口拖拽功能
 */

class SliceApp {
    constructor() {
        this.isPinned = false;
        this.sliceData = null;
        this.videoElement = null;
        this.captureStream = null;
        this.windowDragManager = null;
        
        console.log('SliceApp构造函数执行');
        
        // 立即初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            console.log('切片应用开始初始化');
            
            // 首先设置IPC监听器
            this.setupIPCListeners();
            
            // 初始化切片信息
            this.initializeSliceInfo();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 设置窗口拖拽管理器
            this.setupWindowDragManager();
            
            // 显示等待状态
            this.displaySliceContent(`
                <div class="slice-waiting">
                    <div class="waiting-icon">⏳</div>
                    <div class="waiting-text">等待切片数据...</div>
                    <div class="waiting-hint">请在主窗口中选择要捕获的区域</div>
                </div>
            `);
            
            console.log('切片应用初始化完成');
        } catch (error) {
            console.error('切片应用初始化失败:', error);
            this.showError('应用初始化失败', error.message);
        }
    }

    setupApp() {
        // 这个方法现在不再需要，逻辑已合并到init中
        console.log('setupApp方法已废弃，使用init方法');
    }

    setupEventListeners() {
        // 控制按钮事件
        const pinBtn = document.getElementById('pinBtn');
        const closeBtn = document.getElementById('closeBtn');
        const resetBtn = document.getElementById('resetBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        
        if (pinBtn) {
            pinBtn.addEventListener('click', () => this.handlePin());
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.handleClose());
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefresh());
        }
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // 移除窗口大小变化监听器，因为切片窗口不应该改变大小
        // window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    setupWindowDragManager() {
        this.windowDragManager = new WindowDragManager();
    }
    
    setupIPCListeners() {
        console.log('开始设置IPC监听器');
        
        if (window.electronAPI) {
            console.log('electronAPI可用，设置slice-data监听器');
            
            window.electronAPI.onSliceData((data) => {
                console.log('收到slice-data事件:', data);
                this.handleSliceData(data);
            });
            
            console.log('IPC监听器设置完成');
        } else {
            console.error('electronAPI不可用，无法设置IPC监听器');
        }
    }

    initializeSliceInfo() {
        this.sliceData = {
            width: 800,  // 增加默认尺寸
            height: 600,
            x: 100,
            y: 100
        };
    }

    handlePin() {
        this.isPinned = !this.isPinned;
        const container = document.querySelector('.slice-container');
        const pinBtn = document.getElementById('pinBtn');
        
        if (this.isPinned) {
            container.classList.add('pinned');
            console.log('切片窗口已固定位置');
        } else {
            container.classList.remove('pinned');
            console.log('切片窗口已取消固定位置');
        }
    }

    handleClose() {
        console.log('关闭切片窗口');
        this.cleanup();
        window.close();
    }

    handleReset() {
        console.log('重置切片缩放');
        
        if (this.videoElement) {
            // 重置视频缩放
            this.videoElement.style.transform = '';
            this.videoElement.style.objectFit = 'contain';
        }
        
        this.showNotification('缩放已重置', 'info');
    }
    
    handleRefresh() {
        console.log('刷新切片内容');
        
        if (this.videoElement) {
            // 重置视频状态
            this.videoElement.style.transform = '';
            this.videoElement.style.objectFit = 'contain';
        }
        
        this.showNotification('内容已刷新', 'info');
    }

    handleKeyboardShortcuts(event) {
        switch (event.key) {
            case 'Escape':
                this.handleClose();
                break;
            case 'Home':
                this.handleReset();
                break;
            case 'F5':
                this.handleRefresh();
                break;
            case 'p':
            case 'P':
                if (event.ctrlKey) {
                    this.handlePin();
                }
                break;
        }
    }

    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    showError(title, message) {
        console.error(title, message);
        this.showNotification(message, 'error');
    }

    setSliceData(data) {
        this.sliceData = data;
        console.log('切片数据已更新:', data);
    }

    displaySliceContent(content) {
        const sliceDisplay = document.getElementById('sliceDisplay');
        if (!sliceDisplay) {
            console.error('找不到sliceDisplay元素');
            return;
        }
        
        console.log('开始显示切片内容:', content);
        
        sliceDisplay.innerHTML = '';
        
        if (typeof content === 'string') {
            sliceDisplay.innerHTML = content;
            console.log('已显示字符串内容');
        } else if (content instanceof HTMLElement) {
            sliceDisplay.appendChild(content);
            console.log('已显示HTML元素内容:', content.tagName);
        }
        
        if (sliceDisplay.children.length > 0) {
            console.log('内容已成功添加到sliceDisplay，子元素数量:', sliceDisplay.children.length);
        } else {
            console.warn('内容可能未正确添加到sliceDisplay');
        }
    }
    
    async handleSliceData(data) {
        try {
            console.log('处理切片数据:', data);
            
            this.sliceData = {
                ...this.sliceData,
                ...data.selectionData,
                sourceId: data.sourceId,
                windowName: data.windowInfo.name
            };
            
            await this.startContentCapture(data);
            
        } catch (error) {
            console.error('处理切片数据失败:', error);
            this.showError('处理失败', error.message);
        }
    }
    
    async startContentCapture(data) {
        try {
            console.log('开始捕获内容，源ID:', data.sourceId);
            console.log('选择区域数据:', data.selectionData);
            
            if (!data.sourceId) {
                throw new Error('缺少源ID');
            }
            
            if (!data.selectionData) {
                throw new Error('缺少选择区域数据');
            }
            
            // 获取桌面捕获流 - 移除高分辨率约束，避免显示问题
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: data.sourceId
                    }
                }
            });
            
            console.log('成功获取媒体流:', stream);
            
            // 创建视频元素
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            
            // 创建容器用于裁剪
            const container = document.createElement('div');
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.overflow = 'hidden';
            container.style.position = 'relative';
            container.style.background = '#000';
            
            // 等待视频元数据加载完成后进行裁剪设置
            video.addEventListener('loadedmetadata', () => {
                console.log('视频元数据已加载，尺寸:', video.videoWidth, 'x', video.videoHeight);
                
                const selection = data.selectionData;
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                
                console.log('选择区域:', { x: selection.x, y: selection.y, width: selection.width, height: selection.height });
                console.log('视频原始尺寸:', { width: videoWidth, height: videoHeight });
                
                // 设置容器尺寸为选择区域的尺寸
                container.style.width = `${selection.width}px`;
                container.style.height = `${selection.height}px`;
                
                // 关键修正：重新计算视频定位
                // 1. 设置视频为原始尺寸
                video.style.width = `${videoWidth}px`;
                video.style.height = `${videoHeight}px`;
                video.style.position = 'absolute';
                video.style.objectFit = 'none';
                
                // 2. 计算正确的偏移量
                // 由于选择坐标是相对于选择窗口的，需要转换为视频坐标
                // 视频流是完整的窗口/屏幕内容，所以偏移量就是选择坐标的负值
                const offsetX = -selection.x;
                const offsetY = -selection.y;
                
                video.style.left = `${offsetX}px`;
                video.style.top = `${offsetY}px`;
                
                console.log('视频设置完成');
                console.log('视频尺寸:', `${videoWidth}px x ${videoHeight}px`);
                console.log('视频偏移:', `${offsetX}px, ${offsetY}px`);
                console.log('容器尺寸:', `${selection.width}px x ${selection.height}px`);
                
                // 确保容器样式正确
                container.style.overflow = 'hidden';
                container.style.position = 'relative';
                container.style.background = '#000';
            });
            
            video.addEventListener('canplay', () => {
                console.log('视频可以开始播放');
            });
            
            video.addEventListener('error', (e) => {
                console.error('视频播放错误:', e);
            });
            
            // 将视频添加到容器
            container.appendChild(video);
            
            // 显示捕获的内容
            this.displaySliceContent(container);
            
            // 存储引用
            this.videoElement = video;
            this.captureStream = stream;
            
            console.log('内容捕获完成');
            this.showNotification('内容捕获成功', 'success');
            
        } catch (error) {
            console.error('内容捕获失败:', error);
            this.showError('捕获失败', error.message);
            
            this.displaySliceContent(`
                <div class="slice-error">
                    <span class="error-icon">❌</span>
                    <span class="error-text">内容捕获失败: ${error.message}</span>
                </div>
            `);
        }
    }
    
    // 清理资源
    cleanup() {
        if (this.captureStream) {
            this.captureStream.getTracks().forEach(track => track.stop());
            this.captureStream = null;
        }
        
        if (this.windowDragManager) {
            this.windowDragManager.cleanup();
            this.windowDragManager = null;
        }
        
        this.videoElement = null;
    }
}

// 窗口拖拽管理器
class WindowDragManager {
    constructor() {
        this.isDragging = false;
        this.isRightMouseDown = false;
        this.dragStartTime = 0;
        this.dragThreshold = 300; // 右键长按阈值（毫秒）
        this.dragTimer = null;
        this.lastMousePos = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        // 绑定事件处理器
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        
        // 添加事件监听器
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('contextmenu', this.handleContextMenu);
        
        console.log('窗口拖拽管理器已初始化');
    }
    
    handleMouseDown(event) {
        if (event.button === 2) { // 右键
            this.isRightMouseDown = true;
            this.dragStartTime = Date.now();
            this.lastMousePos = { x: event.screenX, y: event.screenY };
            
            // 设置长按计时器
            this.dragTimer = setTimeout(() => {
                if (this.isRightMouseDown) {
                    this.startWindowDrag();
                }
            }, this.dragThreshold);
            
            event.preventDefault();
            event.stopPropagation(); // 阻止事件传播到其他元素
        }
    }
    
    handleMouseMove(event) {
        if (this.isDragging) {
            const deltaX = event.screenX - this.lastMousePos.x;
            const deltaY = event.screenY - this.lastMousePos.y;
            
            // 通知主进程移动窗口
            if (window.electronAPI && window.electronAPI.moveWindow) {
                window.electronAPI.moveWindow(deltaX, deltaY);
            }
            
            this.lastMousePos = { x: event.screenX, y: event.screenY };
            event.preventDefault();
            event.stopPropagation(); // 阻止事件冒泡，防止影响视频元素
        }
    }
    
    handleMouseUp(event) {
        if (event.button === 2) { // 右键释放
            this.isRightMouseDown = false;
            
            if (this.dragTimer) {
                clearTimeout(this.dragTimer);
                this.dragTimer = null;
            }
            
            if (this.isDragging) {
                this.stopWindowDrag();
            }
            
            event.preventDefault();
            event.stopPropagation(); // 阻止事件传播到其他元素
        }
    }
    
    handleContextMenu(event) {
        // 阻止右键菜单
        event.preventDefault();
        event.stopPropagation(); // 阻止事件传播到其他元素
    }
    
    startWindowDrag() {
        this.isDragging = true;
        document.body.style.cursor = 'move';
        
        // 显示拖拽指示器
        const indicator = document.getElementById('dragIndicator');
        if (indicator) {
            indicator.classList.add('show');
        }
        
        console.log('开始窗口拖拽模式');
    }
    
    stopWindowDrag() {
        this.isDragging = false;
        document.body.style.cursor = 'default';
        
        // 隐藏拖拽指示器
        const indicator = document.getElementById('dragIndicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
        
        console.log('结束窗口拖拽模式');
    }
    
    cleanup() {
        // 清理计时器
        if (this.dragTimer) {
            clearTimeout(this.dragTimer);
            this.dragTimer = null;
        }
        
        // 移除事件监听器
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('contextmenu', this.handleContextMenu);
        
        // 重置状态
        this.isDragging = false;
        this.isRightMouseDown = false;
        document.body.style.cursor = 'default';
        
        const indicator = document.getElementById('dragIndicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
        
        console.log('窗口拖拽管理器已清理');
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    window.sliceApp = new SliceApp();
});

// InteractionManager类已移除，避免与窗口拖拽功能冲突

// 导出应用类（用于测试）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SliceApp;
}
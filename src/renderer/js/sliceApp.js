/**
 * 切片页面应用
 * 负责管理切片窗口的交互和显示
 */

class SliceApp {
    constructor() {
        this.isPinned = false;
        this.isMinimized = false;
        this.isFullscreen = false;
        this.sliceData = null;
        this.interactionManager = null; // 交互管理器
        this.videoElement = null; // 视频元素引用
        
        this.init();
    }

    init() {
        console.log('切片应用初始化');
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
        
        // 立即设置IPC监听器，以防主进程在DOM加载完成前就发送数据
        this.setupIPCListeners();
    }

    setupApp() {
        try {
            // 设置事件监听器
            this.setupEventListeners();
            
            // 初始化切片信息
            this.initializeSliceInfo();
            
            console.log('切片应用设置完成');
            
        } catch (error) {
            console.error('切片应用设置失败:', error);
            this.showError('应用设置失败', error.message);
        }
    }

    setupEventListeners() {
        // 控制按钮事件
        const pinBtn = document.getElementById('pinBtn');
        const minimizeBtn = document.getElementById('minimizeBtn');
        const closeBtn = document.getElementById('closeBtn');
        const resetBtn = document.getElementById('resetBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        if (pinBtn) {
            pinBtn.addEventListener('click', () => this.handlePin());
        }
        
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.handleMinimize());
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
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.handleFullscreen());
        }
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // 窗口大小变化
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    setupIPCListeners() {
        // 监听来自主进程的切片数据
        if (window.electronAPI) {
            window.electronAPI.onSliceData((data) => {
                console.log('收到切片数据:', data);
                this.handleSliceData(data);
            });
        }
    }

    initializeSliceInfo() {
        // 这里可以从URL参数或其他方式获取切片数据
        // 暂时使用默认值
        this.sliceData = {
            width: 400,
            height: 300,
            x: 100,
            y: 100
        };
        
        this.updateSliceInfo();
    }

    updateSliceInfo() {
        const sizeInfo = document.getElementById('sizeInfo');
        const positionInfo = document.getElementById('positionInfo');
        
        if (sizeInfo && this.sliceData) {
            sizeInfo.textContent = `${this.sliceData.width} x ${this.sliceData.height}`;
        }
        
        if (positionInfo && this.sliceData) {
            positionInfo.textContent = `(${this.sliceData.x}, ${this.sliceData.y})`;
        }
    }

    handlePin() {
        this.isPinned = !this.isPinned;
        const container = document.querySelector('.slice-container');
        const pinBtn = document.getElementById('pinBtn');
        
        if (this.isPinned) {
            container.classList.add('pinned');
            pinBtn.style.background = 'rgba(255, 255, 255, 0.4)';
            console.log('切片窗口已固定位置');
        } else {
            container.classList.remove('pinned');
            pinBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            console.log('切片窗口已取消固定位置');
        }
    }

    handleMinimize() {
        this.isMinimized = !this.isMinimized;
        const container = document.querySelector('.slice-container');
        const minimizeBtn = document.getElementById('minimizeBtn');
        
        if (this.isMinimized) {
            container.classList.add('minimized');
            minimizeBtn.style.background = 'rgba(255, 255, 255, 0.4)';
            console.log('切片窗口已最小化');
        } else {
            container.classList.remove('minimized');
            minimizeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            console.log('切片窗口已恢复');
        }
    }

    handleClose() {
        console.log('关闭切片窗口');
        // 这里可以添加关闭前的确认逻辑
        window.close();
    }

    handleReset() {
        console.log('重置切片位置');
        
        // 重置交互变换
        if (this.interactionManager) {
            this.interactionManager.resetTransform();
        }
        
        this.showNotification('位置已重置', 'info');
    }
    
    handleRefresh() {
        console.log('刷新切片内容');
        
        // 重置交互变换
        if (this.interactionManager) {
            this.interactionManager.resetTransform();
        }
        
        // 这里可以实现刷新内容的逻辑
        this.showNotification('内容已刷新', 'info');
    }

    handleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        const container = document.querySelector('.slice-container');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        if (this.isFullscreen) {
            container.classList.add('fullscreen');
            fullscreenBtn.style.background = '#dee2e6';
            fullscreenBtn.style.color = '#495057';
            console.log('切片窗口已全屏显示');
        } else {
            container.classList.remove('fullscreen');
            fullscreenBtn.style.background = '#e9ecef';
            fullscreenBtn.style.color = '#6c757d';
            console.log('切片窗口已退出全屏');
        }
    }

    handleKeyboardShortcuts(event) {
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                if (this.isFullscreen) {
                    this.handleFullscreen();
                }
                break;
            case 'F11':
                event.preventDefault();
                this.handleFullscreen();
                break;
            case 'F5':
                event.preventDefault();
                this.handleRefresh();
                break;
            case 'Home':
                event.preventDefault();
                this.handleReset();
                break;
        }
    }

    handleWindowResize() {
        console.log('切片窗口大小已变化');
        // 可以在这里添加窗口大小变化的处理逻辑
    }

    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        // 可以在这里添加通知UI
        // 暂时使用简单的alert
        if (type === 'error') {
            alert(`错误: ${message}`);
        } else {
            console.log(`通知: ${message}`);
        }
    }

    showError(title, message) {
        console.error(title, message);
        this.showNotification(message, 'error');
    }

    // 设置切片数据
    setSliceData(data) {
        this.sliceData = data;
        this.updateSliceInfo();
        console.log('切片数据已更新:', data);
    }

    // 显示切片内容
    displaySliceContent(content) {
        const sliceDisplay = document.getElementById('sliceDisplay');
        if (!sliceDisplay) {
            console.error('找不到sliceDisplay元素');
            return;
        }
        
        console.log('开始显示切片内容:', content);
        
        // 清除占位符
        sliceDisplay.innerHTML = '';
        
        // 添加内容
        if (typeof content === 'string') {
            sliceDisplay.innerHTML = content;
            console.log('已显示字符串内容');
        } else if (content instanceof HTMLElement) {
            sliceDisplay.appendChild(content);
            console.log('已显示HTML元素内容:', content.tagName);
        } else {
            // 如果是图片数据或其他类型，可以在这里处理
            console.log('显示切片内容:', content);
        }
        
        // 验证内容是否已添加
        if (sliceDisplay.children.length > 0) {
            console.log('内容已成功添加到sliceDisplay，子元素数量:', sliceDisplay.children.length);
        } else {
            console.warn('内容可能未正确添加到sliceDisplay');
        }
    }
    
    async handleSliceData(data) {
        try {
            console.log('处理切片数据:', data);
            
            // 更新切片信息
            this.sliceData = {
                ...this.sliceData,
                ...data.selectionData,
                sourceId: data.sourceId,
                windowName: data.windowInfo.name
            };
            
            this.updateSliceInfo();
            
            // 开始捕获内容
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
            
            // 检查必要的参数
            if (!data.sourceId) {
                throw new Error('缺少源ID');
            }
            
            if (!data.selectionData) {
                throw new Error('缺少选择区域数据');
            }
            
            // 获取桌面捕获流
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
            
            // 创建视频元素显示捕获的内容
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            
            // 设置视频元素的样式，确保它正确显示
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            
            // 添加视频事件监听器
            video.addEventListener('loadedmetadata', () => {
                console.log('视频元数据已加载，尺寸:', video.videoWidth, 'x', video.videoHeight);
                // 视频元数据加载完成后设置交互功能
                this.setupInteraction(video, data);
            });
            
            video.addEventListener('canplay', () => {
                console.log('视频可以开始播放');
            });
            
            video.addEventListener('error', (e) => {
                console.error('视频播放错误:', e);
            });
            
            // 显示捕获的内容
            this.displaySliceContent(video);
            
            // 存储视频元素引用
            this.videoElement = video;
            
            // 存储流引用以便后续管理
            this.captureStream = stream;
            
            console.log('内容捕获完成');
            this.showNotification('内容捕获成功', 'success');
            
        } catch (error) {
            console.error('内容捕获失败:', error);
            this.showError('捕获失败', error.message);
            
            // 显示错误占位符
            this.displaySliceContent(`
                <div class="slice-error">
                    <span class="error-icon">❌</span>
                    <span class="error-text">内容捕获失败: ${error.message}</span>
                </div>
            `);
        }
    }
    
    // 设置交互功能
    setupInteraction(video, data) {
        try {
            console.log('设置交互功能');
            
            // 创建交互管理器
            this.interactionManager = new InteractionManager(video, data.selectionData);
            
            // 启用交互
            this.interactionManager.enable();
            
            console.log('交互功能已启用');
            
        } catch (error) {
            console.error('设置交互功能失败:', error);
        }
    }
    
    // 清理资源
    cleanup() {
        if (this.captureStream) {
            this.captureStream.getTracks().forEach(track => track.stop());
            this.captureStream = null;
        }
        
        if (this.interactionManager) {
            this.interactionManager.disable();
            this.interactionManager = null;
        }
        
        this.videoElement = null;
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    window.sliceApp = new SliceApp();
});

// 交互管理器类
class InteractionManager {
    constructor(videoElement, selectionData) {
        this.video = videoElement;
        this.selectionData = selectionData;
        this.isEnabled = false;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.scrollOffset = { x: 0, y: 0 };
        
        // 绑定方法到实例
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleDoubleClick = this.handleDoubleClick.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
    }
    
    enable() {
        if (this.isEnabled) return;
        
        console.log('启用交互管理器');
        
        // 添加事件监听器
        this.video.addEventListener('mousedown', this.handleMouseDown);
        this.video.addEventListener('mousemove', this.handleMouseMove);
        this.video.addEventListener('mouseup', this.handleMouseUp);
        this.video.addEventListener('wheel', this.handleWheel);
        this.video.addEventListener('click', this.handleClick);
        this.video.addEventListener('dblclick', this.handleDoubleClick);
        this.video.addEventListener('contextmenu', this.handleContextMenu);
        
        // 设置视频元素样式以支持交互
        this.video.style.pointerEvents = 'auto';
        this.video.classList.add('interactive');
        
        this.isEnabled = true;
        console.log('交互管理器已启用');
    }
    
    disable() {
        if (!this.isEnabled) return;
        
        console.log('禁用交互管理器');
        
        // 移除事件监听器
        this.video.removeEventListener('mousedown', this.handleMouseDown);
        this.video.removeEventListener('mousemove', this.handleMouseMove);
        this.video.removeEventListener('mouseup', this.handleMouseUp);
        this.video.removeEventListener('wheel', this.handleWheel);
        this.video.removeEventListener('click', this.handleClick);
        this.video.removeEventListener('dblclick', this.handleDoubleClick);
        this.video.removeEventListener('contextmenu', this.handleContextMenu);
        
        // 恢复视频元素样式
        this.video.style.pointerEvents = 'none';
        this.video.classList.remove('interactive', 'dragging');
        
        this.isEnabled = false;
        console.log('交互管理器已禁用');
    }
    
    // 处理鼠标按下事件
    handleMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
        
        this.isDragging = true;
        this.lastMousePos = { x: event.clientX, y: event.clientY };
        
        // 添加拖拽状态样式
        this.video.classList.add('dragging');
        
        console.log('鼠标按下:', event.clientX, event.clientY);
    }
    
    // 处理鼠标移动事件
    handleMouseMove(event) {
        if (!this.isDragging) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const deltaX = event.clientX - this.lastMousePos.x;
        const deltaY = event.clientY - this.lastMousePos.y;
        
        // 更新滚动偏移
        this.scrollOffset.x += deltaX;
        this.scrollOffset.y += deltaY;
        
        // 应用变换到视频元素
        this.applyTransform();
        
        this.lastMousePos = { x: event.clientX, y: event.clientY };
        
        console.log('鼠标移动:', deltaX, deltaY);
    }
    
    // 处理鼠标释放事件
    handleMouseUp(event) {
        if (!this.isDragging) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        this.isDragging = false;
        
        // 移除拖拽状态样式
        this.video.classList.remove('dragging');
        
        console.log('鼠标释放');
    }
    
    // 处理滚轮事件
    handleWheel(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const deltaX = event.deltaX || 0;
        const deltaY = event.deltaY || 0;
        
        // 根据滚轮方向更新滚动偏移
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // 水平滚动
            this.scrollOffset.x += deltaX * 0.5; // 调整滚动灵敏度
        } else {
            // 垂直滚动
            this.scrollOffset.y += deltaY * 0.5;
        }
        
        // 应用变换到视频元素
        this.applyTransform();
        
        console.log('滚轮事件:', deltaX, deltaY);
    }
    
    // 处理点击事件
    handleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // 计算相对于选择区域的坐标
        const rect = this.video.getBoundingClientRect();
        const relativeX = event.clientX - rect.left;
        const relativeY = event.clientY - rect.top;
        
        console.log('点击事件:', relativeX, relativeY);
        
        // 这里可以添加点击处理逻辑
        // 例如：模拟在原始窗口中的点击
    }
    
    // 处理双击事件
    handleDoubleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('双击事件');
        
        // 这里可以添加双击处理逻辑
    }
    
    // 处理右键菜单事件
    handleContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('右键菜单事件');
        
        // 这里可以添加右键菜单处理逻辑
    }
    
    // 应用变换到视频元素
    applyTransform() {
        const transform = `translate(${this.scrollOffset.x}px, ${this.scrollOffset.y}px)`;
        this.video.style.transform = transform;
        
        console.log('应用变换:', transform);
    }
    
    // 重置变换
    resetTransform() {
        this.scrollOffset = { x: 0, y: 0 };
        this.video.style.transform = '';
        console.log('重置变换');
    }
    
    // 获取当前变换状态
    getTransformState() {
        return {
            scrollOffset: { ...this.scrollOffset },
            isDragging: this.isDragging
        };
    }
}

// 导出应用类（用于测试）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SliceApp;
} 
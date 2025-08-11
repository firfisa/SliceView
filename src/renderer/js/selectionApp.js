/**
 * 选择工具页面应用
 * 负责管理区域选择流程和与主进程通信
 */

class SelectionApp {
    constructor() {
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.overlay = null;
        this.selectionBox = null;
        this.coordsDisplay = null;
        this.confirmBtn = null;
        this.cancelBtn = null;
        
        this.init();
    }

    init() {
        console.log('选择工具应用初始化');
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        try {
            // 获取DOM元素
            this.overlay = document.getElementById('selectionOverlay');
            this.selectionBox = document.getElementById('selectionBox');
            this.coordsDisplay = document.getElementById('selectionCoords');
            this.confirmBtn = document.getElementById('confirmBtn');
            this.cancelBtn = document.getElementById('cancelBtn');
            
            if (!this.overlay || !this.selectionBox || !this.coordsDisplay || !this.confirmBtn || !this.cancelBtn) {
                throw new Error('必要的DOM元素未找到');
            }
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 开始选择流程
            this.startSelection();
            
            console.log('选择工具应用设置完成');
            
        } catch (error) {
            console.error('选择工具应用设置失败:', error);
            this.showError('应用设置失败', error.message);
        }
    }

    setupEventListeners() {
        // 鼠标事件
        this.overlay.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.overlay.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.overlay.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // 按钮事件
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.cancelBtn.addEventListener('click', () => this.handleCancel());
        
        // 监听来自主进程的目标窗口数据
        if (window.electronAPI) {
            window.electronAPI.onTargetWindowData((data) => {
                console.log('收到目标窗口数据:', data);
                this.handleTargetWindowData(data);
            });
            
            window.electronAPI.onTargetWindowError((error) => {
                console.error('目标窗口错误:', error);
                this.showError('窗口错误', error);
            });
        }
    }

    startSelection() {
        console.log('开始区域选择');
        this.isSelecting = false;
        this.updateCoordsDisplay();
        this.updateConfirmButton();
    }

    handleMouseDown(event) {
        event.preventDefault();
        
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.currentX = this.startX;
        this.currentY = this.startY;
        this.isSelecting = true;
        
        // 显示选择框
        this.updateSelectionBox();
        this.updateCoordsDisplay();
        this.updateConfirmButton();
        
        console.log(`选择开始: (${this.startX}, ${this.startY})`);
    }

    handleMouseMove(event) {
        if (!this.isSelecting) return;
        
        this.currentX = event.clientX;
        this.currentY = event.clientY;
        
        // 更新选择框
        this.updateSelectionBox();
        this.updateCoordsDisplay();
    }

    handleMouseUp(event) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        this.currentX = event.clientX;
        this.currentY = event.clientY;
        
        // 更新选择框
        this.updateSelectionBox();
        this.updateCoordsDisplay();
        this.updateConfirmButton();
        
        console.log(`选择完成: (${this.startX}, ${this.startY}) -> (${this.currentX}, ${this.currentY})`);
    }

    handleKeyDown(event) {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                if (this.hasValidSelection()) {
                    this.handleConfirm();
                }
                break;
            case 'Escape':
                event.preventDefault();
                this.handleCancel();
                break;
        }
    }

    updateSelectionBox() {
        if (!this.selectionBox) return;
        
        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
        
        if (width > 0 && height > 0) {
            this.selectionBox.classList.add('active');
        } else {
            this.selectionBox.classList.remove('active');
        }
    }

    updateCoordsDisplay() {
        if (!this.coordsDisplay) return;
        
        const startCoords = document.getElementById('startCoords');
        const currentCoords = document.getElementById('currentCoords');
        const selectionSize = document.getElementById('selectionSize');
        
        if (startCoords) {
            startCoords.textContent = `起点: (${this.startX}, ${this.startY})`;
        }
        
        if (currentCoords) {
            currentCoords.textContent = `当前位置: (${this.currentX}, ${this.currentY})`;
        }
        
        if (selectionSize) {
            const width = Math.abs(this.currentX - this.startX);
            const height = Math.abs(this.currentY - this.startY);
            selectionSize.textContent = `选择区域: ${width} x ${height}`;
        }
    }

    updateConfirmButton() {
        if (!this.confirmBtn) return;
        
        this.confirmBtn.disabled = !this.hasValidSelection();
    }

    hasValidSelection() {
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        return width > 10 && height > 10; // 最小选择区域
    }

    async handleConfirm() {
        if (!this.hasValidSelection()) {
            this.showError('选择无效', '请选择一个有效的区域');
            return;
        }
        
        try {
            console.log('确认选择，发送数据到主进程');
            
            const selectionData = {
                x: Math.min(this.startX, this.currentX),
                y: Math.min(this.startY, this.currentY),
                width: Math.abs(this.currentX - this.startX),
                height: Math.abs(this.currentY - this.startY),
                startX: this.startX,
                startY: this.startY,
                endX: this.currentX,
                endY: this.currentY
            };
            
            const result = await window.electronAPI.completeSelection(selectionData);
            
            if (result.success) {
                console.log('选择完成，切片窗口已创建');
                // 页面会自动关闭，由主进程处理
            } else {
                console.error('完成选择失败:', result.error);
                this.showError('操作失败', result.error);
            }
            
        } catch (error) {
            console.error('确认选择时发生错误:', error);
            this.showError('操作失败', error.message);
        }
    }

    async handleCancel() {
        try {
            console.log('取消选择');
            
            const result = await window.electronAPI.cancelSelection();
            
            if (result.success) {
                console.log('选择已取消');
                // 页面会自动关闭，由主进程处理
            } else {
                console.error('取消选择失败:', result.error);
                this.showError('操作失败', result.error);
            }
            
        } catch (error) {
            console.error('取消选择时发生错误:', error);
            this.showError('操作失败', error.message);
        }
    }

    showError(title, message) {
        console.error(title, message);
        // 可以在这里添加错误提示UI
        alert(`${title}: ${message}`);
    }
    
    async handleTargetWindowData(data) {
        try {
            console.log('处理目标窗口数据:', data);
            
            // 开始捕获目标窗口的内容
            await this.startBackgroundCapture(data.sourceId);
            
        } catch (error) {
            console.error('处理目标窗口数据失败:', error);
            this.showError('处理失败', error.message);
        }
    }
    
    async startBackgroundCapture(sourceId) {
        try {
            console.log('开始背景捕获，源ID:', sourceId);
            
            // 获取桌面捕获流
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                }
            });
            
            // 创建视频元素显示捕获的内容
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            
            // 显示到背景显示区域
            const backgroundDisplay = document.getElementById('backgroundDisplay');
            if (backgroundDisplay) {
                backgroundDisplay.innerHTML = '';
                backgroundDisplay.appendChild(video);
                console.log('背景内容捕获完成');
            }
            
            // 存储流引用以便后续管理
            this.backgroundStream = stream;
            
        } catch (error) {
            console.error('背景捕获失败:', error);
            this.showError('捕获失败', error.message);
            
            // 显示错误占位符
            const backgroundDisplay = document.getElementById('backgroundDisplay');
            if (backgroundDisplay) {
                backgroundDisplay.innerHTML = `
                    <div class="capture-error">
                        <span class="error-icon">❌</span>
                        <span class="error-text">内容捕获失败: ${error.message}</span>
                    </div>
                `;
            }
        }
    }
    
    // 清理资源
    cleanup() {
        if (this.backgroundStream) {
            this.backgroundStream.getTracks().forEach(track => track.stop());
            this.backgroundStream = null;
        }
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    window.selectionApp = new SelectionApp();
});

// 导出应用类（用于测试）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelectionApp;
} 
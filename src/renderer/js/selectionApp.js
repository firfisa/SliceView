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
            
            // 计算选择区域
            const windowX = Math.min(this.startX, this.currentX);
            const windowY = Math.min(this.startY, this.currentY);
            const windowWidth = Math.abs(this.currentX - this.startX);
            const windowHeight = Math.abs(this.currentY - this.startY);
            
            console.log('窗口坐标选择区域:', { windowX, windowY, windowWidth, windowHeight });
            
            // 如果有视频显示信息，进行坐标转换
            let finalSelectionData;
            
            if (this.videoDisplayInfo) {
                console.log('进行坐标转换，视频显示信息:', this.videoDisplayInfo);
                
                // 将窗口坐标转换为视频显示区域内的坐标
                const videoX = windowX - this.videoDisplayInfo.offsetX;
                const videoY = windowY - this.videoDisplayInfo.offsetY;
                
                console.log('视频显示区域内的坐标:', { videoX, videoY });
                
                // 检查选择区域是否在视频显示范围内
                if (videoX < 0 || videoY < 0 || 
                    videoX + windowWidth > this.videoDisplayInfo.displayWidth ||
                    videoY + windowHeight > this.videoDisplayInfo.displayHeight) {
                    console.warn('选择区域超出视频显示范围，将进行裁剪');
                }
                
                // 计算缩放比例：从显示尺寸到原始视频尺寸
                const scaleX = this.videoDisplayInfo.videoWidth / this.videoDisplayInfo.displayWidth;
                const scaleY = this.videoDisplayInfo.videoHeight / this.videoDisplayInfo.displayHeight;
                
                console.log('缩放比例:', { scaleX, scaleY });
                
                // 转换为原始视频坐标
                const finalX = Math.max(0, videoX * scaleX);
                const finalY = Math.max(0, videoY * scaleY);
                const finalWidth = Math.min(windowWidth * scaleX, this.videoDisplayInfo.videoWidth - finalX);
                const finalHeight = Math.min(windowHeight * scaleY, this.videoDisplayInfo.videoHeight - finalY);
                
                console.log('最终视频坐标:', { finalX, finalY, finalWidth, finalHeight });
                
                finalSelectionData = {
                    x: Math.round(finalX),
                    y: Math.round(finalY),
                    width: Math.round(finalWidth),
                    height: Math.round(finalHeight),
                    startX: Math.round(finalX),
                    startY: Math.round(finalY),
                    endX: Math.round(finalX + finalWidth),
                    endY: Math.round(finalY + finalHeight)
                };
            } else {
                // 如果没有视频显示信息，使用窗口坐标（降级处理）
                console.warn('没有视频显示信息，使用窗口坐标');
                finalSelectionData = {
                    x: windowX,
                    y: windowY,
                    width: windowWidth,
                    height: windowHeight,
                    startX: this.startX,
                    startY: this.startY,
                    endX: this.currentX,
                    endY: this.currentY
                };
            }
            
            console.log('最终选择数据:', finalSelectionData);
            
            const result = await window.electronAPI.completeSelection(finalSelectionData);
            
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
            
            // 获取桌面捕获流 - 移除高分辨率约束，避免黑框问题
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
            
            // 等待视频元数据加载完成后计算坐标转换
            video.addEventListener('loadedmetadata', () => {
                console.log('背景视频元数据已加载，尺寸:', video.videoWidth, 'x', video.videoHeight);
                
                // 计算视频在选择窗口中的实际显示区域
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const videoAspectRatio = video.videoWidth / video.videoHeight;
                const windowAspectRatio = windowWidth / windowHeight;
                
                let displayWidth, displayHeight, offsetX, offsetY;
                
                if (windowAspectRatio > videoAspectRatio) {
                    // 窗口更宽，按高度缩放，左右居中
                    displayHeight = windowHeight;
                    displayWidth = displayHeight * videoAspectRatio;
                    offsetX = (windowWidth - displayWidth) / 2;
                    offsetY = 0;
                } else {
                    // 窗口更高，按宽度缩放，上下居中
                    displayWidth = windowWidth;
                    displayHeight = displayWidth / videoAspectRatio;
                    offsetX = 0;
                    offsetY = (windowHeight - displayHeight) / 2;
                }
                
                console.log('视频在选择窗口中的显示区域:', {
                    displayWidth, displayHeight, offsetX, offsetY
                });
                
                // 存储坐标转换信息，供选择时使用
                this.videoDisplayInfo = {
                    displayWidth,
                    displayHeight,
                    offsetX,
                    offsetY,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight
                };
            });
            
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
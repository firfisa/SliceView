/**
 * 区域选择工具
 * 负责实现窗口区域的框选功能
 */

class SelectionTool {
    constructor() {
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.selectedWindowId = null;
        this.overlay = null;
        this.selectionBox = null;
        this.coordsDisplay = null;
        
        this.init();
    }

    init() {
        console.log('区域选择工具初始化');
        this.createOverlay();
    }

    createOverlay() {
        // 创建选择覆盖层
        this.overlay = document.getElementById('selectionOverlay');
        this.selectionBox = document.getElementById('selectionBox');
        this.coordsDisplay = document.getElementById('selectionCoords');
        
        if (!this.overlay || !this.selectionBox || !this.coordsDisplay) {
            console.error('选择覆盖层元素未找到');
            return;
        }
    }

    startSelection(windowId) {
        if (this.isSelecting) {
            this.cancelSelection();
        }

        this.selectedWindowId = windowId;
        this.isSelecting = true;
        
        // 显示覆盖层
        this.overlay.style.display = 'block';
        
        // 添加事件监听器
        this.addSelectionEventListeners();
        
        console.log(`开始选择窗口 ${windowId} 的区域`);
    }

    addSelectionEventListeners() {
        // 鼠标按下事件
        this.overlay.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // 鼠标移动事件
        this.overlay.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // 鼠标释放事件
        this.overlay.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    removeSelectionEventListeners() {
        this.overlay.removeEventListener('mousedown', this.handleMouseDown);
        this.overlay.removeEventListener('mousemove', this.handleMouseMove);
        this.overlay.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    handleMouseDown(event) {
        event.preventDefault();
        
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.currentX = this.startX;
        this.currentY = this.startY;
        
        // 显示选择框
        this.updateSelectionBox();
        this.updateCoordsDisplay();
        
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
        
        event.preventDefault();
        
        // 完成选择
        this.completeSelection();
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.cancelSelection();
        }
    }

    updateSelectionBox() {
        if (!this.selectionBox) return;
        
        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
    }

    updateCoordsDisplay() {
        if (!this.coordsDisplay) return;
        
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        this.coordsDisplay.textContent = `${width} × ${height}`;
    }

    completeSelection() {
        if (!this.isSelecting) return;
        
        const selection = {
            windowId: this.selectedWindowId,
            x: Math.min(this.startX, this.currentX),
            y: Math.min(this.startY, this.currentY),
            width: Math.abs(this.currentX - this.startX),
            height: Math.abs(this.currentY - this.startY),
            timestamp: Date.now()
        };
        
        console.log('选择完成:', selection);
        
        // 隐藏覆盖层
        this.hideOverlay();
        
        // 移除事件监听器
        this.removeSelectionEventListeners();
        
        // 重置状态
        this.resetSelection();
        
        // 触发选择完成事件
        this.onSelectionComplete(selection);
    }

    cancelSelection() {
        if (!this.isSelecting) return;
        
        console.log('取消选择');
        
        // 隐藏覆盖层
        this.hideOverlay();
        
        // 移除事件监听器
        this.removeSelectionEventListeners();
        
        // 重置状态
        this.resetSelection();
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }

    resetSelection() {
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.selectedWindowId = null;
    }

    onSelectionComplete(selection) {
        // 这里可以添加选择完成后的处理逻辑
        // 比如创建捕获窗口、保存选择记录等
        
        // 触发自定义事件
        const event = new CustomEvent('selectionComplete', {
            detail: selection
        });
        document.dispatchEvent(event);
        
        // 显示通知
        if (window.sliceViewApp && window.sliceViewApp.uiManager) {
            window.sliceViewApp.uiManager.showNotification(
                `已选择区域: ${selection.width} × ${selection.height}`,
                'success'
            );
        }
    }

    getSelection() {
        if (!this.isSelecting) return null;
        
        return {
            windowId: this.selectedWindowId,
            x: Math.min(this.startX, this.currentX),
            y: Math.min(this.startY, this.currentY),
            width: Math.abs(this.currentX - this.startX),
            height: Math.abs(this.currentY - this.startY)
        };
    }

    isActive() {
        return this.isSelecting;
    }
} 
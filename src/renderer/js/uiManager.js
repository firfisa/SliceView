/**
 * UI管理器
 * 负责管理通知、模态框等UI组件
 */

class UIManager {
    constructor() {
        this.notifications = [];
        this.modals = [];
        this.notificationContainer = null;
        
        this.init();
    }

    init() {
        console.log('UI管理器初始化');
        this.createNotificationContainer();
    }

    createNotificationContainer() {
        // 创建通知容器
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notificationContainer';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        
        document.body.appendChild(this.notificationContainer);
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type);
        
        // 添加到容器
        this.notificationContainer.appendChild(notification);
        this.notifications.push(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
        
        return notification;
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // 添加关闭按钮样式
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: inherit;
                font-size: 18px;
                cursor: pointer;
                margin-left: 10px;
                opacity: 0.7;
                transition: opacity 0.2s;
            `;
            
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.opacity = '1';
            });
            
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.opacity = '0.7';
            });
        }
        
        return notification;
    }

    hideNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.classList.remove('show');
        
        // 等待动画完成后移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            // 从数组中移除
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    hideAllNotifications() {
        this.notifications.forEach(notification => {
            this.hideNotification(notification);
        });
    }

    showModal(options) {
        const {
            title = '提示',
            content = '',
            buttons = [],
            onClose = null,
            width = '500px',
            height = 'auto'
        } = options;
        
        const modal = this.createModal(title, content, buttons, onClose, width, height);
        
        // 添加到页面
        document.body.appendChild(modal);
        this.modals.push(modal);
        
        // 显示动画
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
        
        return modal;
    }

    createModal(title, content, buttons, onClose, width, height) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="width: ${width}; height: ${height};">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${buttons.map(btn => `
                        <button class="btn ${btn.class || 'btn-secondary'}" 
                                onclick="${btn.onClick || 'this.closest(\'.modal-overlay\').remove()'}">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 添加显示动画样式
        modal.style.cssText = `
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        modal.classList.add('show');
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modal);
            }
        });
        
        // 关闭回调
        if (onClose) {
            modal.addEventListener('close', onClose);
        }
        
        return modal;
    }

    hideModal(modal) {
        if (!modal || !modal.parentNode) return;
        
        modal.classList.remove('show');
        
        // 等待动画完成后移除
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            
            // 从数组中移除
            const index = this.modals.indexOf(modal);
            if (index > -1) {
                this.modals.splice(index, 1);
            }
            
            // 触发关闭事件
            const closeEvent = new Event('close');
            modal.dispatchEvent(closeEvent);
        }, 300);
    }

    hideAllModals() {
        this.modals.forEach(modal => {
            this.hideModal(modal);
        });
    }

    showConfirmDialog(message, onConfirm, onCancel) {
        return this.showModal({
            title: '确认',
            content: `<p>${message}</p>`,
            buttons: [
                {
                    text: '取消',
                    class: 'btn-secondary',
                    onClick: onCancel || 'this.closest(\'.modal-overlay\').remove()'
                },
                {
                    text: '确认',
                    class: 'btn-primary',
                    onClick: onConfirm || 'this.closest(\'.modal-overlay\').remove()'
                }
            ]
        });
    }

    showAlertDialog(message, onOk) {
        return this.showModal({
            title: '提示',
            content: `<p>${message}</p>`,
            buttons: [
                {
                    text: '确定',
                    class: 'btn-primary',
                    onClick: onOk || 'this.closest(\'.modal-overlay\').remove()'
                }
            ]
        });
    }

    showLoadingOverlay(container, message = '加载中...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        
        if (container) {
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
        
        return overlay;
    }

    hideLoadingOverlay(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    showErrorState(container, message, details = '') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-state';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-message">${message}</div>
            ${details ? `<div class="error-details">${details}</div>` : ''}
        `;
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
        
        return errorDiv;
    }

    // 工具方法：防抖
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 工具方法：节流
    throttle(func, limit) {
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
} 
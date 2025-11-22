class OrderNotifications {
  constructor() {
    this.socket = io();
    this.setupNotifications();
  }

  setupNotifications() {
    // Listen for order status updates
    this.socket.on('orderUpdate', (data) => {
      this.showNotification(data);
      this.updateOrderStatus(data.orderId, data.status);
    });

    // Join order room if on order tracking page
    const orderId = this.getOrderIdFromUrl();
    if (orderId) {
      this.socket.emit('joinOrder', orderId);
    }
  }

  showNotification(data) {
    const statusMessages = {
      'pending': 'Pesanan diterima',
      'diproses': 'Pesanan sedang diproses ☕',
      'siap': 'Pesanan siap diantar! 🎉',
      'selesai': 'Pesanan selesai ✅',
      'dibatalkan': 'Pesanan dibatalkan ❌'
    };

    const message = statusMessages[data.status] || `Status: ${data.status}`;

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Status Pesanan Update', {
        body: message,
        icon: '/images/coffee-icon.png',
        tag: `order-${data.orderId}`
      });
    }

    // In-page notification
    this.showInPageNotification(message, data.status);
  }

  showInPageNotification(message, status) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.order-notification');
    existingNotifications.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `order-notification fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
      this.getStatusColor(status)
    } text-white`;
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-lg">${this.getStatusIcon(status)}</span>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  getStatusColor(status) {
    const colors = {
      'pending': 'bg-yellow-500',
      'diproses': 'bg-blue-500',
      'siap': 'bg-green-500',
      'selesai': 'bg-gray-500',
      'dibatalkan': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  }

  getStatusIcon(status) {
    const icons = {
      'pending': '⏳',
      'diproses': '☕',
      'siap': '🎉',
      'selesai': '✅',
      'dibatalkan': '❌'
    };
    return icons[status] || '📦';
  }

  updateOrderStatus(orderId, status) {
    // Update status display if on order tracking page
    const statusElement = document.querySelector('.order-status');
    if (statusElement) {
      statusElement.textContent = this.formatStatus(status);
      statusElement.className = `order-status px-3 py-1 rounded-full text-sm font-medium ${this.getStatusClass(status)}`;
    }

    // Update status in orders list (admin page)
    document.querySelectorAll(`[data-order-id="${orderId}"] .order-status`).forEach(element => {
      element.textContent = this.formatStatus(status);
      element.className = `order-status px-2 py-1 rounded text-xs ${this.getStatusClass(status)}`;
    });
  }

  formatStatus(status) {
    const statusMap = {
      'pending': 'Menunggu',
      'diproses': 'Diproses',
      'siap': 'Siap',
      'selesai': 'Selesai',
      'dibatalkan': 'Dibatalkan'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status) {
    const classes = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'diproses': 'bg-blue-100 text-blue-800',
      'siap': 'bg-green-100 text-green-800',
      'selesai': 'bg-gray-100 text-gray-800',
      'dibatalkan': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getOrderIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/order\/([^\/]+)/);
    return match ? match[1] : null;
  }

  // Request notification permission
  static requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }
}

// Initialize notifications when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.orderNotifications = new OrderNotifications();
  OrderNotifications.requestPermission();
});
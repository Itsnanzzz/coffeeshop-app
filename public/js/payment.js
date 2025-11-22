class PaymentHandler {
    constructor(orderId) {
      this.orderId = orderId;
      this.pollingInterval = null;
    }
  
    async createPayment() {
      try {
        const response = await fetch(`/payment/${this.orderId}/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        const result = await response.json();
        
        if (result.success) {
          // Redirect to Midtrans payment page
          window.location.href = result.redirect_url;
        } else {
          this.showError('Gagal membuat transaksi pembayaran');
        }
      } catch (error) {
        console.error('Payment creation error:', error);
        this.showError('Terjadi kesalahan saat memproses pembayaran');
      }
    }
  
    startPolling() {
      this.pollingInterval = setInterval(async () => {
        try {
          const response = await fetch(`/payment/${this.orderId}/status`);
          const result = await response.json();
          
          if (result.success) {
            if (result.payment_status === 'paid') {
              this.stopPolling();
              this.showSuccess('Pembayaran berhasil!');
              setTimeout(() => {
                window.location.href = `/order/${this.orderId}`;
              }, 2000);
            } else if (result.payment_status === 'failed') {
              this.stopPolling();
              this.showError('Pembayaran gagal');
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000); // Poll every 3 seconds
    }
  
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    }
  
    showError(message) {
      const alert = document.createElement('div');
      alert.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4';
      alert.innerHTML = `
        <strong class="font-bold">Error! </strong>
        <span class="block sm:inline">${message}</span>
      `;
      
      const container = document.getElementById('paymentAlerts');
      container.innerHTML = '';
      container.appendChild(alert);
    }
  
    showSuccess(message) {
      const alert = document.createElement('div');
      alert.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4';
      alert.innerHTML = `
        <strong class="font-bold">Sukses! </strong>
        <span class="block sm:inline">${message}</span>
      `;
      
      const container = document.getElementById('paymentAlerts');
      container.innerHTML = '';
      container.appendChild(alert);
    }
  }
  
  // Initialize payment handler
  document.addEventListener('DOMContentLoaded', () => {
    const orderId = document.getElementById('orderId')?.value;
    
    if (orderId) {
      window.paymentHandler = new PaymentHandler(orderId);
      
      // Start polling if on payment status page
      if (window.location.pathname.includes('/payment/')) {
        window.paymentHandler.startPolling();
      }
    }
  });
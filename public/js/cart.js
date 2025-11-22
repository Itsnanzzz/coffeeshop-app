class ShoppingCart {
  constructor() {
    this.items = [];
    this.loadFromLocalStorage();
    this.updateCartDisplay();
  }

  loadFromLocalStorage() {
    const savedCart = localStorage.getItem('coffeeShopCart');
    if (savedCart) {
      this.items = JSON.parse(savedCart);
    }
  }

  saveToLocalStorage() {
    localStorage.setItem('coffeeShopCart', JSON.stringify(this.items));
  }

  async addItem(productId, quantity = 1, notes = '') {
    try {
      const response = await fetch('/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity,
          notes: notes,
          name: document.querySelector(`[data-product-id="${productId}"]`).dataset.name,
          price: parseFloat(document.querySelector(`[data-product-id="${productId}"]`).dataset.price),
          image_url: document.querySelector(`[data-product-id="${productId}"]`).dataset.image
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.items = result.cart || this.items;
        this.saveToLocalStorage();
        this.updateCartDisplay();
        this.showNotification('Produk ditambahkan ke keranjang');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showNotification('Gagal menambahkan produk', 'error');
    }
  }

  async updateQuantity(index, quantity) {
    try {
      const response = await fetch('/cart/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ index, quantity })
      });

      const result = await response.json();
      
      if (result.success) {
        this.items = result.cart;
        this.saveToLocalStorage();
        this.updateCartDisplay();
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  }

  async removeItem(index) {
    try {
      const response = await fetch('/cart/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ index })
      });

      const result = await response.json();
      
      if (result.success) {
        this.items = result.cart;
        this.saveToLocalStorage();
        this.updateCartDisplay();
        this.showNotification('Produk dihapus dari keranjang');
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  }

  async clear() {
    try {
      const response = await fetch('/cart/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        this.items = [];
        this.saveToLocalStorage();
        this.updateCartDisplay();
        this.showNotification('Keranjang dikosongkan');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  }

  getTotal() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getItemCount() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  updateCartDisplay() {
    // Update cart counter
    const cartCount = this.getItemCount();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = cartCount;
      el.style.display = cartCount > 0 ? 'flex' : 'none';
    });

    // Update cart modal content
    if (document.getElementById('cartItems')) {
      this.renderCartModal();
    }

    // Update checkout page
    if (document.getElementById('checkoutItems')) {
      this.renderCheckoutPage();
    }
  }

  renderCartModal() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');
    const cartEmptyEl = document.getElementById('cartEmpty');
    const cartNotEmptyEl = document.getElementById('cartNotEmpty');
    
    if (this.items.length === 0) {
      cartEmptyEl.classList.remove('hidden');
      cartNotEmptyEl.classList.add('hidden');
      return;
    }

    cartEmptyEl.classList.add('hidden');
    cartNotEmptyEl.classList.remove('hidden');

    cartItemsEl.innerHTML = this.items.map((item, index) => `
      <div class="flex justify-between items-center border-b py-4">
        <div class="flex-1">
          <h4 class="font-semibold">${item.name}</h4>
          <p class="text-sm text-gray-600">Rp ${item.price.toLocaleString()}</p>
          ${item.notes ? `<p class="text-xs text-gray-500">Catatan: ${item.notes}</p>` : ''}
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="cart.updateQuantity(${index}, ${item.quantity - 1})" 
                  class="px-2 py-1 bg-gray-200 rounded-lg hover:bg-gray-300">-</button>
          <span class="px-2 font-medium">${item.quantity}</span>
          <button onclick="cart.updateQuantity(${index}, ${item.quantity + 1})" 
                  class="px-2 py-1 bg-gray-200 rounded-lg hover:bg-gray-300">+</button>
          <button onclick="cart.removeItem(${index})" 
                  class="ml-4 text-red-500 hover:text-red-700 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    cartTotalEl.textContent = this.getTotal().toLocaleString();
  }

  renderCheckoutPage() {
    const checkoutItemsEl = document.getElementById('checkoutItems');
    const checkoutTotalEl = document.getElementById('checkoutTotal');
    
    if (!checkoutItemsEl) return;

    checkoutItemsEl.innerHTML = this.items.map((item, index) => `
      <div class="flex justify-between items-center border-b py-4">
        <div class="flex-1">
          <h4 class="font-semibold">${item.name}</h4>
          <p class="text-sm text-gray-600">Rp ${item.price.toLocaleString()} x ${item.quantity}</p>
          ${item.notes ? `<p class="text-xs text-gray-500">Catatan: ${item.notes}</p>` : ''}
        </div>
        <div class="text-right">
          <p class="font-semibold">Rp ${(item.price * item.quantity).toLocaleString()}</p>
        </div>
      </div>
    `).join('');

    checkoutTotalEl.textContent = this.getTotal().toLocaleString();
  }

  showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize cart when page loads
let cart;
document.addEventListener('DOMContentLoaded', () => {
  cart = new ShoppingCart();
  
  // Add event listeners for product buttons
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', (e) => {
      const productId = e.target.closest('[data-product-id]').dataset.productId;
      const notesInput = document.querySelector(`#notes-${productId}`);
      const notes = notesInput ? notesInput.value : '';
      
      cart.addItem(productId, 1, notes);
      
      // Clear notes input
      if (notesInput) {
        notesInput.value = '';
      }
    });
  });
});
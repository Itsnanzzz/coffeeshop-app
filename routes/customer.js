const express = require('express');
const router = express.Router();

// Halaman menu untuk customer
router.get('/', async (req, res) => {
  try {
    const { data: products, error } = await req.supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .gt('stock', 0)
      .order('category');
    
    if (error) throw error;
    
    // Group products by category
    const groupedProducts = {};
    products.forEach(product => {
      if (!groupedProducts[product.category]) {
        groupedProducts[product.category] = [];
      }
      groupedProducts[product.category].push(product);
    });
    
    res.render('customer/menu', { 
      title: 'Menu - Coffee Shop',
      groupedProducts,
      cart: req.session.cart || []
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.render('customer/menu', { 
      title: 'Menu - Coffee Shop',
      groupedProducts: {},
      cart: []
    });
  }
});

// Halaman checkout
router.get('/checkout', (req, res) => {
  const cart = req.session.cart || [];
  
  if (cart.length === 0) {
    return res.redirect('/');
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  res.render('customer/checkout', { 
    title: 'Checkout - Coffee Shop',
    cart,
    total 
  });
});

// Add to cart
router.post('/cart/add', (req, res) => {
  const { product_id, quantity, notes } = req.body;
  
  if (!req.session.cart) {
    req.session.cart = [];
  }
  
  const existingItemIndex = req.session.cart.findIndex(
    item => item.product_id === product_id && item.notes === notes
  );
  
  if (existingItemIndex > -1) {
    req.session.cart[existingItemIndex].quantity += parseInt(quantity);
  } else {
    req.session.cart.push({
      product_id,
      quantity: parseInt(quantity),
      notes: notes || '',
      ...req.body
    });
  }
  
  res.json({ success: true, cartCount: req.session.cart.length });
});

// Update cart
router.post('/cart/update', (req, res) => {
  const { index, quantity } = req.body;
  
  if (req.session.cart && req.session.cart[index]) {
    if (quantity <= 0) {
      req.session.cart.splice(index, 1);
    } else {
      req.session.cart[index].quantity = parseInt(quantity);
    }
  }
  
  res.json({ success: true, cart: req.session.cart });
});

// Remove from cart
router.post('/cart/remove', (req, res) => {
  const { index } = req.body;
  
  if (req.session.cart && req.session.cart[index]) {
    req.session.cart.splice(index, 1);
  }
  
  res.json({ success: true, cart: req.session.cart });
});

// Clear cart
router.post('/cart/clear', (req, res) => {
  req.session.cart = [];
  res.json({ success: true });
});

// Process order
router.post('/order', async (req, res) => {
  try {
    const { customer_name, table_number, payment_method } = req.body;
    const cart = req.session.cart || [];
    
    if (cart.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Keranjang kosong' 
      });
    }
    
    // Calculate total and validate stock
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of cart) {
      const { data: product } = await req.supabase
        .from('products')
        .select('price, stock, name')
        .eq('id', item.product_id)
        .single();
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Produk ${item.name} tidak ditemukan`
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stok ${item.name} tidak mencukupi`
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.price,
        notes: item.notes
      });
    }
    
    // Insert order
    const { data: order, error } = await req.supabase
      .from('orders')
      .insert([
        {
          customer_name,
          table_number,
          total_amount: totalAmount,
          payment_method,
          status: 'pending',
          payment_status: payment_method === 'cash' ? 'pending' : 'pending'
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    // Insert order items
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));
    
    const { error: itemsError } = await req.supabase
      .from('order_items')
      .insert(orderItemsWithOrderId);
    
    if (itemsError) throw itemsError;
    
    // Update product stock
    for (const item of cart) {
      await req.supabase
        .from('products')
        .update({ 
          stock: req.supabase.sql`stock - ${item.quantity}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id);
    }
    
    // Clear cart
    req.session.cart = [];
    
    // If payment method is QRIS, redirect to payment page
    if (payment_method === 'qris') {
      return res.json({ 
        success: true, 
        orderId: order.id,
        redirectUrl: `/payment/${order.id}` 
      });
    }
    
    res.json({ 
      success: true, 
      orderId: order.id,
      message: 'Pesanan berhasil dibuat' 
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat memproses pesanan' 
    });
  }
});

// Order tracking page
router.get('/order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: order, error } = await req.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price,
          notes,
          products (
            name,
            image_url
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.render('customer/order-tracking', {
      title: 'Lacak Pesanan',
      order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(404).render('customer/404', { 
      title: 'Pesanan Tidak Ditemukan' 
    });
  }
});

module.exports = router;
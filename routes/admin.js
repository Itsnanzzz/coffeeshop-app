const express = require('express');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Login page
router.get('/login', (req, res) => {
  if (req.session.adminLoggedIn) {
    return res.redirect('/admin/dashboard');
  }
  
  res.render('admin/login', { 
    title: 'Admin Login',
    error: null 
  });
});

// Login process
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.adminLoggedIn = true;
    req.session.adminUsername = username;
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', {
      title: 'Admin Login',
      error: 'Username atau password salah'
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Dashboard (protected)
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get today's sales
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySales, error: todayError } = await req.supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', today);
    
    // Get monthly sales
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: monthlySales, error: monthlyError } = await req.supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', firstDayOfMonth);
    
    // Get popular products
    const { data: popularProducts, error: popularError } = await req.supabase
      .rpc('get_popular_products', { limit_count: 5 });
    
    // Get recent orders
    const { data: recentOrders, error: ordersError } = await req.supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    const todayTotal = todaySales?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
    const monthlyTotal = monthlySales?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
    
    res.render('admin/dashboard', {
      title: 'Dashboard',
      todaySales: todayTotal,
      monthlySales: monthlyTotal,
      popularProducts: popularProducts || [],
      recentOrders: recentOrders || []
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('admin/dashboard', {
      title: 'Dashboard',
      todaySales: 0,
      monthlySales: 0,
      popularProducts: [],
      recentOrders: []
    });
  }
});

// Products management
router.get('/products', adminAuth, async (req, res) => {
  try {
    const { data: products, error } = await req.supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.render('admin/products', {
      title: 'Kelola Produk',
      products: products || []
    });
  } catch (error) {
    console.error('Products error:', error);
    res.render('admin/products', {
      title: 'Kelola Produk',
      products: []
    });
  }
});

// Add product page
router.get('/products/add', adminAuth, (req, res) => {
  res.render('admin/product-form', {
    title: 'Tambah Produk',
    product: null
  });
});

// Edit product page
router.get('/products/edit/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: product, error } = await req.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.render('admin/product-form', {
      title: 'Edit Produk',
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.redirect('/admin/products');
  }
});

// Save product
router.post('/products/save', adminAuth, async (req, res) => {
  try {
    const { id, name, description, price, category, stock, is_available } = req.body;
    
    const productData = {
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      is_available: is_available === 'on',
      updated_at: new Date().toISOString()
    };
    
    if (id) {
      // Update existing product
      const { error } = await req.supabase
        .from('products')
        .update(productData)
        .eq('id', id);
      
      if (error) throw error;
    } else {
      // Create new product
      const { error } = await req.supabase
        .from('products')
        .insert([productData]);
      
      if (error) throw error;
    }
    
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error saving product:', error);
    res.redirect('/admin/products');
  }
});

// Delete product
router.post('/products/delete/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await req.supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Orders management
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { data: orders, error } = await req.supabase
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
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.render('admin/orders', {
      title: 'Kelola Pesanan',
      orders: orders || []
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.render('admin/orders', {
      title: 'Kelola Pesanan',
      orders: []
    });
  }
});

// Update order status
router.post('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const { error } = await req.supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    // Send real-time notification
    req.io.to(`order_${id}`).emit('orderUpdate', { orderId: id, status });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update payment status
router.post('/orders/:id/payment-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;
    
    const { error } = await req.supabase
      .from('orders')
      .update({ 
        payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export CSV
router.get('/export/csv', adminAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const { data: orders, error } = await req.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price,
          products (
            name
          )
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');
    
    if (error) throw error;
    
    // Generate CSV
    let csv = 'Order ID,Customer Name,Table Number,Total Amount,Status,Payment Method,Payment Status,Date,Items\n';
    
    orders.forEach(order => {
      const items = order.order_items.map(item => 
        `${item.products.name} (${item.quantity}x)`
      ).join('; ');
      
      csv += `"${order.id}","${order.customer_name}","${order.table_number}",${order.total_amount},"${order.status}","${order.payment_method}","${order.payment_status}","${order.created_at}","${items}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${month}-${year}.csv`);
    res.send(csv);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Error generating CSV');
  }
});

module.exports = router;
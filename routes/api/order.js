const express = require('express');
const router = express.Router();

// Get all orders
router.get('/', async (req, res) => {
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
            name
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
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
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(404).json({ success: false, error: 'Order not found' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { data: products, error } = await req.supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('name');
    
    if (error) throw error;
    
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: product, error } = await req.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(404).json({ success: false, error: 'Product not found' });
  }
});

module.exports = router;
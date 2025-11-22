const express = require('express');
const midtransClient = require('midtrans-client');
const router = express.Router();

// Initialize Midtrans
let snap = null;
if (process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY) {
  snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
  });
}

// Payment page
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const { data: order, error } = await req.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (error) throw error;
    
    if (order.payment_method !== 'qris') {
      return res.redirect('/');
    }
    
    res.render('customer/payment', {
      title: 'Pembayaran',
      order,
      midtransClientKey: process.env.MIDTRANS_CLIENT_KEY
    });
  } catch (error) {
    console.error('Payment page error:', error);
    res.redirect('/');
  }
});

// Create Midtrans transaction
router.post('/:orderId/create', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!snap) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured'
      });
    }
    
    const { data: order, error } = await req.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (error) throw error;
    
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: order.total_amount
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: order.customer_name,
        email: '', // Add email if available
        phone: ''  // Add phone if available
      }
    };
    
    const transaction = await snap.createTransaction(parameter);
    
    // Update order with midtrans token
    await req.supabase
      .from('orders')
      .update({
        midtrans_token: transaction.token,
        midtrans_order_id: orderId
      })
      .eq('id', orderId);
    
    res.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });
    
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment transaction'
    });
  }
});

// Payment notification handler (webhook from Midtrans)
router.post('/notification', async (req, res) => {
  try {
    const notification = req.body;
    
    // Verify the notification (you should verify the signature in production)
    
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;
    
    let paymentStatus = 'pending';
    
    if (transactionStatus == 'capture') {
      if (fraudStatus == 'challenge') {
        paymentStatus = 'challenge';
      } else if (fraudStatus == 'accept') {
        paymentStatus = 'paid';
      }
    } else if (transactionStatus == 'settlement') {
      paymentStatus = 'paid';
    } else if (transactionStatus == 'deny' || transactionStatus == 'cancel' || transactionStatus == 'expire') {
      paymentStatus = 'failed';
    } else if (transactionStatus == 'pending') {
      paymentStatus = 'pending';
    }
    
    // Update order payment status
    await req.supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    res.send('OK');
  } catch (error) {
    console.error('Payment notification error:', error);
    res.status(500).send('Error');
  }
});

// Check payment status
router.get('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const { data: order, error } = await req.supabase
      .from('orders')
      .select('payment_status, status')
      .eq('id', orderId)
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      payment_status: order.payment_status,
      order_status: order.status
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
});

module.exports = router;
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'coffee-shop-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make supabase and io available to all routes
app.use((req, res, next) => {
  req.supabase = supabase;
  req.io = io;
  next();
});

// Routes
app.use('/', require('./routes/customer'));
app.use('/admin', require('./routes/admin'));
app.use('/api/products', require('./routes/api/products'));
app.use('/api/orders', require('./routes/api/orders'));
app.use('/payment', require('./routes/payment'));

// Socket.io for real-time notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('joinOrder', (orderId) => {
    socket.join(`order_${orderId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('customer/404', { title: 'Halaman Tidak Ditemukan' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('customer/500', { title: 'Terjadi Kesalahan' });
});

server.listen(PORT, () => {
  console.log(`Coffee Shop app running on http://localhost:${PORT}`);
});
-- Products table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    image_url VARCHAR(500),
    stock INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    table_number VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    midtrans_token VARCHAR(500),
    midtrans_order_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Items table
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Function untuk mendapatkan produk terlaris
CREATE OR REPLACE FUNCTION get_popular_products(limit_count integer DEFAULT 5)
RETURNS TABLE(
    product_id UUID,
    product_name VARCHAR,
    total_sold BIGINT,
    total_revenue DECIMAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.name as product_name,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as total_revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.payment_status = 'paid'
    GROUP BY p.id, p.name
    ORDER BY total_sold DESC
    LIMIT limit_count;
END;
$$;

-- Insert sample products
INSERT INTO products (name, description, price, category, stock, image_url) VALUES
('Espresso', 'Kopi espresso dengan rasa kuat dan aroma harum', 25000, 'Kopi', 50, '/images/espresso.jpg'),
('Cappuccino', 'Espresso dengan steamed milk dan foam', 30000, 'Kopi', 45, '/images/cappuccino.jpg'),
('Latte', 'Espresso dengan lebih banyak steamed milk', 32000, 'Kopi', 40, '/images/latte.jpg'),
('Americano', 'Espresso dengan air panas', 28000, 'Kopi', 35, '/images/americano.jpg'),
('Green Tea Latte', 'Matcha green tea dengan steamed milk', 35000, 'Non-Kopi', 30, '/images/green-tea-latte.jpg'),
('Chocolate Frappe', 'Minuman coklat dingin dengan whipped cream', 38000, 'Non-Kopi', 25, '/images/chocolate-frappe.jpg'),
('Croissant', 'Croissant buttery dan flaky', 20000, 'Makanan', 20, '/images/croissant.jpg'),
('Sandwich', 'Sandwich segar dengan isian ayam dan sayuran', 45000, 'Makanan', 15, '/images/sandwich.jpg');
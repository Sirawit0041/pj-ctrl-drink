-- ==============================================================================
-- BEVERAGE & SNACK ORDERING SYSTEM (CTRL + DRINK)
-- SUPABASE POSTGRESQL SCHEMA WITH RLS, INDEXES & SEED DATA
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM (
        'Pending Payment',
        'Waiting Verification',
        'Payment Approved',
        'Preparing',
        'Ready',
        'Completed',
        'Rejected',
        'Cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM (
        'pending',
        'waiting_verification',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES DEFINITION

-- 3.1 profiles (links to auth.users if Supabase Auth is used, or standalone)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role user_role DEFAULT 'user'::user_role NOT NULL,
    phone_verified BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.2 categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.3 products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    sub_category TEXT, -- e.g. 'milk', 'soda', 'snack'
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true NOT NULL,
    stock_quantity INTEGER DEFAULT 100 NOT NULL CHECK (stock_quantity >= 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.4 orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_status payment_status_type DEFAULT 'pending'::payment_status_type NOT NULL,
    order_status order_status_type DEFAULT 'Pending Payment'::order_status_type NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.5 order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    sweetness_level TEXT, -- e.g. 'หวานมาก (100%)', 'หวานปกติ (50%)', 'หวานน้อย (25%)', 'ไม่ระบุ'
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- 3.6 payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method TEXT DEFAULT 'PromptPay' NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    slip_url TEXT,
    verification_status payment_status_type DEFAULT 'waiting_verification'::payment_status_type NOT NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.7 shop_settings
CREATE TABLE IF NOT EXISTS public.shop_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    shop_name TEXT NOT NULL DEFAULT 'PJ Ctrl + Drink',
    shop_logo TEXT DEFAULT '/assets/logo.png',
    is_open BOOLEAN DEFAULT true NOT NULL,
    closed_message TEXT DEFAULT 'ขออภัย ขณะนี้ร้านปิดให้บริการแล้ว กรุณาสั่งซื้อในเวลาทำการ',
    promptpay_number VARCHAR(20) DEFAULT '0945174302' NOT NULL,
    promptpay_account_name TEXT DEFAULT 'PJ Ctrl + Drink' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT single_shop_setting CHECK (id = 1)
);

-- 3.8 admin_logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.9 otp_verifications (For phone verification before ordering)
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    attempt_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.otp_verifications(phone);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if caller is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read their own profile, Admins can read all profiles
DROP POLICY IF EXISTS "Public profiles are readable by owner or admin" ON public.profiles;
CREATE POLICY "Public profiles are readable by owner or admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())); -- Prevent role escalation

-- Categories: Everyone can read, only admin can insert/update/delete
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
CREATE POLICY "Categories are readable by everyone" ON public.categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories manageable by admin" ON public.categories;
CREATE POLICY "Categories manageable by admin" ON public.categories
    FOR ALL USING (public.is_admin());

-- Products: Everyone can read available products, Admin can manage all
DROP POLICY IF EXISTS "Products readable by everyone" ON public.products;
CREATE POLICY "Products readable by everyone" ON public.products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products manageable by admin" ON public.products;
CREATE POLICY "Products manageable by admin" ON public.products
    FOR ALL USING (public.is_admin());

-- Shop Settings: Everyone can read, Admin can update
DROP POLICY IF EXISTS "Shop settings readable by everyone" ON public.shop_settings;
CREATE POLICY "Shop settings readable by everyone" ON public.shop_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Shop settings manageable by admin" ON public.shop_settings;
CREATE POLICY "Shop settings manageable by admin" ON public.shop_settings
    FOR ALL USING (public.is_admin());

-- Orders: Customers can view their own orders or via service role. Admin can view all.
DROP POLICY IF EXISTS "Users can read own orders or admin read all" ON public.orders;
CREATE POLICY "Users can read own orders or admin read all" ON public.orders
    FOR SELECT USING (auth.uid() = customer_id OR public.is_admin());

-- Payments: Customers can read own payments, Admin can manage all
DROP POLICY IF EXISTS "Users read own payments or admin read all" ON public.payments;
CREATE POLICY "Users read own payments or admin read all" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payments.order_id
            AND (orders.customer_id = auth.uid() OR public.is_admin())
        )
    );

-- 6. SEED DATA

-- Initial Shop Settings
INSERT INTO public.shop_settings (id, shop_name, shop_logo, is_open, closed_message, promptpay_number, promptpay_account_name)
VALUES (
    1,
    'PJ Ctrl + Drink',
    '/assets/57853.jpg',
    true,
    'ขออภัย ขณะนี้ร้านปิดให้บริการแล้ว กรุณาสั่งซื้อใหม่ในเวลาทำการ',
    '0945174302',
    'PJ Ctrl + Drink'
) ON CONFLICT (id) DO UPDATE SET
    shop_name = EXCLUDED.shop_name,
    promptpay_number = EXCLUDED.promptpay_number;

-- Categories
INSERT INTO public.categories (id, name, description)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'เครื่องดื่ม', 'เครื่องดื่มเย็นสดชื่น ชานม นมสด และโซดาซ่าโดนใจ'),
    ('22222222-2222-2222-2222-222222222222', 'ของทานเล่น', 'ของว่าง ของทานเล่นทอดและปิ้งร้อนๆ สดใหม่')
ON CONFLICT (name) DO NOTHING;

-- Initial Products
-- หมวดนม (Milk Series)
INSERT INTO public.products (category_id, sub_category, name, description, price, image_url, is_available, stock_quantity)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'milk', 'นมสด', 'นมสดแท้ 100% หอมมัน กลมกล่อม เลือกระดับความหวานได้', 45.00, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80', true, 50),
    ('11111111-1111-1111-1111-111111111111', 'milk', 'นมสดบราวชูก้าร์', 'นมสดหอมมันราดซอสบราวชูก้าร์เคี่ยวหอมละมุนเข้มข้น', 55.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80', true, 50),
    ('11111111-1111-1111-1111-111111111111', 'milk', 'นมสดน้ำผึ้ง', 'นมสดผสมผสานน้ำผึ้งแท้ หอมหวานละมุน ชื่นใจ', 50.00, 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80', true, 40),
    ('11111111-1111-1111-1111-111111111111', 'milk', 'นมโกโก้', 'โกโก้เข้มข้นพิเศษ ชงกับนมสดสูตรเฉพาะ เข้มสะใจ', 50.00, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80', true, 45),
    ('11111111-1111-1111-1111-111111111111', 'milk', 'นมเผือก', 'นมสดผสมเผือกหอมเข้มข้น สีสวย หวานมันกลมกล่อม', 50.00, 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80', true, 35)
ON CONFLICT DO NOTHING;

-- หมวดโซดา (Soda Series)
INSERT INTO public.products (category_id, sub_category, name, description, price, image_url, is_available, stock_quantity)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'soda', 'ลิ้นจี่โซดา', 'ไซรัปลิ้นจี่หวานฉ่ำ ผสมโซดาซ่าเย็นชื่นใจ ดับกระหาย', 45.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', true, 60),
    ('11111111-1111-1111-1111-111111111111', 'soda', 'กีวี่โซดา', 'ไซรัปกีวี่เปรี้ยวหวานสดชื่น เติมเต็มความสดชื่นด้วยโซดาซ่า', 45.00, 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80', true, 50),
    ('11111111-1111-1111-1111-111111111111', 'soda', 'พีชโซดา', 'พีชหอมละมุน เปรี้ยวอมหวาน ผสมโซดาซ่าสะใจ สดชื่นคลายร้อน', 45.00, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', true, 50)
ON CONFLICT DO NOTHING;

-- หมวดของทานเล่น (Snacks)
INSERT INTO public.products (category_id, sub_category, name, description, price, image_url, is_available, stock_quantity)
VALUES
    ('22222222-2222-2222-2222-222222222222', 'snack', 'ไข่นกกระทา', 'ขนมไข่นกกระทาทอด กรอบนอกนุ่มใน หวานมัน ไม่อมน้ำมัน ทอดใหม่ร้อนๆ', 40.00, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80', true, 40),
    ('22222222-2222-2222-2222-222222222222', 'snack', 'เฟรนฟราย', 'มันฝรั่งทอดชิ้นโต กรอบนอกนุ่มใน โรยเกลือเล็กน้อย เสิร์ฟพร้อมซอส', 49.00, 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80', true, 45),
    ('22222222-2222-2222-2222-222222222222', 'snack', 'ขนมปังปิ้งเนย', 'ขนมปังปิ้งเตาถ่าน หอมเนยสดแท้ กรอบนอกนุ่มใน ชุ่มฉ่ำ', 30.00, 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=600&q=80', true, 50),
    ('22222222-2222-2222-2222-222222222222', 'snack', 'ขนมปังปิ้งเนยนม', 'ขนมปังปิ้งทาเนยชุ่มฉ่ำ ราดนมข้นหวานเน้นๆ อร่อยเต็มคำ', 35.00, 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80', true, 50)
ON CONFLICT DO NOTHING;

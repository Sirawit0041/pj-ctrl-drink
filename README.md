# PJ Ctrl + Drink - Beverage & Snack Ordering Web Application

> เว็บแอปพลิเคชันสำหรับร้านจำหน่ายเครื่องดื่มและของทานเล่น (Coffee & Code) พัฒนาด้วย Node.js, Express.js, Tailwind CSS และเชื่อมต่อกับ Supabase PostgreSQL & Storage อย่างสมบูรณ์แบบ ออกแบบ UI/UX สวยงาม ทันสมัย สอดคล้องกับ Mockup ในโฟลเดอร์ `assets/57853.jpg`

---

## 🌟 จุดเด่นและฟังก์ชันการทำงานหลัก

### 1. 👥 ระบบแบ่งสิทธิ์ผู้ใช้งาน (Role-Based Access Control - RBAC)
- **ลูกค้า (Customer / User):**
  - **หน้า Home:** แบนเนอร์ประชาสัมพันธ์, สถานะร้านเปิด/ปิดแบบเรียลไทม์, สินค้าแนะนำ, ทางลัดไปสั่งซื้อและติดตามออเดอร์
  - **หน้าเลือกสินค้า (Menu):** แบ่ง 3 หมวดหมู่หลัก (ทั้งหมด, เครื่องดื่ม, ของทานเล่น)
    - *หมวดเครื่องดื่ม:* แบ่งเป็นหมวดนม (นมสด, นมสดบราวชูก้าร์, นมสดน้ำผึ้ง, นมโกโก้, นมเผือก) และหมวดโซดา (ลิ้นจี่โซดา, กีวี่โซดา, พีชโซดา) พร้อมระบบเลือกระดับความหวาน (หวานมาก 100%, หวานปกติ 50%, หวานน้อย 25%)
    - *หมวดของทานเล่น:* ไข่นกกระทา, เฟรนฟราย, ขนมปังปิ้งเนย, ขนมปังปิ้งเนยนม
  - **ระบบตะกร้าสินค้า (Cart):** เพิ่ม/ลดจำนวน, เปลี่ยนระดับความหวาน, ลบสินค้า, คืนสต็อก, คำนวณยอดเงินรวมแบบไดนามิก
  - **ระบบป้องกันข้อมูลปลอม & ยืนยัน OTP (Anti-Spam & Phone Verification):**
    - ตรวจสอบชื่อ (ห้ามเว้นว่าง, ห้ามใช้ตัวเลขล้วน, ดักจับตัวอักษรซ้ำผิดปกติ เช่น `AAAA` หรือ `1111`, รองรับไทย-อังกฤษ)
    - ตรวจสอบรูปแบบเบอร์โทรศัพท์มือถือไทย 10 หลัก (06, 08, 09)
    - ส่งรหัส OTP 6 หลัก และตรวจสอบความถูกต้องก่อนอนุญาตให้กดสั่งซื้อ
  - **หน้าชำระเงิน & PromptPay QR Code:**
    - สร้าง PromptPay QR Code มาตรฐาน EMVCo ตามยอดเงินสั่งซื้อจริงแบบไดนามิก (ไม่ใช่รูปคงที่)
    - หมายเลข PromptPay: `0945174302` พร้อมปุ่มคัดลอกเลขบัญชี
    - ระบบแนบสลิปโอนเงิน (รองรับ JPG, PNG, WEBP สูงสุด 5MB) พร้อมพรีวิวรูปสลิปทันที
  - **ระบบติดตามสถานะคำสั่งซื้อ (Live Order Tracker):**
    - ตรวจสอบสถานะทั้ง 8 ขั้นตอน:
      1. `Pending Payment` (รอชำระเงิน)
      2. `Waiting Verification` (รอตรวจสอบสลิป)
      3. `Payment Approved` (ชำระเงินแล้ว)
      4. `Preparing` (กำลังจัดเตรียมสินค้า)
      5. `Ready` (สินค้าพร้อมรับ)
      6. `Completed` (สำเร็จ)
      7. `Rejected` (สลิปไม่ถูกต้อง/ถูกปฏิเสธ)
      8. `Cancelled` (ยกเลิกคำสั่งซื้อ)
  - **หน้าการตั้งค่า (Settings):** ค้นหาประวัติการสั่งซื้อด้วยเบอร์โทรศัพท์ และทางเข้าสู่ระบบ Admin

- **ผู้ดูแลระบบ (Admin / Store Manager):**
  - **Admin Dashboard:** ยอดขายวันนี้, ยอดขายรวมทั้งหมด, จำนวนออเดอร์, จำนวนสลิปที่รอตรวจสอบ, ออเดอร์ที่กำลังดำเนินการ, รายงาน 5 อันดับสินค้าขายดี (Bestsellers)
  - **ระบบเปิด-ปิดร้าน (Store Open/Close Toggle):**
    - สวิตช์เปิด-ปิดร้านแบบเรียลไทม์
    - กำหนดข้อความแจ้งเตือนเมื่อร้านปิด
    - ป้องกันการสั่งซื้อใหม่ทั้งจากหน้า Frontend และ Backend API
  - **ระบบจัดการสินค้า (Product Management):**
    - เพิ่ม ลบ แก้ไข รายการสินค้า
    - เปลี่ยนราคา, อัปโหลดรูปภาพ, เปลี่ยนหมวดหมู่, สลับสถานะเปิด-ปิดการขาย, ปรับจำนวนสต็อก
  - **ระบบตรวจสอบสลิปโอนเงินด้วยตนเอง (Manual Slip Verification):**
    - ตรวจสอบรูปสลิปขนาดใหญ่ความละเอียดสูง
    - แสดงเลขออเดอร์, ชื่อผู้สั่งซื้อ, ยอดเงินที่ต้องชำระ, วันเวลา
    - กดยืนยันชำระเงิน (อนุมัติ) หรือกดปฏิเสธสลิปพร้อมระบุเหตุผล
    - มีข้อความแจ้งเตือนให้แอดมินตรวจสอบยอดเงินเข้าบัญชีจริงก่อนอนุมัติทุกครั้ง
  - **ระบบบันทึกประวัติ (Audit Logs):** บันทึกทุกกิจกรรมของ Admin อย่างโปร่งใส

---

## 🛠️ Technology Stack

- **Frontend:**
  - Semantic HTML5
  - Tailwind CSS + Custom CSS (โทนสีส้มพาสเทล / คาราเมล อบอุ่น สอดคล้องกับ Figma Mockup)
  - JavaScript ES6+ (Modular Vanilla Architecture)
  - Font Awesome 6 Icons & Google Fonts (Prompt & Kanit)
  - Responsive Design 100% (Mobile First, Tablet, Desktop)
- **Backend:**
  - Node.js (ES Modules)
  - Express.js (RESTful API)
  - PromptPay-QR (สร้างมาตรฐาน EMVCo PromptPay Payload)
  - QRCode (Render base64 Data URL)
  - Multer (อัปโหลดและกรองไฟล์สลิป)
  - Helmet & CORS & Express Rate Limit (ความปลอดภัยขั้นสูง)
- **Database & Storage:**
  - Supabase (PostgreSQL)
  - Row Level Security (RLS)
  - Supabase Storage (Bucket `slips` สำหรับเก็บสลิปโอนเงิน)
  - ระบบ In-Memory & JSON Storage Fallback อัตโนมัติ (ทำให้สามารถรันและทดสอบระบบได้ทันทีแบบ Standalone)

---

## 📁 โครงสร้างโฟลเดอร์ของโปรเจกต์

```
PJ ctrl + drink/
├── assets/
│   └── 57853.jpg               # ไฟล์ Mockup Figma ต้นแบบ
├── database/
│   └── schema.sql              # คำสั่ง SQL สร้างตาราง, RLS, Indexes และ Seed Data
├── public/                     # ไฟล์ Frontend ฝั่งผู้ใช้งาน
│   ├── assets/                 # รูปภาพและโลโก้
│   ├── css/
│   │   └── style.css           # Styling ธีม Warm Caramel / Curved Hero Header
│   ├── js/
│   │   ├── admin.js            # ระบบจัดการของ Admin & Dashboard
│   │   ├── api.js              # Centralized Fetch API Client
│   │   ├── app.js              # Coordinator, Navigation, Modals, Products Grid
│   │   ├── cart.js             # จัดการตะกร้าสินค้า & LocalStorage
│   │   ├── otp.js              # ขอรหัสและยืนยัน OTP เบอร์โทรศัพท์
│   │   └── payment.js          # จัดการ PromptPay QR & อัปโหลดสลิป
│   └── index.html              # หน้าหลัก Single-Page Web Application
├── server/                     # ไฟล์ Backend API
│   ├── config/
│   │   └── supabase.js         # เชื่อมต่อ Supabase Client (Anon & Service Role)
│   ├── data/
│   │   ├── db.json             # Persistent Local DB Cache
│   │   └── mockDb.js           # Database Service Layer
│   ├── middleware/
│   │   └── auth.js             # RBAC Middleware ตรวจสอบสิทธิ์ Admin
│   ├── routes/
│   │   ├── auth.js             # API ขอ OTP, ยืนยัน OTP, เข้าสู่ระบบ Admin
│   │   ├── orders.js           # API คำสั่งซื้อ, คำนวณราคาฝั่ง Server, ตรวจสอบสถานะร้าน
│   │   ├── payments.js         # API สร้าง QR Code, อัปโหลดสลิป, ตรวจสอบสลิป
│   │   ├── products.js         # API ดึงรายการสินค้า, CRUD สินค้า
│   │   └── shop.js             # API ตั้งค่าร้านค้า, เปิด-ปิดร้าน, แดชบอร์ด
│   ├── utils/
│   │   ├── promptpay.js        # ตัวสร้าง EMVCo PromptPay QR Code
│   │   └── validator.js        # ตัวตรวจสอบชื่อและเบอร์โทรศัพท์ไทย (Anti-Fake)
│   └── index.js                # Express Application Entry Point
├── uploads/                    # โฟลเดอร์เก็บรูปสลิปและไฟล์ที่อัปโหลด
├── .env.example                # ตัวอย่างการกำหนด Environment Variables
├── package.json
└── README.md
```

---

## 🚀 วิธีการติดตั้งและรันโปรเจกต์ (Installation & Running)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. กำหนดค่า Environment Variables
คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```
ภายในไฟล์ `.env`:
```env
PORT=3000
NODE_ENV=development

# Supabase Credentials (หากยังไม่ได้ตั้งค่า ระบบจะใช้ฐานข้อมูลภายในอัตโนมัติ)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Shop Defaults
DEFAULT_PROMPTPAY_NUMBER=0945174302
DEFAULT_PROMPTPAY_NAME=PJ Ctrl + Drink

# Security & Admin Password
ADMIN_SECRET_KEY=admin1234
JWT_SECRET=ctrl_drink_super_secret_jwt_key_2026
```

### 3. รันโปรเจกต์
```bash
# รันโหมดปกติ
npm start

# หรือ รันโหมด Development (Auto-reload)
npm run dev
```

เปิดบราวเซอร์ไปที่: **`http://localhost:3000`**

- **รหัสผ่านเข้าสู่ระบบ Admin ค่าเริ่มต้น:** `admin1234`
- **เบอร์ PromptPay ค่าเริ่มต้น:** `0945174302`

---

## 🗄️ วิธีตั้งค่าบน Supabase (Supabase Setup Guide)

หากต้องการเชื่อมต่อกับ Cloud Supabase Database ของคุณจริง ให้ทำตามขั้นตอนดังนี้:

### ขั้นตอนที่ 1: สร้าง Project บน Supabase
1. เข้าไปที่ [https://supabase.com](https://supabase.com) แล้วลงชื่อเข้าใช้
2. คลิก **"New project"** ตั้งชื่อโปรเจกต์ เช่น `pj-ctrl-drink` และกำหนด Database Password

### ขั้นตอนที่ 2: รันคำสั่ง SQL สร้างตารางและ RLS
1. ไปที่เมนู **SQL Editor** ในแดชบอร์ด Supabase
2. นำเนื้อหาทั้งหมดจากไฟล์ [`database/schema.sql`](file:///c:/Users/TechnoC10/Desktop/PJ%20ctrl%20+%20drink/database/schema.sql) มาวางแล้วกด **Run**
3. คำสั่งจะสร้างตารางทั้ง 8 ตาราง, ฟังก์ชัน `is_admin()`, Row Level Security (RLS) Policies, Indexes และข้อมูลเริ่มต้น (เครื่องดื่ม, ของทานเล่น, ข้อมูลร้าน)

### ขั้นตอนที่ 3: สร้าง Storage Bucket สำหรับเก็บสลิป
1. ไปที่เมนู **Storage** ใน Supabase
2. คลิก **"New bucket"** ตั้งชื่อว่า `slips`
3. ตั้งค่าเป็น **Public bucket** หรือกำหนด Access Policy ให้สิทธิ์ Upload ได้เฉพาะผู้มีสิทธิ์ และ Read ได้เฉพาะ Admin/เจ้าของออเดอร์

### ขั้นตอนที่ 4: คัดลอก API Keys มาใส่ใน `.env`
1. ไปที่ **Project Settings** > **API**
2. คัดลอก **Project URL** -> นำไปใส่ใน `SUPABASE_URL`
3. คัดลอก **anon public key** -> นำไปใส่ใน `SUPABASE_ANON_KEY`
4. คัดลอก **service_role secret key** -> นำไปใส่ใน `SUPABASE_SERVICE_ROLE_KEY` *(เก็บเป็นความลับ ห้ามเปิดเผยในฝั่ง Frontend)*

---

## 🔒 มาตรการความปลอดภัย (Security Features)

1. **Server-Side Price Calculation:** ป้องกันการดัดแปลงราคาผ่าน Developer Tools หรือ Client Script โดย Server จะคำนวณราคาสินค้าและยอดรวมจาก Database โดยตรงเท่านั้น
2. **Store Status Enforcement:** เมื่อร้านปิด ระบบจะปฏิเสธการสร้างคำสั่งซื้อทั้งที่หน้าเว็บ และในระดับ API (Return HTTP 400 พร้อมข้อความแจ้งเตือน)
3. **Anti-Fake Information Validation:**
   - ตรวจสอบชื่อ (ห้ามใช้ตัวเลขล้วน, ดักจับตัวอักษรซ้ำ เช่น `AAAA`, `1111`)
   - ตรวจสอบเบอร์โทรศัพท์มือถือไทย 10 หลัก
   - ระบบ OTP ยืนยันเบอร์โทรศัพท์จริงก่อนสั่งซื้อ
4. **Rate Limiting:** จำกัดจำนวนครั้งในการส่งคำสั่งซื้อและขอ OTP เพื่อป้องกันการ Spam
5. **PromptPay EMVCo Standard:** สร้าง QR Code มาตรฐานการเงินที่มีการคำนวณ CRC16 Checksum ถูกต้องและระบุยอดเงินตามจริง
6. **Manual Verification Requirement:** สลิปที่ส่งมาจะต้องรอให้ Admin ตรวจสอบยอดเงินในบัญชีธนาคารจริงก่อนเสมอ ไม่มีการกดยืนยันอัตโนมัติ

---

## 🌐 วิธี Deploy ระบบสู่ Production

### A. Deploy บน Render หรือ Railway
1. Push โปรเจกต์ขึ้น GitHub Repository
2. เข้าไปที่ [Render](https://render.com) หรือ [Railway](https://railway.app)
3. สร้าง **Web Service** ใหม่ แล้วเลือก Repository
4. ตั้งค่า **Build Command:** `npm install`
5. ตั้งค่า **Start Command:** `node server/index.js`
6. นำ Environment Variables จาก `.env` ไปกรอกในส่วน **Environment Variables** ของแพลตฟอร์ม

### B. Deploy บน Docker / VPS (Ubuntu/Debian)
```bash
# ติดตั้ง Node.js 20+ และ PM2
npm install -g pm2

# Clone โปรเจกต์และติดตั้ง
git clone <your-repo-url>
cd "PJ ctrl + drink"
npm install --production

# รันด้วย PM2 Process Manager
pm2 start server/index.js --name "ctrl-drink"
pm2 startup
pm2 save
```

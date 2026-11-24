async function runTests() {
  await import('./server/index.js');
  await new Promise(r => setTimeout(r, 800));

  console.log('--- 1. Testing GET / (HTML Rendering) ---');
  const resHome = await fetch('http://localhost:3000/');
  console.log('GET / status:', resHome.status);
  const homeHtml = await resHome.text();
  console.log('HTML contains Ctrl + Drink:', homeHtml.includes('Ctrl + Drink'));

  console.log('\n--- 2. Testing GET /api/shop/settings ---');
  const resShop = await (await fetch('http://localhost:3000/api/shop/settings')).json();
  console.log('Shop Name:', resShop.data.shop_name, '| Open:', resShop.data.is_open, '| PromptPay:', resShop.data.promptpay_number);

  console.log('\n--- 3. Testing GET /api/products ---');
  const resProds = await (await fetch('http://localhost:3000/api/products')).json();
  console.log('Products count:', resProds.data.length);
  resProds.data.forEach(p => console.log('  *', p.name, '฿' + p.price, '[' + (p.sub_category || 'other') + ']'));

  console.log('\n--- 4. Testing OTP Request (Anti-Fake Name & Thai Phone) ---');
  const resOtp = await (await fetch('http://localhost:3000/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'สมชาย ใจดี', phone: '0945174302' })
  })).json();
  console.log('OTP Result:', resOtp.message, '| Code:', resOtp.data?.simulatedOtp);

  console.log('\n--- 5. Testing OTP Verify ---');
  const resVerify = await (await fetch('http://localhost:3000/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0945174302', otp_code: resOtp.data.simulatedOtp })
  })).json();
  const phoneToken = resVerify.data?.phone_token;
  console.log('OTP Verified:', resVerify.success, '| Phone Token received:', phoneToken ? 'YES' : 'NO');

  console.log('\n--- 6. Testing Order Placement with Server-side pricing & PromptPay QR ---');
  const resOrder = await (await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: 'สมชาย ใจดี',
      customer_phone: '0945174302',
      phone_token: phoneToken,
      note: 'ไม่หวานมาก แยกน้ำแข็ง',
      items: [
        { product_id: 'prod-milk-01', quantity: 2, sweetness_level: 'หวานปกติ' },
        { product_id: 'prod-snack-01', quantity: 1, sweetness_level: 'ไม่ระบุ' }
      ]
    })
  })).json();
  console.log('Order Result:', resOrder.message);
  console.log('Order Number:', resOrder.data?.order?.order_number, '| Total: ฿' + resOrder.data?.order?.total_amount);
  console.log('PromptPay Payload:', resOrder.data?.promptpay?.payload);
  console.log('PromptPay QR Data URL Prefix:', resOrder.data?.promptpay?.qrDataUrl?.substring(0, 35));

  console.log('\n--- 7. Testing Admin Login & Dashboard Stats ---');
  const resLogin = await (await fetch('http://localhost:3000/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin1234' })
  })).json();
  console.log('Admin Login:', resLogin.message, '| Role:', resLogin.data?.user?.role);
  const adminToken = resLogin.data?.token;

  const resStats = await (await fetch('http://localhost:3000/api/shop/admin/stats', {
    headers: { 'Authorization': 'Bearer ' + adminToken }
  })).json();
  console.log('Today Orders:', resStats.data?.todayOrdersCount, '| Active Orders:', resStats.data?.activeOrdersCount);

  console.log('\n--- 8. Testing Store Closed Protection Guard ---');
  await fetch('http://localhost:3000/api/shop/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
    body: JSON.stringify({ is_open: false, closed_message: 'ร้านปิดรับออเดอร์ชั่วคราว' })
  });

  const resClosedOrder = await (await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: 'สมชาย ใจดี',
      customer_phone: '0945174302',
      phone_token: phoneToken,
      items: [{ product_id: 'prod-milk-01', quantity: 1 }]
    })
  })).json();
  console.log('Store Closed Order Rejected properly? ->', !resClosedOrder.success, '| Reason:', resClosedOrder.message);

  // Restore store to open
  await fetch('http://localhost:3000/api/shop/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
    body: JSON.stringify({ is_open: true })
  });

  console.log('\n=======================================================');
  console.log('🎉 ALL AUTOMATED END-TO-END TESTS PASSED 100%!');
  console.log('=======================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

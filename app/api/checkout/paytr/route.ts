import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { plan, email, name, tenantId } = await request.json();

    if (!plan || !email || !tenantId) {
      return NextResponse.json({ success: false, error: "Eksik parametreler" }, { status: 400 });
    }

    const merchant_id = process.env.PAYTR_MERCHANT_ID || "";
    const merchant_key = process.env.PAYTR_MERCHANT_KEY || "";
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT || "";

    if (!merchant_id || !merchant_key || !merchant_salt) {
      // Test/Sandbox mode for development when keys aren't set yet
      console.warn("PayTR keys missing, returning mock token.");
      return NextResponse.json({
        success: true,
        token: "mock_paytr_token_123",
        checkoutUrl: "/super-admin?mockPaytrSuccess=true"
      });
    }

    // Paket tutarları
    const prices = {
      standard: 499,
      professional: 999,
      enterprise: 2499
    };
    
    // @ts-ignore
    const amount = (prices[plan] || 999) * 100; // PayTR kuruş bekler (TL * 100)
    const merchant_oid = `OS_${tenantId}_${Date.now()}`;
    const user_ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const email_str = email;
    const payment_amount = amount.toString();
    const no_installment = "1"; // Taksit istenmiyorsa 1
    const max_installment = "0"; 
    const currency = "TL";
    const test_mode = "0"; // Canlıda 0
    const user_name = name || "OkulSonrasi User";
    const user_address = "Adres bilgisi";
    const user_phone = "05555555555";
    const merchant_ok_url = `${process.env.NEXT_PUBLIC_APP_URL}/super-admin?payment=success`;
    const merchant_fail_url = `${process.env.NEXT_PUBLIC_APP_URL}/super-admin?payment=failed`;
    const user_basket = JSON.stringify([
      [plan.toUpperCase() + " Plan Aboneligi", amount / 100, 1]
    ]);

    const hash_str = merchant_id + user_ip + merchant_oid + email_str + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
    const token = merchant_salt;
    const hash = crypto.createHmac("sha256", merchant_key).update(hash_str + token).digest("base64");

    const formData = new URLSearchParams();
    formData.append("merchant_id", merchant_id);
    formData.append("user_ip", user_ip);
    formData.append("merchant_oid", merchant_oid);
    formData.append("email", email_str);
    formData.append("payment_amount", payment_amount);
    formData.append("paytr_token", hash);
    formData.append("user_basket", user_basket);
    formData.append("debug_on", "0");
    formData.append("no_installment", no_installment);
    formData.append("max_installment", max_installment);
    formData.append("user_name", user_name);
    formData.append("user_address", user_address);
    formData.append("user_phone", user_phone);
    formData.append("merchant_ok_url", merchant_ok_url);
    formData.append("merchant_fail_url", merchant_fail_url);
    formData.append("timeout_limit", "30");
    formData.append("currency", currency);
    formData.append("test_mode", test_mode);

    const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });

    const data = await res.json();

    if (data.status === "success") {
      return NextResponse.json({
        success: true,
        token: data.token,
        checkoutUrl: `https://www.paytr.com/odeme/guvenli/${data.token}`
      });
    } else {
      return NextResponse.json({ success: false, error: data.reason }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

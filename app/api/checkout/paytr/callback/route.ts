import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const merchant_oid = formData.get("merchant_oid")?.toString();
    const status = formData.get("status")?.toString();
    const total_amount = formData.get("total_amount")?.toString();
    const hash = formData.get("hash")?.toString();
    
    if (!merchant_oid || !status || !hash) {
      return NextResponse.json({ success: false, error: "Eksik parametre" }, { status: 400 });
    }

    const merchant_key = process.env.PAYTR_MERCHANT_KEY || "";
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT || "";

    if (merchant_key && merchant_salt) {
      // Hash dorulama
      const hash_str = merchant_oid + merchant_salt + status + total_amount;
      const expected_hash = crypto.createHmac("sha256", merchant_key).update(hash_str).digest("base64");
      
      if (hash !== expected_hash) {
        return NextResponse.json({ success: false, error: "Geersiz imza (Hash mismatch)" }, { status: 400 });
      }
    }

    if (status === "success") {
      // OS_{tenantId}_{timestamp} -> split
      const parts = merchant_oid.split("_");
      const tenantId = parts[1];

      if (tenantId) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Tenant' aktif et
        await supabaseAdmin
          .from("tenants")
          .update({
            status: "active",
            plan_type: "professional" // Or extract from payload/basket
          })
          .eq("id", tenantId);
      }
    }

    // PayTR'nin webhooks iin OK yantn grmesi gerekir
    return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error: any) {
    return new NextResponse("FAIL", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}

/**
 * lib/whatsapp.ts
 * Gerçek WhatsApp Gateway Servisi
 * Green-API / UltraMsg Entegrasyonu
 */

// =============================================
// GREEN-API YAPILANDIRMASI
// =============================================
const GREENAPI_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || "";
const GREENAPI_TOKEN = process.env.GREEN_API_TOKEN || "";
const GREENAPI_BASE = `https://api.green-api.com/waInstance${GREENAPI_INSTANCE_ID}`;

/**
 * Green-API üzerinden WhatsApp mesajı gönderir.
 * @param phone - Alıcı telefon numarası (Örn: 905551234567)
 * @param message - Gönderilecek metin
 */
async function sendWhatsAppMessage(phone: string, message: string) {
  // Telefon numarasını formata çevir (başında 0 varsa kaldır, +90 ekle)
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0")
    ? "9" + cleanPhone
    : cleanPhone.startsWith("90")
    ? cleanPhone
    : "90" + cleanPhone;

  const chatId = `${formattedPhone}@c.us`;

  try {
    const response = await fetch(`${GREENAPI_BASE}/sendMessage/${GREENAPI_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message || `HTTP ${response.status}`);
    }

    console.log(`[WhatsApp] Mesaj gönderildi -> ${formattedPhone}`, result.idMessage);
    return { success: true, messageId: result.idMessage };
  } catch (error: any) {
    console.error(`[WhatsApp] Gönderim hatası -> ${formattedPhone}:`, error.message);
    return { success: false, error: error.message };
  }
}

// =============================================
// QR KOD İLE CİHAZ EŞLEŞTİRME DURUMU
// =============================================

/**
 * Green-API instance'ının bağlantı durumunu kontrol eder.
 */
export async function getWhatsAppStatus(): Promise<{ authorized: boolean; phone?: string }> {
  try {
    const res = await fetch(`${GREENAPI_BASE}/getStateInstance/${GREENAPI_TOKEN}`);
    const data = await res.json();
    // stateInstance: "authorized" | "notAuthorized" | "blocked" | "sleepMode"
    return {
      authorized: data.stateInstance === "authorized",
      phone: data.phone || undefined,
    };
  } catch {
    return { authorized: false };
  }
}

/**
 * QR kodu alır (cihaz henüz eşleştirilmediyse).
 * Bu QR, admin panelindeki WhatsApp kartında gösterilir.
 */
export async function getWhatsAppQR(): Promise<{ qr: string | null; message: string }> {
  try {
    const res = await fetch(`${GREENAPI_BASE}/qr/${GREENAPI_TOKEN}`);
    const data = await res.json();
    if (data.type === "qrCode") {
      return { qr: data.message, message: "QR kodu taratın" };
    }
    return { qr: null, message: data.message || "Cihaz zaten bağlı" };
  } catch (err: any) {
    return { qr: null, message: "QR alınamadı: " + err.message };
  }
}

// =============================================
// MESAJ ŞABLONLARI
// =============================================

/**
 * Öğrenci giriş yaptığında veliye bildirim gönderir.
 */
export async function sendCheckInMessage(
  parentPhone: string,
  studentName: string,
  checkInType: "qr" | "pin",
  studentId: string
) {
  const time = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const method = checkInType === "qr" ? "QR Kod" : "PIN";
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://okulsonrasi.com"}/veli/${studentId}`;

  const message = `📍 *OkulSonrası Giriş Bildirimi*\n\n${studentName} adlı öğrenci saat ${time}'de ${method} ile güvenle giriş yaptı.\n\n🔗 Canlı Takip: ${trackingUrl}`;

  return sendWhatsAppMessage(parentPhone, message);
}

/**
 * Veliye haftalık veresiye döküm mesajı gönderir (Pazar günleri).
 */
export async function sendWeeklyReportMessage(
  parentPhone: string,
  studentName: string,
  totalAmount: number,
  studentId: string,
  tenantName: string = "OkulSonrası Mekanı",
  paymentUrl: string = "https://odeme.okulsonrasi.com"
) {
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://okulsonrasi.com"}/veli/${studentId}`;

  const message = `Sayın Veli,\n\n${studentName}'nın bu haftaki ${tenantName} veresiye kafe harcaması toplam ${totalAmount.toFixed(2)} TL'dir.\n\nHaftalık Detaylı Harcama Dökümü: ${trackingUrl}\n\nÜyelik ücretinize eklenen bu tutarı ${paymentUrl} üzerinden veya mekanda ödeyebilirsiniz. İyi pazarlar!`;

  return sendWhatsAppMessage(parentPhone, message);
}

/**
 * Toplu duyuru mesajı gönderir (admin panelinden tetiklenir).
 */
export async function sendBulkAnnouncement(
  phones: string[],
  message: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const phone of phones) {
    const result = await sendWhatsAppMessage(phone, message + "\n\n— OkulSonrası Veli Bilgilendirme Servisi");
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    // Rate limiting: Green-API üzerinde mesaj aralığı bırak
    await new Promise((r) => setTimeout(r, 1500));
  }

  return { sent, failed };
}

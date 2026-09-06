/**
 * lib/security.ts
 * Güvenlik Yardımcı Fonksiyonları
 * - PIN Brute-Force Koruması (Rate Limiting)
 * - KVKK Uyumlu Telefon Numarası Maskeleme
 * - Terminal Token Üretici
 */

// =============================================
// 1. PIN GİRİŞ RATE LIMITER
// =============================================

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 dakika

// In-memory store (production'da Redis veya Supabase tablosu kullanılmalı)
const attemptStore = new Map<string, { count: number; lockedUntil: number | null }>();

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntilMs: number | null;
  message: string;
}

/**
 * PIN denemesini kontrol eder. 5 başarısız denemeden sonra 5 dakika kilitler.
 * @param identifier - Benzersiz tanımlayıcı (IP adresi, cihaz kimliği vb.)
 */
export function checkPinRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const record = attemptStore.get(identifier);

  // Kilit süresi dolmuşsa sıfırla
  if (record?.lockedUntil && now > record.lockedUntil) {
    attemptStore.delete(identifier);
  }

  const current = attemptStore.get(identifier);

  // Hâlâ kilitli mi?
  if (current?.lockedUntil && now < current.lockedUntil) {
    const remainingSec = Math.ceil((current.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntilMs: current.lockedUntil,
      message: `Çok fazla hatalı deneme. Lütfen ${remainingSec} saniye sonra tekrar deneyin.`,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - (current?.count || 0),
    lockedUntilMs: null,
    message: "OK",
  };
}

/**
 * Başarısız PIN denemesini kaydeder. Eşik aşıldığında kilitler.
 */
export function recordFailedPinAttempt(identifier: string): RateLimitResult {
  const now = Date.now();
  const current = attemptStore.get(identifier) || { count: 0, lockedUntil: null };

  current.count += 1;

  if (current.count >= MAX_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_DURATION_MS;
    attemptStore.set(identifier, current);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntilMs: current.lockedUntil,
      message: "5 başarısız deneme! Giriş 5 dakika süreyle kilitlendi.",
    };
  }

  attemptStore.set(identifier, current);
  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - current.count,
    lockedUntilMs: null,
    message: `Hatalı PIN. ${MAX_ATTEMPTS - current.count} deneme hakkınız kaldı.`,
  };
}

/**
 * Başarılı giriş sonrası deneme sayacını sıfırlar.
 */
export function resetPinAttempts(identifier: string): void {
  attemptStore.delete(identifier);
}

// =============================================
// 2. KVKK UYUMLU TELEFON NUMARASI MASKELEMESİ
// =============================================

/**
 * Telefon numarasını KVKK uyumlu şekilde maskeler.
 * Örn: "05551234567" -> "0555***4567"
 * Örn: "555-123-4567" -> "555-***-4567"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "***";

  // Sadece rakamları al
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 7) return "***" + digits.slice(-2);

  const prefix = digits.slice(0, 4);
  const suffix = digits.slice(-4);
  return `${prefix}***${suffix}`;
}

/**
 * Tam adı KVKK uyumlu şekilde maskeler.
 * Örn: "Ahmet Yılmaz" -> "A**** Y*****"
 */
export function maskFullName(name: string): string {
  if (!name) return "***";
  return name
    .split(" ")
    .map((word) => (word.length > 1 ? word[0] + "*".repeat(word.length - 1) : word))
    .join(" ");
}

// =============================================
// 3. TERMINAL TOKEN ÜRETİCİ
// =============================================

/**
 * Kiosk veya POS cihazları için güvenli, benzersiz terminal kodu üretir.
 * Format: TRM-XXXXXX (6 haneli büyük harf ve rakam)
 */
export function generateTerminalToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Karıştırılabilecek I/O/1/0 kaldırıldı
  let code = "TRM-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Terminal token'ını doğrular (basit format kontrolü).
 */
export function isValidTerminalToken(token: string): boolean {
  return /^TRM-[A-Z2-9]{6}$/.test(token);
}

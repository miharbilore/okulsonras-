export default function ContactPage() {
  return (
    <div className="container mx-auto px-6 py-20 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">İletişim</h1>
      <p className="text-slate-600 leading-relaxed mb-4">
        Bizimle iletişime geçmek, soru sormak veya teknik destek almak için aşağıdaki e-posta adresini kullanabilirsiniz:
      </p>
      <a href="mailto:iletisim@okulsonrasi.com" className="text-primary text-xl font-bold hover:underline">
        iletisim@okulsonrasi.com
      </a>
      <div className="mt-8 text-sm text-slate-500">
        <p>Destek saatlerimiz: Hafta içi 09:00 - 18:00</p>
      </div>
    </div>
  );
}

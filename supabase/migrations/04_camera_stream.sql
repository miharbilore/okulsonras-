-- ============================================================================
-- 04_camera_stream.sql
-- Evrensel Canlı Kamera İzleme Modülü Veritabanı Güncellemesi
-- ============================================================================

-- `tenants` tablosuna kamera ayarlarını ekle
ALTER TABLE public.tenants
ADD COLUMN camera_stream_url TEXT,
ADD COLUMN camera_stream_type TEXT CHECK (camera_stream_type IN ('hls', 'iframe', 'none')) DEFAULT 'none';

COMMENT ON COLUMN public.tenants.camera_stream_url IS 'Kamera canlı yayın URL adresi (HLS m3u8 veya iFrame src)';
COMMENT ON COLUMN public.tenants.camera_stream_type IS 'Kamera yayın tipi: hls, iframe veya none';

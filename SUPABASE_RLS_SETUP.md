# Supabase RLS Politikası Kurulumu

## Sorun
Uygulamanız şu hatayı alıyor:
```
new row violates row-level security policy for table "kitaplar"
```

Bu, Supabase'de `kitaplar` tablosuna yazma izniniz olmadığı anlamına gelir.

## Çözüm

Supabase Dashboard'unuzda şu adımları izleyin:

### 1. Supabase Dashboard'a Giriş
- https://supabase.com/dashboard adresine gidin
- Projenizi seçin: `izlcuykhlogenvkytuwo`

### 2. RLS Politikalarını Ayarlayın

#### Seçenek A: RLS'yi Tamamen Kapat (Geliştirme İçin - Önerilmez)
1. Sol menüden **Table Editor** > **kitaplar** tablosuna gidin
2. Sağ üstteki **RLS** butonuna tıklayın
3. **Disable RLS** seçeneğini seçin

⚠️ **Uyarı**: Bu yöntem güvenli değildir, sadece test için kullanın!

#### Seçenek B: Public Erişim Politikası Ekle (Önerilen)
1. Sol menüden **Authentication** > **Policies** gidin
2. `kitaplar` tablosunu bulun
3. **New Policy** butonuna tıklayın
4. **For full customization** seçeneğini seçin
5. Aşağıdaki politikayı ekleyin:

**SELECT Politikası (Okuma):**
```sql
CREATE POLICY "Enable read access for all users" ON "public"."kitaplar"
FOR SELECT
USING (true);
```

**INSERT Politikası (Ekleme):**
```sql
CREATE POLICY "Enable insert access for all users" ON "public"."kitaplar"
FOR INSERT
WITH CHECK (true);
```

**UPDATE Politikası (Güncelleme):**
```sql
CREATE POLICY "Enable update access for all users" ON "public"."kitaplar"
FOR UPDATE
USING (true)
WITH CHECK (true);
```

**DELETE Politikası (Silme):**
```sql
CREATE POLICY "Enable delete access for all users" ON "public"."kitaplar"
FOR DELETE
USING (true);
```

#### Seçenek C: SQL Editor ile Hızlı Kurulum
1. Sol menüden **SQL Editor** gidin
2. Aşağıdaki SQL kodunu çalıştırın:

```sql
-- Tüm mevcut politikaları kaldır
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."kitaplar";
DROP POLICY IF EXISTS "Enable insert access for all users" ON "public"."kitaplar";
DROP POLICY IF EXISTS "Enable update access for all users" ON "public"."kitaplar";
DROP POLICY IF EXISTS "Enable delete access for all users" ON "public"."kitaplar";

-- Yeni politikalar ekle
CREATE POLICY "Enable read access for all users" ON "public"."kitaplar"
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON "public"."kitaplar"
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON "public"."kitaplar"
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON "public"."kitaplar"
FOR DELETE USING (true);

-- RLS'nin aktif olduğundan emin ol
ALTER TABLE "public"."kitaplar" ENABLE ROW LEVEL SECURITY;
```

### 3. Tablo Yapısını Kontrol Edin

`kitaplar` tablonuzun şu sütunlara sahip olduğundan emin olun:

```sql
CREATE TABLE IF NOT EXISTS public.kitaplar (
    id BIGSERIAL PRIMARY KEY,
    isbn TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_kitaplar_isbn ON public.kitaplar(isbn);
```

### 4. Test Edin

1. Chrome Extension'ı yeniden yükleyin
2. Popup'ı açın
3. "Yeni Ekle" sekmesinden bir test kaydı ekleyin
4. Hata almamalısınız!

## Güvenlik Notu

⚠️ **Önemli**: Yukarıdaki politikalar herkesin tablonuza erişmesine izin verir. 

Üretim ortamı için daha güvenli politikalar kullanmalısınız:

```sql
-- Sadece kimliği doğrulanmış kullanıcılar için
CREATE POLICY "Authenticated users can do everything" ON "public"."kitaplar"
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
```

Ancak bu durumda uygulamanızda kullanıcı kimlik doğrulaması eklemeniz gerekir.

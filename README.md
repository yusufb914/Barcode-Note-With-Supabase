# Barkod Not Arayıcı - Supabase Edition

Chrome uzantısı olarak çalışan, barkod numaralarını Supabase veritabanında arayan ve notları gösteren uygulama.

## Özellikler

- ✅ **Supabase Entegrasyonu**: Tüm veriler Supabase'de saklanır
- 📦 **Barkod Arama**: Panodaki barkodu otomatik veya manuel arama
- 📝 **Not Yönetimi**: Barkodlara not ekleme, düzenleme ve silme
- 📤 **CSV İçe/Dışa Aktarma**: CSV dosyalarını Supabase'e yükleme ve dışa aktarma
- 🔍 **Otomatik Arama**: Panoya kopyalanan barkodları otomatik arama
- ⌨️ **Klavye Kısayolu**: Ctrl+Shift+S ile hızlı arama

## Kurulum

1. Chrome'da `chrome://extensions/` adresine gidin
2. "Geliştirici modu"nu aktif edin
3. "Paketlenmemiş uzantı yükle" butonuna tıklayın
4. Bu klasörü seçin

## Supabase Yapılandırması

### Veritabanı Tablosu

Uygulamanın çalışması için Supabase'de `kitaplar` adında bir tablo gereklidir:

```sql
CREATE TABLE kitaplar (
  id BIGSERIAL PRIMARY KEY,
  isbn TEXT NOT NULL,
  note TEXT NOT NULL
);
```

### Bağlantı Bilgileri

Uygulama şu Supabase projesine bağlıdır:
- **URL**: https://izlcuykhlogenvkytuwo.supabase.co
- **Anon Key**: (popup.js ve background.js içinde tanımlı)

## Kullanım

### Veri Ekleme

1. **Manuel Ekleme**: "Yeni Ekle" sekmesinden barkod ve not girin
2. **CSV Yükleme**: "CSV Yükle" sekmesinden CSV dosyası yükleyin
   - CSV formatı: `"barkod","not"`

### Arama

1. **Otomatik**: Bir barkodu kopyalayın, uygulama otomatik arayacak
2. **Manuel**: Ctrl+Shift+S kısayolunu kullanın
3. **Test**: Popup'tan "Test Et" butonuna tıklayın

### Veri Yönetimi

"Veri Yönet" sekmesinden:
- Tüm kayıtları görüntüleyin
- Kayıtları arayın
- Notları düzenleyin
- Kayıtları silin

## Dosya Yapısı

```
├── manifest.json          # Chrome uzantı yapılandırması
├── popup.html            # Popup arayüzü
├── popup.js              # Popup mantığı (Supabase entegrasyonu)
├── background.js         # Arka plan servisi (Supabase entegrasyonu)
├── icon16.png            # Uzantı ikonu (16x16)
├── icon48.png            # Uzantı ikonu (48x48)
└── icon128.png           # Uzantı ikonu (128x128)
```

## Teknolojiler

- **Chrome Extension API**: Manifest V3
- **Supabase**: PostgreSQL veritabanı ve API
- **JavaScript**: Vanilla JS (framework yok)

## Notlar

- Tüm veriler Supabase'de saklanır (local storage kullanılmaz)
- Clipboard izinleri gereklidir
- Aktif tab'a script injection yapılır (popup gösterimi için)

# Google Tag Manager Kurulum Dokümanı — Santek Qbrick Landing Page'leri

> **Hedef kitle:** GTM uzmanı
> **Container:** `GTM-PXS2Q35R` (zaten 4 LP'ye ve ana sayfaya gömülü)
> **Kapsam:** 4 Qbrick landing page + ana site
> **Son güncelleme:** 2026-05

---

## 0. Özet — Yapılması Gerekenler

GTM container'a aşağıdakiler kurulacak:

1. **9 adet Data Layer Variable** (DLV) — payload alanlarını okumak için
2. **4 adet Custom Event trigger** — `lead_submit`, `outbound_click`, `qty_selected`, `lp_view`
3. **GA4 Configuration + 4 GA4 Event tag**
4. **Google Ads Conversion tag** (lead için — PRIMARY) + opsiyonel micro-conversion'lar
5. **Meta Pixel base + 3 Meta event tag** (CAPI opsiyonel, aşağıda not var)
6. **Consent Mode** (KVKK/GDPR — opsiyonel ama önerilir)

**Conversion önceliği:**
| Öncelik | Event | Tip |
|---|---|---|
| 🔴 PRIMARY (hard conversion) | `lead_submit` | Form başarıyla gönderildi |
| 🟡 SECONDARY (micro) | `outbound_click` (whatsapp) | WhatsApp'a yönlendi |
| 🟡 SECONDARY (micro) | `outbound_click` (shop) | Online mağazaya yönlendi |
| ⚪ ENGAGEMENT | `qty_selected` | Funnel sinyali (optimize edilmez, audience için) |
| ⚪ PAGE | `lp_view` | Sayfa görüntüleme |

---

## 1. Sayfada Basılan DataLayer Event'leri (Referans)

Tüm event'ler `window.dataLayer.push()` ile basılıyor. Her event'in payload'ında **ad-context alanları** (UTM + click ID'ler) otomatik olarak yer alır — bunlar inbound URL'den yakalanıp `sessionStorage`'da saklanır, sayfadaki tüm event'lere eklenir.

### 1.1 `lp_view` — Sayfa görüntüleme (her sayfa yüklemesinde)

```javascript
{
  event: 'lp_view',
  lp_id: 'qbrick-modular',          // ← sayfaya göre değişir (aşağıda liste)
  page_path: '/lp/qbrick-modular',
  referrer: 'https://www.google.com/',  // veya '(direct)'
  // + ad-context alanları (varsa):
  utm_source: 'meta',
  utm_medium: 'cpc',
  utm_campaign: 'cold_v1',
  utm_term: '...',
  utm_content: '...',
  gclid: 'ABC123',
  fbclid: 'XYZ789',
  msclkid: '...',     // Microsoft Ads
  wbraid: '...',      // Google iOS app→web
  gbraid: '...'       // Google iOS app→web
}
```

### 1.2 `outbound_click` — Dış kanala tıklama (Mağaza / Amazon / WhatsApp)

```javascript
{
  event: 'outbound_click',
  outbound_channel: 'shop',         // 'shop' | 'amazon' | 'whatsapp'
  outbound_url: 'https://shop.santekyapi.com.tr/arama/ONE+450+Profi?utm_source=meta&gclid=ABC123',
  lp_id: 'qbrick-modular',
  // + ad-context alanları (yukarıdakiyle aynı)
}
```

> **Not:** Outbound link'lere UTM + gclid + fbclid **otomatik iliştiriliyor** — `outbound_url` alanında bunu görebilirsin. Yani mağaza ve Amazon'a giden trafik atfı korunuyor.

### 1.3 `qty_selected` — Adet kartı seçimi (toplu alım funnel sinyali)

```javascript
{
  event: 'qty_selected',
  qty_tier: '6-20',                 // '1-5' | '6-20' | '21+'
  lp_id: 'qbrick-modular',
  // + ad-context alanları
}
```

### 1.4 `lead_submit` — Form başarıyla gönderildi (🔴 ANA CONVERSION)

```javascript
{
  event: 'lead_submit',
  lp_id: 'qbrick-modular',
  qty_tier: '6-20',                 // '1-5' | '6-20' | '21+' | '6+'
  // + ad-context alanları
}
```

> **Önemli:** Bu event **sadece** Worker API `{success:true}` döndürdükten sonra basılıyor. Yani form gerçekten kaydedildiğinde. Yanlış pozitif yok.

### 1.5 `lp_id` değerleri (4 sayfa)

| Sayfa URL | `lp_id` |
|---|---|
| `/lp/qbrick-modular` | `qbrick-modular` |
| `/lp/qbrick-cozum` | `qbrick-cozum` |
| `/lp/qbrick-katalog` | `qbrick-katalog` |
| `/lp/qbrick-roi` | `qbrick-roi` |

---

## 2. GTM Değişkenleri (Data Layer Variables)

**Variables → New → Data Layer Variable.** Aşağıdaki 9 DLV'yi oluştur (Version: **Version 2**):

| Değişken Adı (GTM) | Data Layer Variable Name | Açıklama |
|---|---|---|
| `DLV - lp_id` | `lp_id` | Hangi landing page |
| `DLV - outbound_channel` | `outbound_channel` | shop/amazon/whatsapp |
| `DLV - qty_tier` | `qty_tier` | Adet aralığı |
| `DLV - utm_source` | `utm_source` | |
| `DLV - utm_medium` | `utm_medium` | |
| `DLV - utm_campaign` | `utm_campaign` | |
| `DLV - gclid` | `gclid` | Google Click ID |
| `DLV - fbclid` | `fbclid` | Meta Click ID |
| `DLV - page_path` | `page_path` | |

> İstersen `utm_term`, `utm_content`, `outbound_url`, `referrer`, `wbraid`, `gbraid`, `msclkid` için de DLV ekleyebilirsin — aynı pattern.

---

## 3. Tetikleyiciler (Triggers)

**Triggers → New → Custom Event.** 4 trigger:

| Trigger Adı | Event name (tam eşleşme) | Ek koşul |
|---|---|---|
| `CE - lead_submit` | `lead_submit` | — |
| `CE - outbound_whatsapp` | `outbound_click` | `DLV - outbound_channel` **equals** `whatsapp` |
| `CE - outbound_shop` | `outbound_click` | `DLV - outbound_channel` **equals** `shop` |
| `CE - outbound_amazon` | `outbound_click` | `DLV - outbound_channel` **equals** `amazon` |
| `CE - qty_selected` | `qty_selected` | — |
| `CE - lp_view` | `lp_view` | — |

> outbound trigger'larında: "This trigger fires on → **Some Custom Events**" seç, sonra `outbound_channel equals whatsapp` koşulunu ekle.

---

## 4. GA4 Kurulumu

### 4.1 GA4 Configuration Tag
- **Tag Type:** Google Tag (GA4 Configuration)
- **Measurement ID:** `G-XXXXXXX` (Santek GA4 property ID'si — müşteriden al)
- **Trigger:** All Pages (Initialization)
- **Fields to set** (önerilir — kampanya atfı için): GA4 zaten UTM'leri otomatik okur, ek alan gerekmez.

### 4.2 GA4 Event Tag'leri

Her biri **GA4 Event** tipinde, Configuration tag'ine bağlı:

#### `GA4 - generate_lead` (🔴 ana conversion)
- **Event Name:** `generate_lead`
- **Event Parameters:**
  | Parameter | Value |
  |---|---|
  | `lp_id` | `{{DLV - lp_id}}` |
  | `qty_tier` | `{{DLV - qty_tier}}` |
  | `campaign` | `{{DLV - utm_campaign}}` |
  | `source` | `{{DLV - utm_source}}` |
- **Trigger:** `CE - lead_submit`
- ⚠️ GA4'te bu event'i **Admin → Events → Mark as conversion** ile conversion işaretle.

#### `GA4 - whatsapp_click`
- **Event Name:** `whatsapp_click`
- **Parameters:** `lp_id`, `utm_campaign`
- **Trigger:** `CE - outbound_whatsapp`
- (İstenirse conversion işaretle — micro conversion)

#### `GA4 - shop_click`
- **Event Name:** `shop_click`
- **Trigger:** `CE - outbound_shop`

#### `GA4 - amazon_click`
- **Event Name:** `amazon_click`
- **Trigger:** `CE - outbound_amazon`

#### `GA4 - qty_selected`
- **Event Name:** `select_quantity`
- **Parameters:** `qty_tier`, `lp_id`
- **Trigger:** `CE - qty_selected`

---

## 5. Google Ads Kurulumu

### 5.1 Google Ads Conversion Tracking — `lead_submit` (PRIMARY)
- **Tag Type:** Google Ads Conversion Tracking
- **Conversion ID / Label:** Google Ads → Tools → Conversions → yeni "Submit lead form" conversion oluştur, ID + Label al.
- **Conversion Value:** sabit değer girilebilir (örn. lead başına tahmini değer) veya boş.
- **Trigger:** `CE - lead_submit`
- ⚠️ **Enhanced Conversions** açılması önerilir (aşağıda Bölüm 8).

### 5.2 Google Ads — WhatsApp & Shop click (SECONDARY / micro)
İstenirse ayrı conversion action'lar (kategori: **"Contact"** veya **"Page view"**, "Secondary" olarak işaretle ki bidding'i bozmasın):
- WhatsApp click → `CE - outbound_whatsapp`
- Shop click → `CE - outbound_shop`

> ⚠️ Micro conversion'ları **"Secondary"** action olarak ayarla. Sadece `lead_submit` "Primary" olmalı, yoksa Smart Bidding yanlış optimize eder.

### 5.3 Google Ads Remarketing
- **Google Ads Remarketing** tag, **All Pages** trigger.
- Audience'lar GA4 veya Google Ads'ten oluşturulabilir: "lp_view ama lead_submit yok" (sepeti terk edenler gibi).

---

## 6. Meta (Facebook) Pixel Kurulumu

### 6.1 Meta Pixel Base Code
- **Tag Type:** Custom HTML (veya "Facebook Pixel" community template)
- **Pixel ID:** Santek Meta Pixel ID'si (müşteriden al)
- **Trigger:** All Pages

### 6.2 Meta Standard Event'leri

| Meta Event | Trigger | Açıklama |
|---|---|---|
| `Lead` | `CE - lead_submit` | 🔴 ana conversion |
| `Contact` | `CE - outbound_whatsapp` | WhatsApp tıklaması |
| `ViewContent` | `CE - outbound_shop` + `CE - outbound_amazon` | Ürün/mağaza yönlendirme |

**Lead event örneği (Custom HTML):**
```html
<script>
  fbq('track', 'Lead', {
    content_category: {{DLV - lp_id}},
    content_name: {{DLV - qty_tier}}
  });
</script>
```

### 6.3 ⚠️ Meta Click ID (fbclid) & CAPI
- Sayfada `fbclid` yakalanıyor ve `DLV - fbclid` ile okunabilir.
- **Browser pixel** için `_fbp` / `_fbc` cookie'leri Meta tarafından otomatik set edilir; ekstra iş gerekmez.
- **Conversions API (CAPI)** kurmak istenirse: lead'ler zaten Cloudflare D1'e UTM + fbclid ile yazılıyor (`contact_submissions` tablosu). Server-side CAPI için bu veri kaynağı kullanılabilir — ayrı entegrasyon işi, bu dokümanın kapsamı dışı ama veri hazır.

---

## 7. iOS / Microsoft Click ID'leri
Sayfada ayrıca yakalanan ve DLV ile okunabilen alanlar:
- `wbraid`, `gbraid` → Google iOS app→web kampanyaları (Google Ads conversion tag bunları otomatik kullanır)
- `msclkid` → Microsoft (Bing) Ads — Microsoft Ads UET tag kurulacaksa kullan.

---

## 8. Enhanced Conversions (önerilir)

Form gönderiminde kullanıcının **e-posta + telefon** bilgisi var. Enhanced Conversions ile atıf kalitesi ciddi artar.

**Sorun:** `lead_submit` event'i şu an form alanlarını payload'a koymuyor (sadece `qty_tier` + ad-context).

**İki seçenek:**
1. **GTM'de manuel mapping** — form input'larından (`#f-eposta`, `#f-tel`) CSS-selector DLV'leriyle değerleri oku. (Form gönderilince DOM'da hâlâ duruyor.)
2. **Geliştirici ricası** — `lead_submit` push'una `email` ve `phone` alanları eklenebilir. İstersen bunu LP koduna ekleyebiliriz (KVKK gereği hash'lenmeden gönderilmemeli; Google Ads Enhanced Conversions SHA-256 hash'i kendi yapar ama yine de dikkat).

> **Karar GTM uzmanına bırakılıyor.** Seçenek 1 için form alanlarının ID'leri: `f-ad`, `f-soyad`, `f-eposta`, `f-tel`, `f-sirket`. Geliştirici tarafı gerekiyorsa bize haber verin.

---

## 9. Consent Mode (KVKK/GDPR)
Site TR pazarına yönelik. Consent Mode v2 önerilir:
- Default state: `denied` (analytics_storage, ad_storage, ad_user_data, ad_personalization)
- Kullanıcı çerez banner'ında kabul edince `update` → `granted`.
- GTM Consent Initialization trigger + bir CMP (Cookiebot, iubenda vb.) gerekir.
- **Not:** Şu an sayfada çerez banner'ı / CMP **yok**. Eklenmesi gerekiyorsa ayrı iş.

---

## 10. Conversion Eşleştirme Tablosu (Özet)

| Sayfa Event | GA4 Event | Google Ads | Meta Pixel | Öncelik |
|---|---|---|---|---|
| `lead_submit` | `generate_lead` ✅conv | Lead form (Primary) | `Lead` | 🔴 ANA |
| `outbound_click` (whatsapp) | `whatsapp_click` | Contact (Secondary) | `Contact` | 🟡 Micro |
| `outbound_click` (shop) | `shop_click` | Page view (Secondary) | `ViewContent` | 🟡 Micro |
| `outbound_click` (amazon) | `amazon_click` | — | `ViewContent` | ⚪ |
| `qty_selected` | `select_quantity` | — | — | ⚪ Funnel |
| `lp_view` | (otomatik page_view) | Remarketing | `PageView` | ⚪ Sayfa |

---

## 11. Test / QA Checklist

GTM **Preview (Tag Assistant)** modunda:

1. **`?utm_source=meta&utm_campaign=test&gclid=ABC&fbclid=XYZ`** parametreleriyle bir LP aç.
   - `lp_view` event'i tetiklenmeli, `DLV - utm_source = meta` görünmeli.
2. **Adet kartı seç** (6–20) → `qty_selected` tetiklenmeli, `qty_tier = 6-20`.
3. **Formu doldur + gönder** → `lead_submit` tetiklenmeli.
   - GA4 `generate_lead`, Google Ads conversion, Meta `Lead` tag'leri **fired** olmalı.
4. **WhatsApp / Mağaza / Amazon butonlarına tıkla** → `outbound_click` tetiklenmeli, `outbound_channel` doğru olmalı.
   - Açılan URL'de `utm_source=meta&gclid=ABC` **iliştirilmiş** olmalı (atıf zinciri korunuyor).
5. **GA4 DebugView** ve **Meta Pixel Helper** ile gerçek zamanlı doğrula.
6. **Google Ads** → conversion action "Recent conversions" 24–48 saat içinde dolmalı (test conversion).

---

## 12. Container Bilgisi
- **Container ID:** `GTM-PXS2Q35R`
- **Kurulu olduğu sayfalar:** Ana site (`/`) + 4 LP (`/lp/qbrick-*`)
- LP'ler ayrı statik HTML — SPA değil, her sayfa yüklemesinde GTM yeniden init olur.
- DataLayer event'leri **GTM yüklenmeden önce** `window.dataLayer = window.dataLayer || []` ile init edildiği için kaybedilmez; GTM yüklenince işlenir.

---

## İletişim / Geliştirici Notları
- LP kaynak kodu: `github.com/mahir550/santekyapi-website` → `public/lp/qbrick-*.html`
- DataLayer push kodu her LP'nin `<head>`'inde (ad-context) ve `<script>` bloğunda (event'ler).
- Yeni event veya alan gerekiyorsa geliştiriciye iletin.

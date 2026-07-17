# Google Tag Manager Kurulum Dokümanı — Santek Qbrick Landing Page'leri

> **Hedef kitle:** GTM uzmanı
> **Container:** `GTM-PXS2Q35R` (zaten 5 LP'ye ve ana sayfaya gömülü)
> **Kapsam:** 4 Qbrick landing page + Qbrick x Bauhaus LP + ana site
> **Son güncelleme:** 2026-07

> **Not:** Bölüm 1–12, ilk 4 LP'nin (`qbrick-modular/cozum/katalog/roi`) `lead_submit` odaklı event şemasını kapsar. `qbrick-bauhaus` sayfası farklı bir modelde çalışır (form yok, mağaza bulucu + ürün linkleri) — onun için ayrı bir event şeması ve kurulum adımları **Bölüm 13**'te.

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
| `/lp/qbrick-bauhaus` | `qbrick-bauhaus` (ayrı event şeması — Bölüm 13) |

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

## 8. Enhanced Conversions ✅ (KURULU — yapılması gerekenler aşağıda)

Form gönderiminde kullanıcının **e-posta + telefon + ad + soyad** bilgisi `lead_submit` event'inin `user_data` nesnesinde **normalize edilmiş halde** dataLayer'a basılıyor. Bu, hem **Google Ads Enhanced Conversions** hem **Meta Advanced Matching** için hazır.

### 8.1 `lead_submit` payload'ında ne var?

```javascript
{
  event: 'lead_submit',
  lp_id: 'qbrick-modular',
  qty_tier: '6-20',
  user_data: {
    email: 'ahmet@firma.com',        // trim + lowercase yapılmış
    phone_number: '+905327280728',   // E.164 (TR), mobil + sabit hat destekli
    first_name: 'Ahmet',
    last_name: 'Yılmaz'
  },
  // + ad-context (utm_*, gclid, fbclid...)
}
```

> **Normalizasyon sayfada yapılıyor:** email lowercase+trim; telefon E.164'e çevriliyor (`0532...` → `+90532...`, `0212...` → `+90212...`). Geçersiz/eksik alanlar `user_data`'ya hiç eklenmiyor.
> **Hash'leme:** Veri **plain (hash'siz)** gönderiliyor. Bu bilinçli bir tercih — Google ve Meta kendi tarafında SHA-256 normalize+hash yapıyor; client-side yanlış normalize edilmiş hash sessizce eşleşmez. Plain göndermek Google'ın EC-via-GTM için **resmî önerisi**. Veri HTTPS üzerinden gidiyor, Google/Meta saklamadan önce hash'liyor.

### 8.2 Data Layer Variable'lar (ekle)

| GTM Değişken Adı | Data Layer Variable Name |
|---|---|
| `DLV - ud_email` | `user_data.email` |
| `DLV - ud_phone` | `user_data.phone_number` |
| `DLV - ud_fname` | `user_data.first_name` |
| `DLV - ud_lname` | `user_data.last_name` |

> Nokta notasyonu (`user_data.email`) Version 2 DLV'de doğrudan çalışır.

### 8.3 Google Ads Enhanced Conversions — Kurulum

**A. Google Ads arayüzünde aç:**
- Tools → Conversions → ilgili **Lead form** conversion'ı seç → Settings → **Enhanced conversions** → "Turn on" → Yöntem: **Google Tag Manager**.

**B. GTM'de "User-Provided Data" değişkeni oluştur:**
- Variables → New → **User-Provided Data**
- Type: **Manual configuration**
- Email: `{{DLV - ud_email}}`
- Phone Number: `{{DLV - ud_phone}}`
- First Name: `{{DLV - ud_fname}}`
- Last Name: `{{DLV - ud_lname}}`
- Adı: `UPD - Lead`

**C. Google Ads Conversion tag'ine bağla:**
- Bölüm 5.1'deki `lead_submit` conversion tag'ini aç → **Include user-provided data from your website** → **Enhanced Conversions açık** → "User-Provided Data Variable" = `{{UPD - Lead}}`.
- Trigger değişmiyor: `CE - lead_submit`.

### 8.4 Meta Advanced Matching — Kurulum

Meta `Lead` event'inde manuel advanced matching parametreleri geç (Meta plain veriyi kendi hash'ler):

```html
<script>
  fbq('track', 'Lead', {
    content_category: {{DLV - lp_id}},
    content_name: {{DLV - qty_tier}}
  }, {
    eventID: 'lead_' + Date.now()
  });
</script>
```

Advanced Matching için Meta base pixel'i init ederken veya event'te `em`/`ph` geçilebilir. En temizi **otomatik Advanced Matching**'i Meta Events Manager → Settings → "Automatic Advanced Matching" açmak; pixel form alanlarını kendi yakalar. Manuel istenirse `{{DLV - ud_email}}` ve `{{DLV - ud_phone}}` kullan.

### 8.5 KVKK Notu
- Veri kullanıcının **kendi gönderdiği** bilgi, sadece **conversion eşleştirme** için kullanılıyor, Google/Meta tarafında hash'leniyor.
- Gizlilik politikasında "reklam ölçümleme için verilerin işlenmesi" maddesi olmalı.
- Çerez/onay banner'ı (CMP) henüz **yok** — Consent Mode ile birlikte kurulması önerilir (Bölüm 9).

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
   - **Enhanced Conversions:** Tag Assistant → `lead_submit` event → Data Layer sekmesinde `user_data` nesnesi görünmeli: `email` (lowercase), `phone_number` (`+90...` E.164), `first_name`, `last_name`.
   - `{{UPD - Lead}}` değişkeni Variables sekmesinde dolu olmalı.
   - Google Ads → Conversion → Enhanced Conversions teşhis bölümü 24-48 saatte "Recording enhanced conversions" yeşil olmalı.
4. **WhatsApp / Mağaza / Amazon butonlarına tıkla** → `outbound_click` tetiklenmeli, `outbound_channel` doğru olmalı.
   - Açılan URL'de `utm_source=meta&gclid=ABC` **iliştirilmiş** olmalı (atıf zinciri korunuyor).
5. **GA4 DebugView** ve **Meta Pixel Helper** ile gerçek zamanlı doğrula.
6. **Google Ads** → conversion action "Recent conversions" 24–48 saat içinde dolmalı (test conversion).

---

## 12. Container Bilgisi
- **Container ID:** `GTM-PXS2Q35R`
- **Kurulu olduğu sayfalar:** Ana site (`/`) + 5 LP (`/lp/qbrick-*`, `/lp/qbrick-bauhaus` dahil)
- LP'ler ayrı statik HTML — SPA değil, her sayfa yüklemesinde GTM yeniden init olur.
- DataLayer event'leri **GTM yüklenmeden önce** `window.dataLayer = window.dataLayer || []` ile init edildiği için kaybedilmez; GTM yüklenince işlenir.

---

## 13. Qbrick x Bauhaus LP (`/lp/qbrick-bauhaus`) — Ayrı Event Şeması

Bu sayfada form yok (lead capture yapmıyor) — amaç ziyaretçiyi ya fiziksel Bauhaus mağazasına (yol tarifi/arama) ya da online mağazaya/ürüne yönlendirmek. Bu yüzden Bölüm 1-12'deki `lead_submit`/`outbound_click` şeması yerine, tüm CTA'lar **tek bir custom event** (`cta_click`) üzerinden, `cta_type` alanıyla ayrıştırılarak basılıyor.

### 13.1 `cta_click` — Payload Şekli

```javascript
{
  event: 'cta_click',
  lp_id: 'qbrick-bauhaus',
  cta_type: 'product',              // aşağıdaki tablo — 7 olası değer
  cta_location: 'hero',             // sadece store_finder/shop/amazon/outbound'da var
  store_name: 'Bauhaus Kozyatağı',  // sadece store_direction/store_call'da var
  phone: '+902165787070',           // sadece store_call'da var
  product_series: 'PRO',            // sadece product'ta var
  product_name: 'PRO Organizer 300 Red UHD'  // sadece product'ta var
}
```

> Ad-context (utm_*, gclid, fbclid) bu sayfada da `lp_view` event'ine ekleniyor (Bölüm 1.1 ile aynı mekanizma), ama `cta_click`'e **eklenmiyor** — istenirse bu geliştirilebilir, şu an kapsam dışı.

### 13.2 `cta_type` Değerleri ve Nerede Basıldığı

| `cta_type` | Basıldığı yer(ler) | Ek alanlar | Anlamı |
|---|---|---|---|
| `store_finder` | Nav, Hero, Footer, Sticky mobil bar — "Mağaza Bul" / "En Yakın Mağazayı Bul" | `cta_location` | Sadece `#stores`'a scroll — henüz gerçek yönlendirme değil |
| `store_direction` | Kozyatağı kartı — "Yol Tarifi Al" | `store_name` | Google Maps directions linkine tıkladı — **en yüksek niyetli mağaza sinyali** |
| `store_call` | Kozyatağı kartı — "Ara" | `store_name`, `phone` | `tel:` linkine tıkladı |
| `shop` | Nav, Hero, Final CTA, Footer, Sticky — "Online Satın Al/Mağaza/Al" | `cta_location` | shop.santekyapi.com.tr'a gitti |
| `product` | 15 ürün satırının her biri | `product_series`, `product_name` | Belirli bir SKU'ya tıkladı — **en yüksek niyetli ürün sinyali** |
| `amazon` | Footer — "Amazon" | `cta_location` | amazon.com.tr'a gitti |
| `outbound` | Footer — "Qbrick Global" | `cta_location` | qbricksystem.com'a gitti |

### 13.3 GTM Değişkenleri (Data Layer Variables)

Bölüm 2'deki DLV'lere ek olarak (Version 2):

| Değişken Adı (GTM) | Data Layer Variable Name |
|---|---|
| `DLV - cta_type` | `cta_type` |
| `DLV - cta_location` | `cta_location` |
| `DLV - store_name` | `store_name` |
| `DLV - product_series` | `product_series` |
| `DLV - product_name` | `product_name` |

### 13.4 Tetikleyici

Tek bir trigger yeterli, tag'ler `cta_type` koşuluyla ayrışıyor:

| Trigger Adı | Event name | Ek koşul |
|---|---|---|
| `CE - cta_click` | `cta_click` | — (tag bazında `DLV - cta_type` ile filtrele) |

İsterseniz her `cta_type` için ayrı trigger de açılabilir (örn. `CE - cta_click_product`: `cta_click` + `DLV - cta_type equals product`) — GA4 tag sayısı artacağından tag bazında filtrelemek (aşağıdaki gibi) daha az bakım gerektirir.

### 13.5 GA4 Event Tag'leri

Hepsi **GA4 Event** tipinde, `CE - cta_click` trigger'ına bağlı, **Trigger'ın "This trigger fires on" alanında `cta_type` koşuluyla filtrelenmiş**:

#### `GA4 - store_finder_click`
- **Event Name:** `store_finder_click`
- **Koşul:** `DLV - cta_type` equals `store_finder`
- **Parameters:** `lp_id`, `cta_location`

#### `GA4 - get_directions` (🔴 en önemli mağaza sinyali)
- **Event Name:** `get_directions` (GA4'ün bazı önerilen event isimlerinden biriyle örtüşüyor, otomatik faydalanır)
- **Koşul:** `DLV - cta_type` equals `store_direction`
- **Parameters:** `lp_id`, `store_name`
- ⚠️ **Admin → Events → Mark as conversion** ile conversion işaretlenmesi önerilir.

#### `GA4 - store_call_click`
- **Koşul:** `DLV - cta_type` equals `store_call`
- **Parameters:** `lp_id`, `store_name`, `phone`
- Conversion işaretlenebilir (micro).

#### `GA4 - shop_click`
- **Koşul:** `DLV - cta_type` equals `shop`
- **Parameters:** `lp_id`, `cta_location`

#### `GA4 - product_click` (🔴 en önemli ürün sinyali)
- **Event Name:** `select_item` (GA4'ün resmî e-ticaret event'i — item_list_name yerine `product_series`, item_name yerine `product_name` kullanılabilir) **veya** basit `product_click` (custom, e-ticaret şeması istenmiyorsa)
- **Koşul:** `DLV - cta_type` equals `product`
- **Parameters:** `lp_id`, `product_series`, `product_name`
- Bu event hangi SKU'nun en çok tıklandığını gösterir — kampanya/ürün önceliklendirmesi için değerli, mutlaka kurulmalı.

#### `GA4 - amazon_click` / `GA4 - outbound_click`
- **Koşul:** `DLV - cta_type` equals `amazon` / `outbound`
- **Parameters:** `lp_id`, `cta_location`

### 13.6 Google Ads / Meta (opsiyonel)

Bu sayfa lead formu içermediğinden **Primary conversion önerisi `store_direction`** (gerçek mağaza ziyareti niyeti) veya **`product` click** (ürün ilgisi) olabilir — ikisi de **Secondary/micro** olarak işaretlenmeli, çünkü hiçbiri kesin bir satın alma değil. Google Ads/Meta tag kurulumu Bölüm 5-6'daki adımlarla birebir aynı, sadece trigger'lar 13.4'teki `CE - cta_click` + `cta_type` koşuluyla değişiyor.

### 13.7 Test / QA Checklist

GTM Preview modunda `https://www.santekyapi.com.tr/lp/qbrick-bauhaus` aç:

1. **"Mağaza Bul"** (nav, hero, footer, sticky'nin her biri ayrı ayrı) → her tıklamada `cta_click` + `cta_type=store_finder` + doğru `cta_location` görünmeli.
2. **"Yol Tarifi Al"** → `cta_type=store_direction`, `store_name=Bauhaus Kozyatağı` — yeni sekmede Google Maps açılmalı.
3. **"Ara"** → `cta_type=store_call`, `phone=+902165787070`.
4. **15 ürün satırının her birine tıkla** → her birinde `cta_type=product`, doğru `product_series` (PRIME/ONE/PRO) ve `product_name` — yeni sekmede doğru shop.santekyapi.com.tr sayfası açılmalı.
5. **"Online Satın Al" / "Online Mağaza" / "Online Al" / "Online Mağazaya Git"** (4 farklı yer) → `cta_type=shop`, `cta_location` her birinde farklı (`hero`/`nav`/`sticky`/`final_cta`).
6. **Footer "Amazon"** ve **"Qbrick Global"** → sırasıyla `cta_type=amazon` ve `cta_type=outbound`.
7. GA4 **DebugView**'da yukarıdaki 7 event'in hepsinin doğru parametrelerle geldiğini doğrula.

---

## İletişim / Geliştirici Notları
- LP kaynak kodu: `github.com/mahir550/santekyapi-website` → `public/lp/qbrick-*.html`
- DataLayer push kodu her LP'nin `<head>`'inde (ad-context) ve `<script>` bloğunda (event'ler).
- Yeni event veya alan gerekiyorsa geliştiriciye iletin.

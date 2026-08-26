-- Harga consumable per cabang.
--
-- Sebelumnya angkanya konstanta di kode — dikarang saat implementasi dan
-- diam-diam ikut ke setiap perhitungan rekap. PRD memang meminta "estimasi
-- biaya consumable terpakai" tanpa menyebut angkanya, jadi angkanya adalah
-- masukan bisnis, bukan keputusan teknis.
--
-- Defaultnya sengaja KOSONG, bukan tebakan: rekap akan menampilkan "harga
-- belum diatur" alih-alih Rp 0 yang terlihat seolah gratis. Tiap cabang bisa
-- beli strip dengan harga berbeda, jadi disimpan per tenant.
--
-- Bentuk: {"gula": 6000, "kolesterol": 12000, "asam_urat": 8000}
--         (rupiah per pemeriksaan; parameter tanpa strip tidak perlu ada)

alter table tenants
  add column consumable_prices jsonb not null default '{}'::jsonb;

alter table tenants
  add constraint tenants_consumable_prices_object
  check (jsonb_typeof(consumable_prices) = 'object');

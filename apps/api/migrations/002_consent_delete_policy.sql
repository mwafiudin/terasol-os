-- Consent tetap immutable terhadap UPDATE (§4.2: hanya insert baru, tidak
-- pernah diubah). Namun memblokir DELETE sepenuhnya membuat dua kewajiban lain
-- mustahil dijalankan: penghapusan data peserta atas permintaan (§4.5.7) dan
-- purge saat retensi habis (D4/D5) — keduanya menghapus lewat cascade.
--
-- Jalan keluarnya dibuat eksplisit, bukan longgar: DELETE hanya lolos bila
-- transaksi menyatakan diri sebagai purge resmi lewat app.purge = 'on'.
-- Penghapusan tak sengaja tetap ditolak.

create or replace function consents_immutable() returns trigger
  language plpgsql as $$
    begin
      if tg_op = 'UPDATE' then
        raise exception
          'consents bersifat immutable — buat record consent baru, jangan ubah yang lama';
      end if;

      if coalesce(nullif(current_setting('app.purge', true), ''), 'off') <> 'on' then
        raise exception
          'consents hanya boleh dihapus lewat purge resmi (set app.purge = ''on'' dalam transaksi)';
      end if;

      return old;
    end;
  $$;

drop trigger if exists consents_no_update on consents;
create trigger consents_no_update before update or delete on consents
  for each row execute function consents_immutable();

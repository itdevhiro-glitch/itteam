# Fitur Excel Import / Export

## Yang Ditambahkan
- Dashboard Admin sekarang punya tombol **Download Semua Data Excel** dan **Upload Excel & Update Data** di topbar.
- Menu Tickets, Users, Requests, Assets, dan Vendors punya tombol **Excel** untuk export per modul.
- Portal teknisi `pages/tiketing.html` punya tombol **Download Excel** dan **Upload Excel** khusus tiket.

## Data yang Bisa Diexport/Import
Workbook semua data berisi sheet:
- `Tickets` -> Realtime Database path `reports`, key wajib `id`
- `Users` -> Realtime Database path `users`, key wajib `uid`
- `Requests` -> Realtime Database path `device_requests`, key wajib `id`
- `Assets` -> Firestore collection `assets`, key wajib `id`
- `Vendors` -> Firestore collection `vendors`, key wajib `id`
- `Announcements` -> Realtime Database path `announcements`, key wajib `key`

## Cara Pakai Aman
1. Download Excel dari sistem.
2. Edit data yang diperlukan.
3. Jangan hapus/ubah kolom key utama: `id`, `uid`, atau `key`.
4. Upload kembali file Excel.
5. Sistem akan **merge/update** data existing berdasarkan key utama.
6. Data yang tidak ada di Excel **tidak dihapus**.

## Catatan Penting
- Upload Excel membutuhkan koneksi internet karena memakai CDN SheetJS.
- Untuk field object/array, sistem export dalam format JSON string dan akan parse balik saat import.
- Setiap data hasil import ditambahkan field `imported_at`.

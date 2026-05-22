# Zeppelin Help — Enhanced Build

Perubahan utama pada build ini:

1. **Backup/restore lengkap**
   - Backup sekarang mencakup `reports`, `users`, `device_requests`, `announcements`, `assets`, dan `vendors`.
   - Restore sekarang mengembalikan RTDB + Firestore, bukan hanya tiket.

2. **Create user lebih aman**
   - Pembuatan user tetap memakai Firebase secondary app agar admin tidak logout.
   - Nama secondary app dibuat unik, lalu selalu dihapus pada `finally`.
   - Password divalidasi minimal 6 karakter.

3. **Reset password proper**
   - Browser hanya membuat request ke `password_reset_requests`.
   - Cloud Function/Admin SDK yang benar-benar mengubah password Firebase Auth ke `123456`.

4. **Integrasi asset/request lebih rapi**
   - Approval request bisa mengubah status asset menjadi `In Use` dan mengikat `assigned_uid` ke user.
   - Save asset/vendor/ticket menambahkan `updated_at` / `updated_by` / audit field.

5. **Theme persist**
   - Pilihan light/dark disimpan ke `localStorage`.

6. **Rules siap deploy**
   - `database.rules.json` tetap dipakai untuk RTDB.
   - Ditambahkan `firestore.rules` untuk koleksi `assets`, `vendors`, dan asset user.
   - Ditambahkan `firebase.json` agar deploy database, firestore, hosting, dan functions lebih jelas.

## Deploy yang disarankan

```bash
firebase deploy --only database,firestore,functions,hosting
```

## Catatan penting

- Admin UID sudah dipertahankan: `Ogy9lUbGHbSu8wYIYx2gQsTtFDF2`.
- Domain publik di UI backup/footer diarahkan ke `zeppelin.help`.
- Jangan taruh credential Admin SDK/service account di HTML/JS browser.

7. **Service Worker ringan**
   - `sw.js` ditambahkan untuk cache shell dasar saat website sudah pernah dibuka.
   - Aktif hanya saat dijalankan via hosting/http(s), bukan `file://`.

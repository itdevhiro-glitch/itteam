# IT Team Refactored

Struktur sudah dipisah menjadi:

- `index.html` untuk dashboard utama
- `pages/` untuk halaman terpisah
- `assets/css/` untuk semua stylesheet
- `assets/js/` untuk semua JavaScript
- `assets/img/` untuk asset gambar/favicon
- `functions/` contoh Cloud Function untuk reset password karyawan

## Reset password default 123456

Firebase client SDK di browser tidak bisa mengubah password user lain secara langsung. Tombol reset di dashboard sekarang membuat request pada node `password_reset_requests/{uid}` dan menandai user `passwordResetRequired: true`.

Agar password Firebase Auth benar-benar berubah ke `123456`, deploy Cloud Function/Admin SDK pada folder `functions/`. Jangan taruh service account/admin credential di HTML/JS browser.

FIX CATATAN

- UID owner/admin TETAP: Ogy9lUbGHbSu8wYIYx2gQsTtFDF2
- Tidak ada UID VWk87... di project ini.
- Struktur sudah dipisah:
  index.html
  pages/
  assets/css/
  assets/js/
  functions/
- File rules yang harus ditempel ke Firebase Realtime Database Rules: database.rules.json
- Penyebab PERMISSION_DENIED reset password sebelumnya: code menulis ke path password_reset_requests, tapi rules lama belum punya izin untuk path itu.
- Reset password user lain ke 123456 tetap harus lewat Cloud Functions/Admin SDK, bukan langsung dari browser.

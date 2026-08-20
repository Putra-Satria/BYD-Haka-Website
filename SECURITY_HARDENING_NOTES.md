# Security Hardening & Security Audit Notes

Fitur yang ditambahkan:

1. **Security Audit Page**
   - URL: `/admin/security-audit`
   - Hanya bisa diakses role `admin`.
   - Menampilkan checklist hardening dan audit log akses dokumen.

2. **NIK Masking**
   - NIK KTP tidak ditampilkan penuh di tabel admin, talent pool, fixed employees, onboarding, dan export Excel.
   - Contoh: `327105******0001`.

3. **Signed URL untuk Dokumen**
   - Admin membuka CV/ijazah/paklaring melalui signed URL 120 detik.
   - Link dokumen tidak permanen.

4. **Upload Hardening**
   - File divalidasi berdasarkan extension, MIME type, dan ukuran maksimal.
   - Nama file asli user tidak dipakai. Sistem memakai UUID agar nama/NIK user tidak bocor dari URL/path.

5. **Security Audit Log**
   - Akses dokumen, download dokumen, export data, dan upload dokumen dicatat ke tabel `security_audit_logs`.
   - Jika migration belum dijalankan, halaman audit akan tampil pakai data demo.

SQL yang harus dijalankan di Supabase:

```sql
-- buka file:
supabase/migrations/20260712000000_security_hardening_audit.sql
```

Catatan penting:
- Setelah bucket `application-documents` dibuat private, akses dokumen harus melalui signed URL, bukan public URL.
- Pastikan user admin memiliki role `admin` di tabel `user_roles`.

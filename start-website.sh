#!/bin/bash

echo "=========================================="
echo "  MEMULAI WEBSITE HAKA AUTO REKRUTMEN"
echo "=========================================="

# 1. Dapatkan IP Address Lokal Komputer saat ini
CURRENT_IP=$(hostname -I | awk '{print $1}')
echo "[1] Mendeteksi IP Address saat ini: $CURRENT_IP"

# 2. Update server/.env
echo "[2] Memperbarui konfigurasi IP di Backend..."
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://$CURRENT_IP:8080|g" server/.env

# 3. Update .env utama (Frontend)
echo "[3] Memperbarui konfigurasi IP di Frontend..."
sed -i "s|VITE_WAZUH_ALERT_API=.*|VITE_WAZUH_ALERT_API=\"http://$CURRENT_IP:3001/api/wazuh-alerts\"|g" .env

# 4. Mematikan sisa proses lama agar tidak bentrok
echo "[4] Membersihkan proses lama..."
kill $(lsof -t -i:3001) 2>/dev/null
kill $(lsof -t -i:8080) 2>/dev/null
sleep 1

# 5. Menjalankan Backend Proxy
echo "[5] Menjalankan Backend Proxy (Port 3001)..."
cd server && nohup node index.js > /dev/null 2>&1 &
cd ..

# 6. Menjalankan Frontend (Vite)
echo "[6] Menjalankan Frontend React (Port 8080)..."
nohup npx vite --host > /dev/null 2>&1 &

echo "=========================================="
echo "✅ SUKSES! Website sedang dijalankan."
echo ""
echo "Tunggu sekitar 3-5 detik, lalu buka di browser Anda:"
echo "👉 http://$CURRENT_IP:8080"
echo "=========================================="

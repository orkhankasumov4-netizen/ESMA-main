#!/bin/bash

# ─── Konfiqurasiya ───────────────────────────────────────────
PORT=8081
HTML_FILE="claude-pro.html"

echo ""
echo "========================================================="
echo "  Claude Pro Local Server"
echo "========================================================="
echo ""

# 1. HTML faylını yoxla
if [ ! -f "$HTML_FILE" ]; then
  echo "[XETA] $HTML_FILE bu qovluqda tapilmadi."
  echo "Xahis olunur bu skripti $HTML_FILE ile eyni qovluga qoyun."
  exit 1
fi

# 2. Python yoxla (sisteme görə python3 və ya python)
if command -v python3 &>/dev/null; then
  PYTHON=python3
elif command -v python &>/dev/null; then
  PYTHON=python
else
  echo "[XETA] Komputerde Python qurasdirilmayib."
  echo "Zehmet olmasa https://www.python.org saytindan yukleyin."
  exit 1
fi

echo "[-] Python tapildi: $($PYTHON --version)"

# 3. Brauzeri aç (Mac-da 'open', Linux-da 'xdg-open')
echo "[+] Brauzer acilir..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "http://localhost:$PORT/$HTML_FILE"
else
  xdg-open "http://localhost:$PORT/$HTML_FILE" 2>/dev/null || true
fi

echo ""
echo "========================================================="
echo "  UGURLU! Server hal-hazirda isleyir."
echo ""
echo "  SERVERI DAYANDIRMAQ UCUN: Ctrl+C"
echo "  URL: http://localhost:$PORT/$HTML_FILE"
echo "========================================================="
echo ""

# 4. Serveri başlat
$PYTHON -m http.server $PORT

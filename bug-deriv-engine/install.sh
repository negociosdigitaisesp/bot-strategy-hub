#!/bin/bash
# install.sh — Instala dependências do Bug Deriv Signal Engine
set -e

echo "=== Bug Deriv Signal Engine — Instalação ==="
echo ""

# Garante pip atualizado
pip install --upgrade pip --quiet

# Instala dependências fixas
pip install websockets==12.0 numpy==1.26.4 scipy==1.12.0

echo ""
echo "=== Dependências instaladas com sucesso! ==="
echo ""
echo "PRÓXIMOS PASSOS:"
echo "  1. Verifique DERIV_APP_ID em config.py (atual: 85515)"
echo "  2. Para rodar em foreground:   python3 main.py"
echo "  3. Para rodar em background:   nohup python3 main.py > logs/server.log 2>&1 &"
echo "  4. Para ver logs em tempo real: tail -f logs/server.log"
echo ""

# Cria diretório de logs
mkdir -p logs
echo "Diretório logs/ criado."

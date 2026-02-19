# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import paramiko, time

HOST = "191.252.182.208"
USER = "root"
PASS = "Vom29bd#@"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

def run(cmd, timeout=20):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if o: print(o)
    if e and 'warning' not in e.lower(): print("ERR:", e[:300])

print("=== VERIFICACAO AO VIVO ===\n")

print("--- Servico ativo? ---")
run("systemctl is-active bug-deriv")

print("\n--- Clientes conectados e sinais recentes ---")
run("journalctl -u bug-deriv --no-pager -n 30")

print("\n--- Teste: conectar websocket ao VPS e aguardar mensagem ---")
# Testar conexao websocket localmente na VPS
run("""python3 -c "
import asyncio, websockets, json, time

async def test():
    try:
        async with websockets.connect('ws://localhost:8000', open_timeout=5) as ws:
            print('WS conectado ao localhost:8000')
            msg = await asyncio.wait_for(ws.recv(), timeout=15)
            data = json.loads(msg)
            print('MENSAGEM RECEBIDA:', json.dumps(data, indent=2)[:500])
    except asyncio.TimeoutError:
        print('TIMEOUT: nenhuma mensagem em 15s (sem sinal emitido nesse periodo)')
    except Exception as e:
        print('ERRO:', e)

asyncio.run(test())
" 2>&1""", timeout=25)

ssh.close()
print("\n=== FIM ===")

"""
Script orquestrador Python para gerar 50 estratégias automaticamente
Executa workflows via Antigravity para cada bloco de estratégias
"""
import os
import time
import subprocess
from datetime import datetime

# Configurações
MATRIX_FILE = "matrix_65_strategies.csv"
WORKFLOW_COMMAND = "antigravity"  # ou path completo se necessário

# Grupos de IDs para processar
BATCHES = {
    "TIER1_novas": {
        "ids": list(range(16, 21)),  # 16-20
        "tier": 1,
        "desc": "5 estratégias TIER 1 (Conservative)"
    },
    "TIER2_batch1": {
        "ids": list(range(21, 31)),  # 21-30
        "tier": 2,
        "desc": "10 estratégias TIER 2 Parte 1"
    },
    "TIER2_batch2": {
        "ids": list(range(31, 41)),  # 31-40
        "tier": 2,
        "desc": "10 estratégias TIER 2 Parte 2"
    },
    "TIER2_batch3": {
        "ids": list(range(41, 46)),  # 41-45
        "tier": 2,
        "desc": "5 estratégias TIER 2 Parte 3"
    },
    "TIER3_batch1": {
        "ids": list(range(46, 56)),  # 46-55
        "tier": 3,
        "desc": "10 estratégias TIER 3 Parte 1"
    },
    "TIER3_batch2": {
        "ids": list(range(56, 66)),  # 56-65
        "tier": 3,
        "desc": "10 estratégias TIER 3 Parte 2"
    }
}

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

def execute_batch(batch_name, batch_config):
    """Executa geração de um lote de estratégias"""
    ids = batch_config["ids"]
    tier = batch_config["tier"]
    desc = batch_config["desc"]
    
    log(f"📦 Processando: {desc}")
    log(f"   IDs: {ids}")
    log(f"   Tier: {tier}")
    
    # Construir lista de IDs separada por vírgula
    ids_str = ",".join(map(str, ids))
    
    # Executar workflow /gerar-multiplas
    log(f"🚀 Executando: /gerar-multiplas {ids_str} {tier}")
    
    # Aqui você vai usar o comando do Antigravity para invocar o workflow
    # Substitua pelo comando correto do seu ambiente
    # Exemplo: subprocess.run(['antigravity', 'workflow', 'gerar-multiplas', ids_str, str(tier)])
    
    # Por enquanto, vamos apenas simular (SUBSTITUA POR COMANDO REAL):
    print(f"\n{'='*60}")
    print(f"COMANDO A EXECUTAR:")
    print(f"@antigravity /gerar-multiplas {ids_str} {tier}")
    print(f"{'='*60}\n")
    
    # NOTA: Você precisará executar este comando manualmente OU
    # integrar com a API do Antigravity se disponível
    
    # Aguardar confirmação manual
    input(f"\n⏸️  Pressione ENTER após concluir a geração de {desc}...\n")
    
    log(f"✅ Lote {batch_name} concluído!")
    
def main():
    start_time = time.time()
    log("🎯 INICIANDO GERAÇÃO MASSIVA DE 50 ESTRATÉGIAS")
    log(f"📊 Matrix: {MATRIX_FILE}")
    
    # Verificar se matrix existe
    if not os.path.exists(MATRIX_FILE):
        log(f"❌ ERRO: Matrix não encontrada: {MATRIX_FILE}")
        return
    
    # Criar diretórios
    log("📁 Verificando diretórios...")
    os.makedirs("strategies/tier1", exist_ok=True)
    os.makedirs("strategies/tier2", exist_ok=True)
    os.makedirs("strategies/tier3", exist_ok=True)
    os.makedirs("temp", exist_ok=True)
    log("✅ Diretórios OK")
    
    # Processar cada batch
    total_batches = len(BATCHES)
    for i, (batch_name, batch_config) in enumerate(BATCHES.items(), 1):
        log(f"\n{'='*60}")
        log(f"📦 LOTE {i}/{total_batches}: {batch_name}")
        log(f"{'='*60}")
        
        execute_batch(batch_name, batch_config)
        
        # Intervalo entre batches (exceto no último)
        if i < total_batches:
            log("⏳ Aguardando 1 minuto antes do próximo lote...")
            time.sleep(60)
    
    # Relatório final
    elapsed = time.time() - start_time
    elapsed_hours = elapsed / 3600
    
    log("\n" + "="*60)
    log("🎉 GERAÇÃO MASSIVA CONCLUÍDA!")
    log("="*60)
    log(f"⏱️  Tempo total: {elapsed_hours:.1f} horas")
    log("📊 Verificando arquivos gerados...")
    
    # Contar arquivos
    tier1_count = len([f for f in os.listdir("strategies/tier1") if f.endswith(".py")])
    tier2_count = len([f for f in os.listdir("strategies/tier2") if f.endswith(".py")])
    tier3_count = len([f for f in os.listdir("strategies/tier3") if f.endswith(".py")])
    
    log(f"   TIER 1: {tier1_count} estratégias")
    log(f"   TIER 2: {tier2_count} estratégias")
    log(f"   TIER 3: {tier3_count} estratégias")
    log(f"   TOTAL: {tier1_count + tier2_count + tier3_count} estratégias")
    
    log("\n📋 Próximos passos:")
    log("   1. Revisar código gerado")
    log("   2. Sincronizar com VPS")
    log("   3. Implementar otimizações (Staggered Execution, etc)")
    log("   4. Deploy gradual")

if __name__ == "__main__":
    main()

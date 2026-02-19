"""
Integration Test Helpers - Funções auxiliares para testes de backend via SSH
"""

import subprocess
import os
from typing import Tuple, Optional
from pathlib import Path

class SSHHelper:
    """Helper para executar comandos SSH na VPS"""
    
    def __init__(self, host: str, user: str = "root", ssh_key: str = "~/.ssh/id_rsa"):
        self.host = host
        self.user = user
        self.ssh_key = os.path.expanduser(ssh_key)
    
    def execute(self, command: str, timeout: int = 15) -> Tuple[int, str, str]:
        """
        Executa comando SSH e retorna (returncode, stdout, stderr)
        """
        ssh_command = [
            "ssh",
            "-i", self.ssh_key,
            "-o", "StrictHostKeyChecking=no",
            "-o", f"ConnectTimeout={timeout}",
            f"{self.user}@{self.host}",
            command
        ]
        
        try:
            result = subprocess.run(
                ssh_command,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return -1, "", f"Timeout após {timeout}s"
        except Exception as e:
            return -1, "", str(e)
    
    def test_connection(self) -> bool:
        """Testa se conexão SSH está funcionando"""
        returncode, stdout, stderr = self.execute("echo OK", timeout=5)
        return returncode == 0 and "OK" in stdout
    
    def count_strategy_files(self, strategies_dir: str = "/root/million_bots_vps/strategies/tier1") -> int:
        """Conta arquivos de estratégia na VPS"""
        returncode, stdout, stderr = self.execute(f"ls -1 {strategies_dir}/*.py 2>/dev/null | wc -l")
        if returncode == 0:
            try:
                return int(stdout.strip())
            except ValueError:
                return -1
        return -1
    
    def get_backend_loaded_strategies(self) -> int:
        """Extrai quantas estratégias o backend carregou dos logs"""
        command = "journalctl -u million_bot --since '10 minutes ago' | grep -i 'Loaded.*strategies' | tail -1"
        returncode, stdout, stderr = self.execute(command)
        
        if returncode == 0 and stdout:
            # Procura por padrão "Loaded X strategies"
            import re
            match = re.search(r'Loaded\s+(\d+)\s+strategies', stdout, re.IGNORECASE)
            if match:
                return int(match.group(1))
        return -1
    
    def count_critical_errors(self, since: str = "1 hour ago") -> int:
        """Conta erros críticos nos logs"""
        command = f"journalctl -u million_bot --since '{since}' | grep -iE 'ERROR|EXCEPTION|CRITICAL|FATAL' | wc -l"
        returncode, stdout, stderr = self.execute(command)
        
        if returncode == 0:
            try:
                return int(stdout.strip())
            except ValueError:
                return -1
        return -1
    
    def count_deriv_ws_errors(self, since: str = "5 minutes ago") -> int:
        """Conta erros de WebSocket do Deriv (Error 1006)"""
        command = f"journalctl -u million_bot --since '{since}' | grep -iE 'error 1006|websocket.*fail' | wc -l"
        returncode, stdout, stderr = self.execute(command)
        
        if returncode == 0:
            try:
                return int(stdout.strip())
            except ValueError:
                return -1
        return -1
    
    def count_signal_generation(self, since: str = "10 minutes ago") -> int:
        """Conta quantos sinais foram gerados"""
        command = f"journalctl -u million_bot --since '{since}' | grep -i 'SHADOW.*Signal' | wc -l"
        returncode, stdout, stderr = self.execute(command)
        
        if returncode == 0:
            try:
                return int(stdout.strip())
            except ValueError:
                return -1
        return -1
    
    def count_regime_detections(self, since: str = "5 minutes ago") -> int:
        """Conta detecções de regime (MOD_VOL, LOW_VOL, HIGH_VOL)"""
        command = f"journalctl -u million_bot --since '{since}' | grep -iE 'MOD_VOL|LOW_VOL|HIGH_VOL' | wc -l"
        returncode, stdout, stderr = self.execute(command)
        
        if returncode == 0:
            try:
                return int(stdout.strip())
            except ValueError:
                return -1
        return -1
    
    def check_service_status(self) -> Tuple[bool, str]:
        """Verifica status do serviço systemd"""
        returncode, stdout, stderr = self.execute("systemctl is-active million_bot")
        is_active = returncode == 0 and "active" in stdout.lower()
        return is_active, stdout.strip()
    
    def kill_and_wait_restart(self, wait_seconds: int = 15) -> bool:
        """Mata processo e aguarda systemd reiniciar"""
        import time
        
        # Mata processo
        self.execute("pkill -9 -f master_bot")
        
        # Aguarda
        time.sleep(wait_seconds)
        
        # Verifica se reiniciou
        is_active, status = self.check_service_status()
        return is_active


class SupabaseHelper:
    """Helper para queries no Supabase"""
    
    def __init__(self, url: str, service_role_key: str):
        try:
            from supabase import create_client
            self.client = create_client(url, service_role_key)
            self.available = True
        except ImportError:
            print("⚠️  supabase-py não instalado. Instale com: pip install supabase")
            self.available = False
    
    def count_strategies(self) -> int:
        """Conta estratégias na tabela strategy_scores"""
        if not self.available:
            return -1
        
        try:
            result = self.client.table("strategy_scores").select("*", count="exact").execute()
            return result.count if hasattr(result, 'count') else len(result.data)
        except Exception as e:
            print(f"Erro ao contar estratégias: {e}")
            return -1
    
    def count_stale_strategies(self, minutes: int = 10) -> int:
        """Conta estratégias desatualizadas"""
        if not self.available:
            return -1
        
        try:
            from datetime import datetime, timedelta
            result = self.client.table("strategy_scores").select("strategy_name, last_updated").execute()
            
            now = datetime.now()
            stale_count = 0
            
            for row in result.data:
                if row.get('last_updated'):
                    last_updated = datetime.fromisoformat(row['last_updated'].replace('Z', '+00:00'))
                    if (now - last_updated.replace(tzinfo=None)) > timedelta(minutes=minutes):
                        stale_count += 1
            
            return stale_count
        except Exception as e:
            print(f"Erro ao verificar freshness: {e}")
            return -1
    
    def validate_wr_calculations(self, tolerance: float = 2.0) -> list:
        """Valida cálculos de WR, retorna lista de inconsistências"""
        if not self.available:
            return []
        
        try:
            result = self.client.table("strategy_scores").select("*").execute()
            inconsistencies = []
            
            for row in result.data:
                if row['total_trades'] >= 10:
                    # Buscar wins da tabela strategy_performance
                    perf = self.client.table("strategy_performance")\
                        .select("wins, total_trades")\
                        .eq("strategy_name", row['strategy_name'])\
                        .execute()
                    
                    if perf.data:
                        wins = perf.data[0]['wins']
                        total = perf.data[0]['total_trades']
                        calculated_wr = (wins / total * 100) if total > 0 else 0
                        stored_wr = row['expected_wr']
                        
                        if abs(calculated_wr - stored_wr) > tolerance:
                            inconsistencies.append({
                                "strategy": row['strategy_name'],
                                "calculated_wr": round(calculated_wr, 2),
                                "stored_wr": stored_wr,
                                "difference": round(abs(calculated_wr - stored_wr), 2)
                            })
            
            return inconsistencies
        except Exception as e:
            print(f"Erro ao validar WR: {e}")
            return []
    
    def check_frequency_zero_bug(self) -> list:
        """Verifica bug onde frequency_1h=0 zera o score"""
        if not self.available:
            return []
        
        try:
            result = self.client.table("strategy_scores")\
                .select("strategy_name, frequency_1h, score, expected_wr, total_trades")\
                .eq("frequency_1h", 0)\
                .eq("score", 0)\
                .gte("total_trades", 10)\
                .execute()
            
            return result.data
        except Exception as e:
            print(f"Erro ao verificar bug de frequency: {e}")
            return []
    
    def count_stale_signals(self, minutes: int = 5) -> int:
        """Conta sinais antigos que não foram limpos"""
        if not self.available:
            return -1
        
        try:
            from datetime import datetime, timedelta
            cutoff = datetime.now() - timedelta(minutes=minutes)
            
            result = self.client.table("active_signals")\
                .select("*", count="exact")\
                .lt("created_at", cutoff.isoformat())\
                .execute()
            
            return result.count if hasattr(result, 'count') else len(result.data)
        except Exception as e:
            print(f"Erro ao contar sinais antigos: {e}")
            return -1
    
    def count_recent_activity(self, hours: int = 1) -> int:
        """Conta atividade recente em bot_activity_logs"""
        if not self.available:
            return -1
        
        try:
            from datetime import datetime, timedelta
            cutoff = datetime.now() - timedelta(hours=hours)
            
            result = self.client.table("bot_activity_logs")\
                .select("*", count="exact")\
                .gt("created_at", cutoff.isoformat())\
                .execute()
            
            return result.count if hasattr(result, 'count') else len(result.data)
        except Exception as e:
            print(f"Erro ao contar atividade: {e}")
            return -1


def measure_api_latency(url: str, timeout: int = 10) -> float:
    """Mede latência de uma API em ms"""
    import time
    import urllib.request
    
    try:
        start = time.time()
        urllib.request.urlopen(url, timeout=timeout)
        latency = (time.time() - start) * 1000
        return latency
    except Exception as e:
        print(f"Erro ao medir latência: {e}")
        return -1.0


if __name__ == "__main__":
    # Testes básicos
    print("🧪 Testing Integration Helpers\n")
    
    # Teste SSH
    from tests.config.test_config import VPS_HOST, VPS_USER, VPS_SSH_KEY
    if VPS_HOST:
        ssh = SSHHelper(VPS_HOST, VPS_USER, VPS_SSH_KEY)
        print(f"SSH Connection: {'✅' if ssh.test_connection() else '❌'}")
    
    # Teste Supabase
    from tests.config.test_config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        supabase = SupabaseHelper(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        if supabase.available:
            count = supabase.count_strategies()
            print(f"Supabase Strategies: {count}")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QA Master - Orquestrador de Testes Automatizados para Million Bots
Executa testes de regressão, E2E, UI, performance, Supabase e backend
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import subprocess

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Configurações
PROJECT_ROOT = Path(__file__).parent.parent
QA_REPORTS_DIR = PROJECT_ROOT / "qa_reports"
SCREENSHOTS_DIR = QA_REPORTS_DIR / "screenshots"

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

class QAMaster:
    def __init__(self, quick_mode=False, category=None):
        self.quick_mode = quick_mode
        self.category = category
        self.results = []
        self.start_time = datetime.now()
        self.env_config = self._load_env()
        
    def _load_env(self) -> Dict[str, str]:
        """Carrega variáveis de ambiente do .env.qa"""
        env_file = PROJECT_ROOT / ".env.qa"
        if not env_file.exists():
            print(f"{Colors.YELLOW}⚠️  .env.qa não encontrado. Usando variáveis de ambiente do sistema.{Colors.END}")
            return {}
        
        env_vars = {}
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
        return env_vars
    
    def _get_env(self, key: str, default: str = "") -> str:
        """Obtém variável de ambiente"""
        return self.env_config.get(key, os.getenv(key, default))
    
    def print_header(self):
        """Imprime cabeçalho do QA Suite"""
        print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"{Colors.BLUE}{Colors.BOLD}🚀 MILLION BOTS QA SUITE v2.0{Colors.END}")
        print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}\n")
        print(f"📅 Data: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⚡ Modo: {'RÁPIDO' if self.quick_mode else 'COMPLETO'}")
        if self.category:
            print(f"🎯 Categoria: {self.category.upper()}")
        print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    def add_result(self, category: str, test_name: str, passed: bool, details: str = ""):
        """Adiciona resultado de teste"""
        status = "✅ PASSOU" if passed else "❌ FALHOU"
        self.results.append({
            "category": category,
            "test": test_name,
            "passed": passed,
            "details": details,
            "status": status
        })
    
    def print_progress(self, step: int, total: int, message: str, status: str = "running"):
        """Imprime progresso do teste"""
        if status == "pass":
            icon = f"{Colors.GREEN}✅{Colors.END}"
        elif status == "fail":
            icon = f"{Colors.RED}❌{Colors.END}"
        elif status == "warning":
            icon = f"{Colors.YELLOW}⚠️{Colors.END}"
        else:
            icon = "⏳"
        
        print(f"[{step}/{total}] {icon} {message}")
    
    def run_preflight_checks(self) -> bool:
        """Executa verificações pré-voo"""
        print(f"\n{Colors.BOLD}🔍 PRE-FLIGHT CHECKS{Colors.END}\n")
        
        checks_passed = True
        
        # 1. Verificar Frontend
        frontend_url = self._get_env("FRONTEND_URL", "http://localhost:5173")
        print(f"Verificando Frontend ({frontend_url})...", end=" ")
        try:
            import urllib.request
            urllib.request.urlopen(frontend_url, timeout=5)
            print(f"{Colors.GREEN}✅ Online{Colors.END}")
        except Exception as e:
            print(f"{Colors.RED}❌ Offline{Colors.END}")
            print(f"   Erro: {str(e)}")
            checks_passed = False
        
        # 2. Verificar VPS SSH (se configurado)
        vps_host = self._get_env("VPS_HOST")
        if vps_host:
            print(f"Verificando VPS SSH ({vps_host})...", end=" ")
            try:
                ssh_key = self._get_env("VPS_SSH_KEY", "~/.ssh/id_rsa")
                ssh_key = os.path.expanduser(ssh_key)
                vps_user = self._get_env("VPS_USER", "root")
                
                result = subprocess.run(
                    ["ssh", "-i", ssh_key, "-o", "ConnectTimeout=5", 
                     "-o", "StrictHostKeyChecking=no", 
                     f"{vps_user}@{vps_host}", "echo OK"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    print(f"{Colors.GREEN}✅ Acessível{Colors.END}")
                else:
                    print(f"{Colors.RED}❌ Falha na conexão{Colors.END}")
                    checks_passed = False
            except Exception as e:
                print(f"{Colors.RED}❌ Erro: {str(e)}{Colors.END}")
                checks_passed = False
        else:
            print(f"{Colors.YELLOW}⚠️  VPS_HOST não configurado, pulando teste SSH{Colors.END}")
        
        # 3. Verificar Supabase
        supabase_url = self._get_env("SUPABASE_URL")
        if supabase_url:
            print(f"Verificando Supabase ({supabase_url})...", end=" ")
            try:
                import urllib.request
                urllib.request.urlopen(f"{supabase_url}/rest/v1/", timeout=5)
                print(f"{Colors.GREEN}✅ Online{Colors.END}")
            except Exception as e:
                print(f"{Colors.RED}❌ Offline{Colors.END}")
                print(f"   Erro: {str(e)}")
                checks_passed = False
        else:
            print(f"{Colors.YELLOW}⚠️  SUPABASE_URL não configurado, pulando teste{Colors.END}")
        
        print()
        return checks_passed
    
    def run_regression_tests(self):
        """Executa testes de regressão"""
        print(f"\n{Colors.BOLD}🐛 REGRESSION TESTS{Colors.END}\n")
        
        # Estes testes serão executados via browser_subagent pelo Antigravity
        # Este script apenas coordena e reporta
        print("⚠️  Testes de regressão devem ser executados via Antigravity browser_subagent")
        print("    Use: @antigravity execute regression tests from qa_master workflow")
        
    def run_e2e_tests(self):
        """Executa testes E2E"""
        print(f"\n{Colors.BOLD}🔄 E2E TESTS{Colors.END}\n")
        
        print("⚠️  Testes E2E devem ser executados via Antigravity browser_subagent")
        print("    Use: @antigravity execute e2e tests from qa_master workflow")
    
    def run_performance_tests(self):
        """Executa testes de performance"""
        print(f"\n{Colors.BOLD}⚡ PERFORMANCE TESTS{Colors.END}\n")
        
        # Teste 1: Backend API Latency
        vps_host = self._get_env("VPS_HOST")
        if vps_host:
            print("Medindo latência do Backend API...", end=" ")
            try:
                import time
                import urllib.request
                
                start = time.time()
                urllib.request.urlopen(f"http://{vps_host}:8000/health", timeout=10)
                latency = (time.time() - start) * 1000
                
                if latency < 200:
                    status = "pass"
                    self.add_result("Performance", "Backend API Latency", True, f"{latency:.0f}ms")
                elif latency < 500:
                    status = "warning"
                    self.add_result("Performance", "Backend API Latency", True, f"{latency:.0f}ms (lento)")
                else:
                    status = "fail"
                    self.add_result("Performance", "Backend API Latency", False, f"{latency:.0f}ms (muito lento)")
                
                self.print_progress(1, 4, f"Backend API: {latency:.0f}ms", status)
            except Exception as e:
                print(f"{Colors.RED}❌ Erro: {str(e)}{Colors.END}")
                self.add_result("Performance", "Backend API Latency", False, str(e))
        
        # Teste 2: Supabase Query Speed
        print("\n⚠️  Testes de performance do Frontend devem ser executados via Antigravity")
    
    def run_supabase_validation(self):
        """Executa validações do Supabase"""
        print(f"\n{Colors.BOLD}🗄️  SUPABASE VALIDATION{Colors.END}\n")
        
        supabase_url = self._get_env("SUPABASE_URL")
        supabase_key = self._get_env("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            print(f"{Colors.YELLOW}⚠️  Credenciais Supabase não configuradas{Colors.END}")
            return
        
        try:
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            
            # Teste 1: Contar estratégias
            print("Verificando strategy_scores...", end=" ")
            result = supabase.table("strategy_scores").select("*", count="exact").execute()
            count = result.count if hasattr(result, 'count') else len(result.data)
            
            if count >= 10:
                print(f"{Colors.GREEN}✅ {count} estratégias{Colors.END}")
                self.add_result("Supabase", "Strategy Count", True, f"{count} estratégias")
            else:
                print(f"{Colors.RED}❌ Apenas {count} estratégias (esperado ≥10){Colors.END}")
                self.add_result("Supabase", "Strategy Count", False, f"Apenas {count}")
            
            # Teste 2: Verificar freshness
            print("Verificando last_updated...", end=" ")
            result = supabase.table("strategy_scores").select("strategy_name, last_updated").execute()
            
            from datetime import datetime, timedelta
            now = datetime.now()
            stale_count = 0
            
            for row in result.data:
                if row.get('last_updated'):
                    last_updated = datetime.fromisoformat(row['last_updated'].replace('Z', '+00:00'))
                    if (now - last_updated.replace(tzinfo=None)) > timedelta(minutes=10):
                        stale_count += 1
            
            if stale_count == 0:
                print(f"{Colors.GREEN}✅ Todas atualizadas{Colors.END}")
                self.add_result("Supabase", "Data Freshness", True, "Todas recentes")
            else:
                print(f"{Colors.YELLOW}⚠️  {stale_count} estratégias desatualizadas{Colors.END}")
                self.add_result("Supabase", "Data Freshness", False, f"{stale_count} desatualizadas")
            
        except ImportError:
            print(f"{Colors.YELLOW}⚠️  Biblioteca supabase-py não instalada{Colors.END}")
            print("    Instale com: pip install supabase")
        except Exception as e:
            print(f"{Colors.RED}❌ Erro: {str(e)}{Colors.END}")
    
    def run_backend_log_analysis(self):
        """Analisa logs do backend via SSH"""
        print(f"\n{Colors.BOLD}📋 BACKEND LOG ANALYSIS{Colors.END}\n")
        
        vps_host = self._get_env("VPS_HOST")
        if not vps_host:
            print(f"{Colors.YELLOW}⚠️  VPS_HOST não configurado{Colors.END}")
            return
        
        ssh_key = os.path.expanduser(self._get_env("VPS_SSH_KEY", "~/.ssh/id_rsa"))
        vps_user = self._get_env("VPS_USER", "root")
        
        try:
            # Buscar erros críticos
            print("Buscando erros críticos...", end=" ")
            result = subprocess.run(
                ["ssh", "-i", ssh_key, "-o", "StrictHostKeyChecking=no",
                 f"{vps_user}@{vps_host}",
                 "journalctl -u million_bot --since '1 hour ago' | grep -i 'ERROR\\|EXCEPTION\\|CRITICAL\\|FATAL' | wc -l"],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                error_count = int(result.stdout.strip())
                if error_count == 0:
                    print(f"{Colors.GREEN}✅ 0 erros{Colors.END}")
                    self.add_result("Backend", "Critical Errors", True, "0 erros")
                elif error_count <= 5:
                    print(f"{Colors.YELLOW}⚠️  {error_count} erros{Colors.END}")
                    self.add_result("Backend", "Critical Errors", True, f"{error_count} erros (investigar)")
                else:
                    print(f"{Colors.RED}❌ {error_count} erros{Colors.END}")
                    self.add_result("Backend", "Critical Errors", False, f"{error_count} erros")
            
        except Exception as e:
            print(f"{Colors.RED}❌ Erro SSH: {str(e)}{Colors.END}")
    
    def generate_report(self):
        """Gera relatório consolidado"""
        print(f"\n{Colors.BOLD}📊 GERANDO RELATÓRIO{Colors.END}\n")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = QA_REPORTS_DIR / f"MASTER_REPORT_{timestamp}.md"
        
        # Calcular score
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['passed'])
        score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Determinar status
        if score >= 90:
            status = "🟢 SAUDÁVEL"
            status_color = Colors.GREEN
        elif score >= 70:
            status = "🟡 ATENÇÃO"
            status_color = Colors.YELLOW
        else:
            status = "🔴 CRÍTICO"
            status_color = Colors.RED
        
        # Gerar markdown
        report_content = f"""# Million Bots QA Report

**Data:** {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}  
**Duração:** {(datetime.now() - self.start_time).total_seconds():.1f}s  
**Score:** {passed_tests}/{total_tests} ({score:.1f}%)  
**Status:** {status}

---

## Resultados por Categoria

| Categoria | Teste | Status | Detalhes |
|-----------|-------|--------|----------|
"""
        
        for result in self.results:
            report_content += f"| {result['category']} | {result['test']} | {result['status']} | {result['details']} |\n"
        
        report_content += f"""
---

## Recomendações

"""
        
        if score < 70:
            report_content += "⚠️ **AÇÃO URGENTE NECESSÁRIA** - Múltiplos testes falharam\n\n"
        
        for result in self.results:
            if not result['passed']:
                report_content += f"- **{result['test']}**: {result['details']}\n"
        
        # Salvar relatório
        report_file.parent.mkdir(parents=True, exist_ok=True)
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"✅ Relatório salvo: {report_file}")
        
        # Criar alertas
        if score < 70:
            alert_file = QA_REPORTS_DIR / "ALERT_CRITICAL.txt"
            with open(alert_file, 'w', encoding='utf-8') as f:
                f.write(f"ALERTA CRÍTICO - QA Score: {score:.1f}%\n")
                f.write(f"Testes falharam: {total_tests - passed_tests}\n\n")
                for result in self.results:
                    if not result['passed']:
                        f.write(f"- {result['test']}: {result['details']}\n")
            print(f"{Colors.RED}🚨 Alerta crítico criado: {alert_file}{Colors.END}")
        elif score >= 90:
            success_file = QA_REPORTS_DIR / "SUCCESS.txt"
            with open(success_file, 'w', encoding='utf-8') as f:
                f.write(f"✅ QA Suite passou com {score:.1f}%\n")
            print(f"{Colors.GREEN}✅ Arquivo de sucesso criado{Colors.END}")
        
        return score, status, status_color
    
    def print_summary(self, score: float, status: str, status_color: str):
        """Imprime sumário final"""
        print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}📊 FINAL SCORE: {score:.1f}%{Colors.END}")
        print(f"{status_color}{Colors.BOLD}{status}{Colors.END}")
        
        failed_count = sum(1 for r in self.results if not r['passed'])
        if failed_count > 0:
            print(f"\n{Colors.YELLOW}⚠️  {failed_count} teste(s) requer(em) atenção{Colors.END}")
        
        print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}\n")
    
    def run(self):
        """Executa suite completa de testes"""
        self.print_header()
        
        # Pre-flight checks
        preflight_passed = self.run_preflight_checks()
        if not preflight_passed:
            print(f"\n{Colors.YELLOW}⚠️  Pre-flight checks falharam. Continuando em modo limitado...{Colors.END}\n")
            print(f"{Colors.YELLOW}    Apenas testes que não requerem serviços externos serão executados.{Colors.END}\n")
        
        # Executar testes baseado na categoria
        if not self.category or self.category == "regression":
            self.run_regression_tests()
        
        if not self.category or self.category == "e2e":
            self.run_e2e_tests()
        
        if not self.category or self.category == "performance":
            self.run_performance_tests()
        
        if not self.category or self.category == "supabase":
            self.run_supabase_validation()
        
        if not self.category or self.category == "backend":
            self.run_backend_log_analysis()
        
        # Gerar relatório
        score, status, status_color = self.generate_report()
        
        # Sumário final
        self.print_summary(score, status, status_color)
        
        return 0 if score >= 70 else 1

def main():
    parser = argparse.ArgumentParser(description="Million Bots QA Master Suite")
    parser.add_argument("--quick", action="store_true", help="Modo rápido (pula testes de 2min)")
    parser.add_argument("--category", choices=["regression", "e2e", "performance", "supabase", "backend"],
                       help="Executar apenas categoria específica")
    
    args = parser.parse_args()
    
    qa = QAMaster(quick_mode=args.quick, category=args.category)
    sys.exit(qa.run())

if __name__ == "__main__":
    main()

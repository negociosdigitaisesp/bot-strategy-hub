# -*- coding: utf-8 -*-
"""
VPS Deployment Script
Handles SSH connection and deployment to Contabo VPS
"""
import os
import sys
import paramiko
from dotenv import load_dotenv
from pathlib import Path
import time

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from pathlib import Path
import time

# Load VPS credentials
load_dotenv('.env.vps')

VPS_HOST = os.getenv('VPS_HOST')
VPS_USER = os.getenv('VPS_USER')
VPS_PASSWORD = os.getenv('VPS_PASSWORD')
VPS_PROJECT_PATH = os.getenv('VPS_PROJECT_PATH', '/root/million_bots_vps')

LOCAL_PROJECT_PATH = os.path.join(os.path.dirname(__file__), 'million_bots_vps')

class VPSDeployer:
    def __init__(self):
        self.ssh = None
        self.sftp = None
        
    def connect(self):
        """Establish SSH connection to VPS"""
        print(f"🔌 Conectando ao VPS: {VPS_HOST}...")
        try:
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(
                hostname=VPS_HOST,
                username=VPS_USER,
                password=VPS_PASSWORD,
                timeout=30
            )
            self.sftp = self.ssh.open_sftp()
            print("✅ Conexão SSH estabelecida com sucesso!")
            return True
        except Exception as e:
            print(f"❌ Erro ao conectar: {e}")
            return False
    
    def execute_command(self, command, show_output=True):
        """Execute command on VPS and return output"""
        try:
            stdin, stdout, stderr = self.ssh.exec_command(command)
            exit_status = stdout.channel.recv_exit_status()
            
            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            
            if show_output and output:
                print(output)
            if error and exit_status != 0:
                print(f"⚠️ Erro: {error}")
            
            return exit_status == 0, output, error
        except Exception as e:
            print(f"❌ Erro ao executar comando: {e}")
            return False, "", str(e)
    
    def sync_directory(self, local_dir, remote_dir, exclude_patterns=None):
        """Sync local directory to VPS using SFTP"""
        exclude_patterns = exclude_patterns or [
            '__pycache__', '*.pyc', '.git', '.env', 
            'venv', 'node_modules', '*.log', 'strategies_backup*', 'archive*'
        ]
        
        print(f"📦 Sincronizando {local_dir} -> {remote_dir}...")
        
        # Ensure remote directory exists
        self.execute_command(f"mkdir -p {remote_dir}", show_output=False)
        
        synced_files = 0
        for root, dirs, files in os.walk(local_dir):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not any(
                self._matches_pattern(d, pattern) for pattern in exclude_patterns
            )]
            
            # Calculate relative path
            rel_path = os.path.relpath(root, local_dir)
            remote_path = os.path.join(remote_dir, rel_path).replace('\\', '/')
            
            # Create remote directory
            try:
                self.sftp.stat(remote_path)
            except FileNotFoundError:
                self.execute_command(f"mkdir -p {remote_path}", show_output=False)
            
            # Upload files
            for file in files:
                if any(self._matches_pattern(file, pattern) for pattern in exclude_patterns):
                    continue
                
                local_file = os.path.join(root, file)
                remote_file = os.path.join(remote_path, file).replace('\\', '/')
                
                try:
                    self.sftp.put(local_file, remote_file)
                    synced_files += 1
                    if synced_files % 10 == 0:
                        print(f"  📄 {synced_files} arquivos sincronizados...")
                except Exception as e:
                    print(f"⚠️ Erro ao enviar {file}: {e}")
        
        print(f"✅ {synced_files} arquivos sincronizados com sucesso!")
        return synced_files
    
    def _matches_pattern(self, name, pattern):
        """Simple pattern matching"""
        if pattern.startswith('*'):
            return name.endswith(pattern[1:])
        elif pattern.endswith('*'):
            return name.startswith(pattern[:-1])
        else:
            return name == pattern
    
    def install_dependencies(self):
        """Install Python dependencies on VPS"""
        print("📦 Instalando dependências no VPS...")
        
        commands = [
            f"cd {VPS_PROJECT_PATH}",
            "pip3 install -r requirements.txt --quiet"
        ]
        
        success, output, error = self.execute_command(" && ".join(commands))
        if success:
            print("✅ Dependências instaladas com sucesso!")
        return success
    
    
    def install_systemd_service(self):
        """Install and enable systemd service for the bot"""
        print("🔧 Instalando serviço systemd...")
        
        # Copy service file to systemd directory
        local_service = os.path.join(LOCAL_PROJECT_PATH, "million_bot.service")
        remote_service = "/etc/systemd/system/million_bot.service"
        
        if os.path.exists(local_service):
            try:
                self.sftp.put(local_service, remote_service)
                print("✅ Arquivo de serviço copiado para /etc/systemd/system/")
            except Exception as e:
                print(f"⚠️ Erro ao copiar arquivo de serviço: {e}")
                return False
        else:
            print(f"⚠️ Arquivo {local_service} não encontrado!")
            return False
        
        # Reload systemd daemon
        print("🔄 Recarregando systemd daemon...")
        success, output, error = self.execute_command("systemctl daemon-reload", show_output=False)
        if not success:
            print(f"⚠️ Erro ao recarregar daemon: {error}")
            return False
        
        # Enable service to start on boot
        print("🔧 Habilitando serviço para iniciar no boot...")
        success, output, error = self.execute_command("systemctl enable million_bot", show_output=False)
        if success:
            print("✅ Serviço habilitado para iniciar automaticamente")
        
        return True
    
    def restart_bot(self):
        """Restart the bot service using systemd"""
        print("🔄 Reiniciando bot via systemd...")
        
        # Stop the service (if running)
        self.execute_command("systemctl stop million_bot", show_output=False)
        time.sleep(2)
        
        # Start the service
        success, output, error = self.execute_command("systemctl start million_bot")
        
        if success or "Active: active" in output:
            print("✅ Serviço iniciado com sucesso!")
            time.sleep(3)
            
            # Check service status
            success, output, error = self.execute_command("systemctl status million_bot --no-pager")
            if "active (running)" in output:
                print("✅ Bot está rodando como serviço systemd:")
                # Extract relevant lines
                for line in output.split('\n'):
                    if 'Active:' in line or 'Main PID:' in line or 'Memory:' in line:
                        print(f"   {line.strip()}")
            else:
                print("⚠️ Serviço pode não ter iniciado corretamente:")
                print(output)
        else:
            print(f"⚠️ Erro ao iniciar serviço: {error}")
        
        return success

    
    def get_bot_logs(self, lines=50):
        """Get recent bot logs"""
        print(f"\n📋 Últimas {lines} linhas do log:")
        success, output, error = self.execute_command(f"tail -{lines} {VPS_PROJECT_PATH}/bot.log")
        return output
    
    def verify_deployment(self):
        """Verify deployment is working"""
        print("\n🔍 Verificando deployment...")
        
        checks = []
        
        # Check if directory exists
        success, output, _ = self.execute_command(f"ls -la {VPS_PROJECT_PATH}", show_output=False)
        checks.append(("Diretório existe", success))
        
        # Check if master_bot.py exists
        success, output, _ = self.execute_command(f"test -f {VPS_PROJECT_PATH}/master_bot.py && echo 'exists'", show_output=False)
        checks.append(("master_bot.py existe", 'exists' in output))
        
        # Check if .env exists
        success, output, _ = self.execute_command(f"test -f {VPS_PROJECT_PATH}/.env && echo 'exists'", show_output=False)
        checks.append((".env existe", 'exists' in output))
        
        # Check if systemd service is active
        success, output, _ = self.execute_command("systemctl is-active million_bot", show_output=False)
        checks.append(("Serviço systemd ativo", 'active' in output))
        
        # Check if service is enabled
        success, output, _ = self.execute_command("systemctl is-enabled million_bot", show_output=False)
        checks.append(("Serviço habilitado no boot", 'enabled' in output))
        
        # Count strategies
        success, output, _ = self.execute_command(f"find {VPS_PROJECT_PATH}/strategies/tier1 -name '*.py' | wc -l", show_output=False)
        strategy_count = int(output.strip()) if output.strip().isdigit() else 0
        checks.append((f"Estratégias carregadas: {strategy_count}", strategy_count > 0))
        
        print("\n" + "="*60)
        print("📊 RELATÓRIO DE VERIFICAÇÃO")
        print("="*60)
        for check_name, passed in checks:
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}")
        print("="*60)
        
        all_passed = all(passed for _, passed in checks)
        return all_passed
    
    def close(self):
        """Close SSH connection"""
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        print("🔌 Conexão SSH fechada")


def deploy_to_vps():
    """Main deployment function"""
    deployer = VPSDeployer()
    
    try:
        # Connect
        if not deployer.connect():
            return False
            
        # Wipe remote strategies tier1 to ensure clean slate (only V3 will remain)
        # archive_v2 local is excluded, and remote is wiped.
        print("🧹 Apagando estratégias antigas (tier1 e tier3) no VPS...")
        deployer.execute_command(f"rm -rf {VPS_PROJECT_PATH}/strategies/tier1/*")
        deployer.execute_command(f"rm -rf {VPS_PROJECT_PATH}/strategies/tier3/*")
        
        # Sync files
        deployer.sync_directory(LOCAL_PROJECT_PATH, VPS_PROJECT_PATH)
        
        # Install dependencies
        deployer.install_dependencies()
        
        # Install systemd service
        deployer.install_systemd_service()
        
        # Cleanup old V2 strategies
        print("🧹 Removendo estratégias V2 antigas...")
        deployer.execute_command(f"rm -f {VPS_PROJECT_PATH}/strategies/tier1/*_V2.py")
        
        # Restart bot (using systemd)
        deployer.restart_bot()
        
        # Verify
        success = deployer.verify_deployment()
        
        # Show logs
        deployer.get_bot_logs(30)
        
        return success
        
    except Exception as e:
        print(f"❌ Erro durante deployment: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        deployer.close()



if __name__ == "__main__":
    print("🚀 INICIANDO DEPLOYMENT PARA VPS")
    print("="*60)
    
    success = deploy_to_vps()
    
    print("\n" + "="*60)
    if success:
        print("✅ DEPLOYMENT CONCLUÍDO COM SUCESSO!")
    else:
        print("❌ DEPLOYMENT FALHOU - Verifique os erros acima")
    print("="*60)
    
    sys.exit(0 if success else 1)

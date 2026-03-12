const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'OracleQuant.tsx');
let content = fs.readFileSync(file, 'utf8');
let count = 0;

function r(old, newStr) {
  if (content.includes(old)) {
    content = content.split(old).join(newStr);
    count++;
  }
}

function rx(pattern, repl) {
  const re = new RegExp(pattern, 'g');
  const newContent = content.replace(re, repl);
  if (newContent !== content) {
    content = newContent;
    count++;
  }
}

// ---- BOT ARSENAL BADGES ----
rx("badge: '.*?PRO'", "badge: '#1 PRO'");
rx("badge: '.*?ELITE'", "badge: '#2 ELITE'");
rx("badge: '.*?QUANT'", "badge: '#3 QUANT'");
rx("badge: '.*?FLOW'", "badge: '>> FLOW'");
rx("badge: '.*?RISK'", "badge: '++ RISK'");

// ---- ADDLOG EMOJI TAGS ----
// Replace [non-ascii TAG] with [TAG]
rx("\\[\\S+ LGN\\] Saldo", "[$ LGN] Saldo");
rx("\\[\\S+ LGN\\] Banca Insuficiente", "[STOP LGN] Saldo Insuficiente");
rx("\\[\\S+ LGN\\] Banca insuficiente", "[STOP LGN] Saldo insuficiente");
rx("\\[\\S+ EV\\]", "[EV]");
rx("\\[\\S+ G(\\d)\\] \\$\\{ativo\\}", "[G$1] ${ativo}");
rx("\\[\\S+ WIN G(\\d)\\]", "[WIN G$1]");
rx("\\[\\S+ LOSS G(\\d)\\]", "[LOSS G$1]");
rx("\\[\\S+ JITTER\\]", "[JITTER]");
rx("\\[\\S+ SHADOW\\]", "[SHADOW]");
rx("\\[\\S+ EXEC\\]", "[EXEC]");
rx("\\[\\S+ \\$\\{status\\}\\]", "[SIGNAL ${status}]");
rx("\\[\\S+ WS_DEAD\\]", "[WS_DEAD]");
rx("\\[\\S+ CAP\\]", "[CAP]");
rx("\\[\\S+ EDGE\\] Consultando", "[EDGE] Consultando");
rx("\\[\\S+ EDGE\\] Diverg", "[EDGE ALERT] Diverg");
rx("\\[\\S+ EDGE\\] Bloqueado", "[EDGE BLOCK] Bloqueado");
rx("\\[\\S+ EDGE\\] Aprovado", "[EDGE OK] Aprobado");
rx("\\[\\S+ EDGE\\] Timeout", "[EDGE TIMEOUT] Timeout");
rx("\\[\\S+ RECOVERY\\]", "[RECOVERY]");
rx("\\[\\S+ SCHEMA\\]", "[SCHEMA]");
rx("\\[\\S+\\s+LGN\\] N", "[WARN LGN] N");

// ---- TOAST EMOJIS ----
rx("toast\\.warning\\('.*?Bot rodando em background.*?mantenha a aba ativa'", "toast.warning('Bot ejecutando en background - mantenga la pestana activa'");
rx("toast\\.error\\(`.*?Diverg.*?configura.*?`\\)", "toast.error(`Divergencia de stake detectada por Edge - verifique configuraciones`)");
rx("toast\\.error\\(`.*?GALE BLOQUEADO pelo servidor: \\$\\{edgeResult\\.reason\\}`\\)", "toast.error(`GALE BLOQUEADO por el servidor: ${edgeResult.reason}`)");
rx("toast\\.error\\(`.*?RECOVERY:(.+?)`\\)", "toast.error(`RECOVERY:$1`)");

// ---- SUBSCRIBE CALLBACK ----
rx("'\\[SIGNAL\\] \\S+ Canal conectado", "'[SIGNAL] Canal conectado");
rx("'\\[SIGNAL\\] \\S+ Erro", "'[SIGNAL] Error");

// ---- PORTUGUESE -> SPANISH ----
r('Canal conectado com sucesso!', 'Canal conectado con exito!');
r('Erro no canal!', 'Error en el canal!');
r('Sinal expirado', 'Senal expirada');
r('Sinal futuro?', 'Senal futura?');
r('sinal ignorado', 'senal ignorada');
r('Sinal de ', 'Senal de ');
r('aguardando', 'esperando');
r('Gale interrompido detectado', 'Gale interrumpido detectado');
r('retomando em 3s', 'retomando en 3s');
r('fallback local assumiu autoridade', 'fallback local asumio autoridad');
r('Prosseguindo com cautela', 'Procediendo con cautela');
r("Histórico resetado!", "Historial reseteado!");
r("Erro inesperado ao buscar grade", "Error inesperado al buscar grade");
r("Colunas ausentes na view", "Columnas ausentes en la view");

// handleReset confirm
const oldReset = `const handleReset = useCallback(async () => {\r\n    await hftSupabase`;
const newReset = `const handleReset = useCallback(async () => {\r\n    if (!confirm('Resetear todos los resultados de la sesion?')) return\r\n    await hftSupabase`;
r(oldReset, newReset);

// Also try without \r
const oldResetLF = `const handleReset = useCallback(async () => {\n    await hftSupabase`;
const newResetLF = `const handleReset = useCallback(async () => {\n    if (!confirm('Resetear todos los resultados de la sesion?')) return\n    await hftSupabase`;
r(oldResetLF, newResetLF);

// Fix Portuguese in comments that are mojibake
r('Erro tÃ©cnico', 'Error tecnico');
r('NÃ£o foi possÃ­vel ler saldo da Deriv', 'No fue posible leer saldo de Deriv');
r('Token Deriv nÃ£o encontrado', 'Token Deriv no encontrado');
r('jÃ¡ em execuÃ§Ã£o', 'ya en ejecucion');
r('ativos em execuÃ§Ã£o', 'activos en ejecucion');

console.log(`Applied ${count} replacements`);
fs.writeFileSync(file, content, 'utf8');
console.log('File saved.');

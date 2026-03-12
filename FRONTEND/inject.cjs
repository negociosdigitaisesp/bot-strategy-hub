const fs = require('fs');
const file = 'src/pages/OracleQuant.tsx';
let content = fs.readFileSync(file, 'utf8');
const search = '  }, [sessionWins, sessionLosses, sessionProfit])';
const insert = `

  // [RISK_GUARD] Stop Win / Stop Loss Verification
  useEffect(() => {
    // Só faz a checagem se o sistema estiver rodando em "masterOn"
    if (!masterOn) return

    const { stopWin, stopLoss } = getRiskConfig()

    // Bloqueia caso o limite seja ultrapassado e o valor estipulado seja válido (> 0)
    if (stopWin > 0 && sessionProfit >= stopWin) {
      setMasterOn(false) // DESLIGA O BOT IMEDIATAMENTE
      addLog('ok', \`[META] Stop Win atingido! Lucro: +$\${sessionProfit.toFixed(2)}\`)
      toast.success(\`Meta alcançada! Stop Win de +$\${sessionProfit.toFixed(2)}\`, { duration: 5000 })
    } 
    else if (stopLoss > 0 && sessionProfit <= -stopLoss) {
      setMasterOn(false) // DESLIGA O BOT IMEDIATAMENTE
      addLog('error', \`[STOP] Stop Loss atingido! Perda: -$\${Math.abs(sessionProfit).toFixed(2)}\`)
      toast.error(\`Risco máximo atingido! Stop Loss de -$\${Math.abs(sessionProfit).toFixed(2)}\`, { duration: 5000 })
    }
  }, [sessionProfit, masterOn, getRiskConfig, addLog])`;

if (content.includes(search)) {
    content = content.replace(search, search + insert);
    fs.writeFileSync(file, content, 'utf8');
    console.log('NODE_INJECTED_OK');
} else {
    console.log('TARGET_NOT_FOUND');
}

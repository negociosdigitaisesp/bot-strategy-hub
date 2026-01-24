export const getFinalNotificationEmailHTML = (userName: string, upgradeLink: string = 'https://appmillionbots.com/quieroserpro') => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación Final</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e2e8f0; line-height: 1.6;">
  
  <!-- Container Principal -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <!-- Card do E-mail -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 12px; border: 1px solid #7f1d1d; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.2);">
          
          <!-- Header (Tema Alerta/Vermelho) -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #7f1d1d; text-align: center; background-color: #450a0a;">
              <h1 style="margin: 0; color: #f87171; font-size: 24px; letter-spacing: 1px; text-transform: uppercase;">⚠️ NOTIFICACIÓN FINAL</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #fca5a5; text-transform: uppercase; letter-spacing: 1px;">Downgrade Automático en 24h</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin-bottom: 20px; font-size: 16px;">Hola, <strong>${userName}</strong>.</p>
              
              <p style="margin-bottom: 20px; font-size: 16px;">
                Te escribo para avisarte que el "Modo Invitado" se cierra mañana.
              </p>

              <p style="margin-bottom: 25px; font-size: 16px;">
                Has tenido en tus manos el <strong>Efecto Midas</strong> y el <strong>Bug Deriv</strong>. Has visto la precisión del <em>Quant Shield</em>. Pero a menos que actúes hoy, tu cuenta sufrirá un <strong>Downgrade Automático</strong>.
              </p>

              <!-- Box de Perda (O que ele vai perder) -->
              <div style="background-color: #1e293b; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ef4444;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                  LO QUE SUCEDERÁ MAÑANA:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #cbd5e1;">
                  <li style="margin-bottom: 10px;">🔒 <strong>Bloqueo de Bots VIP:</strong> El Midas y Vector Flow quedarán inaccesibles (Icono de candado).</li>
                  <li style="margin-bottom: 10px;">📉 <strong>Límite de $5:</strong> La traba de ganancia se mantendrá activa.</li>
                  <li style="margin-bottom: 10px;">🚫 <strong>Cuenta Real:</strong> Seguirá desactivada para retiros.</li>
                </ul>
              </div>

              <p style="margin-bottom: 20px; font-size: 16px;">
                No te voy a presionar con <em>"última oportunidad"</em> falsa.
              </p>

              <p style="margin-bottom: 25px; font-size: 16px;">
                Pero sí te voy a decir la verdad: <strong>El acceso que tienes ahora no volverá a estar disponible en modo gratuito.</strong>
              </p>

              <p style="margin-bottom: 30px; font-size: 16px; border-bottom: 1px dashed #334155; padding-bottom: 20px;">
                Si decides quedarte en FREE, está bien. El Bug Deriv seguirá funcionando (con límites). Pero el Midas, el Sigma, y el Vector Flow se bloquearán permanentemente.
              </p>

              <!-- Botão CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${upgradeLink}" style="display: inline-block; padding: 16px 32px; background-color: #ef4444; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; transition: all 0.3s ease; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);">
                      🔓 MANTENER ACCESO COMPLETO
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin-top: 30px; font-size: 14px; text-align: center; color: #94a3b8;">
                La decisión es tuya. Pero hazla consciente.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #e2e8f0;">Miguel | CEO Million Bots</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Trading Intelligence • High Frequency • Quant</p>
              <p style="margin-top: 20px; font-size: 10px; color: #475569;">
                Si ya no deseas recibir inteligencia de mercado, puedes <a href="#" style="color: #64748b; text-decoration: underline;">darte de baja</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;
};
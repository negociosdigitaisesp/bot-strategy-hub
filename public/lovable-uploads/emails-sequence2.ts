export const getMidasLogicEmailHTML = (userName: string, upgradeLink: string = 'https://appmillionbots.com/quieroserpro') => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lógica de Mercado</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e2e8f0; line-height: 1.6;">
  
  <!-- Container Principal -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <!-- Card do E-mail -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 12px; border: 1px solid #451a03; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          
          <!-- Header (Tema Midas/Gold) -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #451a03; text-align: center; background-color: #1a0f00;">
              <h1 style="margin: 0; color: #fbbf24; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">PROTOCOLO MIDAS</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #d97706; text-transform: uppercase; letter-spacing: 1px;">Inteligencia Invisible</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin-bottom: 20px; font-size: 16px;">Hola, <strong>${userName}</strong>.</p>
              
              <p style="margin-bottom: 20px; font-size: 16px;">
                Mientras duermes o esperas que el tiempo de bloqueo del Plan Free termine, el <strong>Efecto Midas PRO</strong> sigue operando.
              </p>

              <p style="margin-bottom: 25px; font-size: 16px;">
                Muchos usuarios me preguntan por qué el bot Midas a veces tarda en abrir una operación. La respuesta es el <strong>"Modo Sombra" (Shadow Mode)</strong>.
              </p>

              <!-- Box Explicativo -->
              <div style="background-color: #1e293b; padding: 20px; border-left: 4px solid #fbbf24; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 14px; color: #e2e8f0;">
                  👁️ <strong>¿Cómo funciona?</strong><br><br>
                  El algoritmo monitorea el mercado de forma <em>invisible</em>. No dispara órdenes al azar. Él espera una "Anomalía Estadística" específica (como la repetición doble de un dígito en tendencia neutra).
                  <br><br>
                  Solo cuando la probabilidad matemática supera el <strong>90%</strong>, el bot sale de las sombras y ejecuta el tiro.
                </p>
              </div>

              <p style="margin-bottom: 20px; font-size: 16px;">
                En el Plan Free, juegas con protección, pero con un arsenal limitado. En el <strong>Plan PRO</strong>, desbloqueas dos ventajas injustas:
              </p>

              <ul style="margin-bottom: 25px; padding-left: 20px; color: #cbd5e1;">
                <li style="margin-bottom: 10px;">
                  🚀 <strong>Midas Ilimitado:</strong> Sin pausas de enfriamiento. Puedes dejar el "Modo Sombra" escaneando todo el día.
                </li>
                <li style="margin-bottom: 10px;">
                  📈 <strong>Vector Flow AI:</strong> Acceso a nuestro bot de tendencia exclusivo (bloqueado en la versión gratuita).
                </li>
              </ul>

              <p style="margin-bottom: 25px; font-size: 16px;">
                Piénsalo fríamente: <strong>Un solo día</strong> de meta cumplida en el modo PRO ($30 o $50) paga la suscripción anual entera.
              </p>
              
              <p style="margin-bottom: 30px; font-size: 16px; color: #fbbf24; font-weight: bold; text-align: center;">
                La matemática está de tu lado. ¿Por qué limitarla?
              </p>

              <!-- Botão CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${upgradeLink}" style="display: inline-block; padding: 16px 32px; background-color: #fbbf24; color: #0f172a; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; transition: all 0.3s ease; box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);">
                      👁️ ACTIVAR MODO SOMBRA ILIMITADO
                    </a>
                  </td>
                </tr>
              </table>

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
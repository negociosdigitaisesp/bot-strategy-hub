const https = require('https');

const sql = `
CREATE SCHEMA IF NOT EXISTS iq_quant;

CREATE TABLE IF NOT EXISTS iq_quant.pending_trades (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID    NOT NULL,
  signal_id        TEXT    NOT NULL,
  ativo            TEXT    NOT NULL,
  direcao          TEXT    NOT NULL,
  stake_g0         NUMERIC NOT NULL DEFAULT 1.0,
  stake_g1         NUMERIC NOT NULL DEFAULT 2.2,
  stake_g2         NUMERIC NOT NULL DEFAULT 5.0,
  gale_level       INT     DEFAULT 0,
  status           TEXT    DEFAULT 'pending',
  result           TEXT,
  profit           NUMERIC,
  idempotency_key  TEXT    UNIQUE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  executed_at      TIMESTAMPTZ
);

ALTER TABLE iq_quant.pending_trades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='pending_trades' AND schemaname='iq_quant' AND policyname='own_trades'
  ) THEN
    CREATE POLICY own_trades ON iq_quant.pending_trades
      USING (client_id::text = auth.uid()::text);
  END IF;
END $$;
`;

// Try via Supabase Management API
const MGMT_TOKEN = 'sb_secret_4pi9eoVwSNfZABFRK7YfKA_em53gUV0';
const PROJECT_REF = 'ypqekkkrfklaqlzhkbwg';

const body = JSON.stringify({ query: sql });

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${MGMT_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', data);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Tabela iq_quant.pending_trades criada com sucesso!');
    } else {
      console.error('❌ Erro ao criar tabela. Verifique o Supabase Dashboard manualmente.');
    }
  });
});

req.on('error', (e) => {
  console.error('Erro de rede:', e.message);
});

req.write(body);
req.end();

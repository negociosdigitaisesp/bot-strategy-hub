/**
 * IQTraderCard.jsx
 * Card de trader para o marketplace de Copy Trading.
 * Exibe avatar, métricas, sparkline e botões de ação.
 * Dados recebidos via props — lógica nos hooks (Parte 3).
 */

import React from 'react';
import '../../styles/iq-bot-animations.css';

/* ─── Gera sparkline SVG simples com base em array de valores ─── */
function Sparkline({ data = [], width = 100, height = 32, isPositive = true }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${pts.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  const color = isPositive ? '#00FF88' : '#FF3B5C';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      {/* Área preenchida semi-transparente */}
      <path d={areaD} fill={color} fillOpacity="0.12" />
      {/* Linha principal */}
      <path d={pathD} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Badge de nível do trader ─── */
function LevelBadge({ level }) {
  const styles = {
    ELITE: {
      bg: 'rgba(255,184,0,0.15)',
      border: '1px solid rgba(255,184,0,0.45)',
      color: '#FFB800',
      shadow: '0 0 8px rgba(255,184,0,0.25)',
    },
    PRO: {
      bg: 'rgba(0,180,255,0.15)',
      border: '1px solid rgba(0,180,255,0.35)',
      color: '#00B4FF',
      shadow: 'none',
    },
    MASTER: {
      bg: 'rgba(123,97,255,0.15)',
      border: '1px solid rgba(123,97,255,0.35)',
      color: '#7B61FF',
      shadow: 'none',
    },
  };

  const s = styles[level] || styles.PRO;

  return (
    <span
      style={{
        background: s.bg,
        border: s.border,
        color: s.color,
        boxShadow: s.shadow,
        fontSize: '9px',
        fontWeight: 800,
        letterSpacing: '0.08em',
        padding: '2px 7px',
        borderRadius: '6px',
        textTransform: 'uppercase',
      }}
    >
      {level}
    </span>
  );
}

/* ─── Pill de status do trader ─── */
function StatusPill({ status }) {
  const operando = status === 'OPERANDO';

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: '10px',
        fontWeight: 600,
        color: operando ? '#00FF88' : '#4A6080',
        background: operando ? 'rgba(0,255,136,0.10)' : 'rgba(74,96,128,0.12)',
        border: `1px solid ${operando ? 'rgba(0,255,136,0.25)' : 'rgba(74,96,128,0.2)'}`,
        borderRadius: '20px',
        padding: '3px 10px 3px 7px',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: operando ? '#00FF88' : '#4A6080',
          display: 'inline-block',
          animation: operando ? 'iqLiveDot 1.4s ease-in-out infinite' : 'none',
        }}
      />
      {operando ? 'OPERANDO' : 'EM ESPERA'}
    </span>
  );
}

/* ─── Linha de métrica ─── */
function MetricCell({ label, value, valueColor }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.025)',
        borderRadius: 8,
      }}
    >
      <span style={{ fontSize: '9px', fontWeight: 700, color: '#4A6080', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 700, color: valueColor || '#E8EDF5' }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Componente principal ─── */
export default function IQTraderCard({ trader, isCopiando, onCopiar, onParar }) {
  const {
    nome,
    level,
    status,
    winRate,
    totalOps,
    lucroMes,
    maxDD,
    gradiente,
    sparklineData,
  } = trader;

  const lucroPositivo = lucroMes >= 0;
  const lucroFormatado = lucroPositivo
    ? `+$${lucroMes.toLocaleString('pt-BR')}`
    : `-$${Math.abs(lucroMes).toLocaleString('pt-BR')}`;

  return (
    <article
      style={{
        background: 'var(--iq-bg-card)',
        border: isCopiando
          ? '1.5px solid rgba(0,255,136,0.4)'
          : '1px solid var(--iq-border)',
        borderRadius: 'var(--iq-radius)',
        padding: 0,
        overflow: 'hidden',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        cursor: 'default',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Faixa de cor do trader no topo */}
      <div style={{ height: 4, background: gradiente, width: '100%' }} />

      <div style={{ padding: '16px 16px 0' }}>
        {/* ─── Topo: Avatar + Nome + Badges ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar com gradiente único */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: gradiente,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 900,
                color: '#0D1420',
                flexShrink: 0,
                boxShadow: '0 0 16px rgba(0,0,0,0.4)',
              }}
            >
              {nome.charAt(0)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#E8EDF5', letterSpacing: '0.04em' }}>
                  {nome}
                </span>
                <LevelBadge level={level} />
              </div>
              <StatusPill status={status} />
            </div>
          </div>
        </div>

        {/* ─── Grid de métricas 2x2 ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
          <MetricCell label="Win Rate" value={`${winRate}%`} valueColor="#00FF88" />
          <MetricCell label="Operações" value={totalOps.toLocaleString('pt-BR')} />
          <MetricCell label="Lucro Mês" value={lucroFormatado} valueColor={lucroPositivo ? '#00FF88' : '#FF3B5C'} />
          <MetricCell label="Max DD" value={`${maxDD}%`} valueColor="#FFB800" />
        </div>

        {/* ─── Barra de performance com sparkline ─── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#4A6080', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Últimos 7 dias
            </span>
          </div>
          <div style={{ borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.025)', padding: '6px 10px' }}>
            <Sparkline data={sparklineData} width={200} height={32} isPositive={lucroPositivo} />
          </div>
        </div>
      </div>

      {/* ─── Botões de ação ─── */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        {isCopiando ? (
          <>
            {/* Estado: copiando */}
            <button
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: 10,
                border: '1.5px solid #00FF88',
                background: 'rgba(0,255,136,0.08)',
                color: '#00FF88',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>COPIANDO</span>
              <span>✓</span>
            </button>
            <button
              onClick={() => onParar && onParar(trader.id)}
              style={{
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,59,92,0.35)',
                background: 'rgba(255,59,92,0.08)',
                color: '#FF3B5C',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,92,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,59,92,0.08)'; }}
            >
              Parar
            </button>
          </>
        ) : (
          <button
            onClick={() => onCopiar && onCopiar(trader)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #00FF88, #00D4FF)',
              color: '#07100D',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'opacity 150ms ease, transform 100ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.01)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            COPIAR TRADER
          </button>
        )}
      </div>
    </article>
  );
}

// AnnualChart — pure-SVG bar chart. Chart.js replacement for the kit (cosmetic only).
// Three series per month: entrada (petrol), saida (red), liquido line (gold).

const AnnualChart = ({ data, highlights, subtitle }) => {
  const W = 880, H = 240;
  const padL = 44, padR = 16, padT = 18, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxV = Math.max(...data.flatMap(d => [d.entrada, d.saida, Math.abs(d.liquido)]));
  const yScale = (v) => padT + innerH - (v / maxV) * innerH;
  const barW = innerW / data.length / 3.2;
  const groupW = innerW / data.length;

  const liquidoPath = data
    .map((d, i) => {
      const x = padL + groupW * i + groupW / 2;
      const y = yScale(d.liquido);
      return (i === 0 ? 'M' : 'L') + x + ' ' + y;
    })
    .join(' ');

  return (
    <section className="panel chart-panel" style={{ borderLeft: '3px solid var(--gold)' }}>
      <div className="panel-header chart-header">
        <div>
          <span className="panel-eyebrow">Relatório</span>
          <h2>Visão anual</h2>
          <span className="chart-subtitle">
            <span className="dot dot-petrol" style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'var(--petrol)', marginRight:6 }}/> entrada
            <span style={{ margin: '0 6px', color: 'var(--text-faint)' }}>·</span>
            <span className="dot dot-red" style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'var(--red)', marginRight:6 }}/> saída
            <span style={{ margin: '0 6px', color: 'var(--text-faint)' }}>·</span>
            <span className="dot dot-gold" style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'var(--gold)', marginRight:6 }}/> líquido
            <span style={{ margin: '0 8px', color: 'var(--text-faint)' }}>·</span>
            {subtitle}
          </span>
        </div>
        <div className="chart-highlights">
          {highlights.map((h) => (
            <div className="highlight" key={h.label}>
              <span className="highlight-label">{h.label}</span>
              <span className="highlight-value">{h.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {/* gridlines */}
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p}
              x1={padL} x2={W - padR}
              y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)}
              stroke="var(--border)" strokeDasharray="3 4" />
          ))}
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <text key={'l'+p}
              x={padL - 8} y={padT + innerH * (1 - p) + 4}
              textAnchor="end"
              fontSize="10" fontFamily="JetBrains Mono, monospace"
              fill="var(--text-muted)">
              {(maxV * p / 1000).toFixed(1).replace('.', ',')}k
            </text>
          ))}
          {data.map((d, i) => {
            const cx = padL + groupW * i + groupW / 2;
            return (
              <g key={d.mes}>
                <rect x={cx - barW - 2} y={yScale(d.entrada)}
                      width={barW} height={padT + innerH - yScale(d.entrada)}
                      fill="var(--petrol)" rx="2" />
                <rect x={cx + 2} y={yScale(d.saida)}
                      width={barW} height={padT + innerH - yScale(d.saida)}
                      fill="var(--red)" rx="2" />
                <text x={cx} y={H - padB + 18}
                      textAnchor="middle"
                      fontSize="11" fontFamily="Alte Haas Grotesk, sans-serif"
                      fill="var(--text-muted)" fontWeight="500">
                  {d.mes}
                </text>
              </g>
            );
          })}
          <path d={liquidoPath} fill="none" stroke="var(--gold)" strokeWidth="2" />
          {data.map((d, i) => {
            const cx = padL + groupW * i + groupW / 2;
            return <circle key={d.mes} cx={cx} cy={yScale(d.liquido)} r="3" fill="var(--gold)" />;
          })}
        </svg>
      </div>
    </section>
  );
};

Object.assign(window, { AnnualChart });

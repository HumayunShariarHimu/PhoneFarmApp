import { useState, useEffect } from 'react';
import { socketActions, getSocket } from '../../lib/socket';

const STATUS_COLOR = { running:'#00e676', stopped:'#6b7e99', starting:'#ffd600', error:'#ff1744', paused:'#ffd600', restarting:'#ff9100', installing:'#00e5ff' };
const STATUS_DOT   = { running:'#00e676', stopped:'#3a4560', starting:'#ffd600', error:'#ff1744' };

export default function PhoneCard({ device, selected, onSelect, onOpen, onAction }) {
  const [metrics, setMetrics] = useState(device.metrics || {});

  useEffect(() => {
    const sock = getSocket();
    const handler = (updates) => {
      const u = updates.find(u => u.id === device.id);
      if (u?.metrics) setMetrics(u.metrics);
    };
    sock.on('metrics:update', handler);
    return () => sock.off('metrics:update', handler);
  }, [device.id]);

  const isRunning = device.status === 'running';
  const borderColor = isRunning ? STATUS_COLOR.running : STATUS_COLOR[device.status] || '#162035';

  return (
    <div
      onClick={() => onOpen(device)}
      style={{
        background: '#0b1120', border: `1px solid ${selected ? '#00e5ff' : borderColor}`,
        borderTop: `2.5px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden',
        cursor: 'pointer', transition: 'all .15s', position: 'relative', userSelect: 'none',
        boxShadow: selected ? '0 0 0 1px #00e5ff' : 'none',
      }}
      onMouseEnter={e => { if(!selected) e.currentTarget.style.borderColor = '#00e5ff33'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { if(!selected) e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Select checkbox */}
      <div
        onClick={e => { e.stopPropagation(); onSelect(device.id); }}
        style={{ position: 'absolute', top: 5, left: 5, zIndex: 10, width: 16, height: 16, borderRadius: 3, border: `1px solid ${selected ? '#00e5ff' : 'rgba(255,255,255,.2)'}`, background: selected ? '#00e5ff' : 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#000', cursor: 'pointer', transition: 'all .15s' }}
      >
        {selected ? '✓' : ''}
      </div>

      {/* Mini screen placeholder (screenshot updated every 10s) */}
      <div style={{ width: '100%', height: 130, background: '#000', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #0d1a2e' }}>
        {device.lastScreenshot ? (
          <img src={device.lastScreenshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#050810,#0b1120)' }}>
            <span style={{ fontSize: 28, opacity: .4 }}>📱</span>
            <span style={{ fontSize: 10, color: '#2e3d52' }}>{isRunning ? 'Live' : device.status}</span>
          </div>
        )}

        {/* Status bar overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 14, background: 'rgba(0,0,0,.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 5px', fontSize: 7, fontFamily: 'monospace', color: 'rgba(255,255,255,.8)' }}>
          <span>{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
          <span style={{ color: metrics.battery < 20 ? '#ff1744' : '#00e676' }}>{Math.round(metrics.battery || 100)}%</span>
        </div>

        {/* Nav bar overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, background: 'rgba(0,0,0,.6)', display: 'flex', justifyContent: 'center', gap: 14, fontSize: 8, color: 'rgba(255,255,255,.6)', alignItems: 'center' }}>
          <span onClick={e => { e.stopPropagation(); socketActions.back(device.id); }}>◁</span>
          <span onClick={e => { e.stopPropagation(); socketActions.home(device.id); }}>●</span>
          <span onClick={e => { e.stopPropagation(); socketActions.recents(device.id); }}>◻</span>
        </div>

        {/* Error overlay */}
        {device.status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,23,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: 'rgba(0,0,0,.7)', color: '#ff1744', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>⚠ ERROR</span>
          </div>
        )}
        {device.status === 'starting' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#ffd600', fontSize: 10 }}>⟳ Booting...</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '6px 8px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a4560' }}>{device.name}</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[device.status] || '#3a4560', display: 'inline-block', boxShadow: isRunning ? `0 0 5px ${STATUS_DOT.running}` : 'none' }}></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#00e676', fontFamily: 'monospace', fontWeight: 700 }}>
            ${((device.metrics?.earnings || 0)).toFixed(5)}
          </span>
          <span style={{ fontSize: 10, color: '#6b7e99' }}>
            {device.currentApp || (isRunning ? 'Idle' : device.status)}
          </span>
        </div>

        {/* CPU/RAM bars */}
        {isRunning && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
            {[['CPU', metrics.cpu || 0, '#00e5ff'], ['RAM', metrics.memory || 0, '#aa00ff']].map(([label, val, color]) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#3a4560', marginBottom: 1 }}>
                  <span>{label}</span><span>{Math.round(val)}%</span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,.06)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(val, 100)}%`, background: color, borderRadius: 1, transition: 'width .5s' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,.05)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${device.taskProgress || 0}%`, background: '#00e676', borderRadius: 1 }}></div>
        </div>
      </div>

      {/* Quick actions on hover */}
      <div style={{ display: 'flex', gap: 2, padding: '0 6px 6px' }}>
        {[
          ['▶', () => onAction(device.id, isRunning ? 'stop' : 'start'), isRunning ? '#ff1744' : '#00e676'],
          ['📸', () => { onAction(device.id, 'screenshot'); }, '#6b7e99'],
          ['🔄', () => onAction(device.id, 'restart'), '#ffd600'],
        ].map(([icon, fn, color]) => (
          <button key={icon} onClick={e => { e.stopPropagation(); fn(); }}
            style={{ flex: 1, padding: '3px 0', background: '#111d2e', border: '1px solid #162035', borderRadius: 4, color, fontSize: 11, cursor: 'pointer' }}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

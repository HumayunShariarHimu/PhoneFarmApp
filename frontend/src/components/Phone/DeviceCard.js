import { useState, useEffect } from 'react';
import { getSocket, ctrl } from '../../lib/socket';

const STATUS = {
  running: { color:'#00e676', label:'Running', dot:true  },
  stopped: { color:'#3a4560', label:'Offline',  dot:false },
  starting:{ color:'#ffd600', label:'Starting', dot:true  },
  error:   { color:'#ff1744', label:'Error',    dot:true  },
  queued:  { color:'#ff9100', label:'Queued',   dot:false },
  busy:    { color:'#00e5ff', label:'Busy',     dot:true  },
};

export default function DeviceCard({ device, selected, onSelect, onOpen, onAction }) {
  const [frame,   setFrame]   = useState(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const sock = getSocket();
    const key  = `device:frame:${device.id}`;
    const fn   = (d) => { if (d.id === device.id) setFrame(d.frame); };
    sock.on(key, fn);
    return () => sock.off(key, fn);
  }, [device.id]);

  const st = STATUS[device.status] || STATUS.stopped;
  const isRunning = device.status === 'running' || device.status === 'busy';
  const dh = device.height || 851;
  const dw = device.width  || 393;
  const screenH = Math.round(150 * dh / dw);

  return (
    <div
      onClick={() => onOpen(device)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="device-card"
      style={{
        background:'#0b1120',
        border:`1px solid ${selected ? '#00e5ff' : hovered ? 'rgba(0,229,255,.2)' : '#162035'}`,
        borderTop:`2.5px solid ${st.color}`,
        borderRadius:10, overflow:'hidden', cursor:'pointer',
        transition:'all .15s', position:'relative', userSelect:'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: selected ? '0 0 0 1px #00e5ff' : hovered ? '0 6px 20px rgba(0,0,0,.5)' : 'none',
      }}
    >
      {/* Select checkbox */}
      <div
        onClick={e => { e.stopPropagation(); onSelect(device.id); }}
        className="device-select"
        role="checkbox"
        aria-checked={selected}
        aria-label={`Select ${device.name || device.model}`}
        title={selected ? 'Deselect device' : 'Select device'}
        style={{ position:'absolute', top:5, left:5, zIndex:10, width:16, height:16, borderRadius:3, border:`1px solid ${selected?'#00e5ff':'rgba(255,255,255,.15)'}`, background:selected?'#00e5ff':'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#000', cursor:'pointer', fontWeight:900 }}
      >
        {selected && '✓'}
      </div>

      {/* Screen */}
      <div style={{ width:'100%', height:screenH, background:'#000', position:'relative', overflow:'hidden', borderBottom:'1px solid #0d1525' }}>
        {/* Android status bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:14, background:'rgba(0,0,0,.6)', zIndex:2, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 5px', fontSize:7, color:'rgba(255,255,255,.85)', fontFamily:'monospace' }}>
          <span>{new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'})}</span>
          <span style={{ color: device.battery < 20 ? '#ff1744' : 'rgba(255,255,255,.85)' }}>{Math.round(device.battery||85)}%</span>
        </div>

        {/* Live screenshot */}
        {frame ? (
          <img src={`data:image/jpeg;base64,${frame}`} draggable={false} alt="" style={{ width:'100%', height:'100%', objectFit:'fill', display:'block', pointerEvents:'none' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, background:'linear-gradient(135deg,#050810,#090f1c)' }}>
            <span style={{ fontSize:26, opacity:.25 }}>📱</span>
            <span style={{ fontSize:9, color:'#2e3d52' }}>{isRunning ? 'Connecting...' : device.status}</span>
          </div>
        )}

        {/* LIVE badge */}
        {frame && isRunning && (
          <div style={{ position:'absolute', top:16, right:3, background:'rgba(255,23,68,.85)', color:'#fff', fontSize:7, fontWeight:700, padding:'1px 4px', borderRadius:3, zIndex:3 }}>LIVE</div>
        )}

        {/* Status overlay */}
        {device.status === 'error' && (
          <div style={{ position:'absolute', inset:0, background:'rgba(255,23,68,.15)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:4 }}>
            <span style={{ background:'rgba(0,0,0,.8)', color:'#ff1744', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4 }}>⚠ ERROR</span>
          </div>
        )}
        {device.status === 'queued' && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:4, fontSize:9, color:'#ff9100' }}>⏳ Queued</div>
        )}

        {/* Nav bar */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:14, background:'rgba(0,0,0,.6)', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:14, fontSize:9, color:'rgba(255,255,255,.55)' }}>
          <button className="device-nav-action" aria-label="Go back" title="Go back" onClick={e=>{e.stopPropagation();ctrl.back(device.id)}} style={{ cursor:'pointer', background:'none', border:'none', color:'inherit', padding:0 }}>◁</button>
          <button className="device-nav-action" aria-label="Open home page" title="Open home page" onClick={e=>{e.stopPropagation();ctrl.goto(device.id,'https://www.google.com')}} style={{ cursor:'pointer', background:'none', border:'none', color:'inherit', padding:0 }}>●</button>
          <button className="device-nav-action" aria-label="Recent apps" title="Recent apps" onClick={e=>e.stopPropagation()} style={{ cursor:'pointer', background:'none', border:'none', color:'inherit', padding:0 }}>◻</button>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:'7px 8px 5px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#dde5f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{device.brand}</div>
            <div style={{ fontSize:10, color:'#6b7e99', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{device.model}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <span style={{ fontSize:9, color:st.color, fontWeight:600 }}>{st.label}</span>
            <span style={{ width:6, height:6, borderRadius:'50%', background:st.color, boxShadow: st.dot && isRunning ? `0 0 5px ${st.color}` : 'none', animation: st.dot ? 'pulse 2s infinite' : 'none' }}></span>
          </div>
        </div>

        <div className="device-meta" style={{ fontSize:9, color:'#3a4560', display:'flex', gap:8, marginBottom:5 }}>
          <span>Android {device.android}</span>
          <span>{device.width}×{device.height}</span>
          <span>{device.ram}</span>
        </div>

        {/* Quick actions */}
        <div style={{ display:'flex', gap:3 }}>
          <button onClick={e=>{e.stopPropagation(); onAction(device.id, isRunning?'stop':'start')}}
            style={{ flex:1, padding:'4px 0', background:isRunning?'rgba(255,23,68,.1)':'rgba(0,230,118,.1)', color:isRunning?'#ff1744':'#00e676', border:`1px solid ${isRunning?'rgba(255,23,68,.2)':'rgba(0,230,118,.2)'}`, borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:700 }}>
            {isRunning ? '■ Stop' : '▶ Start'}
          </button>
          <button className="device-icon-action" aria-label={`Take screenshot of ${device.name || device.model}`} title="Take screenshot" onClick={e=>{e.stopPropagation(); onAction(device.id,'screenshot')}}
            style={{ width:28, padding:'4px 0', background:'rgba(255,255,255,.04)', border:'1px solid #162035', borderRadius:5, cursor:'pointer', fontSize:11, color:'#6b7e99' }}>
            📸
          </button>
          <button className="device-icon-action" aria-label={`Remove ${device.name || device.model}`} title="Remove device" onClick={e=>{e.stopPropagation(); onAction(device.id,'remove')}}
            style={{ width:28, padding:'4px 0', background:'rgba(255,255,255,.04)', border:'1px solid #162035', borderRadius:5, cursor:'pointer', fontSize:11, color:'#6b7e99' }}>
            🗑
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

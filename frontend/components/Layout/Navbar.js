import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';

export default function Navbar({ title }) {
  const [time, setTime]   = useState('');
  const [rate, setRate]   = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const timer = setInterval(tick, 1000);

    const sock = getSocket();
    sock.on('farm:devices:update', devs => {
      const running = devs.filter(d => d.status === 'running');
      setActive(running.length);
      setRate(running.length * 0.08);
    });

    return () => { clearInterval(timer); sock.off('farm:devices:update'); };
  }, []);

  return (
    <header style={{ position:'fixed', top:0, left:230, right:0, height:58, background:'rgba(5,8,15,.94)', backdropFilter:'blur(16px)', borderBottom:'1px solid #0d1a2e', zIndex:99, display:'flex', alignItems:'center', padding:'0 20px', gap:14 }}>
      <div style={{ fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 }}>{title}</div>

      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
        {/* Live rate */}
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:800, color:'#00e676', padding:'5px 11px', background:'rgba(0,230,118,.1)', border:'1px solid rgba(0,230,118,.25)', borderRadius:7, fontFamily:'monospace' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#ff1744', display:'inline-block', animation:'blink 1s infinite' }}></span>
          LIVE&nbsp;${rate.toFixed(3)}/hr
        </div>

        {/* Active count */}
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, padding:'5px 11px', background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.15)', borderRadius:7, color:'#00e5ff' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#00e676', display:'inline-block', boxShadow:'0 0 6px #00e676' }}></span>
          {active} Active
        </div>

        {/* Clock */}
        <div style={{ fontFamily:'monospace', fontSize:13, color:'#6b7e99', padding:'5px 10px', background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:7 }}>
          {time}
        </div>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
    </header>
  );
}

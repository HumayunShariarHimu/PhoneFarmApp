import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';

const NAV = [
  { href:'/farm',      icon:'📱', label:'Farm Control',  badge:'devices' },
  { href:'/earnings',  icon:'💰', label:'Earnings' },
  { href:'/tasks',     icon:'🤖', label:'Tasks',         badge:'tasks' },
  { href:'/accounts',  icon:'👤', label:'Accounts' },
  { href:'/proxies',   icon:'🌐', label:'Proxies' },
  { href:'/analytics', icon:'📊', label:'Analytics' },
  { href:'/settings',  icon:'⚙', label:'Settings' },
];

export default function Sidebar() {
  const router = useRouter();
  const [farmStats, setFarmStats] = useState({ running:0, total:0, todayEarnings:0, rate:0 });

  useEffect(() => {
    const sock = getSocket();
    sock.on('farm:devices:update', (devs) => {
      const running = devs.filter(d => d.status === 'running').length;
      setFarmStats(s => ({ ...s, running, total: devs.length }));
    });
  }, []);

  return (
    <aside style={{ position:'fixed', left:0, top:0, bottom:0, width:230, background:'#07090f', borderRight:'1px solid #0d1a2e', zIndex:100, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px', borderBottom:'1px solid #0d1a2e', minHeight:58 }}>
        <div style={{ width:32, height:32, background:'linear-gradient(135deg,#00e5ff,#006fff)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#000', flexShrink:0 }}>⌬</div>
        <div>
          <div style={{ fontWeight:800, fontSize:'1rem', color:'#fff', letterSpacing:'-.3px' }}>PhoneFarmOS</div>
          <div style={{ fontSize:10, color:'#2e3d52' }}>v3.0 · Real Emulator</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase', color:'#2e3d52', padding:'10px 10px 4px' }}>Main</div>
        {NAV.map(({ href, icon, label }) => {
          const active = router.pathname === href;
          return (
            <Link href={href} key={href} style={{ textDecoration:'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:8, color: active ? '#00e5ff' : '#6b7e99', background: active ? 'rgba(0,229,255,.08)' : 'transparent', border: `1px solid ${active ? 'rgba(0,229,255,.2)' : 'transparent'}`, cursor:'pointer', transition:'all .15s', position:'relative', fontSize:14, fontWeight:500 }}>
                {active && <div style={{ position:'absolute', left:0, top:7, bottom:7, width:3, background:'#00e5ff', borderRadius:'0 2px 2px 0' }}></div>}
                <span style={{ fontSize:15, width:20, textAlign:'center', flexShrink:0 }}>{icon}</span>
                <span>{label}</span>
                {label === 'Farm Control' && farmStats.running > 0 && (
                  <span style={{ marginLeft:'auto', fontSize:10, fontWeight:800, padding:'1px 6px', borderRadius:10, background:'#00e5ff', color:'#000' }}>{farmStats.running}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer stats */}
      <div style={{ padding:'10px 8px', borderTop:'1px solid #0d1a2e' }}>
        <div style={{ background:'#0b1120', borderRadius:8, padding:'10px 12px', border:'1px solid #0d1a2e' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
            <span style={{ color:'#2e3d52' }}>Running</span>
            <span style={{ color:'#00e5ff', fontFamily:'monospace', fontWeight:700 }}>{farmStats.running}/{farmStats.total}</span>
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,.05)', borderRadius:2, overflow:'hidden', marginBottom:6 }}>
            <div style={{ height:'100%', width:`${farmStats.total ? (farmStats.running/farmStats.total*100) : 0}%`, background:'#00e676', borderRadius:2, transition:'width .5s' }}></div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span style={{ color:'#2e3d52' }}>Rate/hr</span>
            <span style={{ color:'#ffd600', fontFamily:'monospace', fontWeight:700 }}>${(farmStats.running*0.08).toFixed(3)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

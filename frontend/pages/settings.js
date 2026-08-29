// settings.js
import Head from 'next/head';
import Layout from '../components/Layout/Layout';
import { settingsAPI } from '../lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const inp = { background:'#0b1120', border:'1px solid #162035', borderRadius:7, color:'#dde5f0', fontSize:13, padding:'8px 12px', width:'100%', outline:'none' };

  return (
    <>
      <Head><title>Settings — PhoneFarmOS</title></Head>
      <Layout title="Settings">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ margin:0, color:'#dde5f0' }}>Settings</h2>
          <button onClick={() => toast.success('Settings saved!')} style={{ padding:'9px 18px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>💾 Save</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Farm config */}
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560', marginBottom:16 }}>Farm Configuration</div>
            {[['Farm Name','text','My Phone Farm'],['Max Emulators','number','50'],['Default RAM (MB)','number','2048'],['Default CPUs','number','2']].map(([l,t,ph]) => (
              <div key={l} style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:5 }}>{l}</label>
                <input type={t} defaultValue={ph} style={inp} />
              </div>
            ))}
          </div>

          {/* Automation */}
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560', marginBottom:16 }}>Automation</div>
            {[['Auto-Restart on Error','Automatically restart phones that error'],['Auto-Start on Launch','Start all phones when app loads'],['Screenshot Monitoring','Take periodic screenshots'],['Metrics Tracking','Track CPU/RAM/battery in real-time']].map(([title, desc], i) => (
              <div key={title} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #0d1a2e' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'#dde5f0' }}>{title}</div>
                  <div style={{ fontSize:11, color:'#3a4560', marginTop:2 }}>{desc}</div>
                </div>
                <div style={{ width:44, height:24, background:'rgba(0,230,118,.2)', borderRadius:12, position:'relative', cursor:'pointer', border:'1px solid rgba(0,230,118,.3)' }}>
                  <div style={{ position:'absolute', top:2, right:2, width:18, height:18, background:'#00e676', borderRadius:'50%', transition:'all .2s' }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* System info */}
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560', marginBottom:16 }}>System Info</div>
            {[['Version','3.0.0'],['Stack','Next.js + Node.js + QEMU + ADB'],['Database','PostgreSQL + Prisma'],['Queue','Redis + Bull'],['Streaming','WebRTC + VNC'],['Automation','ADB + Puppeteer']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #0d1a2e', fontSize:12 }}>
                <span style={{ color:'#3a4560' }}>{k}</span>
                <span style={{ color:'#dde5f0', fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Danger zone */}
          <div style={{ background:'rgba(255,23,68,.05)', border:'1px solid rgba(255,23,68,.15)', borderRadius:10, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#ff1744', marginBottom:16 }}>⚠ Danger Zone</div>
            {[['Stop All Emulators','Immediately stop all running VMs','Stop All'],['Clear Task Queue','Remove all pending tasks from queue','Clear Queue'],['Reset Database','Delete all data and start fresh','Reset All']].map(([title, desc, btn]) => (
              <div key={title} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,23,68,.1)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'#dde5f0' }}>{title}</div>
                  <div style={{ fontSize:11, color:'#6b7e99', marginTop:2 }}>{desc}</div>
                </div>
                <button onClick={() => toast.error('Are you sure? This cannot be undone.')} style={{ padding:'6px 12px', background:'rgba(255,23,68,.1)', color:'#ff1744', border:'1px solid rgba(255,23,68,.25)', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>{btn}</button>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    </>
  );
}

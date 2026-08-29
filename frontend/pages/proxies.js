// proxies.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout/Layout';
import { proxiesAPI } from '../lib/api';
import toast from 'react-hot-toast';

const STATUS_C = { ACTIVE:'#00e676', FAILED:'#ff1744', SLOW:'#ffd600', UNTESTED:'#6b7e99', BANNED:'#ff1744' };

export default function ProxiesPage() {
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showBulk,setShowBulk]= useState(false);
  const [testing, setTesting] = useState(new Set());
  const [form, setForm] = useState({ host:'', port:8080, protocol:'HTTP', username:'', password:'', country:'', provider:'', name:'' });
  const [bulkLines, setBulkLines] = useState('');
  const inp = { background:'#0b1120', border:'1px solid #162035', borderRadius:7, color:'#dde5f0', fontSize:13, padding:'8px 12px', width:'100%', outline:'none' };

  const load = () => proxiesAPI.list({ limit:500 }).then(r => setProxies(r.data||[])).catch(() => toast.error('Load failed')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.host) return toast.error('Host required');
    try { await proxiesAPI.create(form); toast.success('Proxy added!'); setShowNew(false); load(); }
    catch (e) { toast.error(e?.error || 'Failed'); }
  };

  const testProxy = async (id) => {
    setTesting(s => new Set(s).add(id));
    try {
      const r = await proxiesAPI.test(id);
      toast[r.data.ok ? 'success' : 'error'](r.data.ok ? `Active — ${r.data.latency}ms` : 'Proxy failed');
      load();
    } catch { toast.error('Test failed'); }
    finally { setTesting(s => { const n=new Set(s); n.delete(id); return n; }); }
  };

  const testAll = async () => {
    toast.success('Testing all proxies in background...');
    proxiesAPI.testAll().then(load).catch(() => {});
  };

  const deleteProxy = async (id) => {
    try { await proxiesAPI.delete(id); load(); }
    catch { toast.error('Delete failed'); }
  };

  const bulkImport = async () => {
    try {
      const r = await proxiesAPI.import({ lines: bulkLines, protocol: 'HTTP' });
      toast.success(`Imported ${r.data.created} proxies`);
      setShowBulk(false); setBulkLines(''); load();
    } catch { toast.error('Import failed'); }
  };

  const active = proxies.filter(p => p.status === 'ACTIVE');
  const avgLat  = active.length ? Math.round(active.reduce((s,p)=>s+(p.latency||0),0)/active.length) : 0;

  return (
    <>
      <Head><title>Proxies — PhoneFarmOS</title></Head>
      <Layout title="Proxy Manager">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div><h2 style={{ margin:0, color:'#dde5f0' }}>Proxy Manager</h2><p style={{ fontSize:12, color:'#6b7e99', margin:'4px 0 0' }}>{proxies.length} proxies · {active.length} active · avg {avgLat}ms</p></div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={testAll} style={{ padding:'9px 14px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>🔄 Test All</button>
            <button onClick={() => setShowBulk(true)} style={{ padding:'9px 14px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>📥 Import</button>
            <button onClick={() => setShowNew(true)} style={{ padding:'9px 14px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>＋ Add Proxy</button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
          {[['Total', proxies.length, '#00e5ff'],['Active', active.length, '#00e676'],['Failed', proxies.filter(p=>p.status==='FAILED').length, '#ff1744'],['Avg Latency', avgLat+'ms', avgLat>200?'#ffd600':'#00e676']].map(([l,v,c]) => (
            <div key={l} style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
              <div style={{ fontSize:11, color:'#3a4560', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Proxy','Country','Type','Status','Latency','Devices','Actions'].map(h => <th key={h} style={{ background:'#111d2e', color:'#3a4560', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', padding:'9px 12px', textAlign:'left', borderBottom:'1px solid #0d1a2e' }}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#3a4560' }}>Loading...</td></tr>}
              {proxies.map(p => (
                <tr key={p.id} style={{ borderBottom:'1px solid rgba(255,255,255,.03)', opacity:p.status==='FAILED'?.55:1 }}>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, fontWeight:600, color:'#dde5f0' }}>{p.host}:{p.port}</td>
                  <td style={{ padding:'10px 12px', fontSize:12 }}>{p.country || '—'}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:10, padding:'2px 6px', background:'#111d2e', border:'1px solid #162035', borderRadius:4 }}>{p.protocol}</span></td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11, fontWeight:700, color: STATUS_C[p.status]||'#6b7e99', display:'inline-flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:STATUS_C[p.status]||'#6b7e99', display:'inline-block' }}></span>{p.status}</span></td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color: p.latency>200?'#ffd600':'#00e676' }}>{p.status==='ACTIVE'?`${p.latency||0}ms`:'—'}</td>
                  <td style={{ padding:'10px 12px', textAlign:'center', fontSize:11 }}>{p._count?.devices||0}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => testProxy(p.id)} disabled={testing.has(p.id)} style={{ padding:'3px 8px', background:'rgba(0,229,255,.1)', color:'#00e5ff', border:'1px solid rgba(0,229,255,.2)', borderRadius:5, cursor:'pointer', fontSize:11 }}>{testing.has(p.id)?'…':'Test'}</button>
                      <button onClick={() => deleteProxy(p.id)} style={{ padding:'3px 8px', background:'rgba(255,255,255,.04)', color:'#3a4560', border:'1px solid #0d1a2e', borderRadius:5, cursor:'pointer', fontSize:11 }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showNew && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e => e.target===e.currentTarget && setShowNew(false)}>
            <div style={{ background:'#0b1120', border:'1px solid rgba(0,229,255,.2)', borderRadius:14, padding:24, width:440 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}><h3 style={{ margin:0, color:'#dde5f0' }}>Add Proxy</h3><button onClick={() => setShowNew(false)} style={{ background:'none', border:'none', color:'#6b7e99', cursor:'pointer', fontSize:20 }}>✕</button></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['Host *','text','host','proxy.example.com'],['Port','number','port','8080'],['Username','text','username',''],['Password','password','password',''],['Country','text','country','US'],['Provider','text','provider','']].map(([l,t,k,ph]) => (
                  <div key={k}><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>{l}</label><input type={t} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:t==='number'?+e.target.value:e.target.value}))} style={inp} placeholder={ph} /></div>
                ))}
                <div><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Protocol</label><select value={form.protocol} onChange={e=>setForm(f=>({...f,protocol:e.target.value}))} style={inp}>{['HTTP','HTTPS','SOCKS4','SOCKS5'].map(p=><option key={p}>{p}</option>)}</select></div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
                <button onClick={() => setShowNew(false)} style={{ padding:'9px 18px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={create} style={{ padding:'9px 18px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>Add Proxy</button>
              </div>
            </div>
          </div>
        )}

        {showBulk && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e => e.target===e.currentTarget && setShowBulk(false)}>
            <div style={{ background:'#0b1120', border:'1px solid rgba(0,229,255,.2)', borderRadius:14, padding:24, width:480 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}><h3 style={{ margin:0, color:'#dde5f0' }}>Bulk Import Proxies</h3><button onClick={() => setShowBulk(false)} style={{ background:'none', border:'none', color:'#6b7e99', cursor:'pointer', fontSize:20 }}>✕</button></div>
              <p style={{ fontSize:12, color:'#6b7e99', marginBottom:10 }}>Format: <code style={{ background:'#111d2e', padding:'1px 5px', borderRadius:3, fontFamily:'monospace', fontSize:11 }}>host:port:user:pass</code></p>
              <textarea value={bulkLines} onChange={e=>setBulkLines(e.target.value)} style={{ ...inp, height:200, resize:'vertical', fontFamily:'monospace', fontSize:11 }} placeholder={'proxy1.example.com:8080:user1:pass1\nproxy2.example.com:3128'} />
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
                <button onClick={() => setShowBulk(false)} style={{ padding:'9px 18px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={bulkImport} style={{ padding:'9px 18px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>📥 Import</button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}

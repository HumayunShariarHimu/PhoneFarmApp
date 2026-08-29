// accounts.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout/Layout';
import { accountsAPI } from '../lib/api';
import toast from 'react-hot-toast';

const PLATFORMS = ['youtube','swagbucks','mistplay','inboxdollars','cashapp','rakuten','surveytime','honeygain','perk','appkarma'];
const STATUS_C  = { ACTIVE:'#00e676', BANNED:'#ff1744', SUSPENDED:'#ffd600', UNVERIFIED:'#6b7e99' };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ email:'', username:'', password:'', platform:'swagbucks', name:'' });
  const [bulkText, setBulkText] = useState('');
  const inp = { background:'#0b1120', border:'1px solid #162035', borderRadius:7, color:'#dde5f0', fontSize:13, padding:'8px 12px', width:'100%', outline:'none' };

  const load = () => accountsAPI.list({ limit:200 }).then(r => setAccounts(r.data||[])).catch(() => toast.error('Load failed')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const createAcct = async () => {
    if (!form.email || !form.password || !form.platform) return toast.error('Email, password, platform required');
    try { await accountsAPI.create(form); toast.success('Account added!'); setShowNew(false); load(); }
    catch (e) { toast.error(e?.error || 'Failed'); }
  };

  const bulkImport = async () => {
    const lines = bulkText.split('\n').filter(Boolean);
    const accounts = lines.map(l => {
      const [email, password, platform, username] = l.split(':');
      return { email, password, platform: platform || 'swagbucks', username };
    });
    try {
      const r = await accountsAPI.import({ accounts });
      toast.success(`Imported ${r.data.created} accounts`);
      setShowBulk(false);
      setBulkText('');
      load();
    } catch (e) { toast.error('Import failed'); }
  };

  const deleteAcct = async (id) => {
    try { await accountsAPI.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const updateStatus = async (id, status) => {
    try { await accountsAPI.update(id, { status }); load(); }
    catch { toast.error('Update failed'); }
  };

  const active = accounts.filter(a => a.status === 'ACTIVE');

  return (
    <>
      <Head><title>Accounts — PhoneFarmOS</title></Head>
      <Layout title="Account Manager">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div>
            <h2 style={{ margin:0, color:'#dde5f0' }}>Account Manager</h2>
            <p style={{ fontSize:12, color:'#6b7e99', margin:'4px 0 0' }}>{active.length} active across {PLATFORMS.length} platforms</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowBulk(true)} style={{ padding:'9px 14px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>📥 Bulk Import</button>
            <button onClick={() => setShowNew(true)}  style={{ padding:'9px 14px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>＋ Add Account</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
          {[['Total', accounts.length, '#00e5ff'], ['Active', active.length, '#00e676'], ['Balance', `$${active.reduce((s,a)=>s+(a.balance||0),0).toFixed(2)}`, '#ffd600'], ['Banned', accounts.filter(a=>a.status==='BANNED').length, '#ff1744']].map(([l,v,c]) => (
            <div key={l} style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
              <div style={{ fontSize:11, color:'#3a4560', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Email','Platform','Status','Balance','Points','Devices','Earned','Actions'].map(h => <th key={h} style={{ background:'#111d2e', color:'#3a4560', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', padding:'9px 12px', textAlign:'left', borderBottom:'1px solid #0d1a2e' }}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#3a4560' }}>Loading...</td></tr>}
              {accounts.map(a => (
                <tr key={a.id} style={{ borderBottom:'1px solid rgba(255,255,255,.03)', opacity: a.status==='BANNED'?.5:1 }}>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ fontSize:12, fontFamily:'monospace', color:'#dde5f0' }}>{a.email}</div>
                    {a.username && <div style={{ fontSize:10, color:'#3a4560' }}>@{a.username}</div>}
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:12, color:'#00e5ff', fontWeight:600 }}>{a.platform}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11, fontWeight:700, color: STATUS_C[a.status]||'#6b7e99', padding:'2px 7px', background:(STATUS_C[a.status]||'#6b7e99')+'15', borderRadius:10 }}>{a.status}</span></td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, fontWeight:700, color:'#00e676' }}>${(a.balance||0).toFixed(3)}</td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11 }}>{(a.points||0).toLocaleString()}</td>
                  <td style={{ padding:'10px 12px', textAlign:'center', fontSize:11 }}>{a._count?.devices||0}</td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11 }}>${(a.totalEarned||0).toFixed(2)}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      {a.status === 'ACTIVE'
                        ? <button onClick={() => updateStatus(a.id, 'BANNED')} style={{ padding:'3px 8px', background:'rgba(255,23,68,.1)', color:'#ff1744', border:'1px solid rgba(255,23,68,.2)', borderRadius:5, cursor:'pointer', fontSize:11 }}>Ban</button>
                        : <button onClick={() => updateStatus(a.id, 'ACTIVE')} style={{ padding:'3px 8px', background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.2)', borderRadius:5, cursor:'pointer', fontSize:11 }}>Activate</button>
                      }
                      <button onClick={() => deleteAcct(a.id)} style={{ padding:'3px 8px', background:'rgba(255,255,255,.04)', color:'#3a4560', border:'1px solid #0d1a2e', borderRadius:5, cursor:'pointer', fontSize:11 }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* New account modal */}
        {showNew && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e => e.target===e.currentTarget && setShowNew(false)}>
            <div style={{ background:'#0b1120', border:'1px solid rgba(0,229,255,.2)', borderRadius:14, padding:24, width:420 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}><h3 style={{ margin:0, color:'#dde5f0' }}>Add Account</h3><button onClick={() => setShowNew(false)} style={{ background:'none', border:'none', color:'#6b7e99', cursor:'pointer', fontSize:20 }}>✕</button></div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[['Email *','email','email'],['Username','text','username'],['Password *','password','password'],['Display Name','text','name']].map(([l,t,k]) => (
                  <div key={k}><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>{l}</label><input type={t} value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} style={inp} /></div>
                ))}
                <div><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Platform *</label>
                  <select value={form.platform} onChange={e => setForm(f=>({...f,platform:e.target.value}))} style={inp}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
                <button onClick={() => setShowNew(false)} style={{ padding:'9px 18px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={createAcct} style={{ padding:'9px 18px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>Add Account</button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk import modal */}
        {showBulk && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e => e.target===e.currentTarget && setShowBulk(false)}>
            <div style={{ background:'#0b1120', border:'1px solid rgba(0,229,255,.2)', borderRadius:14, padding:24, width:480 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}><h3 style={{ margin:0, color:'#dde5f0' }}>Bulk Import Accounts</h3><button onClick={() => setShowBulk(false)} style={{ background:'none', border:'none', color:'#6b7e99', cursor:'pointer', fontSize:20 }}>✕</button></div>
              <p style={{ fontSize:12, color:'#6b7e99', marginBottom:10 }}>Format per line: <code style={{ background:'#111d2e', padding:'1px 5px', borderRadius:3, fontFamily:'monospace', fontSize:11 }}>email:password:platform:username</code></p>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} style={{ ...inp, height:200, resize:'vertical', fontFamily:'monospace', fontSize:11 }} placeholder={'user@swagbucks.com:pass123:swagbucks:myuser\nuser@youtube.com:pass456:youtube'} />
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

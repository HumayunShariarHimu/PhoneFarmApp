// tasks.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout/Layout';
import { tasksAPI, devicesAPI, accountsAPI } from '../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { RUNNING:'#ffd600', COMPLETED:'#00e676', FAILED:'#ff1744', PENDING:'#6b7e99', QUEUED:'#00e5ff', CANCELLED:'#3a4560', SCHEDULED:'#aa00ff' };
const APPS = { youtube:'YouTube', swagbucks:'Swagbucks', mistplay:'Mistplay', inboxdollars:'InboxDollars', cashapp:'Cash App', rakuten:'Rakuten', surveytime:'SurveyTime', honeygain:'Honeygain', perk:'Perk.tv', appkarma:'AppKarma' };

export default function TasksPage() {
  const [tasks,   setTasks]   = useState([]);
  const [stats,   setStats]   = useState({});
  const [devices, setDevices] = useState([]);
  const [accounts,setAccounts]= useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name:'', appKey:'youtube', action:'watch_video', deviceId:'', accountId:'', config:'{}', scheduleType:'ONCE' });
  const inp = { background:'#0b1120', border:'1px solid #162035', borderRadius:7, color:'#dde5f0', fontSize:13, padding:'8px 12px', width:'100%', outline:'none' };

  const load = async () => {
    try {
      const [tr, dr, ar] = await Promise.all([
        tasksAPI.list({ limit:100 }),
        devicesAPI.list({ limit:200 }),
        accountsAPI.list({ limit:100 }),
      ]);
      setTasks(tr.data || []);
      setStats(tr.queueStats || {});
      setDevices(dr.data || []);
      setAccounts(ar.data || []);
    } catch (e) { toast.error('Load failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, []);

  const createTask = async () => {
    try {
      let config = {};
      try { config = JSON.parse(form.config || '{}'); } catch {}
      if (!form.deviceId) return toast.error('Select a device');
      await tasksAPI.create({ ...form, config });
      toast.success('Task created!');
      setShowNew(false);
      load();
    } catch (e) { toast.error(e?.error || 'Failed'); }
  };

  const cancelTask = async (id) => { try { await tasksAPI.cancel(id); toast.success('Cancelled'); load(); } catch { toast.error('Failed'); } };
  const retryTask  = async (id) => { try { await tasksAPI.retry(id);  toast.success('Retrying'); load(); } catch { toast.error('Failed'); } };
  const deleteTask = async (id) => { try { await tasksAPI.delete(id); toast.success('Deleted');  load(); } catch { toast.error('Failed'); } };

  return (
    <>
      <Head><title>Tasks — PhoneFarmOS</title></Head>
      <Layout title="Task Manager">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div>
            <h2 style={{ margin:0, color:'#dde5f0' }}>Task Manager</h2>
            <p style={{ fontSize:12, color:'#6b7e99', margin:'4px 0 0' }}>Queue: {stats.active||0} active · {stats.waiting||0} waiting · {stats.completed||0} done</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{ padding:'9px 18px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>＋ New Task</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
          {[['Running', tasks.filter(t=>t.status==='RUNNING').length, '#ffd600'],['Completed', tasks.filter(t=>t.status==='COMPLETED').length, '#00e676'],['Failed', tasks.filter(t=>t.status==='FAILED').length, '#ff1744'],['Queued', tasks.filter(t=>t.status==='QUEUED').length, '#00e5ff']].map(([l,v,c]) => (
            <div key={l} style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
              <div style={{ fontSize:'1.6rem', fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
              <div style={{ fontSize:11, color:'#3a4560', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tasks table */}
        <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Task', 'Device', 'App', 'Status', 'Progress', 'Earnings', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ background:'#111d2e', color:'#3a4560', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', padding:'9px 12px', textAlign:'left', borderBottom:'1px solid #0d1a2e', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#3a4560' }}>Loading...</td></tr>}
              {!loading && tasks.length === 0 && <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#3a4560' }}>No tasks yet</td></tr>}
              {tasks.map(t => (
                <tr key={t.id} style={{ borderBottom:'1px solid rgba(255,255,255,.03)' }}>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#dde5f0' }}>{t.name}</div>
                    <div style={{ fontSize:10, color:'#3a4560', fontFamily:'monospace' }}>{t.action}</div>
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:'#6b7e99' }}>{t.device?.name || t.deviceId?.slice(0,8)}</td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:'#00e5ff' }}>{APPS[t.appKey] || t.appKey}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color: STATUS_COLORS[t.status]||'#6b7e99', padding:'2px 7px', background: (STATUS_COLORS[t.status]||'#6b7e99')+'15', borderRadius:10 }}>
                      {t.status === 'RUNNING' ? '⟳' : t.status === 'COMPLETED' ? '✓' : t.status === 'FAILED' ? '✗' : '⏸'} {t.status}
                    </span>
                  </td>
                  <td style={{ padding:'10px 12px', minWidth:100 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#6b7e99' }}>
                      <div style={{ flex:1, height:4, background:'rgba(255,255,255,.06)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${t.progress||0}%`, background: t.status==='FAILED'?'#ff1744':'#00e5ff', borderRadius:2 }}></div>
                      </div>
                      {Math.round(t.progress||0)}%
                    </div>
                    {t.statusMessage && <div style={{ fontSize:10, color:'#3a4560', marginTop:2 }}>{t.statusMessage}</div>}
                  </td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, fontWeight:700, color:'#00e676' }}>${(t.earnings||0).toFixed(5)}</td>
                  <td style={{ padding:'10px 12px', fontSize:10, color:'#3a4560' }}>{new Date(t.createdAt).toLocaleString()}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      {['RUNNING','QUEUED'].includes(t.status) && <button onClick={() => cancelTask(t.id)} style={{ padding:'3px 8px', background:'rgba(255,23,68,.1)', color:'#ff1744', border:'1px solid rgba(255,23,68,.2)', borderRadius:5, cursor:'pointer', fontSize:11 }}>✕</button>}
                      {t.status === 'FAILED' && <button onClick={() => retryTask(t.id)} style={{ padding:'3px 8px', background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.2)', borderRadius:5, cursor:'pointer', fontSize:11 }}>↩</button>}
                      <button onClick={() => deleteTask(t.id)} style={{ padding:'3px 8px', background:'rgba(255,255,255,.04)', color:'#3a4560', border:'1px solid #0d1a2e', borderRadius:5, cursor:'pointer', fontSize:11 }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* New task modal */}
        {showNew && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e => { if(e.target===e.currentTarget) setShowNew(false); }}>
            <div style={{ background:'#0b1120', border:'1px solid rgba(0,229,255,.2)', borderRadius:14, padding:24, width:480, maxWidth:'90vw' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                <h3 style={{ margin:0, color:'#dde5f0' }}>New Automation Task</h3>
                <button onClick={() => setShowNew(false)} style={{ background:'none', border:'none', color:'#6b7e99', cursor:'pointer', fontSize:20 }}>✕</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Task Name</label><input value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} style={inp} placeholder="e.g. YouTube Farm" /></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>App</label>
                    <select value={form.appKey} onChange={e => setForm(f => ({...f, appKey:e.target.value}))} style={inp}>
                      {Object.entries(APPS).map(([k,n]) => <option key={k} value={k}>{n}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Action</label>
                    <select value={form.action} onChange={e => setForm(f => ({...f, action:e.target.value}))} style={inp}>
                      {['watch_video','watch_ad','complete_survey','daily_search','play_game','share_bandwidth','watch_tv','install_app','daily_login'].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Device</label>
                  <select value={form.deviceId} onChange={e => setForm(f => ({...f, deviceId:e.target.value}))} style={inp}>
                    <option value="">Select device...</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.status})</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Account (optional)</label>
                  <select value={form.accountId} onChange={e => setForm(f => ({...f, accountId:e.target.value}))} style={inp}>
                    <option value="">No account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.email} ({a.platform})</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Config (JSON)</label>
                  <textarea value={form.config} onChange={e => setForm(f => ({...f, config:e.target.value}))} style={{ ...inp, height:80, resize:'vertical', fontFamily:'monospace', fontSize:11 }} placeholder='{"videoDuration":300,"autoLike":true}' />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
                <button onClick={() => setShowNew(false)} style={{ padding:'9px 18px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={createTask} style={{ padding:'9px 18px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>🤖 Start Task</button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}

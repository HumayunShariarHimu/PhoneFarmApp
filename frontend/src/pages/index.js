import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import DeviceCard  from '../components/Phone/DeviceCard';
import PhoneScreen from '../components/Phone/PhoneScreen';
import { getSocket, ctrl } from '../lib/socket';
import { devicesAPI } from '../lib/api';
import { ALL_MODELS, BRAND_LIST, BRANDS } from '../data/phoneModels';

const st = { dark:'#0b1120', darker:'#07090f', border:'#162035', cyan:'#00e5ff', green:'#00e676', red:'#ff1744', yellow:'#ffd600', t1:'#dde5f0', t2:'#6b7e99', t3:'#2e3d52' };
const inp = { background:st.dark, border:`1px solid ${st.border}`, borderRadius:7, color:st.t1, fontSize:13, padding:'8px 12px', outline:'none', width:'100%' };

export default function Home() {
  const [devices,  setDevices]  = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [viewing,  setViewing]  = useState(null); // full-screen device
  const [stats,    setStats]    = useState({ total:0, running:0, stopped:0, queued:0, error:0 });
  const [srch,     setSrch]     = useState('');
  const [fBrand,   setFBrand]   = useState('all');
  const [fStatus,  setFStatus]  = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid|compact
  const [showAdd,  setShowAdd]  = useState(false);
  const [showBatch,setShowBatch]= useState(false);
  const [addForm,  setAddForm]  = useState({ brand:'samsung', model:'Galaxy A54 5G', android:'13', count:1, group:'Default', name:'' });
  const [batchUrl, setBatchUrl] = useState('');
  const [batchCode,setBatchCode]= useState('');
  const [activeTab,setActiveTab]= useState('url');

  // Load devices & subscribe to updates
  useEffect(() => {
    devicesAPI.list().then(r => { setDevices(r.data||[]); setStats(r.stats||{}); }).catch(() => {});

    const sock = getSocket();
    sock.on('farm:state',   ({ devices:d, stats:s }) => { setDevices(d||[]); setStats(s||{}); });
    sock.on('farm:devices', (d)  => setDevices(d||[]));
    sock.on('farm:stats',   (s)  => setStats(s||{}));
    sock.on('device:added', ()   => devicesAPI.list().then(r => { setDevices(r.data||[]); setStats(r.stats||{}); }).catch(() => {}));
    sock.on('device:removed',()  => devicesAPI.list().then(r => { setDevices(r.data||[]); setStats(r.stats||{}); }).catch(() => {}));

    return () => { sock.off('farm:state'); sock.off('farm:devices'); sock.off('farm:stats'); sock.off('device:added'); sock.off('device:removed'); };
  }, []);

  // Filtered devices
  const filtered = devices.filter(d => {
    if (fBrand  !== 'all' && d.brand?.toLowerCase() !== fBrand)   return false;
    if (fStatus !== 'all' && d.status !== fStatus) return false;
    if (srch) { const q=srch.toLowerCase(); if (!d.name?.toLowerCase().includes(q) && !d.model?.toLowerCase().includes(q) && !d.brand?.toLowerCase().includes(q)) return false; }
    return true;
  });

  const toggleSel = (id) => setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectAll  = () => setSelected(new Set(filtered.map(d=>d.id)));
  const clearSel   = () => setSelected(new Set());

  const handleAction = async (id, action) => {
    if (action === 'start')  ctrl.startDevice(id);
    else if (action === 'stop')   ctrl.stopDevice(id);
    else if (action === 'remove') { ctrl.removeDevice(id); setSelected(s=>{const n=new Set(s);n.delete(id);return n;}); }
    else if (action === 'screenshot') ctrl.screenshot(id);
  };

  // Add devices
  const addDevices = () => {
    const m = ALL_MODELS.find(m => m.brand === BRANDS[addForm.brand]?.name && m.model === addForm.model);
    const base = {
      brand:   BRANDS[addForm.brand]?.name || 'Samsung',
      model:   addForm.model,
      android: addForm.android,
      group:   addForm.group,
      width:   m?.width  || 393,
      height:  m?.height || 851,
      ram:     m?.ram    || '6GB',
      cpu:     m?.cpu    || 'Unknown',
      userAgent: m?.userAgent,
    };
    const count = Math.min(parseInt(addForm.count)||1, 20);
    const list  = Array.from({length:count}, (_,i) => ({
      ...base,
      name: addForm.name ? (count > 1 ? `${addForm.name} ${i+1}` : addForm.name) : `${base.brand} ${base.model}`,
    }));
    ctrl.addMany(list);
    setShowAdd(false);
  };

  // Batch operations
  const runBatch = () => {
    const ids = selected.size > 0 ? Array.from(selected) : devices.map(d=>d.id);
    if (!ids.length) return;
    if (activeTab === 'url' && batchUrl)  ctrl.batch(ids, 'goto',  { url: batchUrl });
    if (activeTab === 'code' && batchCode) ctrl.batch(ids, 'eval',  { code: batchCode });
    if (activeTab === 'type')              ctrl.batch(ids, 'type',  { text: batchUrl });
    setShowBatch(false);
  };

  const colsMap = { grid:'repeat(auto-fill,minmax(175px,1fr))', compact:'repeat(auto-fill,minmax(115px,1fr))' };

  return (
    <>
      <Head><title>Virtual Phone Farm</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>

      <div style={{ minHeight:'100vh', background:st.darker, color:st.t1, fontFamily:'system-ui,sans-serif' }}>

        {/* TOP BAR */}
        <header style={{ background:'rgba(7,9,15,.95)', borderBottom:`1px solid ${st.border}`, padding:'0 16px', height:54, display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:100, backdropFilter:'blur(12px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <div style={{ width:30, height:30, background:'linear-gradient(135deg,#00e5ff,#0070ff)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#000' }}>⌬</div>
            <div style={{ fontWeight:800, fontSize:'1rem', color:'#fff', lineHeight:1 }}>VirtualFarm<span style={{ color:st.cyan, fontSize:11, fontWeight:400, marginLeft:4 }}>v3</span></div>
          </div>

          {/* Search */}
          <div style={{ flex:1, maxWidth:280, position:'relative' }}>
            <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:st.t3, fontSize:14, pointerEvents:'none' }}>⌕</span>
            <input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search devices..." style={{ ...inp, paddingLeft:30, height:34, fontSize:12 }} />
          </div>

          <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
            {/* Stats pills */}
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {[['▶',stats.running,st.green],['■',stats.stopped,st.t3],['⏳',stats.queued,'#ff9100'],['⚠',stats.error,st.red]].map(([ic,v,c]) => v > 0 ? (
                <div key={ic} style={{ display:'flex', alignItems:'center', gap:3, padding:'3px 8px', background:`${c}12`, border:`1px solid ${c}25`, borderRadius:6, fontSize:11, color:c, fontWeight:700, whiteSpace:'nowrap' }}>
                  {ic} {v}
                </div>
              ) : null)}
              <div style={{ padding:'3px 8px', background:`${st.cyan}08`, border:`1px solid ${st.cyan}20`, borderRadius:6, fontSize:11, color:st.cyan, fontWeight:700 }}>
                📱 {stats.total}
              </div>
            </div>
            <button onClick={() => setShowAdd(true)}     style={{ padding:'7px 14px', background:st.cyan, color:'#000', border:'none', borderRadius:8, fontWeight:800, cursor:'pointer', fontSize:12, flexShrink:0 }}>＋ Add</button>
            <button onClick={() => setShowBatch(true)}   style={{ padding:'7px 12px', background:st.dark, border:`1px solid ${st.border}`, borderRadius:8, color:st.t2, cursor:'pointer', fontSize:12 }}>Batch</button>
          </div>
        </header>

        <div style={{ padding:'14px 16px' }}>
          {/* Filter + controls bar */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
            <select value={fBrand} onChange={e=>setFBrand(e.target.value)} style={{ ...inp, width:'auto', height:32, fontSize:12, padding:'5px 24px 5px 10px' }}>
              <option value="all">All Brands ({devices.length})</option>
              {BRAND_LIST.map(b => {
                const cnt = devices.filter(d=>d.brand===b.name).length;
                return cnt > 0 ? <option key={b.key} value={b.name.toLowerCase()}>{b.logo} {b.name} ({cnt})</option> : null;
              })}
            </select>
            <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{ ...inp, width:'auto', height:32, fontSize:12, padding:'5px 24px 5px 10px' }}>
              <option value="all">All Status</option>
              {['running','stopped','starting','queued','error'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>

            {/* View mode */}
            <div style={{ display:'flex', background:st.dark, borderRadius:7, padding:2, border:`1px solid ${st.border}`, gap:1 }}>
              {[['▦','grid'],['⊟','compact']].map(([ic,m])=>(
                <button key={m} onClick={()=>setViewMode(m)} style={{ width:30, height:28, border:'none', borderRadius:5, background:viewMode===m?st.cyan:'transparent', color:viewMode===m?'#000':st.t3, cursor:'pointer', fontSize:13 }}>{ic}</button>
              ))}
            </div>

            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              <button onClick={selectAll}  style={{ padding:'5px 10px', background:'rgba(0,229,255,.08)', border:`1px solid ${st.cyan}20`, borderRadius:6, color:st.cyan, cursor:'pointer', fontSize:11 }}>☑ All</button>
              <button onClick={clearSel}   style={{ padding:'5px 10px', background:st.dark, border:`1px solid ${st.border}`, borderRadius:6, color:st.t2, cursor:'pointer', fontSize:11 }}>☐ Clear</button>
              <button onClick={() => ctrl.startAll()}  style={{ padding:'5px 10px', background:'rgba(0,230,118,.08)', border:'1px solid rgba(0,230,118,.2)', borderRadius:6, color:st.green, cursor:'pointer', fontSize:11 }}>▶ Start All</button>
              <button onClick={() => ctrl.stopAll()}   style={{ padding:'5px 10px', background:'rgba(255,23,68,.08)', border:'1px solid rgba(255,23,68,.2)', borderRadius:6, color:st.red, cursor:'pointer', fontSize:11 }}>■ Stop All</button>
            </div>

            {selected.size > 0 && (
              <div style={{ display:'flex', gap:5, alignItems:'center', padding:'5px 10px', background:`${st.cyan}10`, border:`1px solid ${st.cyan}25`, borderRadius:7, fontSize:11, color:st.cyan, flexWrap:'wrap' }}>
                <strong>{selected.size} selected</strong>
                <button onClick={()=>ctrl.batch(Array.from(selected),'goto',{url:'https://www.google.com'})} style={{ padding:'2px 8px', background:`${st.cyan}20`, border:'none', borderRadius:4, color:st.cyan, cursor:'pointer', fontSize:10 }}>Open Google</button>
                <button onClick={()=>{Array.from(selected).forEach(id=>ctrl.startDevice(id));}} style={{ padding:'2px 8px', background:'rgba(0,230,118,.2)', border:'none', borderRadius:4, color:st.green, cursor:'pointer', fontSize:10 }}>▶ Start</button>
                <button onClick={()=>{Array.from(selected).forEach(id=>ctrl.stopDevice(id));}}  style={{ padding:'2px 8px', background:'rgba(255,23,68,.2)', border:'none', borderRadius:4, color:st.red, cursor:'pointer', fontSize:10 }}>■ Stop</button>
                <button onClick={clearSel} style={{ background:'none', border:'none', color:st.t3, cursor:'pointer', fontSize:11 }}>✕</button>
              </div>
            )}

            <span style={{ marginLeft:'auto', fontSize:11, color:st.t3 }}>{filtered.length} devices</span>
          </div>

          {/* Device Grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 20px', color:st.t3 }}>
              <div style={{ fontSize:48, marginBottom:14, opacity:.3 }}>📵</div>
              <div style={{ fontSize:16, marginBottom:6 }}>No virtual devices</div>
              <div style={{ fontSize:13, marginBottom:20 }}>Add your first virtual Android phone</div>
              <button onClick={() => setShowAdd(true)} style={{ padding:'10px 24px', background:st.cyan, color:'#000', border:'none', borderRadius:9, fontWeight:800, cursor:'pointer', fontSize:13 }}>＋ Add Device</button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:colsMap[viewMode], gap: viewMode==='compact'?6:10 }}>
              {filtered.map(d => (
                <DeviceCard key={d.id} device={d} selected={selected.has(d.id)} onSelect={toggleSel} onOpen={setViewing} onAction={handleAction} />
              ))}
            </div>
          )}
        </div>

        {/* ═══════ FULL-SCREEN DEVICE VIEWER ═══════ */}
        {viewing && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => { if(e.target===e.currentTarget) setViewing(null); }}>
            <div style={{ background:st.dark, border:`1px solid ${st.cyan}30`, borderRadius:16, padding:20, maxHeight:'95vh', overflow:'auto', display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start', maxWidth:'90vw' }}>
              {/* Device info header */}
              <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:14, borderBottom:`1px solid ${st.border}` }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:'1.05rem', color:'#fff' }}>{viewing.brand} {viewing.model}</div>
                  <div style={{ fontSize:12, color:st.t2, marginTop:2 }}>Android {viewing.android} · {viewing.width}×{viewing.height} · {viewing.ram}</div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:11, color:{ running:st.green, stopped:st.t3, error:st.red, starting:st.yellow, queued:'#ff9100' }[viewing.status]||st.t3, fontWeight:700 }}>● {viewing.status}</span>
                  <button onClick={() => ctrl.restart(viewing.id)} style={{ padding:'5px 10px', background:'rgba(255,214,0,.1)', border:'1px solid rgba(255,214,0,.2)', borderRadius:6, color:st.yellow, cursor:'pointer', fontSize:11 }}>🔄</button>
                  <button onClick={() => { ctrl.removeDevice(viewing.id); setViewing(null); }} style={{ padding:'5px 10px', background:'rgba(255,23,68,.1)', border:'1px solid rgba(255,23,68,.2)', borderRadius:6, color:st.red, cursor:'pointer', fontSize:11 }}>🗑 Remove</button>
                  <button onClick={() => setViewing(null)} style={{ background:'none', border:'none', color:st.t2, cursor:'pointer', fontSize:20, padding:'4px 8px' }}>✕</button>
                </div>
              </div>

              {/* Phone screen */}
              <PhoneScreen device={viewing} width={280} showControls={true} />

              {/* Extended controls */}
              <div style={{ flex:1, minWidth:240, display:'flex', flexDirection:'column', gap:12 }}>
                {/* Quick app launchers */}
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:st.t3, marginBottom:8 }}>Quick Open</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                    {[['🔴 YouTube','https://m.youtube.com'],['🟠 Swagbucks','https://www.swagbucks.com'],['📋 SurveyTime','https://surveytime.io'],['🔵 Facebook','https://m.facebook.com'],['📸 Instagram','https://www.instagram.com'],['🎵 TikTok','https://www.tiktok.com'],['🐦 Twitter/X','https://mobile.twitter.com'],['🔍 Google','https://www.google.com']].map(([l,u])=>(
                      <button key={u} onClick={() => ctrl.goto(viewing.id, u)} style={{ padding:'7px 6px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:6, color:st.t1, cursor:'pointer', fontSize:11, textAlign:'left' }}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Device info */}
                <div style={{ background:'#080d18', border:`1px solid ${st.border}`, borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:st.t3, marginBottom:8 }}>Device Info</div>
                  {[['Brand',viewing.brand],['Model',viewing.model],['Android',`v${viewing.android}`],['RAM',viewing.ram],['CPU',viewing.cpu||'—'],['Resolution',`${viewing.width}×${viewing.height}`],['Group',viewing.group||'Default'],['Battery',`${Math.round(viewing.battery||85)}%`],['Uptime',viewing.uptime?`${Math.floor(viewing.uptime/60)}min`:'—']].map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${st.border}`, fontSize:12 }}>
                      <span style={{ color:st.t3 }}>{k}</span>
                      <span style={{ color:st.t1, fontWeight:500 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Keyboard shortcuts */}
                <div style={{ background:'#080d18', border:`1px solid ${st.border}`, borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:st.t3, marginBottom:8 }}>Quick Actions</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {[['⌨ Type','type'],['📋 Paste','paste'],['🔍 Search','search'],['⬆ Scroll Up','scrollUp'],['⬇ Scroll Down','scrollDown'],['🔝 Top','scrollTop'],['🔚 Bottom','scrollBot'],['🔄 Reload','reload']].map(([l,a])=>(
                      <button key={a} onClick={() => {
                        if (a==='scrollUp') ctrl.scrollUp(viewing.id, 400);
                        else if (a==='scrollDown') ctrl.scrollDown(viewing.id, 400);
                        else if (a==='scrollTop') ctrl.scrollTop(viewing.id);
                        else if (a==='scrollBot') ctrl.scrollBot(viewing.id);
                        else if (a==='reload') ctrl.reload(viewing.id);
                      }} style={{ padding:'5px 8px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:5, color:st.t2, cursor:'pointer', fontSize:11 }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ ADD DEVICE MODAL ═══════ */}
        {showAdd && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
            <div style={{ background:st.dark, border:`1px solid ${st.cyan}30`, borderRadius:16, padding:24, width:480, maxWidth:'95vw', maxHeight:'90vh', overflow:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                <h3 style={{ margin:0, color:'#fff' }}>Add Virtual Device</h3>
                <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'none', color:st.t2, cursor:'pointer', fontSize:22 }}>✕</button>
              </div>

              {/* Brand picker */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>Brand</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {BRAND_LIST.map(b => (
                    <button key={b.key} onClick={() => { setAddForm(f=>({...f, brand:b.key, model:BRANDS[b.key].models[0].model, android:BRANDS[b.key].models[0].android})); }}
                      style={{ padding:'6px 10px', background: addForm.brand===b.key ? b.color+'22' : '#111d2e', border:`1px solid ${addForm.brand===b.key ? b.color : st.border}`, borderRadius:6, color: addForm.brand===b.key ? b.color : st.t2, cursor:'pointer', fontSize:11, fontWeight: addForm.brand===b.key ? 700 : 400 }}>
                      {b.logo} {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model picker */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>Model</label>
                <select value={addForm.model} onChange={e => { const m=BRANDS[addForm.brand]?.models.find(x=>x.model===e.target.value); setAddForm(f=>({...f, model:e.target.value, android:m?.android||f.android})); }} style={{ ...inp }}>
                  {(BRANDS[addForm.brand]?.models||[]).map(m => (
                    <option key={m.model} value={m.model}>{m.model} — Android {m.android}, {m.ram}</option>
                  ))}
                </select>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>Android Version</label>
                  <select value={addForm.android} onChange={e=>setAddForm(f=>({...f,android:e.target.value}))} style={{ ...inp }}>
                    {['15','14','13','12','11','10','9'].map(v=><option key={v} value={v}>Android {v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>Count</label>
                  <input type="number" value={addForm.count} onChange={e=>setAddForm(f=>({...f,count:+e.target.value}))} min={1} max={20} style={{ ...inp }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>Name Prefix</label>
                  <input value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))} placeholder={`${BRANDS[addForm.brand]?.name||'Device'}`} style={{ ...inp }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>Group</label>
                  <input value={addForm.group} onChange={e=>setAddForm(f=>({...f,group:e.target.value}))} placeholder="Default" style={{ ...inp }} />
                </div>
              </div>

              {/* Quick count buttons */}
              <div style={{ display:'flex', gap:5, marginBottom:18 }}>
                {[1,5,10,20].map(n => (
                  <button key={n} onClick={()=>setAddForm(f=>({...f,count:n}))} style={{ flex:1, padding:'7px 0', background:addForm.count===n?st.cyan:'#111d2e', color:addForm.count===n?'#000':st.t2, border:`1px solid ${addForm.count===n?st.cyan:st.border}`, borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:13 }}>×{n}</button>
                ))}
              </div>

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button onClick={()=>setShowAdd(false)} style={{ padding:'10px 18px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:8, color:st.t2, cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={addDevices} style={{ padding:'10px 18px', background:st.cyan, color:'#000', border:'none', borderRadius:8, fontWeight:800, cursor:'pointer', fontSize:13 }}>＋ Add {addForm.count} Device{addForm.count>1?'s':''}</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ BATCH MODAL ═══════ */}
        {showBatch && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && setShowBatch(false)}>
            <div style={{ background:st.dark, border:`1px solid ${st.cyan}30`, borderRadius:16, padding:24, width:480, maxWidth:'95vw' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                <h3 style={{ margin:0, color:'#fff' }}>Batch Operation</h3>
                <button onClick={()=>setShowBatch(false)} style={{ background:'none', border:'none', color:st.t2, cursor:'pointer', fontSize:22 }}>✕</button>
              </div>
              <div style={{ fontSize:12, color:st.t2, marginBottom:14 }}>Target: <strong style={{ color:st.cyan }}>{selected.size > 0 ? `${selected.size} selected` : `all ${devices.length} devices`}</strong></div>

              <div style={{ display:'flex', gap:0, marginBottom:14, borderBottom:`1px solid ${st.border}` }}>
                {[['url','🌐 Open URL'],['type','⌨ Type Text'],['code','⚡ Run JS']].map(([t,l])=>(
                  <button key={t} onClick={()=>setActiveTab(t)} style={{ flex:1, padding:'8px 0', border:'none', background:'transparent', color:activeTab===t?st.cyan:st.t3, borderBottom:activeTab===t?`2px solid ${st.cyan}`:'2px solid transparent', cursor:'pointer', fontSize:12, fontWeight:600 }}>{l}</button>
                ))}
              </div>

              {activeTab==='url'  && <div><label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>URL to open on all devices</label><input value={batchUrl} onChange={e=>setBatchUrl(e.target.value)} placeholder="https://example.com" style={{ ...inp }} /></div>}
              {activeTab==='type' && <div><label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>Text to type on all devices</label><input value={batchUrl} onChange={e=>setBatchUrl(e.target.value)} placeholder="Hello world" style={{ ...inp }} /></div>}
              {activeTab==='code' && <div><label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>JavaScript to run on all pages</label><textarea value={batchCode} onChange={e=>setBatchCode(e.target.value)} rows={4} placeholder="document.querySelector('button')?.click()" style={{ ...inp, height:100, resize:'vertical', fontFamily:'monospace', fontSize:12 }} /></div>}

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
                <button onClick={()=>setShowBatch(false)} style={{ padding:'10px 18px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:8, color:st.t2, cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={runBatch} style={{ padding:'10px 18px', background:st.cyan, color:'#000', border:'none', borderRadius:8, fontWeight:800, cursor:'pointer', fontSize:13 }}>▶ Run on All</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

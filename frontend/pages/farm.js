import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout/Layout';
import PhoneCard from '../components/Farm/PhoneCard';
import PhoneViewer from '../components/Farm/PhoneViewer';
import { devicesAPI, tasksAPI, accountsAPI, runtimeAPI } from '../lib/api';
import { getSocket, socketActions } from '../lib/socket';
import toast from 'react-hot-toast';

const APPS = {
  youtube:     { name:'YouTube',      color:'#ff0000', icon:'▶' },
  swagbucks:   { name:'Swagbucks',    color:'#ff6b35', icon:'SB' },
  mistplay:    { name:'Mistplay',     color:'#a855f7', icon:'🎮' },
  inboxdollars:{ name:'InboxDollars', color:'#00897b', icon:'💌' },
  cashapp:     { name:'Cash App',     color:'#00d632', icon:'$' },
  rakuten:     { name:'Rakuten',      color:'#bf0000', icon:'R' },
  surveytime:  { name:'SurveyTime',   color:'#1565c0', icon:'📋' },
  honeygain:   { name:'Honeygain',    color:'#ffc107', icon:'🍯' },
  perk:        { name:'Perk.tv',      color:'#e65100', icon:'P' },
  appkarma:    { name:'AppKarma',     color:'#c2185b', icon:'AK' },
};

export default function FarmPage() {
  const [devices,     setDevices]     = useState([]);
  const [selected,    setSelected]    = useState(new Set());
  const [viewing,     setViewing]     = useState(null);  // device being viewed live
  const [filter,      setFilter]      = useState({ status:'', app:'', search:'' });
  const [viewMode,    setViewMode]    = useState('grid'); // grid | compact
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [showTask,    setShowTask]    = useState(false);
  const [createForm,  setCreateForm]  = useState({ count:1, ram:2048, cpus:2, android:'9', name:'Phone' });
  const [taskForm,    setTaskForm]    = useState({ appKey:'youtube', action:'watch_video', config:'{}' });
  const [accounts,    setAccounts]    = useState([]);
  const [stats,       setStats]       = useState({ total:0, running:0, earnings:0, rate:0 });
  const [runtime,     setRuntime]     = useState(null);

  // Load devices
  const loadDevices = useCallback(async () => {
    try {
      const res = await devicesAPI.list({ limit: 500 });
      setDevices(res.data || []);
      const running = (res.data || []).filter(d => d.status === 'running');
      setStats({
        total:    res.data?.length || 0,
        running:  running.length,
        earnings: running.reduce((s, d) => s + (d.metrics?.earnings || 0), 0),
        rate:     running.length * 0.08,
      });
    } catch (e) {
      toast.error('Failed to load devices');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    runtimeAPI.status().then(r => setRuntime(r.data || null)).catch(() => setRuntime({ mode:'safe', emulatorAvailable:false, reason:'Backend runtime status unavailable.' }));
    loadDevices();
    accountsAPI.list().then(r => setAccounts(r.data || [])).catch(() => {});

    const sock = getSocket();
    sock.on('farm:devices:update', (devs) => {
      setDevices(devs);
      const running = devs.filter(d => d.status === 'running');
      setStats(s => ({ ...s, total: devs.length, running: running.length }));
    });
    sock.on('emulator:started', loadDevices);
    sock.on('emulator:stopped', loadDevices);
    sock.on('emulator:error',   ({ error }) => toast.error(error));
    sock.on('device:screenshot:done', ({ deviceId, url }) => {
      toast.success('Screenshot saved');
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, lastScreenshot: url } : d));
    });

    socketActions.subscribeMetrics([]);
    const interval = setInterval(loadDevices, 30000);

    return () => {
      sock.off('farm:devices:update');
      sock.off('emulator:started');
      sock.off('emulator:stopped');
      socketActions.unsubscribeMetrics();
      clearInterval(interval);
    };
  }, []);

  // Filtering
  const filtered = devices.filter(d => {
    if (filter.status && d.status !== filter.status) return false;
    if (filter.app && d.currentApp !== filter.app) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!d.name?.toLowerCase().includes(q) && !d.id.includes(q)) return false;
    }
    return true;
  });

  // Selection
  const toggleSel = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll  = () => setSelected(new Set(filtered.map(d => d.id)));
  const clearSel   = () => setSelected(new Set());

  // Actions
  const handleAction = async (deviceId, action, params = {}) => {
    try {
      if (action === 'start' || action === 'stop' || action === 'restart') {
        await devicesAPI.action(deviceId, action);
        toast.success(`Device ${action}ed`);
        loadDevices();
      } else if (action === 'screenshot') {
        socketActions.screenshot(deviceId);
      } else {
        await devicesAPI.action(deviceId, action, params);
      }
    } catch (e) { toast.error(e?.error || 'Action failed'); }
  };

  const handleBulkAction = async (action) => {
    if (selected.size === 0) return toast.error('No devices selected');
    try {
      await devicesAPI.batchAction(Array.from(selected), action);
      toast.success(`${action} applied to ${selected.size} devices`);
      clearSel();
      loadDevices();
    } catch (e) { toast.error('Bulk action failed'); }
  };

  const createDevices = async () => {
    if (runtime && !runtime.emulatorAvailable) {
      toast.error(runtime.reason || 'Live Android runtime is not configured on this server.');
      return;
    }
    try {
      await devicesAPI.create(createForm);
      toast.success(`Creating ${createForm.count} device(s)...`);
      setShowCreate(false);
      setTimeout(loadDevices, 3000);
    } catch (e) { toast.error(e?.error || 'Create failed'); }
  };

  const createTask = async () => {
    if (selected.size === 0 && !taskForm.deviceId) return toast.error('Select devices first');
    try {
      let config = {};
      try { config = JSON.parse(taskForm.config || '{}'); } catch {}
      const deviceIds = selected.size > 0 ? Array.from(selected) : [taskForm.deviceId];
      await Promise.all(deviceIds.map(deviceId =>
        tasksAPI.create({ ...taskForm, deviceId, config })
      ));
      toast.success(`Task created for ${deviceIds.length} device(s)`);
      setShowTask(false);
      clearSel();
    } catch (e) { toast.error(e?.error || 'Task creation failed'); }
  };

  const inputStyle = { background:'#0b1120', border:'1px solid #162035', borderRadius:7, color:'#dde5f0', fontSize:13, padding:'8px 12px', width:'100%', outline:'none' };
  const btnPrimary = { padding:'9px 18px', background:'#00e5ff', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 };

  return (
    <>
      <Head><title>Farm Control — PhoneFarmOS</title></Head>
        <Layout title="Farm Control">

        {runtime && !runtime.emulatorAvailable && (
          <div style={{ marginBottom:16, padding:'12px 14px', background:'rgba(255,214,0,.08)', border:'1px solid rgba(255,214,0,.28)', borderRadius:10, color:'#ffd600', fontSize:13, lineHeight:1.5 }}>
            <strong>Safe mode active:</strong> Dashboard, database, Redis and task management are available. Live Android controls require a connected remote runtime. {runtime.reason}
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display:'flex', gap:0, background:'#0b1120', border:'1px solid #162035', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
          {[
            ['📱 Total',   stats.total,                      '#00e5ff'],
            ['▶ Running',  stats.running,                    '#00e676'],
            ['💰 Session', `$${stats.earnings.toFixed(4)}`,  '#00e676'],
            ['📈 Rate/hr', `$${stats.rate.toFixed(3)}`,      '#00e5ff'],
            ['📅 Daily',   `$${(stats.rate*24).toFixed(2)}`, '#ffd600'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ flex:1, textAlign:'center', padding:'12px 8px', borderRight:'1px solid #162035' }}>
              <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:'1.25rem', color:c }}>{v}</div>
              <div style={{ fontSize:10, color:'#3a4560', textTransform:'uppercase', letterSpacing:'.5px', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', padding:'10px 14px', background:'#0b1120', border:'1px solid #162035', borderRadius:10, marginBottom:12 }}>
          <input value={filter.search} onChange={e => setFilter(f => ({...f, search:e.target.value}))} placeholder="🔍 Search phones..." style={{ ...inputStyle, flex:'1 1 160px', height:34 }} />
          <select value={filter.status} onChange={e => setFilter(f => ({...f, status:e.target.value}))} style={{ ...inputStyle, width:130, height:34 }}>
            <option value="">All Status</option>
            {['running','stopped','starting','error','paused'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filter.app} onChange={e => setFilter(f => ({...f, app:e.target.value}))} style={{ ...inputStyle, width:130, height:34 }}>
            <option value="">All Apps</option>
            {Object.entries(APPS).map(([k,a]) => <option key={k} value={k}>{a.name}</option>)}
          </select>

          {/* View mode */}
          <div style={{ display:'flex', background:'#111d2e', borderRadius:7, padding:2, border:'1px solid #162035' }}>
            {[['▦','grid'],['⊟','compact']].map(([ic,m]) => (
              <button key={m} onClick={() => setViewMode(m)} style={{ width:30, height:30, border:'none', borderRadius:5, background:viewMode===m?'#00e5ff':'transparent', color:viewMode===m?'#000':'#6b7e99', cursor:'pointer', fontSize:13 }}>{ic}</button>
            ))}
          </div>

          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <button onClick={() => devicesAPI.startAll().then(loadDevices)} style={{ padding:'7px 12px', background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.25)', borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:12 }}>▶ Start All</button>
            <button onClick={() => devicesAPI.stopAll().then(loadDevices)}  style={{ padding:'7px 12px', background:'rgba(255,23,68,.1)',  color:'#ff1744', border:'1px solid rgba(255,23,68,.25)',  borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:12 }}>■ Stop All</button>
            <button onClick={() => setShowCreate(true)} style={btnPrimary}>＋ Add Phones</button>
          </div>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 14px', background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.2)', borderRadius:8, marginBottom:12, flexWrap:'wrap' }}>
            <span style={{ color:'#00e5ff', fontWeight:700, fontSize:13 }}>{selected.size} selected</span>
            <button onClick={() => handleBulkAction('start')}   style={{ padding:'5px 10px', background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.2)', borderRadius:6, cursor:'pointer', fontSize:12 }}>▶ Start</button>
            <button onClick={() => handleBulkAction('stop')}    style={{ padding:'5px 10px', background:'rgba(255,23,68,.1)', color:'#ff1744', border:'1px solid rgba(255,23,68,.2)',  borderRadius:6, cursor:'pointer', fontSize:12 }}>■ Stop</button>
            <button onClick={() => handleBulkAction('restart')} style={{ padding:'5px 10px', background:'rgba(255,214,0,.1)', color:'#ffd600', border:'1px solid rgba(255,214,0,.2)',  borderRadius:6, cursor:'pointer', fontSize:12 }}>🔄 Restart</button>
            <button onClick={() => setShowTask(true)}           style={{ padding:'5px 10px', background:'rgba(170,0,255,.1)',  color:'#aa00ff', border:'1px solid rgba(170,0,255,.2)', borderRadius:6, cursor:'pointer', fontSize:12 }}>🤖 Assign Task</button>
            <button onClick={clearSel}  style={{ marginLeft:'auto', background:'none', border:'none', color:'#6b7e99', cursor:'pointer' }}>✕ Clear</button>
          </div>
        )}

        {/* Select all row */}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
          <button onClick={selectAll} style={{ padding:'4px 10px', background:'#111d2e', border:'1px solid #162035', borderRadius:5, color:'#6b7e99', cursor:'pointer', fontSize:11 }}>☑ All ({filtered.length})</button>
          <span style={{ marginLeft:'auto', fontSize:11, color:'#3a4560' }}>{filtered.length} devices</span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:60, color:'#3a4560' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⟳</div>
            <div>Loading devices...</div>
          </div>
        )}

        {/* Live viewer (fullscreen modal) */}
        {viewing && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e => { if(e.target===e.currentTarget) setViewing(null); }}>
            <div style={{ background:'#0b1120', borderRadius:14, border:'1px solid rgba(0,229,255,.2)', padding:20, maxHeight:'95vh', overflow:'auto' }}>
              <PhoneViewer device={viewing} width={340} onClose={() => setViewing(null)} />
              {/* Side controls */}
              <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, color:'#3a4560', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>Quick Launch</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {Object.entries(APPS).map(([k,a]) => (
                      <button key={k} onClick={() => socketActions.launchApp(viewing.id, k)} style={{ padding:'4px 8px', background:'#111d2e', border:`1px solid ${a.color}30`, borderRadius:5, color:a.color, fontSize:10, cursor:'pointer' }}>{a.icon} {a.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#3a4560', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>Open URL</div>
                  <div style={{ display:'flex', gap:4 }}>
                    <input id="url-inp" placeholder="https://..." style={{ ...inputStyle, fontSize:11, height:30 }} onKeyDown={e => { if(e.key==='Enter') socketActions.openUrl(viewing.id, e.target.value); }} />
                    <button onClick={() => { const u=document.getElementById('url-inp').value; if(u) socketActions.openUrl(viewing.id, u); }} style={{ ...btnPrimary, padding:'5px 10px', fontSize:11 }}>Go</button>
                  </div>
                  <div style={{ marginTop:8, fontSize:11, color:'#3a4560', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>Type Text</div>
                  <div style={{ display:'flex', gap:4 }}>
                    <input id="type-inp" placeholder="Type text..." style={{ ...inputStyle, fontSize:11, height:30 }} onKeyDown={e => { if(e.key==='Enter') { socketActions.type(viewing.id, e.target.value); e.target.value=''; }}} />
                    <button onClick={() => { const t=document.getElementById('type-inp').value; if(t) { socketActions.type(viewing.id, t); } }} style={{ ...btnPrimary, padding:'5px 10px', fontSize:11 }}>Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phone Grid */}
        {!loading && (
          <div style={{ display:'grid', gridTemplateColumns: viewMode==='compact' ? 'repeat(auto-fill,minmax(100px,1fr))' : 'repeat(auto-fill,minmax(160px,1fr))', gap: viewMode==='compact' ? 5 : 9 }}>
            {filtered.map(device => (
              <PhoneCard
                key={device.id}
                device={device}
                selected={selected.has(device.id)}
                onSelect={toggleSel}
                onOpen={setViewing}
                onAction={handleAction}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'#3a4560' }}>
                <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
                <div style={{ marginBottom:16 }}>No devices found</div>
                <button onClick={() => setShowCreate(true)} style={btnPrimary}>＋ Add Phones</button>
              </div>
            )}
          </div>
        )}

        {/* Create Device Modal */}
        {showCreate && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e => { if(e.target===e.currentTarget) setShowCreate(false); }}>
            <div style={{ background:'#0b1120', border:'1px solid rgba(0,229,255,.2)', borderRadius:14, padding:24, width:440, maxWidth:'90vw' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                <h3 style={{ color:'#dde5f0', margin:0 }}>Add Virtual Phones</h3>
                <button onClick={() => setShowCreate(false)} style={{ background:'none', border:'none', color:'#6b7e99', cursor:'pointer', fontSize:20 }}>✕</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                {[['Name Prefix', 'text', 'name'],['Count', 'number', 'count'],['RAM (MB)', 'number', 'ram'],['CPUs', 'number', 'cpus']].map(([l,t,k]) => (
                  <div key={k}>
                    <label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>{l}</label>
                    <input type={t} value={createForm[k]} onChange={e => setCreateForm(f => ({...f, [k]:t==='number'?+e.target.value:e.target.value}))} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Android Version</label>
                  <select value={createForm.android} onChange={e => setCreateForm(f => ({...f, android:e.target.value}))} style={inputStyle}>
                    {['14','13','12','11','10','9'].map(v => <option key={v}>Android {v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'space-between', marginBottom:16 }}>
                {[1,5,10,25,50].map(n => (
                  <button key={n} onClick={() => setCreateForm(f => ({...f, count:n}))} style={{ flex:1, padding:'7px 0', background: createForm.count===n ? '#00e5ff' : '#111d2e', color: createForm.count===n ? '#000' : '#6b7e99', border:'1px solid #162035', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:13 }}>×{n}</button>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button onClick={() => setShowCreate(false)} style={{ padding:'9px 18px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={createDevices} style={btnPrimary}>＋ Create {createForm.count} Phone(s)</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showTask && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e => { if(e.target===e.currentTarget) setShowTask(false); }}>
            <div style={{ background:'#0b1120', border:'1px solid rgba(0,229,255,.2)', borderRadius:14, padding:24, width:480, maxWidth:'90vw' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                <h3 style={{ color:'#dde5f0', margin:0 }}>Create Automation Task</h3>
                <button onClick={() => setShowTask(false)} style={{ background:'none', border:'none', color:'#6b7e99', cursor:'pointer', fontSize:20 }}>✕</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Target App</label>
                  <select value={taskForm.appKey} onChange={e => setTaskForm(f => ({...f, appKey:e.target.value}))} style={inputStyle}>
                    {Object.entries(APPS).map(([k,a]) => <option key={k} value={k}>{a.icon} {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Action</label>
                  <select value={taskForm.action} onChange={e => setTaskForm(f => ({...f, action:e.target.value}))} style={inputStyle}>
                    {['watch_video','watch_ad','complete_survey','daily_search','play_game','share_bandwidth','watch_tv','install_app'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Account (optional)</label>
                  <select value={taskForm.accountId || ''} onChange={e => setTaskForm(f => ({...f, accountId:e.target.value||undefined}))} style={inputStyle}>
                    <option value="">No account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.email} ({a.platform})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7e99', display:'block', marginBottom:4 }}>Config (JSON)</label>
                  <textarea value={taskForm.config} onChange={e => setTaskForm(f => ({...f, config:e.target.value}))} style={{ ...inputStyle, height:80, resize:'vertical', fontFamily:'monospace', fontSize:11 }} placeholder='{ "videoDuration": 300, "autoLike": true }' />
                </div>
              </div>
              <div style={{ fontSize:12, color:'#6b7e99', marginBottom:12 }}>
                Will assign to: <strong style={{ color:'#00e5ff' }}>{selected.size} selected device(s)</strong>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button onClick={() => setShowTask(false)} style={{ padding:'9px 18px', background:'#111d2e', border:'1px solid #162035', borderRadius:8, color:'#6b7e99', cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={createTask} style={btnPrimary}>🤖 Start Tasks</button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}

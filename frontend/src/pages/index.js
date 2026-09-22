import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import DeviceCard  from '../components/Phone/DeviceCard';
import PhoneScreen from '../components/Phone/PhoneScreen';
import { getSocket, ctrl, disconnectSocket } from '../lib/socket';
import { authAPI, devicesAPI } from '../lib/api';
import { ALL_MODELS, BRAND_LIST, BRANDS } from '../data/phoneModels';

const st = { dark:'#0b1120', darker:'#07090f', border:'#162035', cyan:'#00e5ff', green:'#00e676', red:'#ff1744', yellow:'#ffd600', t1:'#dde5f0', t2:'#6b7e99', t3:'#2e3d52' };
const inp = { background:st.dark, border:`1px solid ${st.border}`, borderRadius:7, color:st.t1, fontSize:13, padding:'8px 12px', outline:'none', width:'100%' };

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
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
  const [activeTab,setActiveTab]=useState('url');
  const [savingAdd, setSavingAdd] = useState(false);
  const [notice, setNotice] = useState('');
  const [diagnostics, setDiagnostics] = useState(null);
  const [deviceLogs, setDeviceLogs] = useState([]);
  const [networkProfile, setNetworkProfile] = useState('online');
  const [geoPreset, setGeoPreset] = useState('Dhaka');
  const [clipboardText, setClipboardText] = useState('');
  const [qaBusy, setQaBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingName, setRecordingName] = useState('Mobile smoke test');
  const [recordingActions, setRecordingActions] = useState([]);
  const [savedRecordings, setSavedRecordings] = useState([]);

  // Load devices & subscribe to updates
  useEffect(() => {
    const token = window.localStorage.getItem('farm_token');
    setAuthenticated(Boolean(token));
    setAuthReady(true);
    const logout = () => { window.localStorage.removeItem('farm_token'); disconnectSocket(); setAuthenticated(false); };
    window.addEventListener('farm:logout', logout);
    return () => window.removeEventListener('farm:logout', logout);
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    devicesAPI.list().then(r => { setDevices(r.data||[]); setStats(r.stats||{}); }).catch(() => {});
    const sock = getSocket();
    sock.on('farm:state',   ({ devices:d, stats:s }) => { setDevices(d||[]); setStats(s||{}); });
    sock.on('farm:devices', (d)  => setDevices(d||[]));
    sock.on('farm:stats',   (s)  => setStats(s||{}));
    sock.on('device:added', ()   => devicesAPI.list().then(r => { setDevices(r.data||[]); setStats(r.stats||{}); }).catch(() => {}));
    sock.on('device:removed',()  => devicesAPI.list().then(r => { setDevices(r.data||[]); setStats(r.stats||{}); }).catch(() => {}));
    const onDeviceError = ({ error } = {}) => setNotice(error || 'Backend could not create the device.');
    sock.on('device:error', onDeviceError);

    return () => { sock.off('farm:state'); sock.off('farm:devices'); sock.off('farm:stats'); sock.off('device:added'); sock.off('device:removed'); sock.off('device:error', onDeviceError); };
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    devicesAPI.recordings().then(result => setSavedRecordings(result.data || [])).catch(() => {});
  }, [authenticated, viewing?.id]);

  const login = async (event) => {
    event.preventDefault();
    setLoggingIn(true); setAuthError('');
    try {
      const result = await authAPI.login(password);
      window.localStorage.setItem('farm_token', result.token);
      setAuthenticated(true); setPassword('');
    } catch (error) {
      setAuthError(error?.error || 'Login failed. Check the password.');
    } finally { setLoggingIn(false); }
  };


  if (!authReady) return <div style={{ minHeight:'100dvh', width:'100%', background:st.darker }} />;
  if (!authenticated) return (
    <>
      <Head><title>PhoneFarmZone — Owner Access</title><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" /></Head>
      <style jsx global>{`
        :global(html), :global(body), :global(#__next) { margin:0; min-height:100%; width:100%; background:${st.darker}; }
        :global(*), :global(*::before), :global(*::after) { box-sizing:border-box; }
      `}</style>
    <main style={{ minHeight:'100dvh', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:`radial-gradient(circle at 20% 0%, #122640 0%, ${st.darker} 48%)`, color:st.t1, padding:'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))', overflowY:'auto' }}>
      <form onSubmit={login} style={{ width:'100%', maxWidth:390, background:'rgba(11,17,32,.94)', border:`1px solid ${st.border}`, borderRadius:'clamp(12px, 4vw, 18px)', padding:'clamp(20px, 7vw, 32px)', boxShadow:'0 22px 70px rgba(0,0,0,.45)' }}>
        <div style={{ color:st.cyan, fontSize:'clamp(10px, 2.8vw, 12px)', letterSpacing:'clamp(1.5px, .7vw, 3px)', fontWeight:800, overflowWrap:'anywhere' }}>PHONEFARMZONE / OWNER ACCESS</div>
        <h1 style={{ margin:'12px 0 8px', fontSize:'clamp(24px, 8vw, 28px)', lineHeight:1.15 }}>Secure control room</h1>
        <p style={{ color:st.t2, fontSize:13, lineHeight:1.6, margin:'0 0 24px' }}>Enter the owner password to open the virtual device dashboard. Unauthenticated visitors cannot reach the API or live socket.</p>
        <label htmlFor="owner-password" style={{ display:'block', color:st.t2, fontSize:12, marginBottom:7 }}>Password</label>
        <input id="owner-password" autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Owner password" autoComplete="current-password" style={{ ...inp, minHeight:46, padding:'12px 14px', fontSize:16, marginBottom:12 }} />
        {authError && <div role="alert" style={{ color:'#ff6b88', background:'rgba(255,23,68,.1)', border:'1px solid rgba(255,23,68,.25)', borderRadius:8, padding:'9px 10px', fontSize:12, marginBottom:12, overflowWrap:'anywhere' }}>{authError}</div>}
        <button disabled={loggingIn || !password} type="submit" style={{ width:'100%', minHeight:46, padding:'12px 14px', border:0, borderRadius:9, background:st.cyan, color:'#001018', fontWeight:800, cursor:loggingIn?'wait':'pointer', opacity:(loggingIn || !password) ? .8 : 1 }}>{loggingIn ? 'Checking…' : 'Unlock dashboard'}</button>
      </form>
    </main>
    </>
  );

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

  const refreshDiagnostics = async (id = viewing?.id) => {
    if (!id) return;
    try {
      const [diag, logs] = await Promise.all([devicesAPI.diagnostics(id), devicesAPI.logs(id)]);
      setDiagnostics(diag.data || null); setDeviceLogs(logs.data || []);
    } catch (error) { setNotice(error?.error || error?.message || 'Diagnostics unavailable.'); }
  };

  const runQaAction = async (action) => {
    if (!viewing?.id) return;
    setQaBusy(true); setNotice('');
    try {
      if (action === 'network') await devicesAPI.network(viewing.id, networkProfile);
      if (action === 'geo') {
        const coords = { Dhaka:[23.8103,90.4125], Chittagong:[22.3569,91.7832], London:[51.5072,-0.1276], NewYork:[40.7128,-74.006] }[geoPreset];
        await devicesAPI.geolocation(viewing.id, { latitude: coords[0], longitude: coords[1], accuracy: 30 });
      }
      if (action === 'clear') await devicesAPI.clearStorage(viewing.id);
      if (action === 'clipboard-set') await devicesAPI.clipboard(viewing.id, 'set', clipboardText);
      if (action === 'clipboard-get') { const result = await devicesAPI.clipboard(viewing.id, 'get'); setClipboardText(result.data || ''); }
      await refreshDiagnostics(viewing.id);
    } catch (error) { setNotice(error?.error || error?.message || 'QA action failed.'); }
    finally { setQaBusy(false); }
  };

  const recordAction = (action) => { if (recording) setRecordingActions(actions => [...actions, { ...action, at: new Date().toISOString() }].slice(-100)); };
  const startRecording = () => { setRecordingActions([]); setRecording(true); setNotice('Recording touch and navigation actions.'); };
  const stopRecording = async () => {
    setRecording(false); if (!recordingActions.length) { setNotice('No actions recorded yet.'); return; }
    try { const created = await devicesAPI.createRecording(recordingName); for (const action of recordingActions) await devicesAPI.addRecordingAction(created.data.id, action); const list = await devicesAPI.recordings(); setSavedRecordings(list.data || []); setNotice(`Saved ${recordingActions.length} actions as ${recordingName}.`); } catch (error) { setNotice(error?.error || error?.message || 'Could not save recording.'); }
  };
  const replayRecording = async (id) => { try { const result = await devicesAPI.replayRecording(id, selected.size ? [...selected] : [viewing?.id].filter(Boolean)); setNotice(`Replay finished: ${(result.data || []).filter(x => x.ok).length} device(s) passed.`); } catch (error) { setNotice(error?.error || error?.message || 'Replay failed.'); } };

  // Add devices
  const addDevices = async () => {
    const m = ALL_MODELS.find(m => m.brand === BRANDS[addForm.brand]?.name && m.model === addForm.model);
    const base = {
      brand:   BRANDS[addForm.brand]?.name || 'Samsung',
      model:   addForm.model,
      android: addForm.android,
      group:   addForm.group || 'Default',
      width:   m?.width  || 393,
      height:  m?.height || 851,
      ram:     m?.ram    || '6GB',
      cpu:     m?.cpu    || 'Unknown',
      userAgent: m?.userAgent,
    };
    const count = Math.min(Math.max(parseInt(addForm.count, 10) || 1, 1), 20);
    const list  = Array.from({length:count}, (_,i) => ({
      ...base,
      name: addForm.name ? (count > 1 ? `${addForm.name} ${i+1}` : addForm.name) : `${base.brand} ${base.model}${count > 1 ? ` ${i+1}` : ''}`,
    }));

    setSavingAdd(true);
    setNotice('');
    try {
      const result = await devicesAPI.create({ devices: list });
      if (result?.success === false) throw new Error(result.error || 'Device creation failed.');
      const refreshed = await devicesAPI.list();
      setDevices(refreshed.data || []);
      setStats(refreshed.stats || {});
      setShowAdd(false);
    } catch (error) {
      const timedOut = error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
      setNotice(timedOut
        ? 'The Render backend is waking up. Please retry after a minute; no device was lost.'
        : (error?.error || error?.message || 'Could not connect to the backend.'));
    } finally {
      setSavingAdd(false);
    }
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
      <Head><title>PhoneFarmZone</title><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" /></Head>

      <style jsx global>{`
        :global(html), :global(body) { margin:0; padding:0; background:#07090f; overflow-x:hidden; }
        :global(*), :global(*::before), :global(*::after) { box-sizing:border-box; }
        .app-header { min-width:0; }
        .header-search { min-width:120px; }
        .header-actions { min-width:0; }
        .mobile-bottom-nav { display:none; }
        .glass-panel { background:rgba(11,17,32,.78) !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); box-shadow:0 16px 50px rgba(0,0,0,.22); }
        button, input, select, textarea { -webkit-tap-highlight-color:transparent; }
        @media (max-width: 720px) {
          .app-header { height:auto !important; min-height:54px; padding:10px 12px !important; flex-wrap:wrap; }
          .header-search { order:3; flex-basis:100%; max-width:none !important; }
          .header-actions { gap:4px !important; }
          .header-actions > button { white-space:nowrap; }
          .header-actions > div:first-child { max-width:120px; overflow:hidden; }
          .header-actions > button { padding:7px 9px !important; min-height:36px; }
          .dashboard-content { padding:10px 10px 24px !important; }
          .toolbar { align-items:stretch !important; }
          .toolbar > select { flex:1; min-width:calc(50% - 4px); }
          .toolbar-actions { width:100%; }
          .toolbar-actions > button { flex:1; min-width:0; min-height:36px; }
          .device-grid { grid-template-columns:minmax(0, 1fr) !important; gap:10px !important; }
          .device-card { min-width:0 !important; width:100%; max-width:520px; margin:0 auto; }
          .brand-picker { display:grid !important; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:6px !important; }
          .brand-picker > button { min-height:38px; }
          .device-card .device-select { width:28px !important; height:28px !important; top:3px !important; left:3px !important; }
          .device-card .device-icon-action { width:36px !important; min-height:34px; }
          .device-card .device-nav-action { min-width:26px; min-height:24px; }
          .device-card .device-meta { flex-wrap:wrap; gap:4px 8px !important; }
          .modal-shell { width:100% !important; max-width:100% !important; max-height:calc(100dvh - 16px) !important; padding:14px !important; border-radius:12px !important; }
          .viewer-overlay { align-items:flex-end !important; padding:0 !important; }
          .viewer-shell { width:100% !important; max-width:100% !important; max-height:96dvh !important; padding:12px 12px calc(14px + env(safe-area-inset-bottom)) !important; border-radius:18px 18px 0 0 !important; overflow-y:auto !important; display:grid !important; grid-template-columns:minmax(0, 1fr) !important; gap:12px !important; }
          .viewer-shell::before { content:''; width:42px; height:4px; border-radius:8px; background:#34425a; margin:0 auto 2px; grid-column:1; }
          .viewer-shell > .viewer-header-actions, .viewer-shell > .viewer-info { width:100% !important; min-width:0 !important; }
          .viewer-shell > .viewer-header-actions { position:sticky; top:-12px; z-index:2; padding-top:8px; background:rgba(11,17,32,.96); }
          .viewer-shell > div:not(.viewer-header-actions):not(.viewer-info) { margin:0 auto; }
          .modal-shell h3 { font-size:1rem; }
          .modal-shell input, .modal-shell select, .modal-shell textarea { min-height:40px; }
          .form-grid { grid-template-columns:1fr !important; gap:10px !important; }
          .modal-footer { flex-direction:column-reverse !important; }
          .modal-footer > button { width:100%; }
          .viewer-info { width:100% !important; min-width:0 !important; }
          .viewer-header-actions { flex-wrap:wrap; justify-content:flex-end; }
        }
          .mobile-bottom-nav { display:grid; grid-template-columns:repeat(4,1fr); position:fixed; left:0; right:0; bottom:0; z-index:120; padding:6px 8px calc(6px + env(safe-area-inset-bottom)); background:rgba(7,9,15,.94); border-top:1px solid ${st.border}; backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); gap:5px; }
          .mobile-bottom-nav button { min-height:42px; border:1px solid ${st.border}; border-radius:9px; background:#0b1120; color:${st.t2}; font-size:11px; font-weight:700; }
          .mobile-bottom-nav button.primary { background:${st.cyan}; color:#001018; border-color:${st.cyan}; }
          .dashboard-content { padding-bottom:88px !important; }
        }
        @media (max-width: 420px) {
          .header-actions > div:first-child { display:none; }
          .toolbar > select { min-width:100%; }
          .header-actions { width:100%; margin-left:0 !important; justify-content:space-between; }
          .header-actions > button { flex:1; }
        }
      `}</style>

      <div style={{ minHeight:'100vh', background:st.darker, color:st.t1, fontFamily:'system-ui,sans-serif' }}>

        {/* TOP BAR */}
        <header className="app-header" style={{ background:'rgba(7,9,15,.95)', borderBottom:`1px solid ${st.border}`, padding:'0 16px', height:54, display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:100, backdropFilter:'blur(12px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <div style={{ width:30, height:30, background:'linear-gradient(135deg,#00e5ff,#0070ff)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#000' }}>⌬</div>
            <div style={{ fontWeight:800, fontSize:'1rem', color:'#fff', lineHeight:1 }}>PhoneFarmZone</div>
          </div>

          {/* Search */}
          <div className="header-search" style={{ flex:1, maxWidth:280, position:'relative' }}>
            <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:st.t3, fontSize:14, pointerEvents:'none' }}>⌕</span>
            <input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search devices..." style={{ ...inp, paddingLeft:30, height:34, fontSize:12 }} />
          </div>

          <div className="header-actions" style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
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
            <button onClick={() => { window.localStorage.removeItem('farm_token'); disconnectSocket(); setAuthenticated(false); }} style={{ padding:'7px 10px', background:'transparent', border:`1px solid ${st.border}`, borderRadius:8, color:st.t3, cursor:'pointer', fontSize:12 }} aria-label="Lock dashboard">Lock</button>
          </div>
        </header>

        <div className="dashboard-content" style={{ padding:'14px 16px' }}>
          {/* Filter + controls bar */}
          <div className="toolbar" style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
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
            <div className="view-toggle" style={{ display:'flex', background:st.dark, borderRadius:7, padding:2, border:`1px solid ${st.border}`, gap:1 }}>
              {[['▦','grid'],['⊟','compact']].map(([ic,m])=>(
                <button key={m} onClick={()=>setViewMode(m)} style={{ width:30, height:28, border:'none', borderRadius:5, background:viewMode===m?st.cyan:'transparent', color:viewMode===m?'#000':st.t3, cursor:'pointer', fontSize:13 }}>{ic}</button>
              ))}
            </div>

            <div className="toolbar-actions" style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
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
              <div style={{ fontSize:48, marginBottom:14, opacity:.3 }}>{devices.length ? '⌕' : '📵'}</div>
              <div style={{ fontSize:16, marginBottom:6 }}>{devices.length ? 'No matching devices' : 'No virtual devices'}</div>
              <div style={{ fontSize:13, marginBottom:20 }}>{devices.length ? 'Try clearing your search or filters' : 'Add your first virtual Android phone'}</div>
              {devices.length ? (
                <button onClick={() => { setSrch(''); setFBrand('all'); setFStatus('all'); }} style={{ padding:'10px 24px', background:st.dark, color:st.cyan, border:`1px solid ${st.cyan}40`, borderRadius:9, fontWeight:800, cursor:'pointer', fontSize:13 }}>Clear filters</button>
              ) : (
                <button onClick={() => setShowAdd(true)} style={{ padding:'10px 24px', background:st.cyan, color:'#000', border:'none', borderRadius:9, fontWeight:800, cursor:'pointer', fontSize:13 }}>＋ Add Device</button>
              )}
            </div>
          ) : (
            <div className="device-grid" style={{ display:'grid', gridTemplateColumns:colsMap[viewMode], gap: viewMode==='compact'?6:10 }}>
              {filtered.map(d => (
                <DeviceCard key={d.id} device={d} selected={selected.has(d.id)} onSelect={toggleSel} onOpen={setViewing} onAction={handleAction} />
              ))}
            </div>
          )}
        </div>

        {/* ═══════ FULL-SCREEN DEVICE VIEWER ═══════ */}
        {viewing && (
          <div className="viewer-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => { if(e.target===e.currentTarget) setViewing(null); }}>
            <div className="viewer-shell glass-panel" style={{ background:st.dark, border:`1px solid ${st.cyan}30`, borderRadius:16, padding:20, maxHeight:'95vh', overflow:'auto', display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start', maxWidth:'90vw' }}>
              {/* Device info header */}
              <div className="viewer-header-actions" style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:14, borderBottom:`1px solid ${st.border}` }}>
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
              <PhoneScreen device={viewing} width={280} showControls={true} onAction={recordAction} />

              {/* Extended controls */}
              <div className="viewer-info" style={{ flex:1, minWidth:240, display:'flex', flexDirection:'column', gap:12 }}>
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

                {/* Render-compatible browser QA tools */}
                <div style={{ background:'#080d18', border:`1px solid ${st.cyan}25`, borderRadius:8, padding:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:st.cyan }}>QA Lab Tools</div>
                    <button disabled={qaBusy} onClick={() => refreshDiagnostics(viewing.id)} style={{ padding:'4px 7px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:5, color:st.t2, cursor:'pointer', fontSize:10 }}>↻ Inspect</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    <select value={networkProfile} onChange={e=>setNetworkProfile(e.target.value)} style={{ ...inp, padding:'6px 8px', fontSize:11 }}>
                      {['online','slow3g','fast3g','4g','offline'].map(v=><option key={v} value={v}>{v === 'slow3g' ? 'Slow 3G' : v === 'fast3g' ? 'Fast 3G' : v.toUpperCase()}</option>)}
                    </select>
                    <button disabled={qaBusy} onClick={() => runQaAction('network')} style={{ padding:'6px 8px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:5, color:st.t1, cursor:'pointer', fontSize:11 }}>Apply Network</button>
                    <select value={geoPreset} onChange={e=>setGeoPreset(e.target.value)} style={{ ...inp, padding:'6px 8px', fontSize:11 }}>
                      {['Dhaka','Chittagong','London','NewYork'].map(v=><option key={v} value={v}>{v === 'NewYork' ? 'New York' : v}</option>)}
                    </select>
                    <button disabled={qaBusy} onClick={() => runQaAction('geo')} style={{ padding:'6px 8px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:5, color:st.t1, cursor:'pointer', fontSize:11 }}>Set Location</button>
                    <button disabled={qaBusy} onClick={() => runQaAction('clear')} style={{ padding:'6px 8px', background:'rgba(255,23,68,.08)', border:'1px solid rgba(255,23,68,.2)', borderRadius:5, color:st.red, cursor:'pointer', fontSize:11 }}>Clear Storage</button>
                    <button disabled={qaBusy} onClick={() => { ctrl.reload(viewing.id); refreshDiagnostics(viewing.id); }} style={{ padding:'6px 8px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:5, color:st.t1, cursor:'pointer', fontSize:11 }}>Reload + Inspect</button>
                  </div>
                  <div style={{ display:'flex', gap:5, marginTop:7 }}>
                    <input value={clipboardText} onChange={e=>setClipboardText(e.target.value)} placeholder="Clipboard text" style={{ ...inp, padding:'6px 8px', fontSize:11 }} />
                    <button disabled={qaBusy} onClick={() => runQaAction('clipboard-set')} style={{ padding:'6px 8px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:5, color:st.t2, cursor:'pointer', fontSize:11 }}>Set</button>
                    <button disabled={qaBusy} onClick={() => runQaAction('clipboard-get')} style={{ padding:'6px 8px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:5, color:st.t2, cursor:'pointer', fontSize:11 }}>Get</button>
                  </div>
                  {diagnostics && <div style={{ marginTop:9, display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, fontSize:10, color:st.t2 }}>
                    <span>Requests: <b style={{ color:st.t1 }}>{diagnostics.requestCount}</b></span><span>Failed: <b style={{ color:diagnostics.failedRequestCount ? st.red : st.t1 }}>{diagnostics.failedRequestCount}</b></span>
                    <span>Cookies: <b style={{ color:st.t1 }}>{diagnostics.cookies}</b></span><span>Network: <b style={{ color:st.cyan }}>{diagnostics.network}</b></span>
                    <span style={{ gridColumn:'1/-1', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Title: {diagnostics.title || '—'}</span>
                  </div>}
                  {deviceLogs.length > 0 && <div style={{ marginTop:8, maxHeight:92, overflow:'auto', borderTop:`1px solid ${st.border}`, paddingTop:6 }}>{deviceLogs.slice(0,8).map((log, i)=><div key={`${log.at}-${i}`} style={{ fontSize:9, color:log.level==='error'?st.red:st.t3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{new Date(log.at).toLocaleTimeString()} · {log.message}</div>)}</div>}
                </div>
                <div style={{ background:'#080d18', border:`1px solid ${recording ? st.red : st.border}`, borderRadius:8, padding:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}><div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:recording?st.red:st.t3 }}>Test Recording {recording ? `· ${recordingActions.length}` : ''}</div><span style={{ fontSize:10, color:st.t3 }}>touch + pinch + swipe</span></div>
                  {!recording ? <div style={{ display:'flex', gap:5 }}><input value={recordingName} onChange={e=>setRecordingName(e.target.value)} style={{ ...inp, padding:'6px 8px', fontSize:11 }} /><button onClick={startRecording} style={{ padding:'6px 8px', background:'rgba(255,23,68,.12)', border:`1px solid ${st.red}55`, borderRadius:5, color:st.red, cursor:'pointer', fontSize:11 }}>● Record</button></div> : <button onClick={stopRecording} style={{ width:'100%', padding:'7px 8px', background:st.red, border:'none', borderRadius:5, color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700 }}>■ Stop & Save ({recordingActions.length})</button>}
                  {savedRecordings.length > 0 && <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>{savedRecordings.slice(-5).reverse().map(test => <div key={test.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:5, fontSize:10, color:st.t2 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{test.name} · {test.actions.length}</span><button onClick={()=>replayRecording(test.id)} style={{ padding:'4px 7px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:4, color:st.cyan, cursor:'pointer', fontSize:10 }}>Replay</button></div>)}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ ADD DEVICE MODAL ═══════ */}
        {showAdd && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
            <div className="modal-shell" style={{ background:st.dark, border:`1px solid ${st.cyan}30`, borderRadius:16, padding:24, width:480, maxWidth:'95vw', maxHeight:'90vh', overflow:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                <h3 style={{ margin:0, color:'#fff' }}>Add Virtual Device</h3>
                <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'none', color:st.t2, cursor:'pointer', fontSize:22 }}>✕</button>
              </div>

              {/* Brand picker */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, color:st.t2, display:'block', marginBottom:6 }}>Brand</label>
                <div className="brand-picker" style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {BRAND_LIST.map(b => (
                    <button key={b.key} aria-pressed={addForm.brand===b.key} title={`Select ${b.name}`} onClick={() => { setAddForm(f=>({...f, brand:b.key, model:BRANDS[b.key].models[0].model, android:BRANDS[b.key].models[0].android})); }}
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

              <div className="form-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
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

              {notice && <div style={{ marginBottom:12, padding:'9px 10px', borderRadius:7, background:'rgba(255,23,68,.1)', border:'1px solid rgba(255,23,68,.25)', color:'#ff6b86', fontSize:12 }}>{notice}</div>}

              <div className="modal-footer" style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button onClick={()=>setShowAdd(false)} style={{ padding:'10px 18px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:8, color:st.t2, cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={addDevices} disabled={savingAdd} style={{ padding:'10px 18px', background:savingAdd?'#31505a':st.cyan, color:savingAdd?st.t2:'#000', border:'none', borderRadius:8, fontWeight:800, cursor:savingAdd?'wait':'pointer', fontSize:13 }}>{savingAdd ? '⏳ Creating…' : `＋ Add ${addForm.count} Device${addForm.count>1?'s':''}`}</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ BATCH MODAL ═══════ */}
        {showBatch && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && setShowBatch(false)}>
            <div className="modal-shell" style={{ background:st.dark, border:`1px solid ${st.cyan}30`, borderRadius:16, padding:24, width:480, maxWidth:'95vw' }}>
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

              <div className="modal-footer" style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
                <button onClick={()=>setShowBatch(false)} style={{ padding:'10px 18px', background:'#111d2e', border:`1px solid ${st.border}`, borderRadius:8, color:st.t2, cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={runBatch} style={{ padding:'10px 18px', background:st.cyan, color:'#000', border:'none', borderRadius:8, fontWeight:800, cursor:'pointer', fontSize:13 }}>▶ Run on All</button>
              </div>
            </div>
          </div>
        )}
        <nav className="mobile-bottom-nav" aria-label="Mobile dashboard actions">
          <button className="primary" onClick={() => setShowAdd(true)}>＋ Add</button>
          <button onClick={() => setShowBatch(true)}>Batch</button>
          <button onClick={selected.size ? clearSel : selectAll}>{selected.size ? 'Clear' : 'Select'}</button>
          <button onClick={() => ctrl.startAll()}>▶ Start</button>
        </nav>
        <footer className="app-footer" style={{ borderTop:`1px solid ${st.border}`, padding:'20px 16px 28px', marginTop:20, textAlign:'center', color:st.t3, fontSize:12, lineHeight:1.7 }}>
          <a href="https://phonefarmzone.vercel.app/" target="_blank" rel="noreferrer" style={{ color:st.cyan, fontWeight:800, textDecoration:'none' }}>PhoneFarmZone</a>
          <span style={{ margin:'0 8px', opacity:.5 }}>·</span>
          <span>Developed By </span>
          <a href="https://github.com/HumayunShariarHimu" target="_blank" rel="noreferrer" style={{ color:st.t1, fontWeight:700, textDecoration:'none' }}>Humayun Shariar Himu</a>
        </footer>
      </div>
    </>
  );
}

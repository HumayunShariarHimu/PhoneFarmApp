import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout/Layout';
import { analyticsAPI, devicesAPI, tasksAPI } from '../lib/api';
import { getSocket } from '../lib/socket';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const C = { cyan:'#00e5ff', green:'#00e676', yellow:'#ffd600', red:'#ff1744', purple:'#aa00ff', orange:'#ff9100' };

export default function Dashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState({ totalEarnings:0, totalTasks:0, totalDevices:0, activeDevices:0, totalAccounts:0, currentRateHr:0 });
  const [earnings, setEarnings] = useState({ timeline:[], byApp:[] });
  const [devices,  setDevices]  = useState([]);
  const [tasks,    setTasks]    = useState({ total:0, completed:0, failed:0, running:0 });
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.overview().then(r => setOverview(r.data)).catch(() => {}),
      analyticsAPI.earnings({ period:'7d' }).then(r => setEarnings(r.data)).catch(() => {}),
      analyticsAPI.tasks().then(r => setTasks(r.data)).catch(() => {}),
      devicesAPI.list({ limit:20 }).then(r => setDevices(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));

    const sock = getSocket();
    sock.on('farm:devices:update', devs => {
      const running = devs.filter(d => d.status === 'running').length;
      setOverview(o => ({ ...o, activeDevices: running, currentRateHr: running * 0.08 }));
    });
    return () => sock.off('farm:devices:update');
  }, []);

  const card = (label, value, color, sub, onClick) => (
    <div onClick={onClick} style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:'16px 20px', cursor: onClick ? 'pointer' : 'default', transition:'all .15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color+'44')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = '#0d1a2e')}>
      <div style={{ fontSize:'1.8rem', fontWeight:900, color, fontFamily:'monospace', letterSpacing:'-1px', marginBottom:4 }}>{value}</div>
      <div style={{ fontWeight:700, fontSize:13, color:'#dde5f0', marginBottom:2 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#3a4560' }}>{sub}</div>}
    </div>
  );

  const ttStyle = { background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:8, color:'#dde5f0', fontSize:12 };
  const COLORS  = [C.cyan, C.green, C.yellow, C.red, C.purple, C.orange, '#00bcd4', '#8bc34a', '#ff5722', '#9c27b0'];

  const runningDevices = devices.filter(d => d.status === 'running');

  return (
    <>
      <Head><title>Dashboard — PhoneFarmOS</title></Head>
      <Layout title="Dashboard">

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14, marginBottom:20 }}>
          {card('Active Phones',   overview.activeDevices,             C.green,  `of ${overview.totalDevices} total`,           () => router.push('/farm'))}
          {card('Rate / Hour',     `$${(overview.currentRateHr||0).toFixed(3)}`, C.cyan, 'Combined active rate', () => router.push('/earnings'))}
          {card('Daily Estimate',  `$${((overview.currentRateHr||0)*24).toFixed(2)}`, C.yellow, 'Based on current rate')}
          {card('Total Earned',    `$${(overview.totalEarnings||0).toFixed(2)}`, C.green,  'All time')}
          {card('Tasks Completed', (tasks.completed||0).toLocaleString(), C.cyan,  `${tasks.failed||0} failed`,                () => router.push('/tasks'))}
          {card('Accounts',        overview.totalAccounts||0,           C.purple, 'Across all platforms',                      () => router.push('/accounts'))}
        </div>

        {/* Charts row */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:20 }}>
          {/* Earnings timeline */}
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560', marginBottom:12 }}>7-Day Earnings</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={earnings.timeline || []}>
                <XAxis dataKey="date" tick={{ fill:'#3a4560', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#3a4560', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(2)}`} />
                <Tooltip contentStyle={ttStyle} formatter={v => [`$${v.toFixed(4)}`, 'Earnings']} />
                <Line type="monotone" dataKey="amount" stroke={C.green} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* App distribution */}
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560', marginBottom:12 }}>By App</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={earnings.byApp||[]} dataKey="amount" nameKey="app" cx="50%" cy="50%" outerRadius={70} stroke="none">
                  {(earnings.byApp||[]).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={ttStyle} formatter={v => [`$${v.toFixed(4)}`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'3px 8px', marginTop:8 }}>
              {(earnings.byApp||[]).slice(0,6).map((a,i) => (
                <div key={a.app} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#6b7e99' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:COLORS[i%COLORS.length], display:'inline-block' }}></span>
                  {a.app}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Running devices + task status */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {/* Running devices */}
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560' }}>Running Devices</div>
              <button onClick={() => router.push('/farm')} style={{ background:'none', border:'none', color:'#00e5ff', fontSize:11, cursor:'pointer' }}>View all →</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:280, overflowY:'auto' }}>
              {runningDevices.length === 0 && (
                <div style={{ textAlign:'center', padding:'30px 0', color:'#3a4560' }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📱</div>
                  <div style={{ fontSize:12, marginBottom:12 }}>No running devices</div>
                  <button onClick={() => router.push('/farm')} style={{ padding:'6px 14px', background:'#00e5ff', color:'#000', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:12 }}>Start Farm →</button>
                </div>
              )}
              {runningDevices.map(d => (
                <div key={d.id} onClick={() => router.push('/farm')} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#111d2e', borderRadius:7, border:'1px solid #162035', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#00e676', boxShadow:'0 0 5px #00e676', display:'inline-block' }}></span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#dde5f0' }}>{d.name}</div>
                      <div style={{ fontSize:10, color:'#3a4560' }}>{d.currentApp || 'Running'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, color:'#00e676' }}>${(d.metrics?.earnings||0).toFixed(4)}</div>
                    <div style={{ fontSize:10, color:'#3a4560' }}>CPU {Math.round(d.metrics?.cpu||0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task overview */}
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560' }}>Task Overview</div>
              <button onClick={() => router.push('/tasks')} style={{ background:'none', border:'none', color:'#00e5ff', fontSize:11, cursor:'pointer' }}>Manage →</button>
            </div>
            {[
              ['Running',   tasks.running||0,   C.yellow, '⟳'],
              ['Completed', tasks.completed||0,  C.green,  '✓'],
              ['Failed',    tasks.failed||0,     C.red,    '✗'],
              ['Total',     tasks.total||0,      C.cyan,   '≡'],
            ].map(([label, val, color, icon]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #0d1a2e' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14, color }}>{icon}</span>
                  <span style={{ fontSize:13, color:'#6b7e99' }}>{label}</span>
                </div>
                <span style={{ fontSize:16, fontWeight:800, fontFamily:'monospace', color }}>{val.toLocaleString()}</span>
              </div>
            ))}

            {/* Quick actions */}
            <div style={{ marginTop:16, display:'flex', gap:8 }}>
              <button onClick={() => router.push('/farm')} style={{ flex:1, padding:'9px', background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.2)', borderRadius:7, color:'#00e5ff', fontWeight:700, cursor:'pointer', fontSize:12 }}>📱 Farm</button>
              <button onClick={() => router.push('/tasks')} style={{ flex:1, padding:'9px', background:'rgba(170,0,255,.08)', border:'1px solid rgba(170,0,255,.2)', borderRadius:7, color:'#aa00ff', fontWeight:700, cursor:'pointer', fontSize:12 }}>🤖 Tasks</button>
              <button onClick={() => router.push('/analytics')} style={{ flex:1, padding:'9px', background:'rgba(0,230,118,.08)', border:'1px solid rgba(0,230,118,.2)', borderRadius:7, color:'#00e676', fontWeight:700, cursor:'pointer', fontSize:12 }}>📊 Stats</button>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

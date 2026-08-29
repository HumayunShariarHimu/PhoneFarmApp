// analytics.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout/Layout';
import { analyticsAPI } from '../lib/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const C = { cyan:'#00e5ff', green:'#00e676', yellow:'#ffd600', red:'#ff1744', purple:'#aa00ff', orange:'#ff9100' };
const COLORS = [C.cyan, C.green, C.yellow, C.red, C.purple, C.orange, '#00bcd4', '#8bc34a', '#ff5722', '#9c27b0'];
const ttStyle = { background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:8, color:'#dde5f0', fontSize:12 };

export default function AnalyticsPage() {
  const [overview, setOverview] = useState({});
  const [earnings, setEarnings] = useState({ timeline:[], byApp:[] });
  const [tasks,    setTasks]    = useState({});
  const [period,   setPeriod]   = useState('7d');
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    await Promise.all([
      analyticsAPI.overview().then(r => setOverview(r.data)).catch(() => {}),
      analyticsAPI.earnings({ period }).then(r => setEarnings(r.data)).catch(() => {}),
      analyticsAPI.tasks().then(r => setTasks(r.data)).catch(() => {}),
    ]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [period]);

  return (
    <>
      <Head><title>Analytics — PhoneFarmOS</title></Head>
      <Layout title="Analytics">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <h2 style={{ margin:0, color:'#dde5f0' }}>Analytics Dashboard</h2>
          <div style={{ display:'flex', background:'#0b1120', borderRadius:8, padding:2, gap:1, border:'1px solid #0d1a2e' }}>
            {['24h','7d','30d'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding:'6px 14px', background: period===p?'#00e5ff':'transparent', color: period===p?'#000':'#6b7e99', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:12 }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Overview cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, marginBottom:20 }}>
          {[
            ['Total Earned', `$${(overview.totalEarnings||0).toFixed(2)}`, C.green],
            ['Active Devices', overview.activeDevices||0, C.cyan],
            ['Rate/hr', `$${(overview.currentRateHr||0).toFixed(3)}`, C.yellow],
            ['Daily Estimate', `$${((overview.currentRateHr||0)*24).toFixed(2)}`, C.orange],
            ['Total Tasks', (overview.totalTasks||0).toLocaleString(), C.cyan],
            ['Accounts', overview.totalAccounts||0, C.purple],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:'14px 18px' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:c, fontFamily:'monospace', marginBottom:4 }}>{v}</div>
              <div style={{ fontSize:11, color:'#3a4560' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:14 }}>
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560', marginBottom:14 }}>Earnings Timeline</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={earnings.timeline||[]}>
                <XAxis dataKey="date" tick={{ fill:'#3a4560', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#3a4560', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(3)}`} />
                <Tooltip contentStyle={ttStyle} formatter={v=>[`$${(+v).toFixed(5)}`,'Earnings']} />
                <Line type="monotone" dataKey="amount" stroke={C.green} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560', marginBottom:14 }}>By Platform</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={earnings.byApp||[]} dataKey="amount" nameKey="app" cx="50%" cy="50%" outerRadius={75} stroke="none" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(earnings.byApp||[]).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={ttStyle} formatter={v=>[`$${(+v).toFixed(5)}`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background:'#0b1120', border:'1px solid #0d1a2e', borderRadius:10, padding:16 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#3a4560', marginBottom:14 }}>Earnings by App</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={earnings.byApp||[]}>
              <XAxis dataKey="app" tick={{ fill:'#3a4560', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#3a4560', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(4)}`} />
              <Tooltip contentStyle={ttStyle} formatter={v=>[`$${(+v).toFixed(5)}`,'Earnings']} />
              <Bar dataKey="amount" radius={[4,4,0,0]}>
                {(earnings.byApp||[]).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Layout>
    </>
  );
}

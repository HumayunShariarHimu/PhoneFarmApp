import Head from 'next/head';

const st = { darker:'#07090f', dark:'#0b1120', border:'#162035', cyan:'#00e5ff', green:'#00e676', t1:'#dde5f0', t2:'#6b7e99' };

export default function Download() {
  return (
    <>
      <Head>
        <title>PhoneFarm Android · Download</title>
        <meta name="description" content="Download the PhoneFarm Android connector for authorized device QA and testing." />
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
      </Head>
      <main style={{ minHeight:'100vh', background:`radial-gradient(circle at 20% 0%, #122640 0%, ${st.darker} 48%)`, color:st.t1, fontFamily:'system-ui,sans-serif', padding:'48px 20px' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div style={{ color:st.cyan, fontSize:12, letterSpacing:3, fontWeight:800 }}>PHONEFARM / ANDROID CONNECTOR</div>
          <h1 style={{ fontSize:'clamp(32px,7vw,56px)', lineHeight:1.05, margin:'14px 0 16px', color:'#fff' }}>PhoneFarm Android</h1>
          <p style={{ maxWidth:620, color:st.t2, fontSize:17, lineHeight:1.7 }}>An owner-visible connector for authorized Android device testing. Pair a real phone with PhoneFarmZone, install APKs through Android’s standard installer, and launch approved test targets.</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, margin:'28px 0' }}>
            <a href="https://github.com/HumayunShariarHimu/PhoneFarmConnectorApp/releases" style={{ background:st.cyan, color:'#001018', padding:'13px 18px', borderRadius:9, fontWeight:800, textDecoration:'none' }}>Download APK releases</a>
            <a href="https://github.com/HumayunShariarHimu/PhoneFarmConnectorApp" style={{ background:st.dark, color:st.cyan, border:`1px solid ${st.cyan}50`, padding:'13px 18px', borderRadius:9, fontWeight:800, textDecoration:'none' }}>View source</a>
          </div>
          <section style={{ background:'rgba(11,17,32,.82)', border:`1px solid ${st.border}`, borderRadius:14, padding:22, marginTop:22 }}>
            <h2 style={{ color:'#fff', fontSize:20, marginTop:0 }}>Install and pair</h2>
            <ol style={{ color:st.t2, lineHeight:1.8, paddingLeft:22 }}>
              <li>Download the latest APK from GitHub Releases.</li>
              <li>Install it on an Android device and allow this app to request APK installs only if your test workflow needs it.</li>
              <li>Open PhoneFarmZone, sign in as the owner, and choose <b style={{ color:st.green }}>Pair Android</b> to create a one-time code.</li>
              <li>Enter the code in PhoneFarm. Pairing requires explicit owner consent and can be revoked from the app.</li>
            </ol>
          </section>
          <section style={{ background:'rgba(11,17,32,.82)', border:`1px solid ${st.border}`, borderRadius:14, padding:22, marginTop:14 }}>
            <h2 style={{ color:'#fff', fontSize:20, marginTop:0 }}>Important boundary</h2>
            <p style={{ color:st.t2, lineHeight:1.7, marginBottom:0 }}>This is a QA connector, not a hidden-access tool or a multi-OS phone clone. A normal Android app cannot create ten independent full Android phones inside one host phone. Use multiple physical devices or emulators for a real device lab.</p>
          </section>
          <footer style={{ color:'#2e3d52', fontSize:12, marginTop:34 }}>PhoneFarm · <a href="/" style={{ color:st.cyan }}>Open dashboard</a></footer>
        </div>
      </main>
    </>
  );
}

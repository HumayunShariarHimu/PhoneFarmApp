// ════════════════════════════════════════════
//  Layout.js
// ════════════════════════════════════════════
import Sidebar from './Sidebar';
import Navbar  from './Navbar';
import { Toaster } from 'react-hot-toast';

export default function Layout({ children, title }) {
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#05080f', color:'#dde5f0', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <Sidebar />
      <div style={{ flex:1, marginLeft:230, paddingTop:58, minHeight:'100vh' }}>
        <Navbar title={title} />
        <div style={{ padding:'20px 24px', maxWidth:1900, margin:'0 auto' }}>
          {children}
        </div>
      </div>
      <Toaster position="bottom-right" toastOptions={{
        style: { background:'#0b1120', color:'#dde5f0', border:'1px solid #162035', fontFamily:"'Segoe UI',sans-serif", fontSize:13 },
        success: { iconTheme: { primary:'#00e676', secondary:'#000' } },
        error:   { iconTheme: { primary:'#ff1744', secondary:'#fff' } },
      }} />
    </div>
  );
}

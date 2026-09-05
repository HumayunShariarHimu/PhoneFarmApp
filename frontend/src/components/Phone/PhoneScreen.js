/**
 * PhoneScreen — Live virtual Android phone screen
 * Shows real-time Puppeteer screenshots
 * Forwards ALL interactions to backend via Socket.IO
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket, ctrl } from '../../lib/socket';

export default function PhoneScreen({ device, width = 280, showControls = true, className = '' }) {
  const imgRef      = useRef(null);
  const containerRef = useRef(null);
  const touchRef    = useRef(null);

  const [frame,    setFrame]    = useState(null);
  const [live,     setLive]     = useState(false);
  const [url,      setUrl]      = useState(device?.currentUrl || '');
  const [urlInput, setUrlInput] = useState('');
  const [typeText, setTypeText] = useState('');

  const dw = device?.width  || 393;
  const dh = device?.height || 851;
  const h  = Math.round(width * dh / dw);

  // Subscribe to live frames
  useEffect(() => {
    if (!device?.id) return;
    const sock = getSocket();

    const onFrame = (data) => {
      if (data.id !== device.id) return;
      setFrame(data.frame);
      setUrl(data.url || '');
      setLive(true);
    };

    sock.on(`device:frame:${device.id}`, onFrame);
    ctrl.subscribe(device.id);

    return () => {
      sock.off(`device:frame:${device.id}`, onFrame);
      ctrl.unsubscribe(device.id);
    };
  }, [device?.id]);

  // Convert screen coordinates (pixel → device coords)
  const toDeviceCoords = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = dw / rect.width;
    const scaleY = dh / rect.height;
    return {
      x: Math.round(Math.max(0, Math.min(dw, (clientX - rect.left) * scaleX))),
      y: Math.round(Math.max(0, Math.min(dh, (clientY - rect.top)  * scaleY))),
    };
  }, [dw, dh]);

  // Mouse click → tap
  const onMouseDown = useCallback((e) => {
    if (device?.status !== 'running') return;
    e.preventDefault();
    const { x, y } = toDeviceCoords(e.clientX, e.clientY);
    if (e.detail === 2) { ctrl.doubleTap(device.id, x, y); }
    else                { ctrl.tap(device.id, x, y); }
  }, [device?.id, device?.status, toDeviceCoords]);

  // Right-click → long press
  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    if (device?.status !== 'running') return;
    const { x, y } = toDeviceCoords(e.clientX, e.clientY);
    ctrl.longPress(device.id, x, y, 1000);
  }, [device?.id, device?.status, toDeviceCoords]);

  // Touch events → swipe/tap
  const onTouchStart = useCallback((e) => {
    if (device?.status !== 'running') return;
    const t = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    touchRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top, time: Date.now() };
  }, [device?.status]);

  const onTouchEnd = useCallback((e) => {
    if (!touchRef.current || device?.status !== 'running') return;
    const t = e.changedTouches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    const ex = t.clientX - rect.left;
    const ey = t.clientY - rect.top;
    const { x: sx, y: sy, time } = touchRef.current;
    const dx = ex - sx, dy = ey - sy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const dur  = Date.now() - time;

    const scaleX = dw / rect.width;
    const scaleY = dh / rect.height;

    if (dist < 12 && dur < 300) {
      ctrl.tap(device.id, Math.round(ex * scaleX), Math.round(ey * scaleY));
    } else {
      ctrl.swipe(device.id,
        Math.round(sx*scaleX), Math.round(sy*scaleY),
        Math.round(ex*scaleX), Math.round(ey*scaleY),
        Math.min(dur, 800));
    }
    touchRef.current = null;
  }, [device?.id, device?.status, dw, dh]);

  // Keyboard forwarding
  const onKeyDown = useCallback((e) => {
    if (device?.status !== 'running') return;
    e.preventDefault();
    const keyMap = {
      Backspace:'Backspace', Enter:'Enter', Escape:'Escape',
      ArrowUp:'ArrowUp', ArrowDown:'ArrowDown', ArrowLeft:'ArrowLeft', ArrowRight:'ArrowRight',
      Tab:'Tab', Delete:'Delete', Home:'Home', End:'End',
    };
    if (keyMap[e.key]) {
      ctrl.key(device.id, keyMap[e.key]);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      ctrl.type(device.id, e.key);
    }
  }, [device?.id, device?.status]);

  // Scroll wheel
  const onWheel = useCallback((e) => {
    if (device?.status !== 'running') return;
    e.preventDefault();
    if (e.deltaY > 0) ctrl.scrollDown(device.id, Math.abs(e.deltaY));
    else              ctrl.scrollUp(device.id, Math.abs(e.deltaY));
  }, [device?.id, device?.status]);

  const isRunning = device?.status === 'running';
  const statusColor = { running:'#00e676', stopped:'#3a4560', error:'#ff1744', starting:'#ffd600', queued:'#ff9100', busy:'#00e5ff' };
  const sColor = statusColor[device?.status] || '#3a4560';

  return (
    <div className={className} style={{ width, userSelect:'none', fontFamily:'system-ui,sans-serif' }}>

      {/* Status bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 8px', background:'#0b1120', borderRadius:'8px 8px 0 0', border:'1px solid #162035', borderBottom:'none' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#6b7e99', overflow:'hidden' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:sColor, display:'inline-block', flexShrink:0, boxShadow: isRunning ? `0 0 5px ${sColor}` : 'none' }}></span>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth: width - 80 }}>{device?.name}</span>
        </div>
        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
          {isRunning && (
            <>
              <button onClick={() => ctrl.back(device.id)}    title="Back"    style={navBtn}>◁</button>
              <button onClick={() => ctrl.reload(device.id)}  title="Reload"  style={navBtn}>↺</button>
              <button onClick={() => ctrl.screenshot(device.id)} title="Screenshot" style={navBtn}>📸</button>
            </>
          )}
        </div>
      </div>

      {/* Phone frame */}
      <div style={{ background:'#090d18', border:'1px solid #162035', borderTop:'none', borderRadius:'0 0 8px 8px', overflow:'hidden' }}>

        {/* Android status bar */}
        <div style={{ height:18, background:'#000', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 10px', fontSize:8, color:'rgba(255,255,255,.85)', fontFamily:'monospace', flexShrink:0 }}>
          <span>{new Date().toLocaleTimeString('en-US', { hour12:false, hour:'2-digit', minute:'2-digit' })}</span>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            {/* Signal bars */}
            <div style={{ display:'flex', alignItems:'flex-end', gap:1 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ width:2, height:i*2.5, borderRadius:1, background: i <= (device?.signal || 3) ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.2)' }}></div>
              ))}
            </div>
            <span style={{ color: device?.battery < 20 ? '#ff1744' : 'rgba(255,255,255,.9)' }}>
              {Math.round(device?.battery || 85)}%
            </span>
          </div>
        </div>

        {/* Main screen area */}
        <div
          ref={containerRef}
          tabIndex={0}
          style={{ width:'100%', height:h, background:'#000', position:'relative', cursor: isRunning ? 'crosshair' : 'default', outline:'none', overflow:'hidden', display:'block' }}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onKeyDown={onKeyDown}
          onWheel={onWheel}
        >
          {/* Live screenshot */}
          {frame && (
            <img
              ref={imgRef}
              src={`data:image/jpeg;base64,${frame}`}
              alt="screen"
              draggable={false}
              style={{ width:'100%', height:'100%', objectFit:'fill', display:'block', pointerEvents:'none' }}
            />
          )}

          {/* No frame yet */}
          {!frame && (
            <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, background: isRunning ? '#050810' : '#080d18' }}>
              {device?.status === 'starting' ? (
                <>
                  <div style={{ fontSize:28, opacity:.5 }}>⟳</div>
                  <div style={{ fontSize:12, color:'#ffd600' }}>Booting {device.model}...</div>
                </>
              ) : device?.status === 'running' ? (
                <>
                  <div style={{ fontSize:28, opacity:.4 }}>📱</div>
                  <div style={{ fontSize:12, color:'#3a4560' }}>Connecting stream...</div>
                </>
              ) : device?.status === 'queued' ? (
                <>
                  <div style={{ fontSize:22, opacity:.4 }}>⏳</div>
                  <div style={{ fontSize:11, color:'#ff9100', textAlign:'center', padding:'0 10px' }}>Queued<br/>({process.env.NEXT_PUBLIC_MAX_ACTIVE || 3} max active)</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:26, opacity:.3 }}>📵</div>
                  <div style={{ fontSize:11, color:'#2e3d52' }}>Offline</div>
                  <button onClick={() => ctrl.startDevice(device.id)} style={{ padding:'5px 12px', background:'rgba(0,229,255,.1)', color:'#00e5ff', border:'1px solid rgba(0,229,255,.25)', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700 }}>▶ Start</button>
                </>
              )}
            </div>
          )}

          {/* Status overlay badges */}
          {device?.status === 'error' && (
            <div style={{ position:'absolute', inset:0, background:'rgba(255,23,68,.12)', display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ background:'rgba(0,0,0,.8)', color:'#ff1744', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4 }}>⚠ ERROR</div>
            </div>
          )}
          {device?.status === 'starting' && (
            <div style={{ position:'absolute', bottom:20, left:0, right:0, textAlign:'center', pointerEvents:'none' }}>
              <div style={{ display:'inline-block', background:'rgba(0,0,0,.75)', color:'#ffd600', fontSize:9, padding:'2px 8px', borderRadius:10 }}>Starting...</div>
            </div>
          )}
          {live && (
            <div style={{ position:'absolute', top:22, right:4, background:'rgba(255,23,68,.8)', color:'#fff', fontSize:7, fontWeight:700, padding:'1px 4px', borderRadius:3, letterSpacing:.5, pointerEvents:'none' }}>LIVE</div>
          )}

          {/* URL bar if running */}
          {isRunning && url && (
            <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,.75)', padding:'2px 6px', fontSize:8, color:'rgba(255,255,255,.6)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', pointerEvents:'none' }}>
              {url.replace('https://','').replace('http://','').substring(0,50)}
            </div>
          )}
        </div>

        {/* Android nav bar */}
        <div style={{ height:26, background:'#000', display:'flex', alignItems:'center', justifyContent:'center', gap:28, flexShrink:0 }}>
          {[['◁','back'],['●','home'],['◻','recents']].map(([ic,act]) => (
            <button key={act}
              onClick={() => {
                if (act === 'back')    ctrl.back(device.id);
                else if (act === 'home') ctrl.goto(device.id, 'https://www.google.com');
              }}
              style={{ background:'none', border:'none', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer', padding:'4px 8px', lineHeight:1 }}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      {showControls && isRunning && (
        <div style={{ marginTop:4, display:'flex', flexDirection:'column', gap:4 }}>
          {/* URL bar */}
          <div style={{ display:'flex', gap:4 }}>
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter' && urlInput) { ctrl.goto(device.id, urlInput); setUrlInput(''); } }}
              placeholder="URL or search..."
              style={{ flex:1, background:'#0b1120', border:'1px solid #162035', borderRadius:6, color:'#dde5f0', fontSize:11, padding:'6px 10px', outline:'none' }}
            />
            <button onClick={() => { if(urlInput){ ctrl.goto(device.id, urlInput); setUrlInput(''); } }}
              style={{ padding:'6px 10px', background:'#00e5ff', color:'#000', border:'none', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700 }}>
              Go
            </button>
          </div>
          {/* Type text */}
          <div style={{ display:'flex', gap:4 }}>
            <input
              value={typeText}
              onChange={e => setTypeText(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter'){ ctrl.type(device.id, typeText); setTypeText(''); } }}
              placeholder="Type text..."
              style={{ flex:1, background:'#0b1120', border:'1px solid #162035', borderRadius:6, color:'#dde5f0', fontSize:11, padding:'6px 10px', outline:'none' }}
            />
            <button onClick={() => { ctrl.type(device.id, typeText); setTypeText(''); }}
              style={{ padding:'6px 10px', background:'#111d2e', border:'1px solid #162035', borderRadius:6, color:'#6b7e99', cursor:'pointer', fontSize:11 }}>
              Send
            </button>
          </div>
          {/* Quick actions */}
          <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
            {[['⬆','swipeUp'],['⬇','swipeDown'],['⬅','swipeLeft'],['➡','swipeRight'],['🔝','scrollToTop'],['🔚','scrollToBottom']].map(([ic,act]) => (
              <button key={act} onClick={() => ctrl[act]?.(device.id) || ctrl.swipeUp?.(device.id)}
                style={{ flex:1, minWidth:30, padding:'4px 2px', background:'#111d2e', border:'1px solid #162035', borderRadius:5, color:'#6b7e99', cursor:'pointer', fontSize:12, textAlign:'center' }}>
                {ic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = {
  background: 'none', border: 'none', color: '#6b7e99',
  cursor: 'pointer', fontSize: 12, padding: '2px 5px',
  borderRadius: 4, lineHeight: 1,
};

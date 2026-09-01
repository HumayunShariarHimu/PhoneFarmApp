/**
 * PhoneViewer — Real-time Android screen via WebRTC
 * Click anywhere → ADB tap on the real Android VM
 * Swipe gestures → ADB swipe
 * Keyboard → ADB typeText / keyevent
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket, socketActions } from '../../lib/socket';
import { streamAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function PhoneViewer({ device, width = 320, onClose }) {
  const videoRef    = useRef(null);
  const pcRef       = useRef(null);
  const peerIdRef   = useRef(null);
  const containerRef = useRef(null);
  const touchStartRef = useRef(null);

  const [connected,  setConnected]  = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error,      setError]      = useState(null);
  const [showCtrl,   setShowCtrl]   = useState(false);

  const deviceW = device.display?.width  || 1080;
  const deviceH = device.display?.height || 1920;

  // ── Connect WebRTC ─────────────────────────
  const connect = useCallback(async () => {
    if (connecting || connected) return;
    setConnecting(true);
    setError(null);

    try {
      if (device.status !== 'running') {
        throw new Error(device.error || `Device is ${device.status || 'unavailable'}. Start a connected Android runtime first.`);
      }
      // 1. Request offer from backend
      const { data } = await streamAPI.getOffer(device.id);
      const { peerId, offer } = data;
      peerIdRef.current = peerId;

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // 3. Set remote description (offer from server)
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // 4. Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 5. ICE candidates
      pc.onicecandidate = async ({ candidate }) => {
        if (candidate) {
          await streamAPI.sendIce(peerId, candidate).catch(() => {});
        }
      };

      // 6. Receive video stream
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setConnected(true);
          setConnecting(false);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setConnected(false);
          setError('Stream disconnected');
        }
      };

      // 7. Send answer to backend
      await streamAPI.sendAnswer(peerId, answer);

    } catch (err) {
      setError(err?.error || err?.message || 'Connection failed');
      setConnecting(false);
    }
  }, [device.id, connected, connecting]);

  // ── Disconnect WebRTC ──────────────────────
  const disconnect = useCallback(() => {
    if (pcRef.current)     { pcRef.current.close(); pcRef.current = null; }
    if (peerIdRef.current) { streamAPI.stop(peerIdRef.current).catch(() => {}); }
    if (videoRef.current)  { videoRef.current.srcObject = null; }
    peerIdRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [device.id]);

  // ── Coordinate conversion ──────────────────
  const getDeviceCoords = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = deviceW / rect.width;
    const scaleY = deviceH / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top)  * scaleY);
    return { x: Math.max(0, Math.min(x, deviceW)), y: Math.max(0, Math.min(y, deviceH)) };
  };

  // ── Mouse click → ADB tap ─────────────────
  const handleClick = (e) => {
    if (!connected) return;
    const { x, y } = getDeviceCoords(e);
    socketActions.tap(device.id, x, y);
  };

  const handleDoubleClick = (e) => {
    if (!connected) return;
    const { x, y } = getDeviceCoords(e);
    socketActions.doubleTap(device.id, x, y);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!connected) return;
    const { x, y } = getDeviceCoords(e);
    socketActions.longPress(device.id, x, y, 1000);
  };

  // ── Touch / Swipe ─────────────────────────
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    touchStartRef.current = {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || !connected) return;
    const t = e.changedTouches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const endX = t.clientX - rect.left;
    const endY = t.clientY - rect.top;
    const { x: sx, y: sy, time } = touchStartRef.current;
    const dx = endX - sx, dy = endY - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const scaleX = deviceW / rect.width;
    const scaleY = deviceH / rect.height;

    if (dist < 10 && Date.now() - time < 300) {
      // Tap
      socketActions.tap(device.id, Math.round(endX * scaleX), Math.round(endY * scaleY));
    } else {
      // Swipe
      socketActions.swipe(
        device.id,
        Math.round(sx * scaleX), Math.round(sy * scaleY),
        Math.round(endX * scaleX), Math.round(endY * scaleY),
        Math.min(Date.now() - time, 1000),
      );
    }
    touchStartRef.current = null;
  };

  // ── Keyboard → ADB ────────────────────────
  const handleKeyDown = (e) => {
    if (!connected) return;
    e.preventDefault();
    const keyMap = {
      Backspace: 'KEYCODE_DEL', Enter: 'KEYCODE_ENTER', Escape: 'KEYCODE_BACK',
      ArrowLeft: 'KEYCODE_DPAD_LEFT', ArrowRight: 'KEYCODE_DPAD_RIGHT',
      ArrowUp: 'KEYCODE_DPAD_UP', ArrowDown: 'KEYCODE_DPAD_DOWN',
      Tab: 'KEYCODE_TAB', ' ': 'KEYCODE_SPACE',
      Home: 'KEYCODE_HOME', End: 'KEYCODE_MOVE_END',
      Delete: 'KEYCODE_FORWARD_DEL',
    };
    if (keyMap[e.key]) {
      socketActions.keyevent(device.id, keyMap[e.key]);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      socketActions.type(device.id, e.key);
    }
  };

  const height = Math.round(width * (deviceH / deviceW));
  const statusColor = connected ? '#00e676' : connecting ? '#ffd600' : '#ff1744';

  return (
    <div style={{ width, userSelect: 'none' }}>
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#0b1120', borderRadius: '8px 8px 0 0', border: '1px solid #162035', borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block', boxShadow: connected ? `0 0 6px ${statusColor}` : 'none' }}></span>
          <span style={{ color: '#6b7e99' }}>{device.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowCtrl(!showCtrl)} style={btnStyle}>🎮</button>
          <button onClick={connected ? disconnect : connect} style={btnStyle}>{connected ? '⏸' : '▶'}</button>
          {onClose && <button onClick={onClose} style={btnStyle}>✕</button>}
        </div>
      </div>

      {/* Phone frame */}
      <div style={{ background: '#111', border: '1px solid #162035', borderRadius: '0 0 8px 8px', overflow: 'hidden', position: 'relative' }}>
        {/* Android status bar */}
        <div style={{ height: 20, background: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', fontSize: 9, color: '#fff', fontFamily: 'monospace' }}>
          <span>{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
          <span>📶 🔋</span>
        </div>

        {/* Screen / Video */}
        <div
          ref={containerRef}
          style={{ width: '100%', height, background: '#000', position: 'relative', cursor: connected ? 'crosshair' : 'default', outline: 'none' }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* WebRTC Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'fill', display: connected ? 'block' : 'none' }}
          />

          {/* Loading / Error overlay */}
          {!connected && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#050810', color: '#6b7e99' }}>
              {connecting ? (
                <>
                  <div style={{ fontSize: 32 }}>📡</div>
                  <div style={{ fontSize: 13 }}>Connecting to {device.name}...</div>
                  <div style={{ fontSize: 11, color: '#2e3d52' }}>Establishing WebRTC stream</div>
                </>
              ) : error ? (
                <>
                  <div style={{ fontSize: 28 }}>⚠</div>
                  <div style={{ fontSize: 12, color: '#ff1744', textAlign: 'center', padding: '0 16px' }}>{error}</div>
                  <button onClick={connect} style={{ padding: '6px 16px', background: '#00e5ff', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Reconnect</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32 }}>📱</div>
                  <div style={{ fontSize: 13 }}>Device offline</div>
                  {device.status === 'running' && (
                    <button onClick={connect} style={{ padding: '6px 16px', background: '#00e5ff', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Connect</button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Android nav bar */}
        <div style={{ height: 28, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {[['◁', 'back'], ['●', 'home'], ['◻', 'recents']].map(([icon, action]) => (
            <button key={action} onClick={() => socketActions[action]?.(device.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer', padding: '4px 8px' }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Quick control bar */}
      {showCtrl && (
        <div style={{ marginTop: 4, padding: '8px', background: '#0b1120', borderRadius: 8, border: '1px solid #162035', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            ['📸 Screenshot', () => socketActions.screenshot(device.id)],
            ['🔒 Lock',       () => socketActions.keyevent(device.id, 'KEYCODE_SLEEP')],
            ['🔓 Unlock',     () => socketActions.keyevent(device.id, 'KEYCODE_WAKEUP')],
            ['🔉 Vol-',       () => socketActions.keyevent(device.id, 'KEYCODE_VOLUME_DOWN')],
            ['🔊 Vol+',       () => socketActions.keyevent(device.id, 'KEYCODE_VOLUME_UP')],
            ['⬆ Swipe Up',    () => socketActions.swipe(device.id, 540, 1500, 540, 500, 400)],
            ['⬇ Swipe Down',  () => socketActions.swipe(device.id, 540, 500, 540, 1500, 400)],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{ padding: '4px 8px', background: '#111d2e', border: '1px solid #162035', borderRadius: 5, color: '#7a8aa5', fontSize: 11, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  background: 'none', border: 'none', color: '#6b7e99', cursor: 'pointer',
  fontSize: 12, padding: '2px 6px', borderRadius: 4,
};

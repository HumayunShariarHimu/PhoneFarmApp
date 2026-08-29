'use strict';
/**
 * WebRTCBridge - VNC → WebRTC screen streaming
 * Each Android VM has a VNC server → we bridge it to WebRTC → browser
 */
const net    = require('net');
const events = require('events');

// Try to load wrtc (native WebRTC for Node.js)
let RTCPeerConnection, RTCSessionDescription, nonstandard;
try {
  const wrtc = require('wrtc');
  RTCPeerConnection  = wrtc.RTCPeerConnection;
  RTCSessionDescription = wrtc.RTCSessionDescription;
  nonstandard = wrtc.nonstandard;
} catch {
  console.warn('[WebRTC] wrtc not available — screen streaming disabled. Install: npm install wrtc');
}

const ICE = [{ urls:'stun:stun.l.google.com:19302' }, { urls:'stun:stun1.l.google.com:19302' }];

class WebRTCBridge {
  constructor() {
    this.peers   = new Map(); // peerId → RTCPeerConnection
    this.sources = new Map(); // deviceId → RTCVideoSource
  }

  // ── Create offer for browser ──────────────
  async createOffer(deviceId, vncPort) {
    if (!RTCPeerConnection) {
      // Fallback: return a dummy offer structure when wrtc is unavailable
      const peerId = `${deviceId}_${Date.now()}`;
      return { peerId, offer: { type:'offer', sdp:'' }, fallback: true };
    }

    const peerId = `${deviceId}_${Date.now()}`;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    this.peers.set(peerId, pc);

    // Get or create video source from VNC
    let source = this.sources.get(deviceId);
    if (!source) {
      source = new nonstandard.RTCVideoSource();
      this.sources.set(deviceId, source);
      this._connectVNC(deviceId, vncPort, source);
    }

    const track = source.createTrack();
    pc.addTrack(track);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // ICE gathering
    await new Promise(resolve => {
      if (pc.iceGatheringState === 'complete') { resolve(); return; }
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') resolve(); };
      setTimeout(resolve, 5000);
    });

    return { peerId, offer: pc.localDescription };
  }

  async processAnswer(peerId, answer) {
    const pc = this.peers.get(peerId);
    if (!pc) throw new Error(`Peer not found: ${peerId}`);
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    return { success: true };
  }

  async addIceCandidate(peerId, candidate) {
    const pc = this.peers.get(peerId);
    if (pc && candidate) await pc.addIceCandidate(candidate).catch(() => {});
  }

  closePeer(peerId) {
    const pc = this.peers.get(peerId);
    if (pc) { try { pc.close(); } catch {} this.peers.delete(peerId); }
  }

  stopStream(deviceId) {
    this.sources.delete(deviceId);
    // Close all peers for this device
    for (const [pid, pc] of this.peers.entries()) {
      if (pid.startsWith(deviceId)) { try { pc.close(); } catch {} this.peers.delete(pid); }
    }
  }

  // ── VNC connection & frame feeding ────────
  _connectVNC(deviceId, vncPort, source) {
    const socket = net.createConnection(vncPort, '127.0.0.1');
    let w = 1080, h = 1920;
    const frameBuffer = Buffer.alloc(w * h * 4);

    socket.on('connect', () => {
      // Minimal RFB handshake
      socket.once('data', () => {
        socket.write('RFB 003.008\n');
        socket.once('data', () => {
          socket.write(Buffer.from([1])); // security: none
          socket.once('data', () => {
            socket.write(Buffer.from([1])); // ClientInit: shared
            socket.once('data', serverInit => {
              if (serverInit.length >= 4) {
                w = serverInit.readUInt16BE(0) || w;
                h = serverInit.readUInt16BE(2) || h;
              }
              // Request framebuffer updates
              this._requestUpdate(socket, w, h, true);
              setInterval(() => this._requestUpdate(socket, w, h, false), 33);
            });
          });
        });
      });
    });

    socket.on('data', () => {
      if (source && nonstandard) {
        try {
          source.onFrame({ width: w, height: h, data: new Uint8ClampedArray(frameBuffer) });
        } catch {}
      }
    });

    socket.on('error', err => console.warn(`[VNC:${deviceId}] ${err.message}`));
    socket.on('close', () => console.log(`[VNC:${deviceId}] disconnected`));
  }

  _requestUpdate(socket, w, h, full) {
    const buf = Buffer.alloc(10);
    buf.writeUInt8(3, 0);
    buf.writeUInt8(full ? 0 : 1, 1);
    buf.writeUInt16BE(0, 2); buf.writeUInt16BE(0, 4);
    buf.writeUInt16BE(w, 6); buf.writeUInt16BE(h, 8);
    try { socket.write(buf); } catch {}
  }
}

module.exports = new WebRTCBridge();

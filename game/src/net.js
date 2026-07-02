// P2P networking over WebRTC via PeerJS (vendored, loaded as a global from
// index.html). Star topology: the host is the hub — clients connect to the
// host's peer id, which doubles as the room code. No server for anyone to
// run; signaling uses the free public PeerJS broker (override with ?ps=).

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function makeCode() {
  let c = '';
  for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

function peerOptions() {
  const ps = new URLSearchParams(location.search).get('ps');
  if (!ps) return { debug: 1 }; // public PeerJS cloud
  const [host, port] = ps.split(':');
  return { host, port: +(port || 9000), path: '/', secure: false, debug: 1 };
}

export class Net {
  constructor() {
    this.peer = null;
    this.conns = new Map(); // id -> DataConnection (host only)
    this.hostConn = null;   // client only
    this.isHost = false;
    this.code = '';
    this.myId = '';
    this.handlers = { data: [], peerjoin: [], peerleave: [], error: [] };
    this.connected = false;
  }

  on(type, fn) { this.handlers[type].push(fn); }
  _fire(type, ...args) { for (const fn of this.handlers[type]) fn(...args); }

  host() {
    return new Promise((resolve, reject) => {
      const tryCode = (attempts) => {
        const code = makeCode();
        const peer = new window.Peer('fngr-' + code.toLowerCase(), peerOptions());
        peer.on('open', () => {
          this.peer = peer;
          this.isHost = true;
          this.code = code;
          this.myId = 'host';
          this.connected = true;
          peer.on('connection', (conn) => this._acceptConn(conn));
          peer.on('error', (e) => this._fire('error', e));
          resolve(code);
        });
        peer.on('error', (e) => {
          if (e.type === 'unavailable-id' && attempts > 0) {
            peer.destroy();
            tryCode(attempts - 1);
          } else if (!this.connected) {
            reject(e);
          }
        });
      };
      tryCode(4);
    });
  }

  _acceptConn(conn) {
    conn.on('open', () => {
      this.conns.set(conn.peer, conn);
      this._fire('peerjoin', conn.peer);
    });
    conn.on('data', (msg) => this._fire('data', msg, conn.peer));
    const drop = () => {
      if (this.conns.delete(conn.peer)) this._fire('peerleave', conn.peer);
    };
    conn.on('close', drop);
    conn.on('error', drop);
  }

  join(code) {
    return new Promise((resolve, reject) => {
      const peer = new window.Peer(peerOptions());
      let settled = false;
      peer.on('open', (id) => {
        this.peer = peer;
        this.myId = id;
        const conn = peer.connect('fngr-' + code.toLowerCase().trim(), { reliable: true });
        conn.on('open', () => {
          this.hostConn = conn;
          this.connected = true;
          settled = true;
          resolve();
        });
        conn.on('data', (msg) => this._fire('data', msg, 'host'));
        conn.on('close', () => { this.connected = false; this._fire('peerleave', 'host'); });
      });
      peer.on('error', (e) => {
        this._fire('error', e);
        if (!settled) { settled = true; reject(e); }
      });
    });
  }

  // client: send to host. host: broadcast to all clients.
  send(msg) {
    if (this.isHost) this.broadcast(msg);
    else if (this.hostConn && this.hostConn.open) this.hostConn.send(msg);
  }

  broadcast(msg, exceptId = null) {
    for (const [id, conn] of this.conns) {
      if (id !== exceptId && conn.open) {
        try { conn.send(msg); } catch (_) { /* dropped mid-send */ }
      }
    }
  }

  sendTo(id, msg) {
    const conn = this.conns.get(id);
    if (conn && conn.open) conn.send(msg);
  }

  peerCount() { return this.isHost ? this.conns.size : (this.connected ? 1 : 0); }
}

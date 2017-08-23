import { observable } from 'mobx';
import fetch from 'isomorphic-fetch';

class Conn {
  conn;
  serial = 0;

  constructor() {
    this.conn = new WebSocket("ws://127.0.0.1:8412?password=hackme")
  }

  sendMsg(msg) {
    msg.serial = this.nextSerial()
    this.conn.send(JSON.stringify(msg))
    return msg.serial
  }

  nextSerial() {
    this.serial += 1
    return this.serial - 1
  }
}

class AppState {
  @observable resources = {};
  @observable tids = [];
  @observable torrent_peers = {};
  @observable torrent_files = {};
  counter = 0;
  ws = null;
  torrent_serial = 0;
  server_serial = 0;
  server_id = 0;
  torrent_uploads = {};
  file_downloads = {};
  torrent_peer_serials = {};
  torrent_file_serials = {};

  constructor() {
    this.ws = new Conn()
    this.ws.conn.onmessage = this.wsMsg.bind(this)
    this.ws.conn.onopen = this.wsOpen.bind(this)
    this.downloadFile = this.downloadFile.bind(this)
    this.uploadTorrent = this.uploadTorrent.bind(this)
  }

  uploadTorrent(file) {
    const ts = this.ws.sendMsg({
      type: "UPLOAD_TORRENT",
      size: file.byteLength,
    })
    this.torrent_uploads[ts] = file;
  }

  downloadFile(id) {
    const ts = this.ws.sendMsg({
      type: "DOWNLOAD_FILE",
      id: id,
    })
    this.file_downloads[ts] = id;
  }

  wsOpen(evt) {
    // Subscribe to all torrent resources
    this.torrent_serial = this.ws.sendMsg({
      type: "FILTER_SUBSCRIBE",
      criteria: [],
    });

    this.server_serial = this.ws.sendMsg({
      type: "FILTER_SUBSCRIBE",
      kind: "server",
      criteria: [],
    })
  }

  wsMsg(evt) {
    let msg = JSON.parse(evt.data)
    switch (msg.type) {
      case "RESOURCES_EXTANT":
        if (msg.serial == this.torrent_serial) {
          this.torrentExtant(msg);
        } else if (msg.serial == this.server_serial) {
          this.serverExtant(msg);
        } else if (msg.serial in this.torrent_peer_serials) {
          this.peerExtant(msg);
        } else if (msg.serial in this.torrent_file_serials) {
          this.fileExtant(msg);
        }
        break;
      case "RESOURCES_REMOVED":
        for (const i in msg.ids) {
          const id = msg.ids[i]
          delete this.resources[id]
        }
        if (msg.serial == this.torrent_serial) {
          for (const i in msg.ids) {
            const id = msg.ids[i]
            const idx = this.tids.indexOf(id)
            if (idx > -1) {
              this.tids.splice(idx, 1);
            }
          }
        }
        if (msg.serial in this.torrent_peer_serials) {
          const tid = this.torrent_peer_serials[msg.serial];
          for (const i in msg.ids) {
            const id = msg.ids[i]
            this.torrent_peers[tid].delete(id);
          }
        }
        break;
      case "UPDATE_RESOURCES":
        msg.resources.map((resource) => {
          const id = resource.id;
          for (const field in resource) {
            this.resources[id][field] = resource[field]
          }
        })
        break;
      case "TRANSFER_OFFER":
        if (msg.serial in this.torrent_uploads) {
          let headers = new Headers();
          headers.append("Authorization", "Bearer " + msg.token);
          fetch('http://localhost:8412/', { method: 'POST', body: this.torrent_uploads[msg.serial], headers: headers });
        } else if (msg.serial in this.file_downloads) {
          const url = 'http://localhost:8412/?token=' + msg.token
          window.open(url, '_blank');
        }
        break;

      default:
        break;
    }
  }

  torrentExtant(msg) {
    msg.ids.map(id => {
      const ps = this.ws.sendMsg({
        type: "FILTER_SUBSCRIBE",
        kind: "peer",
        criteria: [
          { field: "torrent_id", op: "==", value: id}
        ],
      });
      const fs = this.ws.sendMsg({
        type: "FILTER_SUBSCRIBE",
        kind: "file",
        criteria: [
          { field: "torrent_id", op: "==", value: id}
        ],
      });

      this.torrent_peer_serials[ps] = id;
      this.torrent_peers[id] = new Set();

      this.torrent_file_serials[fs] = id;
      this.torrent_files[id] = new Set();

      this.resources[id] = new Torrent(id, this.ws, ps)


      this.tids.push(id);
    })

    this.ws.sendMsg({
      type: "SUBSCRIBE",
      ids: msg.ids,
    });
  }

  serverExtant(msg) {
    this.server_id = msg.ids[0];
    this.resources[msg.ids[0]] = new Server(msg.ids[0])
    this.ws.sendMsg({
      type: "SUBSCRIBE",
      ids: msg.ids,
    });
  }

  peerExtant(msg) {
    const tid = this.torrent_peer_serials[msg.serial];
    msg.ids.map(id => {
      this.resources[id] = new Peer(id)
      this.torrent_peers[tid].add(id);
    })
    this.ws.sendMsg({
      type: "SUBSCRIBE",
      ids: msg.ids,
    });
  }

  fileExtant(msg) {
    const tid = this.torrent_file_serials[msg.serial];
    msg.ids.map(id => {
      this.resources[id] = new File(id)
      this.torrent_files[tid].add(id);
    })
    this.ws.sendMsg({
      type: "SUBSCRIBE",
      ids: msg.ids,
    });
  }
}

class Server {
  @observable throttle_down;
  @observable throttle_up;
  @observable rate_up;
  @observable rate_down;
  id

  constructor(id) {
    this.id = id
  }
}

class File {
  @observable progress
  @observable progress
  @observable availability

  id
  torrent_id
  path

  constructor(id) {
    this.id = id
  }
}

class Peer {
  @observable rate_up;
  @observable rate_down;
  torrent_id;
  client_id;
  ip;
  id

  constructor(id) {
    this.id = id
  }
}

class Torrent {
  @observable transferred_down;
  @observable transferred_up;
  @observable throttle_down;
  @observable throttle_up;
  @observable rate_up;
  @observable rate_down;
  @observable progress;
  @observable status;
  id;
  name;
  pieces;
  piece_size;
  ws = null;
  peer_serial = 0;

  constructor(id, ws, ps) {
    this.id = id;
    this.ws = ws;
    this.peer_serial = ps;
  }

  toggleStatus() {
    if (this.status == "paused") {
      this.ws.sendMsg({
        type: "RESUME_TORRENT",
        id: this.id,
      })
    } else {
      this.ws.sendMsg({
        type: "PAUSE_TORRENT",
        id: this.id,
      })
    }
  }

  remove() {
    this.ws.sendMsg({
      type: "REMOVE_RESOURCE",
      "id": this.id,
    })
  }
}

export default AppState;

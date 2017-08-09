import { observable } from 'mobx';
import fetch from 'isomorphic-fetch';

class Conn {
  conn;
  serial = 0;

  constructor() {
    this.conn = new WebSocket("ws://127.0.0.1:8412")
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
  counter = 0;
  ws = null;
  torrent_serial = 0;
  server_serial = 0;
  server_id = 0;
  transfers = {};

  constructor() {
    this.ws = new Conn()
    this.ws.conn.onmessage = this.wsMsg.bind(this)
    this.ws.conn.onopen = this.wsOpen.bind(this)
  }

  uploadTorrent(file) {
    const ts = this.ws.sendMsg({
      type: "UPLOAD_TORRENT",
      size: file.byteLength,
    })
    this.transfers[ts] = file;
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
        } else {
          console.log("Bad serial: " + msg.serial);
        }
        break;
      case "RESOURCES_REMOVED":
        if (msg.serial == this.torrent_serial) {
          for (const i in msg.ids) {
            const id = msg.ids[i]
            const idx = this.tids.indexOf(id)
            if (idx > -1) {
              this.tids.splice(idx, 1);
            }
            delete this.resources[id]
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
        let headers = new Headers();
        headers.append("Authorization", "Bearer " + msg.token);
        fetch('http://localhost:8412/', { method: 'POST', body: this.transfers[msg.serial], headers: headers });
        break;

      default:
        break;
    }
  }

  torrentExtant(msg) {
    msg.ids.map(id => {
      this.resources[id] = new Torrent(id, this.ws)
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

  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
  }

  toggleStatus() {
    this.ws.sendMsg({
      type: "UPDATE_RESOURCE",
      "resource": {
        "id": this.id,
        "status": "paused"
      }
    })
  }

  remove() {
    this.ws.sendMsg({
      type: "REMOVE_RESOURCE",
      "id": this.id,
    })
  }
}

export default AppState;

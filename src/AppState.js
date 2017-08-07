import { observable } from 'mobx';
import fetch from 'isomorphic-fetch';

class AppState {
  @observable resources = {};
  @observable tids = [];
  counter = 0;
  ws = null;
  serial = 0;
  torrent_serial = 0;
  transfers = {};

  constructor() {
    this.ws = new WebSocket("ws://127.0.0.1:8412")
    this.ws.onmessage = this.wsMsg.bind(this)
    this.ws.onopen = this.wsOpen.bind(this)
  }

  uploadTorrent(file) {
    const ts = this.nextSerial();
    this.transfers[ts] = file;
    this.ws.send(JSON.stringify({
      type: "UPLOAD_TORRENT",
      serial: ts,
      size: file.byteLength,
    }))
  }

  nextSerial() {
    this.serial += 1;
    return this.serial - 1;
  }

  wsOpen(evt) {
    const ts = this.nextSerial();
    this.torrent_serial = ts;
    // Subscribe to all torrent resources
    this.ws.send(JSON.stringify({
      type: "FILTER_SUBSCRIBE",
      serial: ts,
      criteria: [],
    }));
  }

  wsMsg(evt) {
    let msg = JSON.parse(evt.data)
    switch (msg.type) {
      case "RESOURCES_EXTANT":
        if (msg.serial == this.torrent_serial) {
          msg.ids.map(id => {
            this.resources[id] = new Torrent(id)
            this.tids.push(id);
          })

          this.ws.send(JSON.stringify({
            type: "SUBSCRIBE",
            serial: this.nextSerial(),
            ids: msg.ids,
          }));
        } else {
          console.log("Bad serial: " + msg.serial);
        }
        break;
      case "RESOURCES_REMOVED":
        if (msg.serial == this.torrent_serial) {
          // Remove torrent.
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
}

class Torrent {
  @observable transferred_down;
  @observable transferred_up;
  @observable rate_up;
  @observable rate_down;
  @observable progress;
  @observable status;
  id;
  name;
  pieces;
  piece_size;

  constructor(id) {
    this.id = id;
  }
}

export default AppState;

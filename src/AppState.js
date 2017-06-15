import { observable } from 'mobx';
import fetch from 'isomorphic-fetch';

class AppState {
  @observable torrents = [];
  counter = 0;

  constructor() {
    this.getData();
  }

  getData() {
    fetch('http://localhost:8412/torrent/list')
      .then(resp => resp.json())
      .then(({Torrents}) => {
        Torrents.map(t => this.addTorrent(t));
      })
      .then(() => {
        console.log('Done loading torrents!');
      });
  }

  addTorrent(id) {
    if (this.torrents.every((t) => t.id != id)) {
      this.torrents.push(new Torrent(id));
    }
  }

  removeTorrent() {
    this.torrents.pop();
  }
}

class Torrent {
  @observable downloaded;
  @observable uploaded;
  @observable status;

  constructor(id) {
    this.id = id;
    this.int = setInterval(() => {
        fetch(`http://localhost:8412/torrent/${this.id}/info`)
        .then(resp => resp.json())
        .then(({TorrentInfo}) => this.setInfo(TorrentInfo))
        .catch((e) => clearInterval(this.int));
    }, 1000);
  }

  setInfo(info) {
    this.title = info.name;
    this.downloaded = info.downloaded;
    this.uploaded = info.uploaded;
    this.size = info.size;
    this.status = info.status;
  }
}

export default AppState;

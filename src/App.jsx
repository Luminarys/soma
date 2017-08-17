import React, { Component } from 'react';
import { ButtonToolbar, Input, Button, ProgressBar } from 'react-bootstrap';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

function toInt(n){ return Math.round(Number(n)); };

function bytesToSize(bytes) {
  var sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (bytes == 0) return '0 byte';
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

@observer
class Peer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const p = this.props.peer;
    return (
      <div>
        Peer - {`DL ${bytesToSize(p.rate_down)}/s`} - {`UL ${bytesToSize(p.rate_up)}/s`}
      </div>
    );
  }
}

@observer
class Torrent extends Component {
  constructor(props) {
    super(props);
    this.toggleStatus = this.toggleStatus.bind(this)
    this.remove = this.remove.bind(this)
  }

  toggleStatus() {
    this.props.torrent.toggleStatus()
  }

  remove() {
    this.props.torrent.remove()
  }

  render() {
    const t = this.props.torrent;
    let ctrl_btn = <Button onClick={this.toggleStatus} bsStyle="warning">Pause</Button>;
    if (t.status == "paused") {
      ctrl_btn = <Button onClick={this.toggleStatus} bsStyle="success">Resume</Button>;
    }
    let peers = [];
    this.props.app.torrent_peers[t.id].forEach(id => {
       peers.push(<Peer peer={this.props.app.resources[id]} key={id} />);
    });
    return (
      <div>
        <ButtonToolbar>
          {ctrl_btn}
          <Button onClick={this.remove} bsStyle="danger">Remove</Button>
        </ButtonToolbar>
        <br />
        {t.name} - {t.status} - {`DL ${bytesToSize(t.rate_down)}/s`} - {`UL ${bytesToSize(t.rate_up)}/s`}
        <ProgressBar now={t.progress * 100} label={`${(t.progress * 100).toFixed(2)}%`}/>
        {peers}
      </div>
    );
  }
}

@observer
class App extends Component {
  constructor(props) {
    super(props);
    this.addTorrent = this.addTorrent.bind(this);
    this.upload = this.upload.bind(this);
    this.handleFile = this.handleFile.bind(this);
  }

  render() {
    let torrents = this.props.appState.tids.map(id => {
      return <Torrent
        torrent={this.props.appState.resources[id]}
        app={this.props.appState}
        key={id}
        />;
    });
    const server = this.props.appState.resources[this.props.appState.server_id];
    let ul = 0, dl = 0;
    if (server != undefined) {
      dl = bytesToSize(server.rate_down);
      ul = bytesToSize(server.rate_up);
    }
    return (
      <div>
        <Button bsStyle='primary' onClick={this.addTorrent}>
          Add Torrent
        </Button>
        <br />
        <br />
        {`DL ${dl}/s - UL ${ul}/s`}
        <br />
        <input
          id='torrent-ul' className='hidden' type='file' label='Upload' accept='.torrent'
          onChange={this.handleFile}
        />
        <br />
        {torrents}
        <DevTools />
      </div>
    );
  }

  upload(ev) {
    console.log(ev)
    this.props.appState.uploadTorrent(ev.target.result)
  }

  handleFile(ev) {
    const file = ev.target.files[0];
    const reader = new FileReader();
    reader.onload = this.upload;
    reader.readAsArrayBuffer(file);
  }

  addTorrent() {
    document.getElementById('torrent-ul').click();
  }
};

export default App;

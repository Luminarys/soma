import React, { Component } from 'react';
import { ButtonToolbar, DropdownButton, MenuItem, Col, Input, Button, ProgressBar, FormControl } from 'react-bootstrap';
import { observer } from 'mobx-react';
import peerid from 'bittorrent-peerid';
import DevTools from 'mobx-react-devtools';

function toInt(n){ return Math.round(Number(n)); };

function bytesToSize(bytes) {
  var sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (bytes == 0) return '0 byte';
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

function toPerc(n) {
  return `${(n * 100).toFixed(2)}%`
}

@observer
class File extends Component {
  constructor(props) {
    super(props);
    this.download = this.download.bind(this)
    this.setPrio = this.setPrio.bind(this)
  }

  download() {
    this.props.download(this.props.file.id)
  }

  render() {
    const f = this.props.file;
    const prios = Array.from(new Array(6), (_, i) => 
      <MenuItem
        key={i}
        eventKey={i}
        active={f.priority == i ? true : false}
        onSelect={this.setPrio}
      >
        {i}
      </MenuItem>
    )
    return (
      <div>
        <Button bsStyle='link' href={`http://localhost:8412/dl/${f.id}`}>{f.path}</Button>
        {`progress: ${toPerc(f.progress)}`}
        <br />
        <DropdownButton title="Priority" id="dropdown-size-small">
          {prios}
        </DropdownButton>
        <br />
        <br />
      </div>
    );
  }

  setPrio(p) {
    this.props.setPrio(this.props.file.id, p);
  }
}

@observer
class Peer extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const p = this.props.peer;

    return (
      <div>
        {p.client_id ? peerid(p.client_id).client : ''} - {`DL ${bytesToSize(p.rate_down)}/s`} - {`UL ${bytesToSize(p.rate_up)}/s`}
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

    let files = [];
    this.props.app.torrent_files[t.id].forEach(id => {
       peers.push(<File file={this.props.app.resources[id]} key={id} setPrio={this.props.app.setPrio} />);
    });
    return (
      <div>
        <ButtonToolbar>
          {ctrl_btn}
          <Button onClick={this.remove} bsStyle="danger">Remove</Button>
        </ButtonToolbar>
        <br />
        {t.name} - {t.status} - {`DL ${bytesToSize(t.rate_down)}/s`} - {`UL ${bytesToSize(t.rate_up)}/s`}
        <ProgressBar now={t.progress * 100} label={toPerc(t.progress)}/>
        {peers}
        {files}
      </div>
    );
  }
}

@observer
class App extends Component {
  constructor(props) {
    super(props);
    this.addTorrent = this.addTorrent.bind(this);
    this.addMagnet = this.addMagnet.bind(this);
    this.upload = this.upload.bind(this);
    this.handleFile = this.handleFile.bind(this);
    this.magnetChange = this.magnetChange.bind(this);
    this.state = {
      magnet: '',
    };
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
        <ButtonToolbar>
          <Button bsStyle='primary' onClick={this.addTorrent}>
            Add Torrent
          </Button>
          <Button bsStyle='primary' onClick={this.addMagnet}>
            Add Magnet
          </Button>
          <Col xs={8} md={4}>
            <FormControl type="text" value={this.state.magnet} onChange={this.magnetChange} />
          </Col>
        </ButtonToolbar>
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

  magnetChange(ev) {
    this.setState({ magnet: ev.target.value })
  }

  upload(ev) {
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

  addMagnet() {
    this.props.appState.uploadMagnet(this.state.magnet)
  }
};

export default App;

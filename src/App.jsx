import React, { Component } from 'react';
import { Input, Button, ProgressBar } from 'react-bootstrap';
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
class Torrent extends Component {
  render() {
    const t = this.props.torrent;
    return (
      <div>
        {t.name} - {t.status} - {`DL ${bytesToSize(t.rate_down)}/s`} - {`UL ${bytesToSize(t.rate_up)}/s`}
        <ProgressBar now={t.progress * 100} label={`${(t.progress * 100).toFixed(2)}%`}/>
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
      return <Torrent torrent={this.props.appState.resources[id]} key={id} />;
    });
    return (
      <div>
        <Button bsStyle='primary' onClick={this.addTorrent}>
          Add Torrent
        </Button>
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

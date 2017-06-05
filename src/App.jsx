import React, { Component } from 'react';
import { Input, Button, ProgressBar } from 'react-bootstrap';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

function toInt(n){ return Math.round(Number(n)); };

@observer
class Torrent extends Component {
  render() {
    const t = this.props.torrent;
    const perc_done = toInt(100 * t.downloaded/t.size);
    return (
      <div>
        {t.title} : {t.status}
        <ProgressBar now={perc_done} label={`${perc_done}%`}/>
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
    let torrents = this.props.appState.torrents.map((t) => {
      return <Torrent torrent={t} key={t.id} />;
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
    fetch('http://localhost:8412/torrent', { method: 'POST', body: ev.currentTarget.result})
      .then(resp => resp.json())
      .then(success => this.props.appState.getData());
  }

  handleFile(ev) {
    const file = ev.target.files[0];
    const reader = new FileReader();
    reader.onload = this.upload;
    reader.readAsArrayBuffer(file);
    console.log(file);
  }

  addTorrent() {
    document.getElementById('torrent-ul').click();
  }

  removeTorrent() {
  }
};

export default App;

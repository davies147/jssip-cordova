# jssip-cordova

Plugin to run [JsSIP](http://jssip.net) in Cordova.


## Installation

```bash
$ npm install jssip-cordova
```


## Usage

In Node:

```javascript
var JsSIP = require('jssip');
var JsSIPCordovaRTCEngine = require('jssip-cordova');

if (window.cordova) {
    JsSIP.rtcEngine = JsSIPCordovaRTCEngine;
}
```

## Limitations

Currently (development) just outgoing sessions are implemented.


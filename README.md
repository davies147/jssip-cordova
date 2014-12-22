# jssip-cordova

Plugin to run [JsSIP](http://jssip.net) in [Cordova](http://cordova.apache.org).


## Requirements

* Cordova [PhoneRTC](http://phonertc.io/) plugin must be installed into your Cordova project.


## Installation

* Using NPM:

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

var ua = new JsSIP.UA(...);
// etc
```

Also follow the steps in the *PhoneRTC* [documentation](https://github.com/alongubkin/phonertc/wiki).


## API

### `JsSIPCordovaRTCEngine.iceRelayCandidateTimeout = timeout`

Limit the time waiting for new local candidates (ICE gathering) once a relay candidate has been retrieved.

Params:
* *timeout*: Milliseconds.


## Limitations

* Current version (0.1.X) just supports outgoing sessions.


## Changelog

### Version 0.1.2 (2014-12-22)

* Added API `JsSIPCordovaRTCEngine.iceRelayCandidateTimeout = timeout`.

### Version 0.1.0 (2014-11-27)

* Just outgoing sessions.


## Author

Iñaki Baz Castillo.


## License

MIT.

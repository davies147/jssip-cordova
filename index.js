/**
 * Dependencies.
 */
var debug = require('debug')('JsSIP:CordovaRTCEngine');
var debugerror = require('debug')('JsSIP:ERROR:CordovaRTCEngine');


/**
 * Expose the JsSIPCordovaRTCEngine class.
 */
module.exports = JsSIPCordovaRTCEngine;


/**
 * Internal constants.
 */
var C = {
  REGEXP_GOOD_CANDIDATE: new RegExp(/^a=/i),
  REGEXP_RELAY_CANDIDATE: new RegExp(/ relay /i)
};


/**
 * Internal variables.
 */
var VAR = {
  iceRelayCandidateTimeout: null
};


// Defined module properties.
Object.defineProperties(JsSIPCordovaRTCEngine, {
  iceRelayCandidateTimeout: {
    set: function(timeout) {
      VAR.iceRelayCandidateTimeout = timeout;
    }
  }
});


function JsSIPCordovaRTCEngine(session, options) {
  debug('new()');

  options = options || {};

  var turn_server = options.turn_servers;
  var configuration = session.ua.configuration;

  this.session = session;
  this.phonertc = {
    config: {
      streams: { audio:true, video:true },  // Default unless getUserMedia() overrides it.
      turn: null,
      isInitiator: null
    },
    session: null,  // The cordova.plugins.phonertc.Session instance.
    localSDP: null,
    remoteSDP: null
  };
  this.ready = true;
  this.gotIceRelayCandidate = false;
  this.iceRelayCandidateTimer = null;

  // Must use a single TURN server.
  if (! turn_server) {
    turn_server = configuration.turn_servers[0];
  }
  else if (typeof turn_server instanceof Array) {
    turn_server = turn_server[0];
  }

  // Convert WebRTC TURN settings to phonertc TURN settings.
  if (turn_server) {
    this.phonertc.config.turn = {
      host: turn_server.urls instanceof Array ? turn_server.urls[0] : turn_server.urls,
      username: turn_server.username,
      password: turn_server.credential
    };
  }
  else {
    // Phonertc API sucks. This is needed if no TURN is desired.
    this.phonertc.config.turn = {
      host: '',
      username: 'test',
      password: 'test'
    };
  }
}


JsSIPCordovaRTCEngine.prototype.isReady = function() {
  return this.ready;
};


JsSIPCordovaRTCEngine.prototype.getUserMedia = function(onSuccess, onFailure, constraints) {
  debug('getUserMedia() | constraints:', constraints);

  if (!constraints) {
    debugerror('getUserMedia(): bad media constraints');
    onFailure(new Error('JsSIPCordovaRTCEngine.getUserMedia(): bad media constraints'));
    return;
  }

  // Override audio/video flags.
  this.phonertc.config.streams = constraints;

  // Call the success callback giving true as argument (instead of a MediaStream).
  onSuccess(true);
};


JsSIPCordovaRTCEngine.prototype.addStream = function(stream, onSuccess, onFailure) {
  debug('addStream()');

  // Here 'stream' must be true. Really.
  if (stream !== true) {
    debugerror('addStream(): "stream" argument must be true');
    onFailure();
    return;
  }

  onSuccess();
};


/**
 * This method creates a new cordova.Session as initiator.
 */
JsSIPCordovaRTCEngine.prototype.createOffer = function(onSuccess, onFailure) {
  debug('createOffer()');

  var self = this;

  this.ready = false;
  this.phonertc.config.isInitiator = true;

  try {
    this.phonertc.session = new cordova.plugins.phonertc.Session(this.phonertc.config);
  }
  catch(error) {
    debugerror('createOffer(): error creating phonertc.Session instance:', error);
    onFailure(error);
    return;
  }

  debug('config: ', this.phonertc.config);

  this.phonertc.session.on('sendMessage', function(data) {
    debug('phonertc.session.on(sendMessage) | data:', data);

    function onIceDone() {
      self.ready = true;

      if (onSuccess) {
        onSuccess(self.phonertc.localSDP);
      }
      // NOTE: Ensure it is called just once.
      onSuccess = null;
    }

    // Got the SDP offe (ICE candidates missing yet).
    if (data.type === 'offer') {
      self.phonertc.localSDP = data.sdp;
    }

    // Got an ICE candidate.
    else if (data.type === 'candidate') {
      var candidate = data.candidate;

      if (C.REGEXP_RELAY_CANDIDATE.test(candidate) && VAR.iceRelayCandidateTimeout) {
        if (! self.iceRelayCandidateTimer) {
          self.iceRelayCandidateTimer = setTimeout(function() {
            delete self.iceRelayCandidateTimer;
            onIceDone();
          }, VAR.iceRelayCandidateTimeout);
        }
      }

      // Allow old/wrong syntax in Chrome/Firefox.
      if (! C.REGEXP_GOOD_CANDIDATE.test(candidate)) {
        candidate = 'a=' + candidate + '\r\n';
      }

      // m=video before m=audio.
      if (self.phonertc.localSDP.indexOf('m=video') < self.phonertc.localSDP.indexOf('m=audio')) {
        if (data.id === 'video') {
          self.phonertc.localSDP = self.phonertc.localSDP.replace(/m=audio.*/, candidate + '$&');
        }
        else {
          self.phonertc.localSDP += candidate;
        }
      }
      // m=audio before m=video (or no m=video).
      else {
        if(data.id === 'audio') {
          self.phonertc.localSDP = self.phonertc.localSDP.replace(/m=video.*/, candidate + '$&');
        }
        else {
          self.phonertc.localSDP += candidate;
        }
      }
    }

    // ICE gathering ends.
    else if (data.type === 'IceGatheringChange' && data.state === 'COMPLETE') {
      // PhoneRTC fires 'COMPLETE' before all the relay candidates, so wait a bit.
      setTimeout(function() {
        onIceDone();
      }, 100);
    }
  });

  this.phonertc.session.on('answer', function(data) {
    debug('phonertc.session.on(answer) | data:', data);
  });

  this.phonertc.session.on('disconnect', function(data) {
    debug('phonertc.session.on(disconnect) | data:', data);
  });

  // Start the media flow.
  this.phonertc.session.call();
};


JsSIPCordovaRTCEngine.prototype.createAnswer = function() {
  throw new Error('JsSIPCordovaRTCEngine.createAnswer() not implemented yet');
};


JsSIPCordovaRTCEngine.prototype.setRemoteDescription = function(type, body, onSuccess, onFailure) {
  debug('setRemoteDescription()');

  try {
    this.phonertc.session.receiveMessage({type: type, sdp: body});
    debug('setRemoteDescription(): success');
    this.phonertc.remoteSDP = body;
    onSuccess();
  }
  catch(error) {
    debugerror('setRemoteDescription(): error:', error);
    onFailure(error);
  }
};


JsSIPCordovaRTCEngine.prototype.getRemoteDescription = function() {
  debug('getRemoteDescription()');

  // Return "like" a RTCSessionDescription object.
  return { sdp: this.phonertc.remoteSDP };
};


JsSIPCordovaRTCEngine.prototype.getLocalStreams = function() {
  debugerror('getLocalStreams() not feasible');

  return [];
};


JsSIPCordovaRTCEngine.prototype.getRemoteStreams = function() {
  debugerror('getRemoteStreams() not feasible');

  return [];
};


JsSIPCordovaRTCEngine.prototype.close = function() {
  if (! this.phonertc.session) { return; }

  debug('closing phonertc.session');

  clearTimeout(this.iceRelayCandidateTimer);
  delete this.iceRelayCandidateTimer;
  this.ready = false;
  try {
    this.phonertc.session.close();
  }
  catch(error) {
    debugerror('close(): error while closing phonertc.session:', error);
  }
};

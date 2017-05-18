var PALM_DOWN = [0, -1, 0];
var PALM_LEFT = [-1, 0, 0];
var PALM_RIGHT = [1, 0, 0];
var VEL_THRESH = 130;

var GRAB_THRESH = 0.3;
var VOL_RATIO = 0.75;
var SEEK_RATIO = 1.0;

var ASPECT_RATIO = 9/16;
var INIT_WIDTH = window.innerWidth/2;
// var INIT_HEIGHT = 450;


// CHANGE_THRESH: min num frames btwn commands
var FULL_CHANGE_THRESH = 90;
var PLAY_CHANGE_THRESH = 50;
var VOL_CHANGE_THRESH = 100;
var SEEK_CHANGE_THRESH = 100;
var FULL_SINGLE_THRESH = 80;

var FLAT_THRESH = 0.2;
var VERT_THRESH = 0.5;

var Y_CHANGE = 50;
var X_CHANGE = 20;
var CLOSE_ENOUGH_Z = 60;
var X_AXIS_SHIFT = 100;


function timepad(s) {
  var res = s.split(':');
  if (res[1].length < 2) {
    return s + '0';
  }
  return s;

}

function round5(x) {
  return Math.ceil(x/5)*5;
}

function vectorsCloseEnough(v1, v2, thresh) {
  if (v1.length != v2.length) {
    return false;
  }
  for (var i=0; i < v1.length; i++ ) {
    if (Math.abs(v1[i] - v2[i]) > thresh) {
      return false;
    }
  }
  return true;
}

function resetState(gestureStart, state) {
  var newState = false;
  if (gestureStart.state != state) {
    newState = true;
  }
  gestureStart.state = state;
  gestureStart.frames = 0;
  gestureStart.init_pos = null;
  gestureStart.init_left = null;
  gestureStart.init_right = null;
  if (newState) {
    // console.log(gestureStart);
    if (gestureStart.name == 'full_single') {
      console.log(gestureStart);
    }
  }
}

function vectorToString(v) {
  return "[" + v.toString() + "]";
}

window.onload = () => {

  // toggle instructions visibility
  document.getElementById('instButton').addEventListener('click', () => {
    var inst = document.getElementById('instImg');
    if (inst.style.display == 'none') {
      inst.style.display = 'block';
    } else {
      inst.style.display = 'none';
    }
  });


  const player = jwplayer('player');
  document.getElementById('feedback').style.width = INIT_WIDTH - 10;

  function handleFileSelect(evt) {
    var files = evt.target.files;

    // set up video player

    player.setup({
      "file": "videos/"+files[0].name,
      "height": ASPECT_RATIO*INIT_WIDTH,
      "width": INIT_WIDTH,
      "controls":true,
      "controls.position": "bottom"
    });

    document.getElementById('feedback').style.display = 'block';

  }

  document.getElementById('video_input').addEventListener('change', handleFileSelect, false);

  // Leap logic
  var controllerOptions = {enableGestures: true};
  var togglePlayGestureStart = {'name': 'playPause', 'state': 'READY', 'frames': 0, 'frames_thresh': PLAY_CHANGE_THRESH, 'init_pos': null};
  var toggleFullGestureStart = {'name': 'full', 'state': 'READY', 'frames': 0, 'frames_thresh': FULL_CHANGE_THRESH, 'init_left': null, 'init_right': null}; // [state, frames, thresh], where state = READY, STARTED, WAITING
  var volumeGestureStart = {'name': 'volume', 'state':'READY', 'init_pos': null, 'init_vol': 0, 'frames_thresh': VOL_CHANGE_THRESH};
  var seekGestureStart = {'name': 'seek', 'state': 'READY', 'init_pos': null, 'init_time': 0, 'frames_thresh': SEEK_CHANGE_THRESH};

  var toggleFullSingleGestureStart = {'name': 'full_single', 'state': 'READY', 'startFist': true, 'frames': 0, 'frames_thresh': FULL_SINGLE_THRESH}

  var customGestures = [togglePlayGestureStart, toggleFullGestureStart, volumeGestureStart, seekGestureStart];

  var leftHand;
  var rightHand;

  var hands;
  var feedbackString;

  player.on('ready', () => {
    player.setVolume(50);
  });

  Leap.loop(controllerOptions, function(frame) {

    if (player.getState() == 'idle') {
      feedbackString = 'ready';
    } else {
      feedbackString = player.getState();
    }
    // Body of callback function


    // sloppy loop through all gestures
    // if enough time has passed between switching screen size, now ready to switch again.
    if (frame.hands.length === 0) {
      // feedbackString = "ready";
      resetState(togglePlayGestureStart, 'READY');
      resetState(toggleFullGestureStart, 'READY');
      resetState(volumeGestureStart, 'READY');
      resetState(seekGestureStart, 'READY');
      // resetState(toggleFullSingleGestureStart, 'READY');
    }
    customGestures = [togglePlayGestureStart, toggleFullGestureStart, volumeGestureStart, seekGestureStart];

    for (var f=0; f < customGestures.length; f++) {
      var gestureStart = customGestures[f];
      gestureStart.frames += 1 // increment frames
      if (gestureStart.frames >= gestureStart.frames_thresh && gestureStart.state == 'WAITING') {
        // ready to change state
        // customGestures[f][0] = 'READY';
        // customGestures[f][1] = 0;
        resetState(customGestures[f], 'READY');
      }
    }

    togglePlayGestureStart = customGestures[0];
    toggleFullGestureStart = customGestures[1];
    volumeGestureStart = customGestures[2];
    seekGestureStart = customGestures[3];
    // toggleFullSingleGestureStart = customGestures[4];

    // detect pause gesture
    if (frame.hands.length == 1 && frame.hands[0].palmPosition[2] <= CLOSE_ENOUGH_Z) {

      resetState(toggleFullGestureStart, 'READY');
      var hand = frame.hands[0];
      var extendedFingers = 0;
      for (var f = 0; f < hand.fingers.length; f++){
          var finger = hand.fingers[f];
          if(finger.extended) extendedFingers++;
      }

      // seek gesture start
      if (hand.indexFinger.extended && extendedFingers == 1) {
        resetState(volumeGestureStart, 'READY');
        resetState(togglePlayGestureStart, 'READY');
        if (seekGestureStart.state == 'READY') {
          feedbackString = "seeking";

          resetState(seekGestureStart, 'STARTED');
          seekGestureStart.init_pos = hand.palmPosition[0]; // save y position
          seekGestureStart.init_time = player.getPosition();
        }
      }

      // volume gesture start
      else if (hand.pinchStrength >= GRAB_THRESH) {
        resetState(seekGestureStart, 'READY');
        resetState(togglePlayGestureStart, 'READY');

        if (volumeGestureStart.state == 'READY') {
          feedbackString += "adjusting volume";
          resetState(volumeGestureStart, 'STARTED');
          volumeGestureStart.init_pos = hand.palmPosition[1]; // save y position
          volumeGestureStart.init_vol = player.getVolume();

        }

      // play/pause gesture start
      } else {
        resetState(seekGestureStart, 'READY');
        resetState(volumeGestureStart, 'READY');
        if (togglePlayGestureStart.state == 'READY') {

          // if palm is flat-ish, and pause/play toggle is ready
          resetState(togglePlayGestureStart, 'STARTED');
          togglePlayGestureStart.init_pos = hand.palmPosition[1];
        }
      }


      /////// ----------------------------- ////////
      // toggle play logic

      if (togglePlayGestureStart.state == 'STARTED') {
        resetState(seekGestureStart, 'WAITING'); // to avoid transitioning to seeking
        feedbackString = "move hand down to toggle play/pause";
        // detect for y-axis speed
        if (hand.palmVelocity[1] <= -VEL_THRESH && hand.palmPosition[1] - togglePlayGestureStart.init_pos <= -Y_CHANGE) {
          // toggles
          player.play()
          feedbackString = player.getState();
          resetState(togglePlayGestureStart, 'WAITING');
        }
      }
      /////// ----------------------------- ////////
      // adjust volume and seek logic
      if (volumeGestureStart.state == 'STARTED') {
        resetState(seekGestureStart, 'WAITING'); // to avoid transitioning to seeking
        var volChange = VOL_RATIO*(hand.palmPosition[1] - volumeGestureStart.init_pos);
        player.setVolume(round5(Math.max(0, Math.min(100, volumeGestureStart.init_vol + volChange))));
        feedbackString = 'setting volume: ' + round5(Math.max(0, Math.min(100, volumeGestureStart.init_vol + volChange))).toString();

      }
      if (seekGestureStart.state == 'STARTED') {
        resetState(volumeGestureStart, 'WAITING');
        var seekChange = SEEK_RATIO*(hand.palmPosition[0] + X_AXIS_SHIFT);
        var seekTime = Math.min(Math.max(0, seekChange), player.getDuration());
        player.seek(seekTime);
        var seconds = (Math.floor(seekTime % 60)).toString();
        if (seconds.length < 2) {
          seconds = seconds+'0';
        }
        feedbackString = 'seeking to time: ' + (Math.floor(seekTime/60)).toString() +":"+ seconds;
      }

    }

    else if (frame.hands.length == 2 && frame.hands[0].palmPosition[2] <= CLOSE_ENOUGH_Z && frame.hands[1].palmPosition[2] <= CLOSE_ENOUGH_Z) { // only detect for one person
      hands = frame.hands;
      resetState(togglePlayGestureStart, 'READY');
      resetState(volumeGestureStart, 'READY');
      resetState(seekGestureStart, 'READY');

      if (hands[0].palmPosition[0] < hands[1].palmPosition[0]) {
        leftHand = hands[0];
        rightHand = hands[1];
      } else {
        leftHand = hands[1];
        rightHand = hands[0];
      }

      // detect if hands are facing each other palm side
      if (toggleFullGestureStart.state == 'READY') {

        // if ready to change screens, switch to STARTED state
        resetState(toggleFullGestureStart, 'STARTED');

        // detect left and right hands


        toggleFullGestureStart.init_left = leftHand.palmPosition[0];
        toggleFullGestureStart.init_right = rightHand.palmPosition[0];
      }
      // if enough frames have passed or
      if (toggleFullGestureStart.state == 'STARTED') {
        feedbackString = "move out to full screen, move in to small screen";

        // if left and right hands are moving fast enough in certain diretions

        if (
          leftHand.palmVelocity[0] < VEL_THRESH &&
          rightHand.palmVelocity[0] > VEL_THRESH &&
          leftHand.palmPosition[0] - toggleFullGestureStart.init_left <= -X_CHANGE &&
          rightHand.palmPosition[0] - toggleFullGestureStart.init_right >= X_CHANGE
        ) {
          if (player.getWidth() == INIT_WIDTH) {
            player.resize(window.innerWidth-150, ASPECT_RATIO*(window.innerWidth-150));
            document.getElementById('feedback').style.width = window.innerWidth - 150 - 10;
            resetState(toggleFullGestureStart, 'WAITING');
          }
        } else if (
          leftHand.palmVelocity[0] > VEL_THRESH &&
          rightHand.palmVelocity[0] < VEL_THRESH &&
          leftHand.palmPosition[0] - toggleFullGestureStart.init_left >= X_CHANGE &&
          rightHand.palmPosition[0] - toggleFullGestureStart.init_right <= -X_CHANGE
        ) {
          if (player.getWidth() != INIT_WIDTH) {
            player.resize(INIT_WIDTH, ASPECT_RATIO*INIT_WIDTH);
            document.getElementById('feedback').style.width = INIT_WIDTH - 10;
            resetState(toggleFullGestureStart, 'WAITING');
          }
        }

      }

    }
    ///////////////////////
    // debugging
    var handString = "";
    var frameString = "Frame ID: " + frame.id  + "<br />"
                  + "Timestamp: " + frame.timestamp + " &micro;s<br />"
                  + "Hands: " + frame.hands.length + "<br />"
                  + "Fingers: " + frame.fingers.length + "<br />"
                  + "Tools: " + frame.tools.length + "<br />"
                  + "Gestures: " + frame.gestures.length + "<br />";

    if (frame.hands.length > 0) {
      for (var i = 0; i < frame.hands.length; i++) {

        var hand = frame.hands[i];

        handString += "Hand ID: " + hand.id + "<br />";
        handString += "Direction: " + vectorToString(hand.direction, 2) + "<br />";
        handString += "Palm normal: " + vectorToString(hand.palmNormal, 2) + "<br />";
        handString += "Palm position: " + vectorToString(hand.palmPosition) + " mm<br />";
        handString += "Palm velocity: " + vectorToString(hand.palmVelocity) + " mm/s<br />";
        handString += "Sphere center: " + vectorToString(hand.sphereCenter) + " mm<br />";
        handString += "Sphere radius: " + hand.sphereRadius.toFixed(1) + " mm<br />";

        // And so on...
      }
    }
    // uncomment for debug
    // document.getElementById('frame_info').innerHTML = frameString + handString;
    document.getElementById('feedback').innerHTML = feedbackString;
  });
}

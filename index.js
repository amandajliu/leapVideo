// PLAY: palm down, moving upwards
// PAUSE: palm down, moving downwards
// "FULL SCREEN": two hands palms facing, moving apart
// EXIT "FULL SCREEN": two hands palms facing, moving towards

// Issues:
// - pause/play too sensitive, so sometimes switch
var PALM_DOWN = [0, -1, 0];
var PALM_LEFT = [-1, 0, 0];
var PALM_RIGHT = [1, 0, 0];
var VEL_THRESH = 150;

var INIT_WIDTH = 800;
var FULL_CHANGE_THRESH = 80;
var PLAY_CHANGE_THRESH = 50;

var FLAT_THRESH = 0.2;
var VERT_THRESH = 0.5;

var Y_CHANGE = 100;
var X_CHANGE = 100;

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
  if (gestureStart[0] != state) {
    newState = true;
  }
  gestureStart[0] = state;
  gestureStart[1] = 0;
  if (newState) {
    console.log(gestureStart);
  }
}

function vectorToString(v) {
  return "[" + v.toString() + "]";
}

var player = videojs('my-video');

// Leap logic
var controllerOptions = {enableGestures: true};
var togglePlayGestureStart = ['READY', 0, PLAY_CHANGE_THRESH];
var toggleFullGestureStart = ['READY', 0, FULL_CHANGE_THRESH]; // [state, frames, thresh], where state = READY, STARTED, WAITING

var customGestures = [togglePlayGestureStart, toggleFullGestureStart];

Leap.loop(controllerOptions, function(frame) {
  // Body of callback function


  // sloppy loop through all gestures
  // if enough time has passed between switching screen size, now ready to switch again.
  if (frame.hands.length === 0) {
    resetState(togglePlayGestureStart, 'READY');
    resetState(toggleFullGestureStart, 'READY');
  }
  customGestures = [togglePlayGestureStart, toggleFullGestureStart];

  for (var f=0; f < customGestures.length; f++) {
    var gestureStart = customGestures[f];
    gestureStart[1] += 1 // increment frames
    if (gestureStart[1] >= gestureStart[2] && gestureStart[0] == 'WAITING') {
      // ready to change state
      // customGestures[f][0] = 'READY';
      // customGestures[f][1] = 0;
      resetState(customGestures[f], 'READY');
    }
  }

  togglePlayGestureStart = customGestures[0];
  toggleFullGestureStart = customGestures[1];

  // detect pause gesture
  if (frame.hands.length == 1) {
    resetState(toggleFullGestureStart, 'READY');

    var hand = frame.hands[0];
    var isFlat = vectorsCloseEnough(PALM_DOWN, hand.palmNormal, FLAT_THRESH);

    if (isFlat && togglePlayGestureStart[0] == 'READY') {
      // if palm is flat, and pause/play toggle is ready
      togglePlayGestureStart[0] = 'STARTED';
    }
    if (togglePlayGestureStart[0] == 'STARTED') {
      // detect for y-axis speed
      if (hand.palmVelocity[1] <= -VEL_THRESH) {
        // complete pause gesture!
        // pause the video!
        if (!player.paused()) {
          player.pause()
          resetState(togglePlayGestureStart, 'WAITING');
        }

      } else if (hand.palmVelocity[1] >= VEL_THRESH) {
        if (player.paused()) {
          player.play();
          resetState(togglePlayGestureStart, 'WAITING');
        }


      }

    }

  }

  else if (frame.hands.length == 2) { // only detect for one person
    resetState(togglePlayGestureStart, 'READY');

    // find left and right hands

    var leftHand;
    var rightHand;
    for (var i=0; i < frame.hands.length; i++) {
      var hand = frame.hands[i];
      if (hand.type == 'left') {
        leftHand = hand;
      } else {
        rightHand = hand;
      }
    }

    // detect if hands are facing each other palm side
    if (rightHand && leftHand && vectorsCloseEnough(PALM_LEFT, rightHand.palmNormal, VERT_THRESH) && vectorsCloseEnough(PALM_RIGHT, leftHand.palmNormal, VERT_THRESH) && toggleFullGestureStart[0] == 'READY') {

      // if ready to change screens, switch to STARTED state
      resetState(toggleFullGestureStart, 'STARTED');

    }
    // if enough frames have passed or
    if (toggleFullGestureStart[0] == 'STARTED') {
      // if left and right hands are moving fast enough in certain diretions

      if (leftHand.palmVelocity[0] < VEL_THRESH && rightHand.palmVelocity[0] > VEL_THRESH) {
        if (player.width() != window.innerWidth-100) {
          player.width(window.innerWidth-100);
          resetState(toggleFullGestureStart, 'WAITING');
        }
      } else if (leftHand.palmVelocity[0] > VEL_THRESH && rightHand.palmVelocity[0] < VEL_THRESH) {
        if (player.width() != INIT_WIDTH) {
          player.width(INIT_WIDTH);
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

});

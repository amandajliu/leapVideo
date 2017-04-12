// PLAY: palm down, moving upwards
// PAUSE: palm down, moving downwards
var PALM_DOWN = [0, -1, 0];
var NORMAL_THRESH = 0.2;
var VERTICAL_CHANGE = 100;

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

function vectorToString(v) {
  return "[" + v.toString() + "]";
}

var player = videojs('my-video');

// Leap logic
var controllerOptions = {enableGestures: true};
var pauseGestureStart = null; // both play and pause gesture

Leap.loop(controllerOptions, function(frame) {
  // Body of callback function
  var frameString = "Frame ID: " + frame.id  + "<br />"
                + "Timestamp: " + frame.timestamp + " &micro;s<br />"
                + "Hands: " + frame.hands.length + "<br />"
                + "Fingers: " + frame.fingers.length + "<br />"
                + "Tools: " + frame.tools.length + "<br />"
                + "Gestures: " + frame.gestures.length + "<br />";

  // if (frame.gestures.length > 0) {
  //   frame.gestures.forEach(function(gesture){
  //       switch (gesture.type){
  //         case "circle":
  //             console.log("Circle Gesture");
  //             player.play();
  //             break;
  //         case "keyTap":
  //             console.log("Key Tap Gesture");
  //             break;
  //         case "screenTap":
  //             console.log("Screen Tap Gesture");
  //             break;
  //         case "swipe":
  //             console.log("Swipe Gesture");
  //             player.pause();
  //             break;
  //       }
  //   });
  // }

  var handString = "";

  // detect pause gesture
  if (frame.hands.length == 1) {

    var hand = frame.hands[0];
    var isFlat = vectorsCloseEnough(PALM_DOWN, hand.palmNormal, NORMAL_THRESH);

    if (isFlat && !pauseGestureStart) {
      // if palm is flat and pause gesture hasn't started yet
      pauseGestureStart = hand.palmPosition[1]; // vertical axis
    } else if (!isFlat) {
      // if palm is not flat
      pauseGestureStart = null;
    }
    if (pauseGestureStart) {
      // detect for y-axis change from start of pause gesture
      if (pauseGestureStart - hand.palmPosition[1] >= VERTICAL_CHANGE) {
        // complete pause gesture!
        // pause the video!
        player.pause()
        pauseGestureStart = null; // reset pause
      } else if (hand.palmPosition[1] - pauseGestureStart >= VERTICAL_CHANGE) {
        player.play();
        pauseGestureStart = null;
      }

    }

  }

  else if (frame.hands.length == 2) { // only detect for one person
    pauseGestureStart = null;

  }

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

  document.getElementById('frame_info').innerHTML = frameString + handString;

});

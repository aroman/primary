// Copyright 2014 Avi Romanoff <avi at romanoff.me>

// var colors = [
//   {
//     name: "red",
//     hex: "#D0021B",
//     current: levels.red,
//     max: levels.red
//   },
//   {
//     name: "green",
//     hex: "#7ED321",
//     current: levels.green,
//     max: levels.green
//   },
//   {
//     name: "blue",
//     hex: "#4A90E2",
//     current: levels.blue,
//     max: levels.blue
//   }
// ];

// var colorIndex = 0;

// var canvas = $('#pad');
// var ctx = canvas[0].getContext('2d');

// ctx.canvas.width = window.innerWidth * devicePixelRatio;
// ctx.canvas.height = window.innerHeight * devicePixelRatio;
// ctx.lineWidth = 10 * devicePixelRatio;
// ctx.lineCap = "round";
// ctx.strokeStyle = colors[colorIndex].hex;

// var scaleFactor = 60 * (ctx.canvas.width * devicePixelRatio);
// var barWidth = 10 * devicePixelRatio;

// function drawLevels() {
//   ctx.clearRect(0, 0, ctx.canvas.width, barWidth * colors.length);
//   colors.forEach(function (color, i) {
//       ctx.fillStyle = color.hex;
//       ctx.globalAlpha = 0.3;
//       ctx.fillRect(0, i * barWidth, ctx.canvas.width * color.max, barWidth);
//       ctx.globalAlpha = 1;
//       ctx.fillRect(0, i * barWidth, ctx.canvas.width * color.current, barWidth);
//   });
// }

// ctx.fillStyle = "#666";
// var bottomHeight = 40 * devicePixelRatio;
// ctx.fillRect(0, ctx.canvas.height - bottomHeight, ctx.canvas.width, bottomHeight);

// drawLevels();

// // Touch Events handlers
// var draw = {

//   started: false,

//   start: function(event) {
//     if (event.originalEvent.touches.length == 3) {
//       for (var i = colors.length - 1; i >= 0; i--) {
//         colors[i].current = 100;
//       };
//       drawLevels();
//     }
//     else if (event.originalEvent.touches.length == 4) {
//       socket.send(JSON.stringify({type: "clear"}));
//       ctx.clearRect(0, 0, canvas.width() * devicePixelRatio, canvas.height() * devicePixelRatio);
//       drawLevels();
//     }
//     else if (event.originalEvent.touches.length == 2) {
//       colorIndex += 1;
//       if (colorIndex >= colors.length) {
//         colorIndex = 0;
//       }
//       ctx.strokeStyle = colors[colorIndex].hex;
//     } else {
//       this.distance = 0;
//       ctx.beginPath();
//       var x = event.originalEvent.touches[0].pageX * devicePixelRatio;
//       var y = (event.originalEvent.touches[0].pageY - $("body").scrollTop()) * devicePixelRatio;
//       ctx.moveTo(x, y);
//       this.started = true;
//       socket.send(JSON.stringify({
//         type: 'start',
//         color: ctx.strokeStyle,
//         x: x,
//         y: y
//       }));
//     }
//   },

//   move: function(event) {
//     if (!this.started) return;
//     if (colors[colorIndex].current < 0) return;
//     var x = event.originalEvent.touches[0].pageX * devicePixelRatio;
//     var y = (event.originalEvent.touches[0].pageY - $("body").scrollTop()) * devicePixelRatio;
//     // Euclidean distance * area of circle (point)
//     if (this.prevX) {
//       var newDistance = Math.sqrt(
//         Math.pow(this.prevY - y, 2)
//         +
//         Math.pow(this.prevX - x, 2)
//       ) * Math.PI * ctx.lineWidth;
//       colors[colorIndex].current -= (newDistance / scaleFactor); 
//     }
//     this.prevX = x;
//     this.prevY = y;
//     ctx.lineTo(x, y);
//     ctx.stroke();
//     drawLevels();
//     socket.send(JSON.stringify({
//       type: 'move',
//       x: x,
//       y: y
//     }));
//   },

//   end: function(event) {
//     this.started = false;
//     this.prevX = this.prevY = null;
//   }

// };

// // Connect websocket
// var host = location.origin.replace(/^http/, 'ws')
// var socket = new WebSocket(host + "/socket/player");

// // Touch events
// canvas.on('touchstart', draw.start);
// canvas.on('touchend', draw.end);
// canvas.on('touchmove', draw.move);

// var canvas = $('#pad');
// var ctx = canvas[0].getContext('2d');
// function handleOrientation() {

//   ctx.font="40px Helvetica";
//   ctx.fillStyle = "white"; 
//   ctx.fillText("orientation: " + window.orientation, 30, ctx.canvas.height - 30);
//   if (window.orientation == 0) {
//     $("#main-msg").show();
//     $("#pad").hide();
//   } else {
//     $("#main-msg").hide();
//     !scream.isMinimalView() && $("#pad").show();
//   }
// }

// $(window).on('orientationchange', handleOrientation);

// handleOrientation();

// // Disable Page Move
// $('body').on('touchmove', function(event) {
//   if (scream.isMinimalView()) {
//     event.preventDefault();
//   }
// });

var PadView = Backbone.View.extend({

  el: $("#board"),

  events: {

  },

  initialize: function() {
    // Connect websocket
    var host = location.origin.replace(/^http/, 'ws')
    this.socket = new WebSocket(host + "/socket/player");
    this.updateStatus("connecting...");

    // Bind socket events
    this.socket.onclose = this.onSocketClosed.bind(this);
    this.socket.onopen = this.onSocketOpened.bind(this);
    this.socket.onmessage = this.onSocketMessage.bind(this);

    var width = window.innerWidth * devicePixelRatio;
    var height = window.innerHeight * devicePixelRatio;
    this.world = Physics();
    this.renderer = Physics.renderer('canvas', {
      el: "pad",
      width: width,
      height: height,
      styles: {
        'rectangle': {
          fillStyle: "#fff"
        }
      }
    });
    this.world.add(this.renderer);
    var bounds = Physics.aabb(0, 0, width, height);
    var edgeBounce = Physics.behavior('edge-collision-detection', {
        aabb: bounds,
        restitution: 0.1
    });
    this.world.add(edgeBounce);

    this.world.on('step', this.onStep.bind(this));
    Physics.util.ticker.on(this.onTick.bind(this));

    // start the ticker
    Physics.util.ticker.start();

    // Set up canvas    
    var canvas = this.world.renderer().el;
    // var ctx = canvas[0].getContext('2d');

    canvas.ontouchstart = this.onTouchStart.bind(this);
    canvas.ontouchmove = this.onTouchMove.bind(this);
    canvas.ontouchend = this.onTouchEnd.bind(this);

    $(canvas).on('mousedown', this.onMouseDown.bind(this));
    $(canvas).on('mousemove', this.onMouseMove.bind(this));
    $(canvas).on('mouseup', this.onMouseUp.bind(this));
  },

  onTick: function(time, dt) {
    this.world.step(time);
  },

  onStep: function() {
    this.world.render();
  },

  onMouseDown: function(event) {
    this.prevX = event.clientX * devicePixelRatio;
    this.prevY = (event.clientY - $("body").scrollTop()) * devicePixelRatio;
    this.started = true;
  },

  onMouseMove: function(event) {
    if (!this.started) return;
    var x = event.clientX * devicePixelRatio;
    var y = (event.clientY - $("body").scrollTop()) * devicePixelRatio;

    var distance = Math.sqrt(Math.pow((this.prevX - x), 2) + Math.pow((this.prevY - y), 2));
    var path = Physics.body('rectangle', {
      x: (this.prevX + x) / 2,
      y: (this.prevY + y) / 2,
      width: distance + devicePixelRatio,
      height: 10
    });

    var adjacent = this.prevX - x;
    if (y > this.prevY) {
      adjacent = -adjacent;
    }
    path.state.angular.pos = Math.acos(adjacent / distance);
    this.world.add(path);
    this.sendMessage({
      type: 'path',
      start: {
        x: this.prevX,
        y: this.prevY
      },
      end: {
        x: x,
        y: y
      },
      color: "green"
    });
    this.prevX = x;
    this.prevY = y;
  },

  onMouseUp: function(event) {
    this.started = false;
  },

  onTouchStart: function(event) {
    if (event.touches.length > 1) {
      return alert("multitouch not supported yet");
    }
    var touch = event.touches[0];
    var x = touch.clientX * devicePixelRatio;
    var y = (touch.clientY - $("body").scrollTop()) * devicePixelRatio;
    var square = Physics.body('rectangle', {
      x: x,
      y: y,
      width: 50,
      height: 50
    });
    this.world.add(square);
  },

  onTouchMove: function() {
    
  },
 
  onTouchEnd: function() {
   
  },

  // drawLevels: function () {
  //   ctx.clearRect(0, 0, ctx.canvas.width, barWidth * colors.length);
  //   colors.forEach(function (color, i) {
  //       ctx.fillStyle = color.hex;
  //       ctx.globalAlpha = 0.3;
  //       ctx.fillRect(0, i * barWidth, ctx.canvas.width * color.max, barWidth);
  //       ctx.globalAlpha = 1;
  //       ctx.fillRect(0, i * barWidth, ctx.canvas.width * color.current, barWidth);
  //   });
  // },

  sendMessage: function(message) {
    console.log("Sending message:", message);
    this.socket.send(JSON.stringify(message));
  },

  onSocketOpened: function() {
    // this.updateStatus("connected :)");
  },

  onSocketClosed: function() {
    // this.updateStatus("disconnected :(");
  },

  onSocketMessage: function(event) {
    console.log("socket message recieved!", event);
  },

  updateStatus: function(status) {
    // this.$("h1").text(status);
  },

});

window.view = new PadView();
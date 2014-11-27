// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var colorMap = {
  red: "#D0021B",
  green: "#7ED321",
  blue: "#4A90E2",
};

var colors = [
    '#b58900',
    '#cb4b16',
    '#dc322f',
    '#d33682',
    '#6c71c4',
    '#268bd2',
    '#2aa198',
    '#859900'
];

var MAX_BARRIER_WIDTH = 50 * devicePixelRatio;

Physics.body('barrier', 'rectangle', function(parent) {
  return {
    init: function(options) {
      options.styles = {
        fillStyle: colors[Math.floor(Math.random() * colors.length)]
      };
      options.treatment = 'static';
      parent.init.call(this, options);
    }
  };
});

var BoardView = Backbone.View.extend({

  el: $("#container"),

  events: {

  },

  initialize: function() {
    // Connect websocket
    var host = location.origin.replace(/^http/, 'ws')
    this.socket = new WebSocket(host + "/socket/board");
    this.updateStatus("connecting...");

    // Bind socket events
    this.socket.onclose = this.onSocketClosed.bind(this);
    this.socket.onopen = this.onSocketOpened.bind(this);
    this.socket.onmessage = this.onSocketMessage.bind(this);

    // Set up physics stuff
    var width = window.innerWidth * devicePixelRatio;
    var height = window.innerHeight * devicePixelRatio;
    // $("#board")[0].width = window.innerWidth * 2;
    // $("#board")[0].height = window.innerHeight * 2;
    this.world = Physics();
    this.renderer = Physics.renderer('canvas', {
      el: "board",
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
        restitution: 1
    });
    this.world.add(edgeBounce);
    this.world.add(Physics.behavior('body-impulse-response'));
    this.world.add(Physics.behavior('body-collision-detection'));
    this.world.add(Physics.behavior('sweep-prune'));

    // Test object
    var square = Physics.body('circle', {
      x: 250,
      y: 250,
      vy: -0.25,
      radius: 50
    });
    this.world.add(square);

    this.world.on('step', this.onStep.bind(this));
    Physics.util.ticker.on(this.onTick.bind(this));

    // start the ticker
    Physics.util.ticker.start();
  },

  clearBoard: function() {
    alert("Not implemented!");
  },

  onTick: function(time, dt) {
    this.world.step(time);
  },

  onStep: function() {
    this.world.render();
  },

  sendMessage: function(message) {
    console.log("Sending message:", message);
    this.socket.send(message);
  },

  onSocketOpened: function() {
    this.updateStatus("connected :)");
  },

  onSocketClosed: function() {
    this.updateStatus("disconnected :(");
  },

  onSocketMessage: function(event) {
    var msg = JSON.parse(event.data);
    if (msg.type == "path") {
      this.createBarrier(msg.start, msg.end, msg.color);
    }
  },

  // start -> {x: Number, y: Number}
  // end -> {x: Number, y: Number}
  // color -> String
  createBarrier: function(start, end, color) {
    var distance = Math.sqrt(
      Math.pow((start.x - end.x), 2)
      +
      Math.pow((start.y - end.y), 2)
    );

    // If the barrier is too big, split it into 
    // two, recursively
    if (distance > MAX_BARRIER_WIDTH) {
      var midPoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      }
      this.createBarrier(start, midPoint, color);
      this.createBarrier(midPoint, end, color);
      return;
    }

    // Create static body
    var path = Physics.body('barrier', {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
      width: distance + devicePixelRatio,
      height: 10
    });

    // Rotate it
    var adjacent = start.x - end.x;
    if (end.y > start.y) {
      adjacent = -adjacent;
    }
    path.state.angular.pos = Math.acos(adjacent / distance);

    // Add it to the world
    this.world.add(path);
  },

  updateStatus: function(status) {
    this.$("h1").text(status);
  },

});

window.board = new BoardView();
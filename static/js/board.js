// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var colorMap = {
  red: 0xD0021B,
  green: 0x7ED321,
  blue: 0x4A90E2,
};

var colors = [
    0xb58900,
    0xcb4b16,
    0xdc322f,
    0xd33682,
    0x6c71c4,
    0x268bd2,
    0x2aa198,
    0x859900
];

var MAX_BARRIER_WIDTH = 50 * devicePixelRatio;

Physics.body('barrier', 'rectangle', function(parent) {
  return {
    init: function(options) {
      options.styles = {
        fillStyle: colorMap[options.color]
      };
      options.treatment = 'static';
      parent.init.call(this, options);
    }
  };
});

Physics.body('ball', 'circle', function(parent) {
  return {
    init: function(options) {
      options.styles = {
        fillStyle: colorMap[options.color]
      };
      options.radius = 7.5 * devicePixelRatio;
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
    // this.renderer = Physics.renderer('canvas', {
    //   el: "board",
    //   width: width,
    //   height: height
    // });
    this.renderer = Physics.renderer('pixi', {
      el: "container",
      width: width,
      height: height,
      styles: {
        'circle': {
            lineWidth: 3
          },
        'rectangle': {
            lineWidth: 3
          }
        },
    });
    this.world.add(this.renderer);
    var bounds = Physics.aabb(0, 0, width, height);
    var edgeBounce = Physics.behavior('edge-collision-detection', {
        aabb: bounds,
        restitution: 1.00001
    });
    this.world.add(edgeBounce);
    this.world.add(Physics.behavior('body-impulse-response', {
      check: 'collisions:desired'
    }));
    this.world.add(Physics.behavior('body-collision-detection'));
    this.world.add(Physics.behavior('sweep-prune'));

    ["green", "red","green","red","green","red","green","red","green","red","green","red","green","red","green","red","green","red","green","red","green", "red", "blue"].forEach(function (color) {
      var ball = Physics.body('ball', {
        x: width * Math.random(),
        y: height * Math.random(),
        vy: 1 * Math.random(),
        vx: -1 * Math.random(),
        color: color
      });
      this.world.add(ball);
    }, this);

    this.world.on('collisions:detected', this.onCollisions.bind(this));
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

  onCollisions: function(data) {
    
    data.collisions.forEach(potentialCollision, this);

    function emitCollision(collision) {
      this.world.emit("collisions:desired", {collisions: [collision]});
    }

    function potentialCollision(collision) {

      // We hit a screen boundary
      if (!_.has(collision.bodyB, "color")) {
        emitCollision.call(this, collision);
        return;
      }

      // We hit another ball
      if (collision.bodyB.treatment === "dynamic" &&
          collision.bodyA.treatment === "dynamic") {
        return;
      }

      // Figure out which one is the ball and
      // which one is the wall.
      var ball, wall;
      if (collision.bodyA.treatment === "static") {
        ball = collision.bodyB;
        wall = collision.bodyA;
      } else {
        ball = collision.bodyA;
        wall = collision.bodyB;
      }

      // Break wall
      if ((ball.color === 'red' && wall.color === 'green') ||
          (ball.color === 'green' && wall.color === 'blue') ||
          (ball.color === 'blue' && wall.color === 'red')) {
            this.world.remove(wall);
            this.world.remove(ball);
      }
      // Pass through
      else if (ball.color === wall.color) {
        console.log("Pass through!");
      }
      // Bounce
      else {
        emitCollision.call(this, collision);
      }
    }
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
      height: 10,
      color: 'blue'
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
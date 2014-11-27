// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var colorMap = {
  red: "#D0021B",
  green: "#7ED321",
  blue: "#4A90E2",
};

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
    var width = window.innerWidth ;
    var height = window.innerHeight;
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
    $("#board")[0].width = window.innerWidth;
    $("#board")[0].height = window.innerHeight;
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
    this.world.add(Physics.behavior('interactive', {el: this.renderer.el}));


    this.world.on('interact:grab', function( data ){
      console.log(data);
      data.x; // the x coord
      data.y; // the y coord
      data.body; // the body that was grabbed (if applicable)
      return false;
    });

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
      console.log(msg);
      var distance = Math.sqrt(
        Math.pow((msg.start.x - msg.end.x), 2)
        +
        Math.pow((msg.start.y - msg.end.y), 2)
      );
      var path = Physics.body('rectangle', {
        x: (msg.start.x + msg.end.x) / 2,
        y: (msg.start.y + msg.end.y) / 2,
        width: distance + devicePixelRatio,
        height: 10,
        treatment: 'static',
      });

      // Rotate it
      var adjacent = msg.start.x - msg.end.x;
      if (msg.end.y > msg.start.y) {
        adjacent = -adjacent;
      }
      path.state.angular.pos = Math.acos(adjacent / distance);

      this.world.add(path);
    }
  },

  updateStatus: function(status) {
    this.$("h1").text(status);
  },

});

window.board = new BoardView();
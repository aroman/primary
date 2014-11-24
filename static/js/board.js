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

var BoardView = Backbone.View.extend({

  el: $("#board"),

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

    // Set up canvas    
    this.canvas = this.$('canvas');
    this.ctx = this.canvas[0].getContext('2d');

    this.ctx.canvas.width = window.innerWidth * devicePixelRatio;
    this.ctx.canvas.height = window.innerHeight * devicePixelRatio;
    this.ctx.lineWidth = 10 * devicePixelRatio;
    this.ctx.lineCap = "round";
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
    var msg = JSON.parse(event.data).move;
    console.log(msg);
    this.ctx.strokeStyle = "#D0021B";
    this.ctx.beginPath();
    this.ctx.moveTo(msg.start.x, msg.start.y);
    this.ctx.lineTo(msg.end.x, msg.end.y);
    this.ctx.stroke();
  },

  updateStatus: function(status) {
    this.$("h1").text(status);
  },

});

new BoardView();
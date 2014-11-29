// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var BaseView = Backbone.View.extend({

  el: $("#container"),

  initialize: function() {
    // Connect websocket
    var host = location.origin.replace(/^http/, 'ws')
    this.socket = new ReconnectingWebSocket(host + this.socketPath);
    this.updateStatus("connecting...");

    // Bind socket events
    this.socket.onclose = this.onSocketClosed.bind(this);
    this.socket.onopen = this.onSocketOpened.bind(this);
    this.socket.onmessage = this._onSocketMessage.bind(this);
  },

  updateStatus: function(status) {
    this.$("#status").text(status);
  },

  sendMessage: function(message) {
    console.log("Sending message:", message);
    this.socket.send(JSON.stringify(message));
  },

  onSocketOpened: function() {
    this.updateStatus("connected");
  },

  onSocketClosed: function() {
    this.updateStatus("disconnected");
  },

  _onSocketMessage: function() {
    var message = JSON.parse(event.data);
    console.log("socket message recieved!", message);
    this.onSocketMessage(message);
  }

});
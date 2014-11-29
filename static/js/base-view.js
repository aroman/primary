// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var BaseView = Backbone.View.extend({

  el: $("#container"),

  initialize: function() {
    // Connect websocket
    var host = location.origin.replace(/^http/, 'ws')
    this.socket = new WebSocket(host + this.socketPath);
    this.updateStatus("connecting...");

    // Bind socket events
    this.socket.onclose = this._onSocketClosed.bind(this);
    this.socket.onopen = this._onSocketOpened.bind(this);
    this.socket.onmessage = this._onSocketMessage.bind(this);
  },

  updateStatus: function(status) {
    window.document.title = "PRIMARY [" + status + "]"; 
    this.$("#status").text(status);
  },

  sendMessage: function(message) {
    console.log("[ws] message sent:", message);
    this.socket.send(JSON.stringify(message));
  },

  _onSocketOpened: function() {
    this.updateStatus("connected");
    this.onSocketOpened && this.onSocketOpened();
  },

  _onSocketClosed: function() {
    this.updateStatus("disconnected");
    this.onSocketClosed && this.onSocketClosed();
  },

  _onSocketMessage: function() {
    var message = JSON.parse(event.data);
    console.log("[ws] message recieved:", message);
    this.onSocketMessage && this.onSocketMessage(message);
  }

});
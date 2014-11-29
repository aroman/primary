// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var colorMap = {
  red: "#D0021B",
  green: "#7ED321",
  blue: "#4A90E2",
};

var colorMap = {
  red: 0xD0021B,
  green: 0x7ED321,
  blue: 0x4A90E2,
};

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

var PadView = BaseView.extend({

  initialize: function() {
    this.socketPath = "/socket/player";
    BaseView.prototype.initialize.call(this);

    var width = window.innerWidth * devicePixelRatio;
    var height = window.innerHeight * devicePixelRatio;
    this.world = Physics();
    this.renderer = Physics.renderer('pixi', {
      el: "container",
      width: width,
      height: height
    });
    // this.renderer = Physics.renderer('canvas', {
    //   el: "pad",
    //   width: width,
    //   height: height
    // });
    this.world.add(this.renderer);
    var bounds = Physics.aabb(0, 0, width, height);
    var edgeBounce = Physics.behavior('edge-collision-detection', {
      aabb: Physics.aabb(0, 0, width, height)
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
    this.runningDistance += distance;
    if (this.runningDistance < 500) return;
    this.runningDistance = 0;
    var path = Physics.body('barrier', {
      x: (this.prevX + x) / 2,
      y: (this.prevY + y) / 2,
      width: distance + devicePixelRatio,
      height: 10,
      color: 'blue'
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
    this.onMouseDown(touch);
  },

  onTouchMove: function() {
    if (event.touches.length > 1) {
      return alert("multitouch not supported yet");
    }
    var touch = event.touches[0];
    this.onMouseMove(touch);
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

  onSocketMessage: function(message) {

  }

});

window.view = new PadView();
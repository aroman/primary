// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var Engine = {

  colors: {
    red: 0xD0021B,
    green: 0x7ED321,
    blue: 0x4A90E2,
  },

  COLORIZE_ROUNDS: 2, // <scalar>
  ROUND_SECONDS: 50, // seconds
  WALL_COST: 3, // color points 
  BALL_COST: 3, // color points
  BALL_POINTS: 10, // player score points
  MIDWAY_HEIGHT: 20, // pixels
  REGEN_DELAY: 1000, // milliseconds
  REGEN_INCREMENT: 0.75, // color points
  HEARTBEAT_INTERVAL: 15000, // milliseconds
  BALL_VELOCITY_SCALE_DIVISOR: 500, // dividend is pixels
  MAX_WALL_WIDTH: 50 * devicePixelRatio, // pixels
  MIN_WALL_WIDTH: 400 * devicePixelRatio // pixels

};

if (_.has(window, 'Physics')) {

  Physics.body('wall', 'rectangle', function(parent) {
    return {
      init: function(options) {
        options.styles = {
          fillStyle: Engine.colors[options.color],
          strokeStyle: 0x000,
          lineWidth: 3
        };
        options.height = 10;
        options.treatment = 'static';
        parent.init.call(this, options);
      }
    };
  });

  Physics.body('ball', 'circle', function(parent) {
    return {
      init: function(options) {
        options.styles = {
          fillStyle: Engine.colors[options.color]
        };
        options.radius = 10 * devicePixelRatio;
        parent.init.call(this, options);
      }
    };
  });

}
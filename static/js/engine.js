// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var Engine = {

  colors: {
    red: 0xD0021B,
    green: 0x7ED321,
    blue: 0x4A90E2,
  },

  ROUNDS: 2,
  WALL_COST: 3,
  BALL_COST: 3,
  MIDWAY_HEIGHT: 20,
  REGEN_DELAY: 1000,
  REGEN_INCREMENT: 0.5,
  MAX_WALL_WIDTH: 50 * devicePixelRatio,
  MIN_WALL_WIDTH: 400 * devicePixelRatio

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
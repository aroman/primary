var Engine = {

  colors: {
    red: 0xD0021B,
    green: 0x7ED321,
    blue: 0x4A90E2,
  },

  MAX_BARRIER_WIDTH: 50 * devicePixelRatio

};

Physics.body('barrier', 'rectangle', function(parent) {
  return {
    init: function(options) {
      options.styles = {
        fillStyle: Engine.colors[options.color],
        strokeStyle: 0x0,
        lineWidth: 3
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
        fillStyle: Engine.colors[options.color]
      };
      options.radius = 10 * devicePixelRatio;
      parent.init.call(this, options);
    }
  };
});
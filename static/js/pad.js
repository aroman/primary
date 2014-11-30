// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var ROUNDS = 1;
var WALL_COST = 4;
var BALL_COST = 5;
var REGEN_INCREMENT = 1;
var REGEN_DELAY = 2000;
var MIN_WALL_WIDTH = 400 * devicePixelRatio;

var PhotoModel = Backbone.Model.extend({

});

var PhotoView = Backbone.View.extend({

  className: "pure-u-1-2 photo",

  events: {
    "click .original": "select",
  },

  initialize: function(options) {
    this.template = Hogan.compile($("#photo-template").html());
    this.render();
  },

  select: function() {
    this.$(".original").hide();
    this.$(".colorized").show();
    window.view.addLevels(this.model.get('levels'));
    if (window.view.levels.red.values.length < (ROUNDS + 1)) {
      window.view.getImages();
    } else {
      window.view.startGame();
    }

    // Prevent other PhotoView's events from delegating,
    // thereby preventing the user from tapping the other
    // image after he's already tapped this one
    var me = this;
    window.view.views.forEach(function(brother) {
      if (brother !== me) {
        brother.undelegateEvents();
      }
    })
  },

  render: function() {
    $("#levels").fadeIn('slow');
    var context = this.model.toJSON();
    var html = this.template.render(context);
    this.$el.html(html);
    return this;
  }

});

var ColorizeView = BaseView.extend({

  events: {
    "click #next-slide": "nextSlide",
    "click #skip-intro": "skipIntro",
    "click #watch-intro": "watchIntro",
  },

  initialize: function() {
    this.socketPath = "/socket/pad";
    BaseView.prototype.initialize.call(this);

    // Yeah, yeah, we're storing the levels
    // on the client. Deal with it.
    this.resetLevels();
    this.views = [];
    this.currentColor = "red";

    var pad = $("#pad");
    pad.on("mousedown", this.onMouseDown.bind(this));
    pad.on("mousemove", this.onMouseMove.bind(this));
    pad.on("mouseup", this.onMouseUp.bind(this));
    pad.on("touchstart", this.onTouchStart.bind(this));
    pad.on("touchmove", this.onTouchMove.bind(this));
    pad.on("touchend", this.onTouchEnd.bind(this));

    setInterval(
      this.regenerateColors.bind(this),
      REGEN_DELAY
    );
  },

  onTick: function(time, dt) {
    this.world.step(time);
  },

  onStep: function() {
    this.world.render();
  },

  regenerateColors: function() {
    var changed = false;
    _.each(_.keys(this.levels), function(color) {
      var level = this.levels[color];
      if (level.current < level.max) {
        var scaleFactor = 1 + (level.current / 100);
        level.current += REGEN_INCREMENT * scaleFactor;
        changed = true;
      }
    }, this);
    if (changed) {
      this.renderLevels();
    }
  },

  onMouseDown: function(event) {
    // Unwrap jQuery event
    if ('originalEvent' in event) {
      var event = event.originalEvent;
    }
    this.prevX = event.clientX * devicePixelRatio;
    this.prevY = (event.clientY - $("body").scrollTop()) * devicePixelRatio;
    this.dragStarted = true;
  },

  onMouseMove: function(event) {
    // Unwrap jQuery event
    if ('originalEvent' in event) {
      var event = event.originalEvent;
    }
    if (!this.dragStarted) return;
    if (this.levels[this.currentColor].current < WALL_COST) return;
    var x = event.clientX * devicePixelRatio;
    var y = (event.clientY - $("body").scrollTop()) * devicePixelRatio;

    var distance = Math.sqrt(Math.pow((this.prevX - x), 2) + Math.pow((this.prevY - y), 2));
    this.runningDistance += distance;
    if (this.runningDistance < MIN_WALL_WIDTH) return;
    this.levels[this.currentColor].current -= WALL_COST;
    this.runningDistance = 0;
    this.sendMessage({
      type: 'wall',
      screen: {
        width: window.innerWidth * devicePixelRatio,
        height: window.innerHeight * devicePixelRatio
      },
      start: {
        x: this.prevX,
        y: this.prevY
      },
      end: {
        x: x,
        y: y
      },
      color: this.currentColor
    });
    this.prevX = x;
    this.prevY = y;
    this.renderLevels();
  },

  onMouseUp: function(event) {
    this.dragStarted = false;
  },

  onTouchStart: function(event) {
    event.preventDefault();
    var event = event.originalEvent;
    if (event.touches.length == 1) {
      this.onMouseDown(event.touches[0]);
    }
  },

  onTouchMove: function(event) {
    event.preventDefault();
    var event = event.originalEvent;
    if (event.touches.length === 1) {
      this.onMouseMove(event.touches[0]);
    }
    else if (event.touches.length === 2) {
      this.sendMessage({
        type: 'ball',
        screen: {
          width: window.innerWidth * devicePixelRatio,
          height: window.innerHeight * devicePixelRatio
        },
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        vx: -1,
        vy: 0,
        color: this.currentColor
      });
    }
    else {
      alert("gesture unsupported");
    }
  },

  onTouchEnd: function(event) {
    var event = event.originalEvent;
    if (event.touches.length > 1) {
      alert("Multitouch not implemented");
    }
    this.onMouseUp(event.touches[0]);
  },

  resetLevels: function() {
    this.levels = {
      red: {
        max: null,
        current: null,
        values: [100 / 3]
      },
      green: {
        max: null,
        current: null,
        values: [100 / 3]
      },
      blue: {
        max: null,
        current: null,
        values: [100 / 3]
      }
    };
    this.renderLevels();
  },

  addLevels: function(colorValueMap) {
    _.each(colorValueMap, function(value, color) {
      var level = this.levels[color]; 
      level.values.push(value);
      var sum = level.values.reduce(function(memo, value) {
        return memo + value
      }, 0);
      level.max = level.current = Math.round(sum / level.values.length);
    }, this);
    this.renderLevels();
  },

  renderLevels: function() {
    _.each(this.levels, function(data, color) {
      if (_.isNull(data.current)) {
        this.setLevelToValue(color, data.values[0]);
      } else {
        this.setLevelToValue(color,data.current);
      }
    }, this);
  },

  setLevelToValue: function(color, value) {
    value = Math.round(value);
    // In case it's not already visible
    var progress = this.$(".progress." + color);
    progress.find(".percent").text(value + "%");
    // Finish the existing animations queue
    progress.find(".percent").finish();
    progress.find(".bar").finish();
    // If the value is small enough, show the
    // label next to the bar, and in inside it
    if (value <= 9) {
      progress.find(".percent").css("color", "white");
      progress.find(".percent").animate({
        left: (value + 1) + "%"
      });
    } else {
      // Minor adjustment to prevent text from
      // being cut off by screen's right edge
      var adjustment = (value == 100) ? 8 : 7;
      progress.find(".percent").css("color", "#2D2D2D");
      progress.find(".percent").animate({
        left: (value - adjustment) + "%"
      });
    }
    progress.find(".bar").animate({
      width: value + "%"
    });
  },

  getImages: function() {
    this.sendMessage({type: "getImages"});
  },

  startGame: function() {
    this.sendMessage({type: "startGame"});
  },

  onSocketMessage: function(message) {
    if ("images" in message) {
      var that = this;
      // remove any previous views we might have
      this.views.forEach(function(view) {
        view.remove();
      });
      this.$("#compare").empty();
      // create new views
      this.views = [
        new PhotoView({
          model: new PhotoModel(message.images[0]),
        }),
        new PhotoView({
          model: new PhotoModel(message.images[1])
        })
      ];
      // insert new views into the DOM
      this.views.forEach(function(view) {
        this.$("#compare").append(view.$el);
      });
    }

    else if (message.type == "stateChange") {

      switch (message.state) {

        case "wait_for_pair":
          $("#pad").fadeOut('slow');
          $("#compare").fadeOut("slow");
          $("#skip-intro").fadeOut("slow");
          $("#watch-intro").fadeOut("slow");
          $("#levels").fadeOut("slow");

          $("#wait-for-opponent").fadeIn("slow");
          this.resetLevels();
          break;

        case "ask_for_intro":
          $("#pad").fadeOut('slow');
          $("#wait-for-opponent").fadeOut("slow");
          $("#compare").fadeOut("slow");

          $("#skip-intro").fadeIn("slow");
          $("#watch-intro").fadeIn("slow");
          break;

        case "in_colorize":
          $("#wait-for-opponent").fadeOut("slow");
          $("#skip-intro").fadeOut("slow");
          $("#watch-intro, #skip-intro, #wait-for-opponent").fadeOut("slow", function () {
            $("#compare").fadeIn("slow");
          });
          break;

        case "in_intro":
          $("#pad").fadeOut('slow');
          $("#wait-for-opponent").fadeOut("slow");
          $("#skip-intro").fadeOut("slow");
          $("#watch-intro").fadeOut("slow", function() {
            $("#next-slide").fadeOut("slow");
          });
          break;

        case "wait_for_slide":
          $("#pad").fadeOut('slow');
          $("#next-slide").fadeIn("slow");
          break;

        case "in_game":
          $("#container").children().not("#levels").fadeOut('slow', function () {
            $("#pad").fadeIn('slow');
          });
          break;

      }

      this.updateStatus(message.state);
    }
  },

  nextSlide: function() {
    this.sendMessage({type: "nextSlide"});
  },

  skipIntro: function() {
    this.$("#skip-intro").fadeOut("slow");
    var that = this;
    this.$("#watch-intro").fadeOut("slow", function() {
      that.$("#compare").fadeIn("slow");
    });
    this.sendMessage({type: "skipIntro"});
  },

  watchIntro: function() {
    this.sendMessage({type: "watchIntro"});
  }

});

window.view = new ColorizeView();
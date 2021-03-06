// Copyright 2014 Avi Romanoff <avi at romanoff.me>

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
    if (window.view.levels.red.values.length < (Engine.COLORIZE_ROUNDS + 1)) {
      window.view.getImages();
    } else {
      // Give the user a bit to see the final colorization
      // results before starting the round!
      _.delay(_.bind(window.view.finishColorize, window.view), 1500);
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
    "click #action": "onAction",
  },

  initialize: function() {
    this.socketPath = "/socket/pad";
    BaseView.prototype.initialize.call(this);

    // Yeah, yeah, we're storing the levels
    // on the client. Deal with it.
    this.resetLevels();
    this.views = [];
    this.currentColor = "red";
    this.actionMode = "wall";

    // Bind events
    var pad = $("#pad");
    pad.on("mousedown", this.onMouseDown.bind(this));
    pad.on("mousemove", this.onMouseMove.bind(this));
    pad.on("mouseup", this.onMouseUp.bind(this));
    pad.on("touchstart", this.onTouchStart.bind(this));
    pad.on("touchmove", this.onTouchMove.bind(this));
    pad.on("touchend", this.onTouchEnd.bind(this));
    pad.on("contextmenu", this.onContextMenu.bind(this));
    $(window).on('orientationchange', this.onDimensionsChange.bind(this));
    $(window).on('resize', this.onDimensionsChange.bind(this));

    // Disable 300 ms tap-to-click delay on iOS
    Origami.fastclick(document.body);

    setInterval(
      this.regenerateColors.bind(this),
      Engine.REGEN_DELAY
    );
    setInterval(
      this.onHeartbeatTimerFired.bind(this),
      Engine.HEARTBEAT_INTERVAL
    );
    this.updateAction();
    this.onDimensionsChange();
  },

  onHeartbeatTimerFired: function() {
    this.sendMessage({type: "heartbeat"});
  },

  onTick: function(time, dt) {
    this.world.step(time);
  },

  onStep: function() {
    this.world.render();
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
    
    var x = event.clientX * devicePixelRatio;
    var y = (event.clientY - $("body").scrollTop()) * devicePixelRatio;

    if (this.actionMode == "wall") {
      if (this.levels[this.currentColor].current < Engine.WALL_COST) return;
      var distance = Math.sqrt(
        Math.pow((this.prevX - x), 2)
        +
        Math.pow((this.prevY - y), 2)
      );
      this.runningDistance += distance;
      if (this.runningDistance < Engine.MIN_WALL_WIDTH) return;
      this.runningDistance = 0;
      this.sendMessage({
        type: 'wall',
        screen: this.screen,
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
      this.levels[this.currentColor].current -= Engine.WALL_COST;
      this.prevX = x;
      this.prevY = y;
    }

    this.renderLevels();
  },

  onMouseUp: function(event) {
    if (this.actionMode == "wall") {
      this.dragStarted = false;
    }
    else if (this.actionMode == "ball") {
      var x = event.clientX * devicePixelRatio;
      var y = (event.clientY - $("body").scrollTop()) * devicePixelRatio;
      if (this.levels[this.currentColor].current < Engine.BALL_COST) return;
      this.sendMessage({
        type: 'ball',
        screen: this.screen,
        x: x,
        vx: (x - this.prevX),
        vy: (y - this.prevY),
        color: this.currentColor
      });
      this.levels[this.currentColor].current -= Engine.WALL_COST;
    }
  },

  onTouchStart: function(event) {
    event.preventDefault();
    var event = event.originalEvent;
    if (event.touches.length == 1) {
      this.onMouseDown(event.touches[0]);
    }
    else if (event.touches.length === 2) {
      this.nextColor();
    } else {
      alert("unsupported gesture");
    }
  },

  onTouchMove: function(event) {
    event.preventDefault();
    var event = event.originalEvent;
    if (event.touches.length === 1) {
      this.onMouseMove(event.touches[0]);
    }
    else if (event.touches.length === 2) {
      // spurious input from color-change gesture
      // no-op 
    }
    else {
      alert("unsupported gesture");
    }
  },

  onTouchEnd: function(event) {
    var event = event.originalEvent;
    if (event.changedTouches.length === 1) {
      this.onMouseUp(event.changedTouches[0]);
    }
  },

  onDimensionsChange: function() {

    this.screen = {
      width: window.innerWidth * devicePixelRatio,
      height: (window.innerHeight * devicePixelRatio) - 60
    };

    // Not a mobile device
    if (!_.has(window, 'orientation')) return;

    switch (window.orientation) {
      case -90:
      case 90:
        // Landscape
        $("#rotate-nag").fadeOut();
        break; 
      default:
        // Portrait
        $("#rotate-nag").fadeIn();
        break; 
    }
  },

  onContextMenu: function() {
    this.nextColor();
    return false;
  },

  onAction: function() {
    if (this.actionMode == "ball") {
      this.actionMode = "wall";
    } else {
      this.actionMode = "ball"
    }
    this.updateAction();
  },

  regenerateColors: function() {
    var changed = false;
    _.each(_.keys(this.levels), function(color) {
      var level = this.levels[color];
      if (level.current < level.max) {
        var scaleFactor = 1 + (level.max / 100);
        level.current += Engine.REGEN_INCREMENT * scaleFactor;
        changed = true;
      }
    }, this);
    if (changed) {
      this.renderLevels();
    }
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

  updateAction: function() {
    if (this.actionMode == "wall") {
      $("#action").text("BUILD");
    }
    else if (this.actionMode == "ball") {
      $("#action").text("FIRE!");
    } else {
      throw (this.actionMode + " is an invalid action mode");
    }
    $("#action").removeClass("action-red action-blue action-green")
    $("#action").addClass("action-" + this.currentColor);
  },

  getImages: function() {
    this.sendMessage({type: "getImages"});
  },

  finishColorize: function() {
    $("#compare").fadeOut('slow', function() {
      $("#wait-for-opponent").fadeIn('slow');
    });
    this.sendMessage({type: "finishedColorize"});
  },

  nextColor: function() {
    var colors = _.keys(view.levels);
    var newIndex = (colors.indexOf(view.currentColor) + 1) % colors.length;
    this.currentColor = _.keys(view.levels)[newIndex]
    this.updateAction();
  },

  onSocketMessage: function(message) {
    if (message.type == "colorized") {
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
          break;

        case "ask_for_intro":
          $("#pad, #action, #wait-for-opponent, #compare, #levels").fadeOut('slow');
          _.delay(function() {
            $("#skip-intro").parents().show();
            $("#skip-intro, #watch-intro").fadeIn("slow");
          }, 700);
          break;

        case "in_colorize":
          this.resetLevels();
          $("#skip-intro").parent().parent().hide();
          $("#watch-intro, #skip-intro, #wait-for-opponent").fadeOut("slow");
          // We're using _.delay and not passing a callback to the 
          // fadeOut call above because it won't fire if some of the
          // targetted elements are already hidden, which they will be
          // depending on if we or the other player hit the button.
          // Therefore, we don't rely on it and use our own delay.
          _.delay(function() {
            $("#compare").fadeIn("slow");
          }, 700);
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
          $("#container")
          .children()
          .not("#levels, #action, #status")
          .fadeOut('slow', function() {
            $("#pad, #action").fadeIn('slow');
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
    this.sendMessage({type: "skipIntro"});
  },

  watchIntro: function() {
    this.sendMessage({type: "watchIntro"});
  }

});

window.view = new ColorizeView();
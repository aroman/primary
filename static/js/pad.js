// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var ROUNDS = 3;

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
    if (window.view.levels.red.length < (ROUNDS + 1)) {
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

    // Physics stuff
    var width = window.innerWidth * devicePixelRatio;
    var height = window.innerHeight * devicePixelRatio;
    this.world = Physics();
    this.renderer = Physics.renderer('pixi', {
      el: "pad",
      width: width,
      height: height
    });
    this.world.add(this.renderer);
    var edgeBounce = Physics.behavior('edge-collision-detection', {
      aabb: Physics.aabb(0, 0, width, height)
    });
    this.world.add(edgeBounce);
    this.world.add(Physics.behavior('body-collision-detection'));
    this.world.add(Physics.behavior('sweep-prune'));

    this.world.on('step', this.onStep.bind(this));
    Physics.util.ticker.on(this.onTick.bind(this));

    var canvas = this.world.renderer().el;

    canvas.onmousedown = this.onMouseDown.bind(this);
    canvas.onmousemove = this.onMouseMove.bind(this);
    canvas.onmouseup = this.onMouseUp.bind(this);

    // start the ticker
    Physics.util.ticker.start();
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
    this.dragStarted = true;
  },

  onMouseMove: function(event) {
    if (!this.dragStarted) return;
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
    this.dragStarted = false;
  },

  // start -> {x: Number, y: Number}
  // end -> {x: Number, y: Number}
  // color -> String
  createBarrier: function(start, end, color) {
    var distance = Math.sqrt(
      Math.pow((start.x - end.x), 2)
      +
      Math.pow((start.y - end.y), 2)
    );

    // If the barrier is too big, split it into 
    // two, recursively
    if (distance > MAX_BARRIER_WIDTH) {
      var midPoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      }
      this.createBarrier(start, midPoint, color);
      this.createBarrier(midPoint, end, color);
      return;
    }

    // Create static body
    var path = Physics.body('barrier', {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
      width: distance + devicePixelRatio,
      height: 10,
      color: 'blue'
    });

    // Rotate it
    var adjacent = start.x - end.x;
    if (end.y > start.y) {
      adjacent = -adjacent;
    }
    path.state.angular.pos = Math.acos(adjacent / distance);

    // Add it to the world
    this.world.add(path);
  },

  resetLevels: function() {
    this.levels = {
      red: [33],
      green: [33],
      blue: [33]
    };
    this.renderLevels();
  },

  addLevels: function(levels) {
    _.each(levels, function (value, color) {
      this.levels[color].push(value);
    }, this);
    this.renderLevels();
  },

  renderLevels: function() {
    _.each(this.levels, function (values, color) {
      var sum = values.reduce(function(memo, value) {
        return memo + value
      }, 0); 
      var average = Math.round(sum / values.length);
      this.setLevelToValue(color, average);
    }, this);
  },

  setLevelToValue: function(color, value) {
    // In case it's not already visible
    var progress = this.$(".progress." + color);
    progress.find(".percent").text(value + "%");
    // If the value is small enough, show the
    // label next to the bar, and in inside it
    if (value <= 6) {
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
          $("#container").children().fadeOut('slow', function () {
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
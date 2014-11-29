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
    this.socketPath = "/socket/player";
    // Yeah, yeah, we're storing the levels
    // on the client. Deal with it.
    this.resetLevels();
    this.views = [];
    BaseView.prototype.initialize.call(this);
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
      this.$("#wait-for-opponent").fadeOut("slow");
      this.$("#skip-intro").fadeOut("slow");
      this.$("#watch-intro").fadeOut("slow", function () {
        that.$("#compare").fadeIn("slow");
      });
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
          this.$("#wait-for-opponent").fadeIn("slow");
          this.$("#compare").fadeOut("slow");
          this.$("#skip-intro").fadeOut("slow");
          this.$("#watch-intro").fadeOut("slow");
          this.$("#levels").fadeOut("slow");
          this.resetLevels();
          break;

        case "ask_for_intro":
          this.$("#wait-for-opponent").fadeOut("slow");
          this.$("#skip-intro").fadeIn("slow");
          this.$("#watch-intro").fadeIn("slow");
          this.$("#compare").fadeOut("slow");
          break;

        case "in_intro":
          this.$("#wait-for-opponent").fadeOut("slow");
          this.$("#skip-intro").fadeOut("slow");
          var that = this;
          this.$("#watch-intro").fadeOut("slow", function() {
            that.$("#next-slide").fadeOut("slow");
          });
          break;

        case "wait_for_slide":
          this.$("#next-slide").fadeIn("slow");
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
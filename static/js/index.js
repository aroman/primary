// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var IndexView = BaseView.extend({

  events: {

  },

  initialize: function() {
    this.socketPath = "/socket/board";
    BaseView.prototype.initialize.call(this);

    // Compile templates
    this.playerTemplate = Hogan.compile($("#player-template").html());

    if (_.isEmpty(existingProfiles)) {
      this.players = [null, null];
    } else {
      this.players = existingProfiles;
    }
    this.render();
  },

  render: function () {
    this.players.forEach(function(profile, i) {
      if (_.isNull(profile)) {
        var profile = {
          first_name: "Player " + String(i + 1),
          picture_url: "http://i.imgur.com/2CIgGqF.png",
        };
      }
      var html = this.playerTemplate.render(profile);
      this.$("#player-" + String(i + 1)).html(html);
    }, this);

    if (this.players.length == 2 && _.every(this.players)) {
      _.delay(this.beginSlides.bind(this), 1500);
    } else {
      this.$(".slide, .byline, #tap-to-continue, #slide-2 > img").hide();
      this.$("#players").show();
    }
  },

  beginSlides: function (callback) {
    var that = this;

    function waitForNextSlide(callback) {
      async.series([

        function show(next) {
          $("#tap-to-continue").fadeIn('slow');
          that.nextSlide = next;
        },

        function hide(next) {
          $("#tap-to-continue").fadeOut('fast');
          _.delay(next, 500);
        }

      ], callback);
    }

    var steps = [

      function hidePlayers(next) {
        var players = $("#players")
        var classes = "animated zoomOutUp";  
        players.addClass(classes);
        players.one('webkitAnimationEnd', function() {
          players.removeClass(classes)
          players.hide();
          _.delay(next, 500);
        });
      },

      function showSlide1(next) {
        $("#slide-1").show();
        var classes = "animated fadeInDown"; 
        async.eachSeries($("#slide-1 > .byline"), function(el, cont) {
          var el = $(el);
          el.show();
          el.addClass(classes);
          el.one("webkitAnimationEnd", function() {
            el.removeClass(classes);
            _.delay(cont, 500);
          });
        }, function done() {
          $("#tap-to-continue").fadeIn('slow');
          waitForNextSlide(next);
        });
      },

      _.partial(hideSlide, $("#slide-1"), _),

      function showSlide2(next) {
        $("#slide-2").show();
        var classes = "animated fadeInDown";
        async.eachSeries($("#slide-2 > img"), function(el, cont) {
          var el = $(el);
          el.show();
          el.addClass(classes);
          el.one("webkitAnimationEnd", function() {
            el.removeClass(classes);
            _.delay(cont, 150);
          });
        }, function done() {
          waitForNextSlide(next);
        });
      },

      _.partial(hideSlide, $("#slide-2"), _),

    ];

    function showSlide(slide, next) {
      slide.fadeIn('slow');
      _.delay(function() {
        waitForNextSlide(next);
      }, 1200);
    }

    function hideSlide(slide, next) {
      var classes = "animated fadeOutDown";
      slide.addClass(classes);
      slide.one('webkitAnimationEnd', function() {
        slide.removeClass(classes);
        slide.hide();
        _.delay(next, 500);
      });
    }

    for (var n = 3; n <= 6; n++) {
      var slide = $("#slide-" + n);
      steps.push(
        _.partial(showSlide, slide, _),
        _.partial(hideSlide, slide, _)
      );
    }

    async.series(steps, callback);
  },

  onSocketMessage: function(message) {
    if (message.type == "playerConnected") {
      this.players = message.profiles;
      this.render();
    }
    else if (message.type == "nextSlide") {
      this.nextSlide();
    }
  }

});

window.view = new IndexView();
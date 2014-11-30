// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var IndexView = BaseView.extend({

  initialize: function() {
    this.socketPath = "/socket/board";
    BaseView.prototype.initialize.call(this);

    // Physics stuff
    var width = (window.innerWidth * devicePixelRatio);
    var height = (window.innerHeight * devicePixelRatio) - 120;
    this.world = Physics();
    this.renderer = Physics.renderer('pixi', {
      el: "board",
      width: width,
      height: height
    });
    this.world.add(this.renderer);
    var edgeBounce = Physics.behavior('edge-collision-detection', {
      aabb: Physics.aabb(0, 0, width, height)
    });
    this.world.add(edgeBounce);
    this.world.add(Physics.behavior('body-impulse-response', {
      check: 'collisions:desired'
    }));
    this.world.add(Physics.behavior('body-collision-detection'));
    this.world.add(Physics.behavior('sweep-prune'));

    // ["green", "blue", "blue", "blue","green","red","green","red","green","red","green","red","green","red","green", "red", "blue"].forEach(function (color) {
    //   var ball = Physics.body('ball', {
    //     x: width * Math.random(),
    //     y: height * Math.random(),
    //     vy: 1 * Math.random(),
    //     vx: -1 * Math.random(),
    //     color: color
    //   });
    //   this.world.add(ball);
    // }, this);

    this.world.on('collisions:detected', this.onCollisions.bind(this));
    this.world.on('step', this.onStep.bind(this));
    Physics.util.ticker.on(this.onTick.bind(this));

    // start the ticker
    Physics.util.ticker.start();

    // Compile templates
    this.playerAvatarTemplate = Hogan.compile($("#player-avatar-template").html());
    this.playerStatusTemplate = Hogan.compile($("#player-status-template").html());

    if (_.isEmpty(existingProfiles)) {
      this.players = [null, null];
    } else {
      this.players = existingProfiles;
    }
    this.render();
  },

  render: function() {
    if (this.state == 'in_game') {
      this.players.forEach(function(profile, i) {
        var html = this.playerStatusTemplate.render(profile);
        this.$("#player-status-" + String(i + 1)).html(html);
      }, this);
    }
    else {
      this.players.forEach(function(profile, i) {
        if (_.isNull(profile)) {
          var profile = {
            first_name: "Player " + String(i + 1),
            picture_url: "http://i.imgur.com/2CIgGqF.png",
          };
        }
        var html = this.playerAvatarTemplate.render(profile);
        this.$("#player-avatar-" + String(i + 1)).html(html);
      }, this);
    }

  },

  onTick: function(time, dt) {
    this.world.step(time);
  },

  onStep: function() {
    this.world.render();
  },

  onCollisions: function(data) {

    data.collisions.forEach(potentialCollision, this);

    function emitCollision(collision) {
      this.world.emit("collisions:desired", {collisions: [collision]});
    }

    function potentialCollision(collision) {

      // We hit a screen boundary
      if (!collision.bodyB.hasOwnProperty("color")) {
        emitCollision.call(this, collision);
        return;
      }

      // We hit another ball
      if (collision.bodyA.treatment === "dynamic" &&
          collision.bodyB.treatment === "dynamic") {
        emitCollision.call(this, collision);
        return;
      }

      // Figure out which one is the ball and
      // which one is the wall.
      var ball, wall;
      if (collision.bodyA.treatment === "static") {
        ball = collision.bodyB;
        wall = collision.bodyA;
      } else {
        ball = collision.bodyA;
        wall = collision.bodyB;
      }

      // Break wall
      if ((ball.color === 'red' && wall.color === 'green') ||
          (ball.color === 'green' && wall.color === 'blue') ||
          (ball.color === 'blue' && wall.color === 'red')) {
            this.world.remove(wall);
            this.world.remove(ball);
      }
      // Pass through
      else if (ball.color === wall.color) {
        console.log("Pass through!");
      }
      // Bounce
      else {
        emitCollision.call(this, collision);
      }
    }
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
    if (distance > Engine.MAX_BARRIER_WIDTH) {
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

  beginSlides: function (callback) {
    var that = this;

    function waitForNextSlide(callback) {
      async.series([

        function show(next) {
          $("#tap-to-continue").fadeIn('slow');
          that.sendMessage({
            "type": "slideReady"
          });
          that.nextSlide = next;
        },

        function hide(next) {
          $("#tap-to-continue").fadeOut('fast');
          _.delay(next, 500);
        },

      ], callback);
    }

    var steps = [

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

  onSocketClosed: function() {
    this.render();
  },

  onSocketMessage: function(message) {

    if (message.type == "playerChange") {
      this.players = message.profiles;
      this.render();
    }

    if (message.type == "path") {
      this.createBarrier(message.start, message.end, message.color);
    }

    else if (message.type == "stateChange") {

      this.state = message.state;
      switch (message.state) {


        case "ask_for_intro":
          $("#board").fadeOut('slow');
          $(".playerStatus").fadeOut('slow');
          $("#players, #in-colorize").fadeOut('slow', function() {
            $("#ask-for-intro").fadeIn("slow");
          });
          break;

        case "in_intro":
          // If we've already started the slies, do ntohing
          if (this.begunSlides) return;
          this.begunSlides = true;
          var that = this;
          $("#board").fadeOut('slow');
          $(".playerStatus").fadeOut('slow');
          $("#ask-for-intro").fadeOut('slow', function() {
            that.beginSlides(function() {
              that.sendMessage({type: "introFinished"});
              this.begunSlides = false;
            });
          });
          break;

        case "wait_for_slide":
          break;

        case "wait_for_pair":
          $(".playerStatus").fadeOut('slow');
          $("#board").fadeOut('slow', function() {
            $("#logo").fadeIn('slow');
            $("#players").fadeIn('slow')
          });
          break;

        case "in_colorize":
          $("#board").fadeOut('slow');
          $(".playerStatus").fadeOut('slow');
          $("#ask-for-intro").fadeOut('slow', function() {
            $("#in-colorize").fadeIn('slow');
          });
          break;

        case "in_game":
          this.render();
          $("#container").children().fadeOut('slow', function() {
            $(".playerStatus").show()
            $("#board").fadeIn('slow');
          });
          break;

      }

      this.updateStatus(message.state);
    }

    else if (message.type == "nextSlide") {
      this.nextSlide();
      this.sendMessage({type: "watchIntro"});
    }

  }

});

window.view = new IndexView();
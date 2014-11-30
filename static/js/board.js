// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var MIDWAY_HEIGHT = 20;

var IndexView = BaseView.extend({

  initialize: function() {
    this.socketPath = "/socket/board";
    BaseView.prototype.initialize.call(this);

    // Physics stuff
    this.width = (window.innerWidth * devicePixelRatio);
    this.height = (window.innerHeight * devicePixelRatio) - (60 * 4);
    this.world = Physics();
    this.renderer = Physics.renderer('pixi', {
      el: "board",
      width: this.width,
      height: this.height
    });
    this.world.add(this.renderer);
    var edgeBounce = Physics.behavior('edge-collision-detection', {
      aabb: Physics.aabb(0, 0, this.width, this.height)
    });
    this.world.add(edgeBounce);
    this.world.add(Physics.behavior('body-impulse-response', {
      check: 'collisions:desired'
    }));
    this.world.add(Physics.behavior('body-collision-detection'));
    this.world.add(Physics.behavior('sweep-prune'));
    var midWayLine = Physics.body('rectangle', {
      x: 0,
      y: this.height / 2,
      vx: 1,
      width: this.width * 2,
      height: MIDWAY_HEIGHT,
      treatment: 'static',
      isMidWay: true,
      styles: {
        fillStyle: 0xffffff,
        alpha: 0.5
      }
    });
    this.world.add(midWayLine);


    ["green"].forEach(function (color) {
      var ball = Physics.body('ball', {
        x: this.width * Math.random(),
        y: this.height * Math.random(),
        vy: 1 * Math.random(),
        vx: -1 * Math.random(),
        color: color
      });
      this.world.add(ball);
    }, this);

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

      if (collision.bodyA.isMidWay || collision.bodyB.isMidWay) {
        return;
      }

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
  createWall: function(start, end, color) {

    var distance = Math.sqrt(
      Math.pow((start.x - end.x), 2)
      +
      Math.pow((start.y - end.y), 2)
    );

    // If the wall is too big, split it into 
    // two, recursively
    if (distance > Engine.MAX_WALL_WIDTH) {
      var midPoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      }
      this.createWall(start, midPoint, color);
      this.createWall(midPoint, end, color);
      return;
    }

    // Create static body
    var path = Physics.body('wall', {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
      width: distance + devicePixelRatio,
      height: 10,
      color: color
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
          $("#tap-to-continue").fadeIn();
          that.sendMessage({
            "type": "slideReady"
          });
          that.nextSlide = next;
        },

        function hide(next) {
          $("#tap-to-continue").fadeOut('fast');
          _.delay(next, 100);
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
    ];

    function showSlide(slide, next) {
      $("#banner").fadeOut("slow", function () {
        var classes = "animated fadeIn"; 
        slide.show();
        async.eachSeries(slide.children(), function(el, cont) {
          console.log(el);
          var el = $(el);
          el.show();
          el.addClass(classes);
          el.one("webkitAnimationEnd", function() {
            el.removeClass(classes);
            cont();
          });
        }, function done() {
          waitForNextSlide(next);
        });
      });
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

    for (var n = 2; n <= 12; n++) {
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
      // Scale based on the user's phone dimensions
      message.start.x *= (this.width / message.screen.width );
      message.start.y *= (this.height / message.screen.height );
      message.end.x *= (this.width / message.screen.width);
      message.end.y *= (this.height / message.screen.height);
      console.log(message);
      message.start.y /= 2;
      message.end.y /= 2;
      // translate to bottom half of screen
      if (message.player === 1) {
        message.start.y += (this.height + MIDWAY_HEIGHT) / 2;
        message.end.y += (this.height + MIDWAY_HEIGHT) / 2;
      } else {
        message.start.y -= MIDWAY_HEIGHT;
        message.end.y -= MIDWAY_HEIGHT;
      }
      this.createWall(
        message.start,
        message.end,
        message.color
      );
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
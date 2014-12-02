// Copyright 2014 Avi Romanoff <avi at romanoff.me>

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
    this.clearBoard();
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
        } else {
          // we always want to show a user's score, even if it's 0
          // profile.score = String(profile.score);
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
        var ball = collision.bodyA;
        // top edge
        if (ball.state.pos.get(1) < 20) {
          this.players[1].score += 10;
          this.render();
          this.world.remove(ball);
        }
        // bottom edge
        else if ((this.height - ball.state.pos.get(1)) < 20) {
          this.players[0].score += 10;
          this.render();
          this.world.remove(ball);
        }
        else {
          emitCollision.call(this, collision);
        }
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

  clearBoard: function() {

    _.each(this.world.getBodies(), function(body) {
      this.world.removeBody(body);
    }, this);

    var midWayLine = Physics.body('rectangle', {
      x: this.width / 2, // wut
      y: this.height / 2,
      vx: 1,
      width: this.width,
      height: Engine.MIDWAY_HEIGHT,
      treatment: 'static',
      isMidWay: true,
      styles: {
        fillStyle: 0xffffff,
        alpha: 0.5
      }
    });

    this.world.add(midWayLine);
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

    // Create wall
    var wall = Physics.body('wall', {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
      width: distance + devicePixelRatio,
      color: color
    });

    // Rotate it
    var adjacent = start.x - end.x;
    if (end.y > start.y) {
      adjacent = -adjacent;
    }
    wall.state.angular.pos = Math.acos(adjacent / distance);

    // Add it to the world
    this.world.add(wall);
  },

  createBall: function(x, y, vx, vy, color) {
    console.log("createBall called with", arguments);

    // Create ball
    var ball = Physics.body('ball', {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      color: color
    });

    // Add it to the world
    this.world.add(ball);
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
      $("#logo").fadeOut("slow", function () {
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

    if (message.type == "wall") {
      // Scale based on the user's phone dimensions
      message.start.x *= (this.width / message.screen.width);
      message.start.y *= (this.height / message.screen.height);
      message.end.x *= (this.width / message.screen.width);
      message.end.y *= (this.height / message.screen.height);
      message.start.y /= 2;
      message.end.y /= 2;

      // top half of screen
      if (message.player === 0) {
        message.start.y -= Engine.MIDWAY_HEIGHT;
        message.end.y -= Engine.MIDWAY_HEIGHT;
      // bottom half of screen
      } else {
        message.start.y += (this.height + Engine.MIDWAY_HEIGHT) / 2;
        message.end.y += (this.height + Engine.MIDWAY_HEIGHT) / 2;
      }

      this.createWall(
        message.start,
        message.end,
        message.color
      );
    }

    else if (message.type == "ball") {
      // Scale based on the user's phone dimensions
      message.x *= (this.width / message.screen.width);
      // Balls spawn at the midpoint
      message.y = this.height / 2;

      // translate to bottom half of screen
      if (message.player === 1) {

      } else {

      }
      
      this.createBall(
        message.x,
        message.y,
        message.vx / 1000,
        message.vy / 1000,
        message.color
      );
    }

    else if (message.type == "stateChange") {

      this.state = message.state;
      switch (message.state) {


        case "ask_for_intro":
          $("#board").fadeOut('slow');
          $(".player-status").fadeOut('slow');
          $("#players, #in-colorize").fadeOut('slow', function() {
            $("#ask-for-intro").fadeIn("slow");
          });
          break;

        case "in_intro":
          // If we've already started the slies, do ntohing
          if (this.begunSlides) return;
          this.begunSlides = true;
          var that = this;
          $("#slides").show();
          $("#board").fadeOut('slow');
          $(".player-status").fadeOut('slow');
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
          $(".player-status").fadeOut('slowz');
          $("#board, #slides").fadeOut('slow', function() {
            $("#logo").fadeIn('slow');
            $("#players").fadeIn('slow')
          });
          break;

        case "in_colorize":
          $("#board").fadeOut('slow');
          $(".player-status").fadeOut('slow');
          $("#players").fadeOut('slow');
          $("#logo").fadeOut('slow');
          $("#ask-for-intro").fadeOut('slow', function() {
            $("#in-colorize").fadeIn('slow');
          });
          break;

        case "in_game":
          this.render();
          this.clearBoard();
          $("#container").children().fadeOut('slow', function() {
            $(".player-status").show()
            $("#board").fadeIn('slow', function() {
              // $("#themesong")[0].play();
            });
          });
          break;

      }

      if (message.status != "in_game") {
          $("#themesong")[0].currentTime = 0;
          $("#themesong")[0].pause();
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
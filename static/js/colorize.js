// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var PhotoModel = Backbone.Model.extend({

});

var PhotoView = Backbone.View.extend({

  className: "choice",

  events: {
    "click img": "select",
  },

  initialize: function(options) {
    this.template = Hogan.compile($("#photo-template").html());
  },

  select: function() {
    this.$(".image").hide();
    this.$(".image-overlay").show();
    console.log("clicked image with id", this.model.get('id'));
    var levels = this.model.get('levels');
    $("input[name=red]").val(levels.red);
    $("input[name=green]").val(levels.green);
    $("input[name=blue]").val(levels.blue);

    setTimeout(function () {
      $("form").submit();
    }, 2000);
  },

  render: function() {
    console.log(this.model);
    var context = this.model.toJSON();
    var html = this.template.render(context);
    this.$el.html(html);
    return this;
  }

});

var ColorizeView = BaseView.extend({

  el: $("#container"),

  events: {
    "click #next-slide": "nextSlide",
  },

  initialize: function() {
    this.socketPath = "/socket/player";
    BaseView.prototype.initialize.call(this);
  },

  onSocketMessage: function(message) {
    if ("images" in message) {
      console.log(message.images[0]);

      var A = new PhotoView({model: new PhotoModel(message.images[0])});
      var B = new PhotoView({model: new PhotoModel(message.images[1])});
      this.$("#compare").append(A.render().el);
      this.$("#compare").append(B.render().el);
    }
    if (message.state == "in_colorize") {
      this.sendMessage("get_images");
    }
    this.updateStatus(message.state);
  },

  nextSlide: function() {
    this.sendMessage({type: "nextSlide"});
  }

});

window.view = new ColorizeView();
// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var PhotoModel = Backbone.Model.extend({

});

var PhotoView = Backbone.View.extend({

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
    console.log("clicked image with id", this.model.get('id'));
    var levels = this.model.get('levels');
    $("input[name=red]").val(levels.red);
    $("input[name=green]").val(levels.green);
    $("input[name=blue]").val(levels.blue);

    _.delay($("form").submit.bind(this), 2000);
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

  events: {
    "click #next-slide": "nextSlide",
  },

  initialize: function() {
    this.socketPath = "/socket/player";
    BaseView.prototype.initialize.call(this);
  },

  onSocketMessage: function(message) {
    if ("images" in message) {
      var A = new PhotoView({
        model: new PhotoModel(message.images[0]),
        el: this.$(".photo").first()[0]
      });
      var B = new PhotoView({
        model: new PhotoModel(message.images[1]),
        el: this.$(".photo").last()[0]
      });
    }
    if (message.state == "in_colorize") {
      this.sendMessage({type: "getImages"});
    }
    this.updateStatus(message.state);
  },

  nextSlide: function() {
    this.sendMessage({type: "nextSlide"});
  }

});

window.view = new ColorizeView();
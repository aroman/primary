// Copyright 2014 Avi Romanoff <avi at romanoff.me>

var colors = [
  {
    name: "red",
    hex: "#D0021B",
    current: 1.00,
    max: 1.00
  },
  {
    name: "green",
    hex: "#7ED321",
    current: 0.47,
    max: 0.47
  },
  {
    name: "blue",
    hex: "#4A90E2",
    current: 0.82,
    max: 0.82
  }
];

var colorIndex = 0;

var canvas = $('#pad');
var ctx = canvas[0].getContext('2d');

ctx.canvas.width = window.innerWidth * devicePixelRatio;
ctx.canvas.height = window.innerHeight * devicePixelRatio;
ctx.lineWidth = 10 * devicePixelRatio;
ctx.lineCap = "round";
ctx.strokeStyle = colors[colorIndex].hex;

var scaleFactor = 60 * (ctx.canvas.width * devicePixelRatio);
var barWidth = 10 * devicePixelRatio;

function drawLevels() {
  ctx.clearRect(0, 0, ctx.canvas.width, barWidth * colors.length);
  colors.forEach(function (color, i) {
      ctx.fillStyle = color.hex;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(0, i * barWidth, ctx.canvas.width * color.max, barWidth);
      ctx.globalAlpha = 1;
      ctx.fillRect(0, i * barWidth, ctx.canvas.width * color.current, barWidth);
  });
}

ctx.fillStyle = "#666";
var bottomHeight = 40 * devicePixelRatio;
ctx.fillRect(0, ctx.canvas.height - bottomHeight, ctx.canvas.width, bottomHeight);

drawLevels();

// Touch Events handlers
var draw = {

  started: false,

  start: function(event) {
    if (event.originalEvent.touches.length == 2) {
      colorIndex += 1;
      if (colorIndex >= colors.length) {
        colorIndex = 0;
      }
      ctx.strokeStyle = colors[colorIndex].hex;
    } else {
      this.distance = 0;
      ctx.beginPath();
      ctx.moveTo(
        event.originalEvent.touches[0].pageX * devicePixelRatio,
        (event.originalEvent.touches[0].pageY - $("body").scrollTop()) * devicePixelRatio
      );
      this.started = true;
    }
  },

  move: function(event) {
    if (!this.started) return;
    if (colors[colorIndex].current < 0) return;
    var x = event.originalEvent.touches[0].pageX * devicePixelRatio;
    var y = (event.originalEvent.touches[0].pageY - $("body").scrollTop()) * devicePixelRatio;
    // Euclidean distance * area of circle (point)
    if (this.prevX) {
      var newDistance = Math.sqrt(
        Math.pow(this.prevY - y, 2)
        +
        Math.pow(this.prevX - x, 2)
      ) * Math.PI * ctx.lineWidth;
      colors[colorIndex].current -= (newDistance / scaleFactor); 
    }
    this.prevX = x;
    this.prevY = y;
    ctx.lineTo(x, y);
    ctx.stroke();
    drawLevels();
  },

  end: function(event) {
    this.started = false;
    this.prevX = this.prevY = null;
  }

};

// Touch events
canvas.on('touchstart', draw.start);
canvas.on('touchend', draw.end);
canvas.on('touchmove', draw.move);

function handleOrientation() {

  ctx.font="40px Helvetica";
  ctx.fillStyle = "white"; 
  ctx.fillText("orientation: " + window.orientation, 30, ctx.canvas.height - 30);
  if (window.orientation == 0) {
    $("#main-msg").show();
    $("#pad").hide();
  } else {
    $("#main-msg").hide();
    !scream.isMinimalView() && $("#pad").show();
  }
}

$(window).on('orientationchange', handleOrientation);

handleOrientation();

// Disable Page Move
$('body').on('touchmove', function(event) {
  if (scream.isMinimalView()) {
    event.preventDefault();
  }
});
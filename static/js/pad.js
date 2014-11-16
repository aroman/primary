var isMobile;

function isTouchDevice() {
   var el = document.createElement('div');
   el.setAttribute('ongesturestart', 'return;');
   return typeof el.ongesturestart === "function";
}

isMobile = isTouchDevice();

  
if (window.addEventListener) {
  window.addEventListener('load', function () {
    var canvas, context, draw;

    // Touch Events handlers
    draw = {
      started: false,
      start: function(event) {

        context.beginPath();
        if (isMobile){
          context.moveTo(
            event.originalEvent.touches[0].pagex,
            event.originalEvent.touches[0].pageY
          );
        }else{
          context.moveTo(
            event.pageX - this.offsetLeft, 
            event.pageY - this.offsetTop
          );
        }
        this.started = true;

      },
      move: function(event) {

        if (this.started) {
          if(isMobile){
            context.lineTo(
              event.originalEvent.touches[0].pageX,
              event.originalEvent.touches[0].pageY
            );
          }else{
          
            context.lineTo(
              event.pageX - this.offsetLeft, 
              event.pageY - this.offsetTop
            );
          }
          context.lineWidth=10;
          context.lineCap="round";
          context.strokeStyle = "#D0021B";
          context.stroke();
        }

      },
      end: function(event) {
        this.started = false;
      }
    };

    // Canvas & Context
    canvas = document.getElementById('pad');
    context = canvas.getContext('2d');

    // Events
    canvas.addEventListener('touchstart', draw.start, false);
    canvas.addEventListener('touchend', draw.end, false);
    canvas.addEventListener('touchmove', draw.move, false);
    canvas.addEventListener('mousedown', draw.start, false);
    canvas.addEventListener('mousemove', draw.move, false);
    canvas.addEventListener('mouseup', draw.end, false);

  });

  // Disable Page Move
  document.body.addEventListener('touchmove',function(event){
    event.preventDefault();
  },false);
}
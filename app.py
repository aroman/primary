import os
import asyncio
import tornado.web
import tornado.options
import tornado.websocket
import tornado.platform.asyncio

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/pair", PairHandler),
            (r"/websocket", EchoWebSocket),
        ]

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            debug=True
        )

        super().__init__(handlers, **settings)

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")

class PairHandler(tornado.web.RequestHandler):
    def get(self):
        print("yo")
        self.render("pair.html")

class EchoWebSocket(tornado.websocket.WebSocketHandler):
    def open(self):
        print("WebSocket opened")

    def on_message(self, message):
        self.write_message(u"You said: " + message)

    def on_close(self):
        print("WebSocket closed")

if __name__ == "__main__":
    tornado.platform.asyncio.AsyncIOMainLoop().install()
    tornado.options.parse_command_line()
    if 'PORT' in os.environ:
        port = os.environ['PORT']
    else:
        port = 8888
    Application().listen(port)
    asyncio.get_event_loop().run_forever()
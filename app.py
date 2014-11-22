import os
import asyncio
import tornado.web
import tornado.options
import tornado.websocket
import tornado.platform.asyncio

import color

class Application(tornado.web.Application):

    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/privacy", PrivacyHandler),
            (r"/pad", PadHandler),
            (r"/pair", PairHandler),
            (r"/websocket", EchoWebSocket),
        ]

        # Player sockets
        player_sockets = [None, None]

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            cookie_secret="C4RP3D13M",
            debug=True
        )

        super().__init__(handlers, **settings)

class MainHandler(tornado.web.RequestHandler):

    def get(self):
        self.render("index.html")

class PrivacyHandler(tornado.web.RequestHandler):

    def get(self):
        self.render("privacy.html")

class PairHandler(tornado.web.RequestHandler):

    def post(self):
        access_token = self.get_argument("access_token")
        expires_in = int(self.get_argument("expires_in"))
        signed_value = self.create_signed_value("access_token", access_token)
        self.set_cookie("access_token", signed_value, expires=expires_in)
        self.render("color.html")

    def get(self):
        if self.get_secure_cookie("access_token"):
            self.render("color.html")
        self.render("pair.html")

class PadHandler(tornado.web.RequestHandler):

    def get(self):
        self.render("pad.html")

class EchoWebSocket(tornado.websocket.WebSocketHandler):

    def open(self):
        if self not in clients:
            self.application.player_sockets.append(self)

    def on_close(self):
        if self in cl:
            self.application.player_sockets.remove(self)

    def on_message(self, message):
        self.write_message(u"You said: " + message)

if __name__ == "__main__":
    tornado.platform.asyncio.AsyncIOMainLoop().install()
    tornado.options.parse_command_line()
    if 'PORT' in os.environ:
        port = os.environ['PORT']
    else:
        port = 8888
    Application().listen(port)
    asyncio.get_event_loop().run_forever()
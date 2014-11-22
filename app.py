import os
import enum
import datetime

import asyncio
import tornado.web
import tornado.options
import tornado.websocket
import tornado.platform.asyncio

from player import Player

@enum.unique
class GameState(enum.Enum):
    wait_for_player = 1
    wait_for_pair = 2
    in_colorize = 3
    in_draw = 4
    in_main = 5

class Application(tornado.web.Application):

    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/privacy", PrivacyHandler),
            (r"/pad", PadHandler),
            (r"/pair", PairHandler),
            (r"/socket", WebSocketHandler),
        ]

        self.players = {}
        self.state = GameState.wait_for_player

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
        expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in)
        self.set_cookie("access_token", signed_value, expires=expires)
        self.render("color.html")

    def get(self):
        if self.get_secure_cookie("access_token"):
            self.render("color.html")
        else:
            self.render("pair.html")

class PadHandler(tornado.web.RequestHandler):

    def get(self):
        self.render("pad.html")

class WebSocketHandler(tornado.websocket.WebSocketHandler):

    def broadcast(self, message):
        for socket in self.application.players.keys():
            socket.write_message(message)

    def update_state(self):
        connectedPlayers = len(self.application.players)
        if connectedPlayers == 1:
            self.application.state = GameState.wait_for_pair
        elif connectedPlayers == 2:
            self.application.state = GameState.in_colorize
        self.broadcast({
            'state': self.application.state.name
        })

    @property
    def opponent(self):
        for socket in self.application.players.keys():
            if socket != self:
                return self.application.players[socket]

    def open(self):
        access_token = self.get_secure_cookie("access_token")
        self.application.players[self] = Player(access_token)
        self.update_state()

    def on_close(self):
        del self.application.players[self]
        self.update_state()

    def on_message(self, message):
        if message == "getimg":
            self.write_message({
                "A": self.opponent.getRandomPhoto(),
                "B": self.opponent.getRandomPhoto()
            })

if __name__ == "__main__":
    tornado.platform.asyncio.AsyncIOMainLoop().install()
    tornado.options.parse_command_line()
    if 'PORT' in os.environ:
        port = os.environ['PORT']
    else:
        port = 8888
    Application().listen(port)
    asyncio.get_event_loop().run_forever()
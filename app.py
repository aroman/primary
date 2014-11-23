import os
import enum
import datetime

# import pymongo
import asyncio
import facebook
import tornado.web
import tornado.options
import tornado.websocket
import tornado.platform.asyncio

from player import Player

# db = pymongo.MongoClient('mongodb://primary:carpediem@ds053370.mongolab.com:53370/primary')

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
            (r"/auth", AuthHandler),
            (r"/socket", WebSocketHandler),
            (r"/colorize", ColorizeHandler),
        ]

        self.players = {}
        self.state = GameState.wait_for_player

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            cookie_secret="C4RP3D13M",
            debug=True,
            login_url="/auth"
        )

        super().__init__(handlers, **settings)


FB_APP_ID = "1557570384475065"
FB_APP_SECRET = "fe096dedfe43239f31fbe39f7ed7300e"

class BaseHandler(tornado.web.RequestHandler):

    def get_current_user(self):
        access_token = self.get_cookie("access_token")
        # If the user hasn't been logged in yet
        if not access_token: return None
        # If they have, return their profile
        graph = facebook.GraphAPI(access_token)
        profile = graph.get_object("me")
        return profile

class MainHandler(BaseHandler):

    def get(self):
        self.render("index.html")

class PrivacyHandler(BaseHandler):

    def get(self):
        self.render("privacy.html")

class ColorizeHandler(BaseHandler):

    @tornado.web.authenticated
    def get(self):
        print(self.current_user)
        self.render("color.html")

class PadHandler(BaseHandler):

    @tornado.web.authenticated
    def get(self):
        self.render("pad.html")

class AuthHandler(BaseHandler):

    def get(self):
        cookies = dict((n, self.cookies[n].value) for n in self.cookies.keys())
        user = facebook.get_user_from_cookie(cookies, FB_APP_ID, FB_APP_SECRET)
        if user:
            graph = facebook.GraphAPI(user['access_token'])
            res = graph.extend_access_token(FB_APP_ID, FB_APP_SECRET)
            self.set_cookie('access_token', res['access_token'])
            self.redirect("/colorize")
        else:
            self.render("auth.html")


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
        access_token = self.get_cookie("access_token")
        print("access_token in WebSocketHandler", access_token)
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
    print("PRIMARY listening on port", port)
    asyncio.get_event_loop().run_forever()
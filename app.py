import os
import enum
import logging

import pymongo
import asyncio
import colorama
import facebook
import tornado.web
import tornado.options
import tornado.websocket
import tornado.platform.asyncio

from liaison import Liaison

db = pymongo.MongoClient('mongodb://primary:carpediem@ds053370.mongolab.com:53370/primary').primary

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
        user = self.get_secure_cookie("user")
        # If the user is not logged in
        if not user: return None
        # If they have, return their liasion
        player = db.players.find_one({"_id": user.decode("utf-8")})
        return Liaison(db, player)

class MainHandler(BaseHandler):

    def get(self):
        self.render("index.html")

class PrivacyHandler(BaseHandler):

    def get(self):
        self.render("privacy.html")

class ColorizeHandler(BaseHandler):

    @tornado.web.authenticated
    def post(self):
        self.render("pad.html", levels={
            'red': self.get_argument("red"),
            'green': self.get_argument("green"),
            'blue': self.get_argument("blue"),
        })

    @tornado.web.authenticated
    def get(self):
        self.render("colorize.html")

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
            player = {
                '_id': user['uid'],
                'access_token': res['access_token']
            }
            db.players.save(player)
            self.set_secure_cookie('user', user['uid'])
            self.redirect("/colorize")
        else:
            self.render("auth.html")

class WebSocketHandler(tornado.websocket.WebSocketHandler, BaseHandler):

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
        # sanity checks
        if not self.current_user or len(self.application.players) >= 2:
            logging.error("YOU SHOULD NOT SEE THIS AT ALL!!! UNWANTED SOCKET!!")
            raise
        self.application.players[self] = self.current_user
        self.update_state()

    def on_close(self):
        del self.application.players[self]
        self.update_state()

    def on_message(self, message):
        logging.debug("websocket@{} message: {}".format(id(self), repr(message)))
        if message == "get_images":
            self.write_message({
                "images": [self.opponent.getRandomPhoto() for _ in range(2)]
            })

if __name__ == "__main__":
    tornado.platform.asyncio.AsyncIOMainLoop().install()
    tornado.options.parse_command_line()
    if 'PORT' in os.environ:
        port = os.environ['PORT']
    else:
        port = 8888
    Application().listen(port)
    (R, G, B, X) = (
        colorama.Fore.RED,
        colorama.Fore.GREEN,
        colorama.Fore.BLUE,
        colorama.Fore.RESET
    )
    logging.info(R + "PRI" + G + "MA" + B + "RY" + X + 
        " listening on http://127.0.0.1:" + str(port) + X)
    asyncio.get_event_loop().run_forever()
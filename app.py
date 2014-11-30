# Copyright 2014 Avi Romanoff <avi at romanoff.me>

import os
import json
import enum
import logging
import collections

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
    ask_for_intro = 3
    wait_for_slide = 4
    in_intro = 5
    in_colorize = 6
    in_game = 7

class Application(tornado.web.Application):

    def __init__(self):
        handlers = [
            (r"/", AuthHandler),
            (r"/pad", PadHandler),
            (r"/board", BoardHandler),
            (r"/socket/pad", PadSocketHandler),
            (r"/socket/board", BoardSocketHandler),
        ]

        self.players = collections.OrderedDict()
        self.board = None
        self._state = GameState.wait_for_player

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            cookie_secret="C4RP3D13M",
            debug=True,
            login_url="/"
        )

        super().__init__(handlers, **settings)

    @property
    def state(self):
        return self._state

    @state.setter
    def state(self, value):
        self._state = value
        self.publish_state()
        logging.info("State changed to {}".format(value))
        if value == GameState.in_colorize:
            for player in self.players:
                player.send_images()

    def publish_state(self):
        msg = {
            'type': 'stateChange',
            'state': self.state.name
        }
        self.send_to_pads(msg)
        self.send_to_board(msg)
    
    def get_player_profiles(self):
        profiles = [player.getProfile() for player in self.players.values()]
        for _ in range(2 - len(profiles)):
            profiles.append(None)
        return profiles

    def send_to_board(self, message):
        if not self.board:
            print("NO BOARD, dropping message!")
            return
        self.board.write_message(message)

    def send_to_pads(self, message):
        for socket in self.players.keys():
            socket.write_message(message)

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

class AuthHandler(BaseHandler):

    def get(self):
        cookies = dict((n, self.cookies[n].value) for n in self.cookies.keys())
        user = facebook.get_user_from_cookie(cookies, FB_APP_ID, FB_APP_SECRET)
        if user:
            graph = facebook.GraphAPI(user['access_token'])
            res = graph.extend_access_token(FB_APP_ID, FB_APP_SECRET)
            player = {
                '_id': user['uid'],
                'access_token': res['access_token'],
                'score': 0
            }
            db.players.save(player)
            self.set_secure_cookie('user', user['uid'])
            self.redirect("/pad")
        else:
            self.render("auth.html")

class PadHandler(BaseHandler):

    @tornado.web.authenticated
    def get(self):
        if len(self.application.players) == 2:
            self.write("two players already online; kill one first")
            return
        self.render("pad.html")

class BoardHandler(BaseHandler):

    def get(self):
        if self.application.board:
            self.write("board already exists; close it first")
            return
        profiles = self.application.get_player_profiles()
        self.render("board.html", profiles=profiles)

class PadSocketHandler(tornado.websocket.WebSocketHandler, BaseHandler):

    @property
    def opponent(self):
        for socket in self.application.players.keys():
            if socket != self:
                return self.application.players[socket]

    def open(self):
        logging.debug("PlayerSocket@{} opened".format(id(self)))
        # sanity checks
        if not self.current_user or len(self.application.players) >= 2:
            logging.error("YOU SHOULD NOT SEE THIS AT ALL!!! UNWANTED SOCKET!!")
            raise
        self.application.players[self] = self.current_user
        self.application.send_to_board({
            'type': "playerChange",
            'profiles': self.application.get_player_profiles()
        })
        self.players_changed()

    def players_changed(self):
        connectedPlayers = len(self.application.players)
        if connectedPlayers == 1:
            self.application.state = GameState.wait_for_pair
        elif connectedPlayers == 2:
            self.application.state = GameState.ask_for_intro
        self.application.send_to_board({
            'type': "playerChange",
            'profiles': self.application.get_player_profiles()
        })

    def on_close(self):
        del self.application.players[self]
        self.players_changed()

    def send_images(self):
        self.write_message({
            "images": [self.opponent.getRandomPhoto() for _ in range(2)]
        })

    def on_message(self, message):
        message = json.loads(message)
        logging.debug("PlayerSocket@{} message: {}".format(id(self), repr(message)))
        if message['type'] == "getImages":
            self.send_images()
        elif message['type'] == "startGame":
            self.application.state = GameState.in_game
        elif message['type'] == "skipIntro":
            self.application.state = GameState.in_colorize
        elif message['type'] == "watchIntro":
            self.application.state = GameState.in_intro
        else:
            message['player'] = list(self.application.players.keys()).index(self)
            self.application.send_to_board(message)

class BoardSocketHandler(tornado.websocket.WebSocketHandler):

    def open(self):
        logging.debug("BoardSocket@{} opened".format(id(self)))
        self.application.board = self
        # Make sure the board is in sync with the server
        self.application.publish_state()

    def on_close(self):
        self.application.board = None

    def on_message(self, message):
        message = json.loads(message)
        logging.debug("BoardSocket@{} message: {}".format(id(self), repr(message)))
        if message['type'] == "slideReady":
            self.application.state = GameState.wait_for_slide
        elif message['type'] == "introFinished":
            self.application.state = GameState.in_colorize
        elif message['type'] == "watchIntro":
            self.application.state = GameState.in_intro

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
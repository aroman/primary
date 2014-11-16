import os
import asyncio
import tornado.web
import tornado.options
import tornado.platform.asyncio

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")
        # self.write("Hello, world")

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
        ]

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            debug=True
        )

        super().__init__(handlers, **settings)

application = tornado.web.Application([
    (r"/", MainHandler),
], )

if __name__ == "__main__":
    tornado.platform.asyncio.AsyncIOMainLoop().install()
    tornado.options.parse_command_line()
    Application().listen(8888)
    asyncio.get_event_loop().run_forever()
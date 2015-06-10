primary
=======

Colorful sockets.

## What is this?

PRIMARY is a multi-platform, multi-player, Facebook-integrated arcade game. Players sign in with their Facebook accounts and then select among random photos of their opponent to extract the primary colors from those images. These color levels determine the quantity and speed of the construction of that player’s defensive structures (walls) and their offensive projectiles (balls). The objective of the game is to score as many points as possible during the 50-second round by flinging balls across the opponents screen. Walls and balls can come in each of the three primary RGB colors (red, green, and blue), and interact with each other based on these colors. For example, balls will pass through walls of the game color, but will by deflected by walls after them in RGB order. All of the specific combinations are enumerated in the included interactive tutorial.

## How to use

PRIMARY runs on Python 3.4+, and lists and manages its specific dependencies using the Pip-standard requirements.txt. Additionally, a Heroku-compatible Foreman profile is included in this archive.

To get started, first install the project requirements. It is highly suggested that you create a new VirtualEnv sandbox for use with PRIMARY, as its dependencies are bleeding-edge, and it requires the very latest stable major release of Python (3.4). Setting up VirtualEnv is outside the scope of these instructions, but Google is your friend :)

Once you have a VirtualEnv, use pip to install the dependencies:

$ pip install -r requirements.txt

Once the dependencies have been downloaded and installed, run PRIMARY:

$ python app.py

Alternatively, for a Heroku-compatible environment:

$ foreman start

Additional logging can be enabled using standard Tornado command-line options:

$ python app.py --logging=debug

Finally, PRIMARY can be made to run on any port its host process has permission to bind to by setting the $PORT environment variable.

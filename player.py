import io
import random

import facebook
import requests
from PIL import Image

import color

class Player(object):

    def __init__(self, access_token):
        self.graph = facebook.GraphAPI(access_token)
        self.photoIds = self.getPhotoIds()

    def getPhotoIds(self, after=None):
        photoIds = []
        # Don't pass the 'after' kwarg at all if it's not set
        extraArgs = {'after': after} if after else {}
        res = self.graph.get_connections("me", "photos", fields="id", limit=100, **extraArgs)
        # If there's more data to fetch, fetch it (recursively)
        if 'paging' in res.keys():
            photoIds += self.getPhotoIds(after=res['paging']['cursors']['after'])
        for photo in res['data']:
            photoIds.append(photo['id'])
        return photoIds

    def getRandomPhoto(self):
        randomId = random.choice(self.photoIds)
        self.photoIds.remove(randomId)
        res = self.graph.get_object(randomId)
        data = requests.get(res['source']).content
        orig = Image.open(io.BytesIO(data)).convert("RGBA")
        (overlay, levels) = color.colorize(orig)
        orig.save("./static/generated/" + randomId + ".png")
        overlay.save("./static/generated/" + randomId + "-overlay.png")
        return {
            "id": randomId,
            "levels": levels
        }
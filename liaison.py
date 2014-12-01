# Copyright 2014 Avi Romanoff <avi at romanoff.me>

import io
import base64
import random

import facebook
import requests
import PIL.Image

import color

def imageToBase64String(image):
    # Encode the image and save it to an in-memory buffer
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    # image bytes -> base64 bytes -> utf-8 string
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

class Liaison(object):

    def __init__(self, db, player):
        self.player = player
        self.finishedColorize = False
        self.graph = facebook.GraphAPI(player['access_token'])
        if 'photo_ids' in player:
            self.photoIds = player['photo_ids']
        else:
            self.photoIds = player['photo_ids'] = self.getPhotoIds()
            db.players.save(player)

    def getProfile(self):
        profile = self.graph.get_object("me")
        profile['picture_url'] = self.graph.get_object("me/picture",
            type="large", redirect=False)['data']['url']
        profile['score'] = self.player['score']
        return profile

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
        res = self.graph.get_object(randomId)
        data = requests.get(res['source']).content
        original = PIL.Image.open(io.BytesIO(data)).convert("RGBA")
        (colorized, levels) = color.colorize(original)

        return {
            "id": randomId,
            "levels": levels,
            "original": imageToBase64String(original),
            "colorized": imageToBase64String(colorized),
        }
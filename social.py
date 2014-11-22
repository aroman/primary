import io
import sys
import random
from pprint import pprint as pp

import facebook
import requests
from PIL import Image

import color

graph = facebook.GraphAPI(sys.argv[1])

def getPhoto(photoId):
    pp(photoId)
    res = graph.get_object(photoId)
    data = requests.get(res['source']).content
    origImg = Image.open(io.BytesIO(data)).convert("RGBA")
    return color.colorize(origImg)

def getPhotoIds(after=None):
    photoIds = []
    # Don't pass the 'after' kwarg at all if it's not set
    extraArgs = {'after': after} if after else {}
    res = graph.get_connections("me", "photos", fields="id", limit=100, **extraArgs)
    # If there's more data to fetch, fetch it (recursively)
    if 'paging' in res.keys():
        photoIds += getPhotoIds(after=res['paging']['cursors']['after'])
    for photo in res['data']:
        photoIds.append(photo['id'])
    return photoIds

photoIds = getPhotoIds()
getPhoto(random.choice(photoIds))
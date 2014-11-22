import facebook
import sys
from pprint import pprint as pp

graph = facebook.GraphAPI(sys.argv[1])

def getPhotoIds(after=None):
    photoIds = []
    # Don't pass the 'after' kwarg at all if it's not set
    extraArgs = {'after': after} if after else {}
    res = graph.get_connections("me", "photos", fields="id", limit=10, **extraArgs)
    # If there's more data to fetch, fetch it (recursively)
    if 'paging' in res.keys():
        photoIds += getPhotoIds(after=res['paging']['cursors']['after'])
    for photo in res['data']:
        photoIds.append(photo['id'])
    return photoIds

pp(getPhotoIds())
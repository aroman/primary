import sys
from PIL import Image
import time

img = Image.open(sys.argv[1])

def dominantColor(r, g, b):
    if r < 25 and g < 25 and b < 25:
        return (r, g, b)
    if r > 200 and g > 200 and b > 200:
        return (r, g, b)
    if r in (g, b) or g in (r, b) or b in (r, g):
        return (r, g, b)
    if max(r, g, b) == b:
        return (0, 0, 255)
    if max(r, g, b) == g:
        return (0, 255, 0)
    if max(r, g, b) == r:
        return (255, 0, 0)
    else:
        return (r, g, b)

before = time.time()

newImgData = []
(width, height) = img.size
rSum = gSum = bSum = 0
for y in range(height):
    for x in range(width):
        pixel = img.getpixel((x,y))
        (r, g, b) = pixel
        rSum += r
        gSum += g
        bSum += b
        newImgData.append(dominantColor(*pixel))

print (time.time() - before)
total = rSum + gSum + bSum
print (rSum / total, gSum / total, bSum / total)

newImg = Image.new(img.mode, img.size)
newImg.putdata(newImgData)
print (time.time() - before)
newImg.show()
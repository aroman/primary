# Copyright 2014 Avi Romanoff <avi at romanoff.me>

import PIL.Image

def colorize(image):
    # constants are out here (although not global!)
    # as a performance optimization
    ALPHA_PIXEL = (255, 255, 255, 0)
    RED_PIXEL = (255, 0, 0)
    GREEN_PIXEL = (0, 255, 0)
    BLUE_PIXEL = (0, 0, 255)

    def isGrayish(r, g, b, a):
        average = (r + g + b) / 3
        return ((abs(average - r) < 20) and
                (abs(average - g) < 20) and
                (abs(average - b) < 20))

    def isBlueish(r, g, b, a):
        return b > (r + g) * 0.65

    def isGreenish(r, g, b, a):
        return g > (r + b) * 0.55

    def isRedish(r, g, b, a):
        return r > (g + b) * 0.60

    colorizedData = []
    (width, height) = image.size
    rSum = gSum = bSum = 0
    for y in range(height):
        for x in range(width):
            pixel = image.getpixel((x,y))
            if isGrayish(*pixel):
                colorizedData.append(ALPHA_PIXEL)
            elif isBlueish(*pixel):
                bSum += 1
                colorizedData.append(BLUE_PIXEL)
            elif isGreenish(*pixel):
                gSum += 1
                colorizedData.append(GREEN_PIXEL)
            elif isRedish(*pixel):
                rSum += 1
                colorizedData.append(RED_PIXEL)
            else:
                colorizedData.append(ALPHA_PIXEL)

    total = rSum + gSum + bSum

    colorized = PIL.Image.new(image.mode, image.size)
    colorized.putdata(colorizedData)

    # image was grayscale
    if total == 0:
        levels = {
            'red': 100 / 3,
            'green': 100 / 3,
            'blue': 100 / 3
        }
    else:
        levels = {
            'red': round(rSum / total * 100),
            'green': round(gSum / total * 100),
            'blue': round(bSum / total * 100)
        }

    return (colorized, levels)

from PIL import Image

def colorize(image):

	# TODO: Implement Joe's suggestion, which was 
	# to replace whiteish/blackish functions with
	# a single function that determines if all
	# three color values are close to eachother,
	# indicating a gray-ish value, which covers
	# both cases and is also inherently desirable.

	def isBlackish(r, g, b, a):
		return r < 25 and g < 25 and b < 25

	def isWhiteish(r, g, b, a):
		return r > 200 and g > 200 and b > 200

	def isBlue(r, g, b, a):
		return b > (r + g) * 0.65

	def isGreen(r, g, b, a):
		return g > (r + b) * 0.55

	def isRed(r, g, b, a):
		return r > (g + b) * 0.65

	colorizedData = []
	transparentPixel = (255, 255, 255, 0)
	(width, height) = image.size
	rSum = gSum = bSum = 0
	for y in range(height):
		for x in range(width):
			pixel = image.getpixel((x,y))
			if isBlackish(*pixel) or isWhiteish(*pixel):
				colorizedData.append(transparentPixel)
			elif isBlue(*pixel):
				bSum += 1
				colorizedData.append((0, 0, 255))
			elif isGreen(*pixel):
				gSum += 1
				colorizedData.append((0, 255, 0))
			elif isRed(*pixel):
				rSum += 1
				colorizedData.append((255, 0, 0))
			else:
				colorizedData.append(transparentPixel)

	total = rSum + gSum + bSum

	print("making new image with mode", image.mode)
	colorized = Image.new(image.mode, image.size)
	colorized.putdata(colorizedData)

	# image was grayscale
	if total == 0:
		levels = {
			'red': 33,
			'green': 33,
			'blue': 33
		}
	else:
		levels = {
			'red': round(rSum / total * 100),
			'green': round(gSum / total * 100),
			'blue': round(bSum / total * 100)
		}

	return (colorized, levels)

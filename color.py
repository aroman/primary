from PIL import Image

def evaluate(uri):
	img = Image.open(Ellipsis)

	# TODO: Implement Joe's suggestion, which was 
	# to replace whiteish/blackish functions with
	# a single function that determines if all
	# three color values are close to eachother,
	# indicating a gray-ish value, which covers
	# both cases and is also inherently desirable.

	def isBlackish(r, g, b):
		return r < 25 and g < 25 and b < 25

	def isWhiteish(r, g, b):
		return r > 200 and g > 200 and b > 200

	def isBlue(r, g, b):
		return b > (r + g) * 0.65

	def isGreen(r, g, b):
		return g > (r + b) * 0.55

	def isRed(r, g, b):
		return r > (g + b) * 0.60

	newImgData = []
	(width, height) = img.size
	rSum = gSum = bSum = 0
	for y in range(height):
		for x in range(width):
			pixel = img.getpixel((x,y))
			if isBlackish(*pixel) or isWhiteish(*pixel):
				newImgData.append(pixel)
			elif isBlue(*pixel):
				bSum += 1
				newImgData.append((0, 0, 255))
			elif isGreen(*pixel):
				gSum += 1
				newImgData.append((0, 255, 0))
			elif isRed(*pixel):
				rSum += 1
				newImgData.append((255, 0, 0))
			else:
				newImgData.append(pixel)

	total = rSum + gSum + bSum
	print (rSum / total, gSum / total, bSum / total)

	newImg = Image.new(img.mode, img.size)
	newImg.putdata(newImgData)
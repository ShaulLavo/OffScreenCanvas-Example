self.onmessage = function (event) {
	try {
		const { offscreen, imageBitmap, width, height } = event.data

		if (!offscreen) throw new Error('offscreen is null')
		if (!imageBitmap) throw new Error('imageBitmap is null')
		if (!width) throw new Error('width is null')
		if (!height) throw new Error('height is null')

		const ctx = offscreen.getContext('2d')
		if (!ctx) throw new Error('Could not get 2D context')

		ctx.drawImage(imageBitmap, 0, 0, width, height)

		const bitmap = offscreen.transferToImageBitmap()

		self.postMessage({ bitmap })
	} catch (err) {
		console.error('Error inside worker:', err)
	}
}

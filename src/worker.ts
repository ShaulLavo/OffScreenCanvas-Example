export type WorkerMessageData =
	| {
			type: 'start'
	  }
	| {
			canvasId: string
			offscreen: OffscreenCanvas
			imageBitmap: ImageBitmap
			canvasWidth: number
			canvasHeight: number
			buffer: SharedArrayBuffer | ArrayBuffer
			type: 'init'
	  }

type CanvasContext = {
	offscreen: OffscreenCanvas
	imageBitmap: ImageBitmap
	context: OffscreenCanvasRenderingContext2D
}

const updatePosition = (
	current: number,
	other: number,
	width: number,
	delta: number
) => {
	const newX = current - 100 * (delta / 1000)
	if (newX + width < 0) {
		return other + width
	}
	return newX
}

const frameDuration: number = 1000 / 60 // 60 FPS
const canvasMap: Record<string, CanvasContext> = {}
let height: number
let width: number

self.onmessage = function (event: MessageEvent<WorkerMessageData>) {
	try {
		const { type } = event.data

		if (type === 'init') {
			const { canvasId, offscreen, imageBitmap, canvasHeight, canvasWidth } =
				event.data
			const ctx = offscreen.getContext('2d')!
			canvasMap[canvasId] = {
				offscreen: offscreen,
				imageBitmap: imageBitmap,
				context: ctx,
			}
			height = canvasHeight
			width = canvasWidth

			ctx.drawImage(imageBitmap, 0, 0, width, height)
			ctx.drawImage(imageBitmap, width, 0, width, height)
		}

		let imageX = 0
		let imageCopyX = width
		let prevTime = 0

		function animate(currentTime: number) {
			let delta = currentTime - prevTime

			if (delta > frameDuration) {
				imageX = updatePosition(imageX, imageCopyX, width, delta)
				imageCopyX = updatePosition(imageCopyX, imageX, width, delta)

				Object.keys(canvasMap).forEach(id => {
					const ctx = canvasMap[id].context
					ctx.clearRect(0, 0, width, height)
					ctx.drawImage(canvasMap[id].imageBitmap, imageX, 0, width + 2, height)
					ctx.drawImage(
						canvasMap[id].imageBitmap,
						imageCopyX,
						0,
						width + 2,
						height
					)
				})

				prevTime = currentTime - (delta % frameDuration)
			}
			requestAnimationFrame(animate)
		}

		if (type === 'start') requestAnimationFrame(animate)
	} catch (err) {
		err instanceof Error && self.postMessage({ message: err.message })
	}
}

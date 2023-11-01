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

const canvasMap: Record<string, CanvasContext> = {}
let height: number
let width: number

const updatePosition = (current: number, other: number, width: number) => {
	const newX = current - 8
	if (newX + width < 0) {
		return other + width
	}
	return newX
}

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
		function animate() {
			requestAnimationFrame(() => {
				imageX = updatePosition(imageX, imageCopyX, width)
				imageCopyX = updatePosition(imageCopyX, imageX, width)

				Object.keys(canvasMap).forEach(id => {
					const ctx = canvasMap[id].context
					ctx.clearRect(0, 0, width, height)
					ctx.drawImage(canvasMap[id].imageBitmap, imageX, 0, width, height)
					ctx.drawImage(canvasMap[id].imageBitmap, imageCopyX, 0, width, height)
				})
				animate()
			})
		}
		if (type === 'start') animate()
	} catch (err) {
		err instanceof Error && self.postMessage({ message: err.message })
	}
}

interface WorkerMessageData {
	canvasId: string
	offscreen: OffscreenCanvas
	imageBitmap: ImageBitmap
	width: number
	height: number
	buffer: SharedArrayBuffer | ArrayBuffer
	type: 'init' | 'update'
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
		const { canvasId, type } = event.data

		if (type === 'init') {
			canvasMap[canvasId] = {
				offscreen: event.data.offscreen,
				imageBitmap: event.data.imageBitmap,
				context: event.data.offscreen.getContext('2d')!,
			}
			height = event.data.height
			width = event.data.width
		}
		if (!canvasMap[canvasId]) {
			throw new Error(`Canvas with id ${canvasId} is not initialized.`)
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

		animate()
	} catch (err) {
		err instanceof Error && self.postMessage({ message: err.message })
	}
}

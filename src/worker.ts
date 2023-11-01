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
let sharedData: Int32Array

self.onmessage = function (event: MessageEvent<WorkerMessageData>) {
	try {
		const { canvasId, buffer, type } = event.data

		if (type === 'init') {
			canvasMap[canvasId] = {
				offscreen: event.data.offscreen,
				imageBitmap: event.data.imageBitmap,
				context: event.data.offscreen.getContext('2d')!,
			}
			height = event.data.height
			sharedData = new Int32Array(buffer)
			width = event.data.width
		}
		if (!canvasMap[canvasId]) {
			throw new Error(`Canvas with id ${canvasId} is not initialized.`)
		}

		function animate() {
			requestAnimationFrame(() => {
				Object.keys(canvasMap).forEach(id => {
					const ctx = canvasMap[id].context
					ctx.clearRect(0, 0, width, height)
					ctx.drawImage(
						canvasMap[id].imageBitmap,
						sharedData[0],
						0,
						width,
						height
					)
					ctx.drawImage(
						canvasMap[id].imageBitmap,
						sharedData[1],
						0,
						width,
						height
					)
				})
				animate()
			})
		}

		animate()
	} catch (err) {
		err instanceof Error && self.postMessage({ message: err.message })
	}
}

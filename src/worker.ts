interface WorkerMessageData {
	id: string
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
}

const canvasMap: Record<string, CanvasContext> = {}
let height: number
let width: number
let sharedData: Int32Array

self.onmessage = function (event: MessageEvent<WorkerMessageData>) {
	try {
		const { id, buffer, type } = event.data

		if (type === 'init') {
			canvasMap[id] = {
				offscreen: event.data.offscreen,
				imageBitmap: event.data.imageBitmap,
			}
			height = event.data.height
			sharedData = new Int32Array(buffer)
			width = event.data.width
		}
		self.postMessage({ imageBitmap: canvasMap[id].imageBitmap })

		if (!canvasMap[id]) {
			throw new Error(`Canvas with id ${id} is not initialized.`)
		}

		const ctx = canvasMap[id].offscreen.getContext('2d')!
		if (!ctx) throw new Error('Could not get 2D context')
		function animate() {
			requestAnimationFrame(() => {
				Object.keys(canvasMap).forEach(id => {
					const canvasContext = canvasMap[id]
					const ctx = canvasContext.offscreen.getContext('2d')!
					if (!ctx) throw new Error('Could not get 2D context')

					ctx.clearRect(0, 0, width, height)
					ctx.drawImage(canvasContext.imageBitmap, 0, 0, width, height)
					// ctx.drawImage(
					// 	canvasContext.imageBitmap,
					// 	canvasContext.sharedData[1],
					// 	0,
					// 	canvasContext.width,
					// 	canvasContext.height
					// )
				})
				animate()
			})
		}

		animate()
	} catch (err) {
		console.error('Error inside worker:', err)
	}
}

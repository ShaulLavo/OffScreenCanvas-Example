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
	width: number
	height: number
	sharedData: Int32Array
}

const canvasMap: Record<string, CanvasContext> = {}

self.onmessage = function (event: MessageEvent<WorkerMessageData>) {
	try {
		const { id, buffer, type } = event.data
		self.postMessage({ buffer })

		if (type === 'init') {
			canvasMap[id] = {
				offscreen: event.data.offscreen,
				imageBitmap: event.data.imageBitmap,
				width: event.data.width,
				height: event.data.height,
				sharedData: new Int32Array(buffer),
			}
		}

		if (!canvasMap[id]) {
			throw new Error(`Canvas with id ${id} is not initialized.`)
		}

		const ctx = canvasMap[id].offscreen.getContext('2d')!
		if (!ctx) throw new Error('Could not get 2D context')

		function* offsetGenerator() {
			let offset = 10
			while (true) {
				yield offset
				yield -offset
			}
		}
		const offset = offsetGenerator()

		function animate() {
			requestAnimationFrame(async () => {
				ctx.clearRect(0, 0, canvasMap[id].width, canvasMap[id].height)
				ctx.drawImage(
					canvasMap[id].imageBitmap,
					canvasMap[id].sharedData[0],
					0,
					canvasMap[id].width,
					canvasMap[id].height
				)
				ctx.drawImage(
					canvasMap[id].imageBitmap,
					canvasMap[id].sharedData[1],
					0,
					canvasMap[id].width + offset.next().value!,
					canvasMap[id].height
				)
				animate()
			})
		}

		animate()
	} catch (err) {
		console.error('Error inside worker:', err)
	}
}

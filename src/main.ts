import './style.css'
import { WorkerMessageData } from './worker'

const IMAGE_NAMES = ['sky', 'mountains', 'trees', 'ground', 'grass']
const app = document.getElementById('app') as HTMLDivElement
const shouldUseWorkers = false
const shouldUseOffscreenCanvas = false
//main thread rendering
const canvases: {
	canvas: OffscreenCanvas | HTMLCanvasElement
	img: ImageBitmap
}[] = []
let imageX = 0
let imageCopyX = window.innerWidth
let prevTime = 0
const frameDuration: number = 1000 / 60 // 60 FPS

function createCanvas() {
	const canvas = document.createElement('canvas')
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
	canvas.style.position = 'absolute'

	app.appendChild(canvas)
	if (!shouldUseOffscreenCanvas && !shouldUseWorkers) return canvas
	return canvas.transferControlToOffscreen()
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

const getImageUrl = (name: string) =>
	`https://res.cloudinary.com/dp7akzaod/image/upload/v1698698710/${name}.png`

const imagePaths = IMAGE_NAMES.map(name => {
	return getImageUrl(name)
})

async function preloadImages(imagePaths: string[]) {
	const promises = imagePaths.map(imagePath => {
		return new Promise<HTMLImageElement>(resolve => {
			const image = new Image()
			image.crossOrigin = 'anonymous'
			image.src = imagePath
			image.width = window.innerWidth
			image.height = window.innerHeight
			image.onload = () => resolve(image)
		})
	})

	return await Promise.all(promises)
}

;(async () => {
	const images = await preloadImages(imagePaths)
	const imageBitmaps = await Promise.all(
		images.map(image => createImageBitmap(image))
	)
	if (shouldUseWorkers) {
		const chunkSize = 3
		const totalImages = imageBitmaps.length
		// Split the the rendering tasks into chunks of 3
		// each worker get 3 canvas elements to render
		for (let i = 0; i < totalImages; i += chunkSize) {
			const imagesChunk = imageBitmaps.slice(i, i + chunkSize)
			const namesChunk = IMAGE_NAMES.slice(i, i + chunkSize)
			createWorkerTask(namesChunk, imagesChunk)
		}
	} else {
		drawOffScreenWithoutWorker(imageBitmaps)
		requestAnimationFrame(animate)
	}
})()

function drawOffScreenWithoutWorker(imageBitmaps: ImageBitmap[]) {
	imageBitmaps.forEach(img => {
		const canvas = createCanvas()
		const ctx = canvas.getContext('2d')!
		// ctx.clip = function () {}
		ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight)
		ctx.drawImage(
			img,
			window.innerWidth,
			0,
			window.innerWidth,
			window.innerHeight
		)
		canvases.push({ canvas, img })
	})
}

function animate(currentTime: number) {
	let delta = currentTime - prevTime

	if (delta > frameDuration) {
		imageX = updatePosition(imageX, imageCopyX, window.innerWidth, delta)
		imageCopyX = updatePosition(imageCopyX, imageX, window.innerWidth, delta)

		canvases.forEach(({ canvas, img }) => {
			const ctx = canvas.getContext('2d')!
			ctx.clearRect?.(0, 0, window.innerWidth, window.innerHeight)
			ctx.drawImage(img, imageX, 0, window.innerWidth + 2, window.innerHeight)
			ctx.drawImage(
				img,
				imageCopyX,
				0,
				window.innerWidth + 2,
				window.innerHeight
			)
		})

		prevTime = currentTime - (delta % frameDuration)
	}
	requestAnimationFrame(animate)
}
function createWorkerTask(ids: string[], imageBitmaps: ImageBitmap[]): void {
	try {
		const worker = new Worker(new URL('./worker.ts', import.meta.url))

		ids.forEach((id, index) => {
			const canvas = createCanvas() as OffscreenCanvas
			worker.postMessage(
				{
					canvasId: id,
					offscreen: canvas,
					imageBitmap: imageBitmaps[index],
					canvasWidth: window.innerWidth,
					canvasHeight: window.innerHeight,
					type: 'init',
				} as WorkerMessageData,
				[canvas]
			)
		})
		worker.postMessage({ type: 'start' } as WorkerMessageData)
		worker.onmessage = function (event: MessageEvent) {
			console.log(event.data)
		}
	} catch (error) {
		console.error(error)
	}
}

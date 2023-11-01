import './style.css'

if (!crossOriginIsolated) throw new Error('Not cross origin isolated')

const IMAGE_NAMES = ['sky', 'mountains', 'trees', 'ground', 'grass']
const app = document.getElementById('app') as HTMLDivElement

const buffer = new SharedArrayBuffer(8)

const sharedData = new Int32Array(buffer)
sharedData[0] = 0
sharedData[1] = window.innerWidth

const updatePosition = (current: number, other: number, width: number) => {
	console.log(current, other, width)
	const newX = current - 1
	if (newX + width < 0) {
		console.log('ha?')
		return other + width
	}
	return newX
}

function createWorkerTask(ids: string[], imageBitmaps: ImageBitmap[]): void {
	try {
		const worker = new Worker(new URL('./worker.ts', import.meta.url))

		ids.forEach((id, index) => {
			const canvas = createCanvas()
			worker.postMessage(
				{
					canvasId: id,
					offscreen: canvas,
					imageBitmap: imageBitmaps[index],
					width: window.innerWidth,
					height: window.innerHeight,
					buffer,
					type: 'init',
				},
				[canvas]
			)
		})

		worker.onmessage = function (event: MessageEvent) {
			console.log(event.data)
		}
	} catch (error) {
		console.error(error)
	}
}

function createCanvas() {
	const canvas = document.createElement('canvas')
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
	canvas.style.position = 'absolute'

	app.appendChild(canvas)

	return canvas.transferControlToOffscreen()
}

const getImageUrl = (name: string) =>
	`https://res.cloudinary.com/dp7akzaod/image/upload/v1698698710/${name}.png`

const imagePaths = IMAGE_NAMES.map(name => {
	return getImageUrl(name)
})

const preloadImages = async (imagePaths: string[]) => {
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
function animate() {
	requestAnimationFrame(() => {
		sharedData[0] = updatePosition(
			sharedData[0],
			sharedData[1],
			window.innerWidth
		)
		sharedData[1] = updatePosition(
			sharedData[1],
			sharedData[0],
			window.innerWidth
		)
		animate()
	})
}

;(async () => {
	const images = await preloadImages(imagePaths)
	const imageBitmaps = await Promise.all(
		images.map(image => createImageBitmap(image))
	)
	const firstThreeImages = imageBitmaps.slice(0, 3)
	const lastTwoImages = imageBitmaps.slice(3)
	createWorkerTask(IMAGE_NAMES.slice(0, 3), firstThreeImages)
	createWorkerTask(IMAGE_NAMES.slice(3), lastTwoImages)
	animate()
})()

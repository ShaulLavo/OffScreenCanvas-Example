import './style.css'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
canvas.width = window.innerWidth
canvas.height = window.innerHeight
const ctx = canvas.getContext('2d')!

async function createWorkerTask(
	imageBitmap: ImageBitmap
): Promise<ImageBitmap> {
	return new Promise(async (resolve, reject) => {
		try {
			const offscreen = new OffscreenCanvas(
				window.innerWidth,
				window.innerHeight
			)
			const worker = new Worker('/worker.ts')

			worker.onmessage = event => {
				resolve(event.data.bitmap)
			}

			worker.onerror = error => {
				reject(error)
			}

			worker.postMessage(
				{
					offscreen,
					imageBitmap,
					width: window.innerWidth,
					height: window.innerHeight,
				},
				[offscreen]
			)
		} catch (error) {
			reject(error)
		}
	})
}

async function drawLayers(imageElements: HTMLImageElement[]) {
	const tasks: Promise<ImageBitmap>[] = []

	for (const imageElement of imageElements.values()) {
		const imageBitmap = await createImageBitmap(imageElement)
		const task = createWorkerTask(imageBitmap)
		tasks.push(task)
	}

	try {
		const bitmaps = await Promise.all(tasks)

		bitmaps.forEach(bitmap => {
			ctx.drawImage(bitmap, 0, 0)
		})
	} catch (error) {
		console.error('An error occurred:', error)
	}
}
const getImageUrl = (name: string) =>
	`https://res.cloudinary.com/dp7akzaod/image/upload/v1698698710/${name}.png`

const imagePaths = ['sky', 'mountains', 'trees', 'ground', 'grass'].map(
	getImageUrl
)

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

;(async () => {
	const images = await preloadImages(imagePaths)
	await drawLayers(images)
})()

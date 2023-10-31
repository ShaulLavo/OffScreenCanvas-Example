import './style.css'

if (!crossOriginIsolated) throw new Error('Not cross origin isolated')
const IMAGE_NAMES = ['sky', 'mountains', 'trees', 'ground', 'grass']
const app = document.getElementById('app') as HTMLDivElement
console.log(crossOriginIsolated)
const buffer = new SharedArrayBuffer(8)

const sharedData = new Int32Array(buffer)
sharedData[0] = 0
sharedData[1] = window.innerWidth

let workers: Worker[] = []
const updatePosition = (current: number, other: number, width: number) => {
	const newX = current - 10
	if (newX + width < 0) {
		return other + width
	}
	return newX
}

function createWorker(): Worker {
	const worker = new Worker(new URL('./worker.ts', import.meta.url))

	worker.onmessage = event => {
		console.log(event.data)
	}

	return worker
}

function createCanvas() {
	const canvas = document.createElement('canvas')
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
	canvas.style.position = 'absolute'

	app.appendChild(canvas)

	return canvas.transferControlToOffscreen()
}

async function firstPaint(imageElements: HTMLImageElement[]) {
	const backgroundImages = [...imageElements, ,]
		.filter(Boolean)
		.map(async image => await createImageBitmap(image!))
	const foregroundImages = [, , , ...imageElements]
		.filter(Boolean)
		.map(async image => await createImageBitmap(image!))
	workers.push(createWorker())
	workers.push(createWorker())
	backgroundImages.forEach((imageBitmap, i) => {
		const offscreen = createCanvas()

		workers[0].postMessage(
			{
				offscreen,
				imageBitmap,
				width: window.innerWidth,
				height: window.innerHeight,
				buffer,
				type: 'init',
				id: IMAGE_NAMES[i],
			},
			[offscreen]
		)
	})
	foregroundImages.forEach((imageBitmap, i) => {
		const offscreen = createCanvas()

		workers[1].postMessage(
			{
				offscreen,
				imageBitmap,
				width: window.innerWidth,
				height: window.innerHeight,
				buffer,
				type: 'init',
				id: [, , , ...IMAGE_NAMES].filter(Boolean)[i],
			},
			[offscreen]
		)
	})
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
	await firstPaint(images)
	animate()
})()

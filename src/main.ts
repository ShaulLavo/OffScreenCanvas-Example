import './style.css'

const IMAGE_NAMES = ['sky', 'mountains', 'trees', 'ground', 'grass']
const app = document.getElementById('app') as HTMLDivElement

//main thread rendering
const canvases: {
	canvas: OffscreenCanvas | HTMLCanvasElement
	img: ImageBitmap
}[] = []
let imageX = 0
let imageCopyX = window.innerWidth
let prevTime = 0
const frameDuration: number = 1000 / 60 // 60 FPS

function createCanvas(shouldUseOffscreenCanvas = false, isBottom = false) {
	const canvas = document.createElement('canvas')
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight / 2
	canvas.style.position = 'absolute'
	if (isBottom) canvas.style.bottom = '0px'
	app.appendChild(canvas)
	if (shouldUseOffscreenCanvas) return canvas.transferControlToOffscreen()
	return canvas
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
			image.height = window.innerHeight / 2
			image.onload = () => resolve(image)
		})
	})

	return await Promise.all(promises)
}

function drawOffScreenWithoutWorker(
	imageBitmaps: ImageBitmap[],
	isOffscreen = false
) {
	imageBitmaps.forEach(img => {
		const canvas = isOffscreen ? createCanvas(true, true) : createCanvas()
		const ctx = canvas.getContext('2d')!
		ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight / 2)
		ctx.drawImage(
			img,
			window.innerWidth,
			0,
			window.innerWidth,
			window.innerHeight / 2
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
			ctx.clearRect?.(0, 0, window.innerWidth, window.innerHeight / 2)
			ctx.drawImage(
				img,
				imageX,
				0,
				window.innerWidth + 5,
				window.innerHeight / 2
			)
			ctx.drawImage(
				img,
				imageCopyX,
				0,
				window.innerWidth + 5,
				window.innerHeight / 2
			)
			ctx.font = '48px serif'
			ctx.fillText(
				ctx instanceof OffscreenCanvasRenderingContext2D
					? 'Off Screen'
					: 'On Screen',
				innerWidth / 2 - 60,
				window.innerHeight / 4
			)
		})

		prevTime = currentTime - (delta % frameDuration)
	}
	requestAnimationFrame(animate)
}

;(async () => {
	const images = await preloadImages(imagePaths)
	const imageBitmaps = await Promise.all(
		images.map(image => createImageBitmap(image))
	)
	drawOffScreenWithoutWorker(imageBitmaps)
	drawOffScreenWithoutWorker(imageBitmaps, true)
	requestAnimationFrame(animate)
})()

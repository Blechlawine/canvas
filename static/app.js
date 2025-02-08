import { colors } from "/colors.js";

const pixelSize = 5;

/**
 * @typedef {{ x: number; y: number: color: number; }} WebsocketEvent
 * @typedef {{ pixels: Array<number>; height: number; width: number; }} Canvas
 */

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");

async function main() {
	if (!canvas) {
		console.error("No canvas element found");
		return;
	}
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		console.error("No canvas context found");
		return;
	}

	canvas.style.pointerEvents = "none";

	await fetchInitialCanvasState(ctx);

	initSocket(ctx);
	initCamera();
	initToolbar();

	canvas.style.pointerEvents = "auto";

	// const reloadButton = document.createElement("button");
	// reloadButton.innerHTML = "🔄";
	// reloadButton.addEventListener("click", () => {
	// 	fetchInitialCanvasState(ctx);
	// });
	// document.getElementById("toolbar").appendChild(reloadButton);
}

/** @type {number | null} */
let selectedColor = null;
function initToolbar() {
	const toolbar = document.getElementById("toolbar");
	/** @type {HTMLButtonElement[]} */
	const buttons = [];
	/**
	 * @param {string} color
	 * @returns {HTMLButtonElement}
	 */
	function createColorButton(color) {
		const button = document.createElement("button");
		button.style.background = color;
		button.classList.add("color-button");
		buttons.push(button);
		button.addEventListener("click", () => {
			if (selectedColor === colors.indexOf(color)) {
				selectedColor = null;
				button.classList.remove("selected");
				return;
			}
			button.classList.add("selected");
			selectedColor = colors.indexOf(color);
			for (const otherButton of buttons) {
				if (otherButton !== button) {
					otherButton.classList.remove("selected");
				}
			}
		});
		return button;
	}
	for (const color of colors) {
		toolbar.appendChild(createColorButton(color));
	}
}

let spacebarHeld = false;
function initCamera() {
	let canvasPositionX = 0;
	let canvasPositionY = 0;
	let canvasScale = 1;
	const canvasContainer = document.getElementById("canvas-container");
	function setCanvasPosition(x, y) {
		canvasPositionX = x;
		canvasPositionY = y;
		canvas.style.translate = `${canvasPositionX}px ${canvasPositionY}px`;
	}
	function setCanvasScale(scale) {
		canvasScale = scale;
		canvasContainer.style.scale = `${canvasScale}`;
	}

	let moving = false;
	let mouseDownPositionX = null;
	let mouseDownPositionY = null;
	let prevCanvasPositionX = null;
	let prevCanvasPositionY = null;
	window.addEventListener("mousedown", (event) => {
		moving = true;
		mouseDownPositionX = event.clientX;
		mouseDownPositionY = event.clientY;
		prevCanvasPositionX = canvasPositionX;
		prevCanvasPositionY = canvasPositionY;
	});
	window.addEventListener("mousemove", (event) => {
		event.preventDefault();
		if (spacebarHeld && moving) {
			moveCanvas(event);
		}
	});
	window.addEventListener("mouseup", () => {
		moving = false;
	});
	window.addEventListener(
		"wheel",
		(event) => {
			event.preventDefault();
			if (event.deltaY > 0) setCanvasScale(canvasScale * 0.9);
			else setCanvasScale(canvasScale * 1.1);
		},
		{
			passive: false,
		},
	);
	// pressing spacebar lets you move the canvas
	window.addEventListener("keydown", (event) => {
		if (event.code === "Space") {
			event.preventDefault();
			document.body.style.cursor = "grab";
			spacebarHeld = true;
		}
	});
	window.addEventListener("keyup", (event) => {
		if (event.code === "Space") {
			event.preventDefault();
			document.body.style.cursor = "auto";
			spacebarHeld = false;
		}
	});
	function moveCanvas(event) {
		setCanvasPosition(
			prevCanvasPositionX + (event.clientX - mouseDownPositionX) / canvasScale,
			prevCanvasPositionY + (event.clientY - mouseDownPositionY) / canvasScale,
		);
	}
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} color
 */
function drawRect(ctx, x, y, color) {
	if (!colors[color]) {
		console.error("Invalid color index:", color);
		return;
	}
	ctx.fillStyle = colors[color];
	ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function initSocket(ctx) {
	const mainSocket = new WebSocket("/ws");

	mainSocket.addEventListener("message", (event) => {
		/** @type {WebsocketEvent} */
		const data = JSON.parse(event.data);
		drawRect(ctx, data.x, data.y, data.color);
	});

	canvas.addEventListener("click", (event) => {
		if (spacebarHeld || selectedColor === null) return;
		const pixelX = Math.floor(event.offsetX / pixelSize);
		const pixelY = Math.floor(event.offsetY / pixelSize);
		// const randomColor = Math.floor(Math.random() * colors.length);
		/** @satisfies {WebsocketEvent} */
		const payload = { x: pixelX, y: pixelY, color: selectedColor };
		mainSocket.send(JSON.stringify(payload));
	});
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
async function fetchInitialCanvasState(ctx) {
	const response = await fetch("/canvas");
	/** @type {Canvas} */
	const json = await response.json();
	const canvasHeight = json.height * pixelSize;
	const canvasWidth = json.width * pixelSize;
	ctx.canvas.width = canvasWidth;
	ctx.canvas.height = canvasHeight;

	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
	let pixelsDrawn = 0;
	for (let y = 0; y < json.height; y++) {
		for (let x = 0; x < json.width; x++) {
			const index = y * json.width + x;
			const pixel = json.pixels[index];

			// Only draw non-zero pixels, because 0 is the default canvas color (white)
			if (pixel !== 0) {
				drawRect(ctx, x, y, pixel);
				pixelsDrawn++;
			}
		}
	}
	console.log(`drew ${pixelsDrawn} pixels`);
}

main();

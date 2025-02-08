import { colors } from "/colors.js";

const pixelSize = 5;

/**
 * @typedef {{ x: number; y: number: color: number; }} WebsocketEvent
 * @typedef {{ pixels: Array<number>; height: number; width: number; }} Canvas
 */

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");

async function main() {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	console.log(ctx);
	if (!ctx) return;

	const { width, height } = await fetchInitialCanvasState(ctx);
	canvas.height = height;
	canvas.width = width;
	initSocket(ctx);
	initCamera();
	initToolbar();
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
 */
function initSocket(ctx) {
	const mainSocket = new WebSocket("/ws");

	mainSocket.addEventListener("message", (event) => {
		/** @type {WebsocketEvent} */
		const data = JSON.parse(event.data);
		console.log({ data });
		ctx.fillStyle = colors[data.color];
		ctx.fillRect(data.x * pixelSize, data.y * pixelSize, pixelSize, pixelSize);
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
 * @returns {Promise<{width: number; height: number; }>}
 */
async function fetchInitialCanvasState(ctx) {
	const response = await fetch("/canvas");
	/** @type {Canvas} */
	const json = await response.json();
	for (let i = 0; i < json.pixels.length; i++) {
		const pixel = json.pixels[i];
		if (pixel === 0) continue;
		ctx.fillStyle = colors[pixel];
		ctx.fillRect(
			(i % json.width) * pixelSize,
			Math.floor(i / json.width) * pixelSize,
			pixelSize,
			pixelSize,
		);
	}
	return {
		height: json.height * pixelSize,
		width: json.width * pixelSize,
	};
}

main();

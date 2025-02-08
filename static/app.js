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
}

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

	let canMove = false;
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
		if (canMove && moving) {
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
			canMove = true;
		}
	});
	window.addEventListener("keyup", (event) => {
		if (event.code === "Space") {
			event.preventDefault();
			document.body.style.cursor = "auto";
			canMove = false;
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

	const testButton = document.getElementById("button");
	testButton.addEventListener("click", () => {
		mainSocket.send(JSON.stringify({ x: 0, y: 0, color: 10 }));
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
	console.log({ json });
	for (let i = 0; i < json.pixels.length; i++) {
		const pixel = json.pixels[i];
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

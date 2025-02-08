import { colors } from "/colors.js";

const pixelSize = 10;

/**
 * @typedef {{ x: number; y: number: color: number; }} WebsocketEvent
 * @typedef {{ pixels: Array<number>; height: number; width: number; }} Canvas
 */

function main() {
	/** @type {HTMLCanvasElement} */
	const canvas = document.getElementById("canvas");
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	console.log(ctx);
	if (!ctx) return;

	fetchInitialCanvasState(ctx);
	initSocket(ctx);
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
}

main();

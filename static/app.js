/**
 * @typedef {{x: number; y: number: color: string;}} WebsocketEvent
 * @typedef {{pixels: Array<number>}} Canvas
 */

function main() {
	/** @type {HTMLCanvasElement} */
	const canvas = document.getElementById("canvas");
	if (!canvas) return;

	fetchInitialCanvasState();

	initSocket();

	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "red";
	ctx.fillRect(0, 0, 100, 100);
}

function initSocket() {
	const mainSocket = new WebSocket("/ws");
	mainSocket.addEventListener("message", onMessage);
	const testButton = document.getElementById("button");
	testButton.addEventListener("click", () => {
		mainSocket.send(JSON.stringify({ x: 0, y: 0, color: "Red" }));
	});
}

async function fetchInitialCanvasState() {
	const response = await fetch("/canvas");
	/** @type {Canvas} */
	const json = await response.json();
	console.log({ json });
}

/**
 * @param {MessageEvent<string>} event
 */
function onMessage(event) {
	console.log({ event });
}

main();

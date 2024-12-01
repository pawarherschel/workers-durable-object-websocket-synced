import { DurableObject } from "cloudflare:workers";

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject {
	private counter: number;
	private clients: Array<WebSocket>

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.counter = 0;
		this.clients = [];
	}

	inc(): number {
		this.counter += 1;
		return this.counter;
	}

	dec(): number {
		this.counter -= 1;
		return this.counter;
	}

	get(): number {
		return this.counter;
	}

	async fetch(request: Request): Promise<Response> {
		const websocketPair = new WebSocketPair();
		const [client, server] = Object.values(websocketPair);

		server.accept();

		this.clients.push(server);

		server.addEventListener('message', (e) => {
			let {data} = e;
			let {event} = JSON.parse(data);

			let val;

			switch (event) {
				case "get":
					val = this.get();
					break;
				case "inc":
					val = this.inc();
					break;
				case "dec":
					val = this.dec();
					break;
				default:
					throw new Error("ugh");
			}

			for (let client of this.clients) {
				client.send(String(val));
			}
		})

		server.addEventListener('close', (e) => {
			server.close(e.code, "closing");
		})

		return new Response(null, {status: 101, webSocket:client});
	}
}

import html from "./index.html";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		let url = new URL(request.url);

		if (url.pathname.endsWith("/")) {
			return new Response(html, {
				headers: {
					"Content-Type": "text/html;charset=UTF-8"
				}
			})
		}

		if(!url.pathname.endsWith("/ws")) {
			return new Response("404", {status: 404});
		}

		const upgradeHeader = request.headers.get("Upgrade")

		if(!upgradeHeader || upgradeHeader !== "websocket") {
			return new Response("expected `Upgrade: websocket`", {status: 426});
		}

		let id: DurableObjectId = env.MY_DURABLE_OBJECT.idFromName("kat");
		let stub = env.MY_DURABLE_OBJECT.get(id);

		return await stub.fetch(request);
	},
} satisfies ExportedHandler<Env>;

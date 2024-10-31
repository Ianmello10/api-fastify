import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db-connection/database";
import crypto from "node:crypto";
import { checkSessionIdExists } from "../middlewares/check-session-id-exist";

export async function transactionsRoutes(app: FastifyInstance) {
	app.get(
		"/",
		{ preHandler: [checkSessionIdExists] },
		async (request, reply) => {
			const { sessionId } = request.cookies;

			const transactions = await db("transactions")
				.select()
				.where("session_id", sessionId);

			return { transactions };
		},
	);

	app.get("/:id", { preHandler: [checkSessionIdExists] }, async (request) => {
		const { sessionId } = request.cookies;

		const getTransactionsParams = z.object({
			id: z.string().uuid(),
		});

		const { id } = getTransactionsParams.parse(request.params);

		const transaction = await db("transactions")
			.where({
				id: id,
				session_id: sessionId,
			})
			.first();

		return { transaction };
	});

	app.get(
		"/summary",
		{ preHandler: [checkSessionIdExists] },
		async (request) => {
			const { sessionId } = request.cookies;

			const summary = await db("transactions")
				.sum("amount", { as: "amount" })
				.where("session_id", sessionId)
				.first();

			return { summary };
		},
	);

	app.post(
		"/",

		async (request, reply) => {
			const createTransactionBody = z.object({
				title: z.string(),
				amount: z.number(),
				type: z.enum(["credit", "debt"]),
			});

			const { title, amount, type } = createTransactionBody.parse(request.body);

			let sessionId = request.cookies.sessionId;

			if (!sessionId) {
				sessionId = crypto.randomUUID();
				reply.cookie("sessionId", sessionId, {
					path: "/",
					maxAge: 60 * 60 * 24 * 7,
				});
			}

			await db("transactions").insert({
				id: crypto.randomUUID(),
				title,
				amount: type === "credit" ? amount : amount * -1,
				session_id: sessionId,
			});

			return reply.status(201).send();
		},
	);
}

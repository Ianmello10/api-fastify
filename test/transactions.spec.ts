import {
	expect,
	test,
	beforeAll,
	afterAll,
	describe,
	it,
	beforeEach,
} from "vitest";
import request from "supertest"; // supertest allow us to make http requests
import { app } from "../src/app";
import { execSync } from "child_process";

describe("Transactions routes", () => {
	// await app be ready
	beforeAll(async () => {
		await app.ready();
	});

	// close app after all operations
	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		execSync("npm run knex migrate:rollback --all");
		execSync("npm run knex migrate:latest");
	});

	it("should be able to  create a new transactions", async () => {
		await request(app.server)
			.post("/transactions")
			.send({
				title: "New transaction",
				amount: 5000,
				type: "credit",
			})
			.expect(201);
	});

	it("should be able to list all transactions", async () => {
		const createTransactionResponse = await request(app.server)
			.post("/transactions")
			.send({
				title: "New transaction",
				amount: 5000,
				type: "credit",
			});

		const cookies = createTransactionResponse.get("Set-Cookie");

		const listAllTransactionsResponse = await request(app.server)
			.get("/transactions")
			.set("Cookie", cookies as string[])
			.expect(200);

		expect(listAllTransactionsResponse.body.transactions).toEqual([
			expect.objectContaining({
				title: "New transaction",
				amount: 5000,
			}),
		]);
	});

	it("should be able to get a specific transaction", async () => {
		const createTransactionResponse = await request(app.server)
			.post("/transactions/")
			.send({
				title: "New transaction",
				amount: 5000,
				type: "credit",
			});

		const cookies = createTransactionResponse.get("Set-Cookie");

		const listAllTransactionsResponse = await request(app.server)
			.get("/transactions")
			.set("Cookie", cookies as string[])
			.expect(200);

		const transactionId = listAllTransactionsResponse.body.transactions[0].id;

		const getTransactionResponse = await request(app.server)
			.get(`/transactions/${transactionId}`)
			.set("Cookie", cookies as string[])
			.expect(200);

		expect(getTransactionResponse.body.transaction).toEqual(
			expect.objectContaining({
				title: "New transaction",
				amount: 5000,
			}),
		);
	});

	it("should be able to get a summary", async () => {
		const createTransactionResponse = await request(app.server)
			.post("/transactions")
			.send({
				title: "Credt transaction",
				amount: 5000,
				type: "credit",
			});

		const cookies = createTransactionResponse.get("Set-Cookie");

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies as string[])
			.send({
				title: "Debt transaction",
				amount: 1000,
				type: "debt",
			});

		const listSummaryResponse = await request(app.server)
			.get("/transactions/summary")
			.set("Cookie", cookies as string[])
			.expect(200);

		expect(listSummaryResponse.body.summary).toEqual({
			amount: 4000,
		});
	});
});

const Fastify = require("fastify");
const Redis = require("ioredis");
const fivebeans = require("fivebeans");

const fastify = Fastify();
const queue = process.env.QUEUE || "redis_rdb";

let client;

if (queue === "redis_rdb" || queue === "redis_aof") {
  client = new Redis({
    port: queue === "redis_rdb" ? 6379 : 6380,
  });
} else if (queue === "beanstalkd") {
  client = new fivebeans.client("127.0.0.1", 11300);
  client.connect();
}

fastify.get("/read", async (request, reply) => {
  let message;

  if (queue === "redis_rdb" || queue === "redis_aof") {
    message = await client.rpop("queue");
  } else if (queue === "beanstalkd") {
    client.reserve((err, jobId, payload) => {
      if (!err) {
        message = payload.toString();
        client.destroy(jobId, () => {});
      }
    });
  }

  reply.send({ message });
});

fastify.listen({ port: 3001, host: "localhost" }, () => {
  console.log("Reader server running on port 3001");
});

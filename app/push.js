const Fastify = require("fastify");
const Redis = require("ioredis");
const fivebeans = require("fivebeans");

const fastify = Fastify();
const queue = process.env.QUEUE || "redis_rdb"; // Use environment variable to switch between Redis and Beanstalkd

let client;

if (queue === "redis_rdb" || queue === "redis_aof") {
  client = new Redis({
    port: queue === "redis_rdb" ? 6379 : 6380,
  });
} else if (queue === "beanstalkd") {
  client = new fivebeans.client("127.0.0.1", 11300);
  client.connect();
}

fastify.post("/push", async (request, reply) => {
  const message = { data: "A".repeat(10000) };

  if (queue === "redis_rdb" || queue === "redis_aof") {
    await client.lpush("queue", JSON.stringify(message));
  } else if (queue === "beanstalkd") {
    client.use("default", (err, tube) => {
      if (!err) {
        client.put(0, 0, 60, JSON.stringify(message), (putErr) => {
          if (putErr) console.error(putErr);
        });
      }
    });
  }

  reply.send({ success: true });
});

fastify.listen({ port: 3000, host: "localhost" }, () => {
  console.log("Server running on port 3000");
});

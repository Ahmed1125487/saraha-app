import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { client } from "../../DB/redis.connection.js";

//counts the requests of every ip + path inside a time window (ttl in minutes)
//the counters live in redis so every pm2 instance shares them
export const generateLimiter = ({
  ttl = 15,
  limit = 1000,
  message = "Too Many Requests",
  status = 429,
} = {}) => {
  const windowMs = ttl * 60 * 1000;

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,

    //no redis, no limiting
    skip: () => !client.isReady,

    keyGenerator: (req) => `${ipKeyGenerator(req.ip, 52)}::${req.path}`,

    handler: (req, res) => res.status(status).json({ error_message: message }),

    store: {
      async increment(key) {
        const redisKey = `Rate_Limit::${key}`;
        const totalHits = await client.incr(redisKey);
        if (totalHits === 1) await client.pExpire(redisKey, windowMs);

        const remaining = await client.pTTL(redisKey);
        return {
          totalHits,
          resetTime: new Date(
            Date.now() + (remaining > 0 ? remaining : windowMs),
          ),
        };
      },
      async decrement(key) {
        await client.decr(`Rate_Limit::${key}`);
      },
      async resetKey(key) {
        await client.del(`Rate_Limit::${key}`);
      },
    },
  });
};

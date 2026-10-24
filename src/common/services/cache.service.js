//thin wrapper around redis, when redis is down every function falls back to
//a neutral value instead of throwing
import { client } from "../../DB/redis.connection.js";

export const isCacheReady = () => client.isReady;

const run = async (command, fallback = null) => {
  if (!client.isReady) return fallback;
  try {
    return await command();
  } catch (error) {
    console.log("redis command failed:", error.message);
    return fallback;
  }
};

//ttl is in seconds, objects are stored as json
export const setCache = async ({ key, value, ttl } = {}) => {
  const payload =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return run(() => client.set(key, payload, ttl ? { EX: ttl } : undefined));
};

export const getCache = async ({ key } = {}) => {
  const value = await run(() => client.get(key));
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

export const existCache = async ({ key } = {}) => {
  return run(() => client.exists(key), 0);
};

//key can be one key or an array of keys
export const deleteCache = async ({ key } = {}) => {
  const keys = [key].flat().filter(Boolean);
  if (!keys.length) return 0;
  return run(() => client.del(keys), 0);
};

export const keysCache = async ({ prefix } = {}) => {
  return run(() => client.keys(`${prefix}*`), []);
};

//-2 means "no such key" (also returned when redis is down)
export const ttlCache = async ({ key } = {}) => {
  return run(() => client.ttl(key), -2);
};

export const expireCache = async ({ key, ttl } = {}) => {
  return run(() => client.expire(key, ttl), 0);
};

export const incrementByCache = async ({ key, value = 1 } = {}) => {
  return run(() => client.incrBy(key, value));
};

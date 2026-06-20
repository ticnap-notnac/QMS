import NodeCache from 'node-cache';

// Cache items for 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300 });

export const cacheMiddleware = (req, res, next) => {
  // We only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Use the requested URL as the cache key
  const key = req.originalUrl || req.url;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    console.log(`[Cache Hit] ${key}`);
    return res.json(cachedResponse);
  } else {
    console.log(`[Cache Miss] ${key}`);
    // Intercept the res.json method to cache the response before sending it
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body);
      }
      originalJson(body);
    };
    next();
  }
};

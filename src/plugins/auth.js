import fp from 'fastify-plugin'
import { config } from '#config/env.js'

/**
 * Two layers of protection:
 *
 * 1. Every route registered under this plugin requires a valid
 *    `x-api-key` header (checked via an onRequest hook, so it runs
 *    before body parsing and any route logic).
 *
 * 2. Routes that publish/modify content (tours, gallery, images) also
 *    add `fastify.requirePublishKey` as a preHandler, which additionally
 *    requires a valid `x-publish-key` header. This lets you hand the
 *    general API key to your frontend/storefront while keeping the
 *    publish key restricted to whoever manages the tour catalog
 *    (e.g. an admin panel or CMS integration).
 */
export default fp(async function authPlugin(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    const key = request.headers['x-api-key']
    if (!key || key !== config.apiKey) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'A valid x-api-key header is required.'
      })
    }
  })

  fastify.decorate('requirePublishKey', async function requirePublishKey(request, reply) {
    const key = request.headers['x-publish-key']
    if (!key || key !== config.publishKey) {
      reply.code(403).send({
        error: 'Forbidden',
        message: 'This operation publishes or modifies content and requires a valid x-publish-key header.'
      })
    }
  })
})

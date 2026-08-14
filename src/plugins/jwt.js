import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { config } from '#/config/env.js'

/**
 * Registers @fastify/jwt (adds `fastify.jwt`, `reply.jwtSign`, and
 * `request.jwtVerify`) and decorates `fastify.authenticateCustomer`, a
 * preHandler that verifies the `Authorization: Bearer <token>` header and
 * populates `request.user` with the decoded payload
 * ({ sub: customerId, email }) — that's @fastify/jwt's default property
 * name for the verified payload.
 *
 * This is a *separate* layer from the `x-api-key` / `x-publish-key` auth
 * in plugins/auth.js: x-api-key identifies the calling app/frontend,
 * while this JWT identifies the logged-in customer within that app. Both
 * apply together on routes that need them — the api-key hook already
 * runs first for everything registered under it.
 */
export default fp(async function jwtPlugin(fastify) {
  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn }
  })

  fastify.decorate('authenticateCustomer', async function authenticateCustomer(request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'A valid Bearer token is required.' })
    }
  })
})
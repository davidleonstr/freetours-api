import fp from 'fastify-plugin'
import pg from 'pg'
import { config } from '#/config/env.js'

const { Pool } = pg

/**
 * Decorates the Fastify instance with `fastify.pg`, a shared connection
 * pool. Registered with fastify-plugin so the decoration is visible
 * across every encapsulated child context (all route files).
 */
export default fp(async function dbPlugin(fastify) {
  const pool = new Pool({ connectionString: config.databaseUrl })

  pool.on('error', (err) => {
    fastify.log.error({ err }, 'Unexpected error on idle PostgreSQL client')
  })

  fastify.decorate('pg', pool)

  fastify.addHook('onClose', async (instance) => {
    await instance.pg.end()
  })
})

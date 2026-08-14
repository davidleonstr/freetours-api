function signCustomerToken(fastify, customer) {
  return fastify.jwt.sign({ sub: customer.id, email: customer.email })
}

/**
 * Account + session management, without the email-confirmation-code
 * detour: registering a customer immediately creates the row and hands
 * back a session token, and logging back in only needs the email on
 * file. This keeps the same JWT-based session model as before — it's
 * just no longer gated behind proving inbox access, since these are
 * free tours and there's nothing to protect a payment method for.
 */
export default async function authRoutes(fastify) {
  const { pg } = fastify

  // ------------------------------------------------------------------
  // Register — creates the customer and returns a session token
  // immediately.
  // ------------------------------------------------------------------

  fastify.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string', minLength: 1, maxLength: 255 },
          phone: { type: 'string', maxLength: 50 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { email, fullName, phone } = request.body

    try {
      const { rows } = await pg.query(
        `INSERT INTO customers (full_name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [fullName, email, phone ?? null]
      )
      const customer = rows[0]
      const token = signCustomerToken(fastify, customer)
      reply.code(201)
      return { token, customer }
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'An account with that email already exists. Use /auth/login instead.'
        })
      }
      throw err
    }
  })

  // ------------------------------------------------------------------
  // Login — no password, no code: an existing account's email is
  // enough to get a fresh session token, so returning visitors can
  // book another free tour in one step.
  // ------------------------------------------------------------------

  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { email } = request.body

    const { rows } = await pg.query('SELECT * FROM customers WHERE email = $1', [email])
    if (!rows.length) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'No account found for this email. Use /auth/register instead.'
      })
    }
    const customer = rows[0]
    const token = signCustomerToken(fastify, customer)
    return { token, customer }
  })

  // ------------------------------------------------------------------
  // Example protected route: returns the logged-in customer's own
  // profile, resolved from the JWT rather than a client-supplied id.
  // ------------------------------------------------------------------

  fastify.get('/auth/me', { preHandler: fastify.authenticateCustomer }, async (request, reply) => {
    const { rows } = await pg.query('SELECT * FROM customers WHERE id = $1', [request.user.sub])
    if (!rows.length) {
      return reply.code(404).send({ error: 'Not Found', message: 'Customer not found.' })
    }
    return rows[0]
  })
}

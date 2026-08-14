export default async function customerRoutes(fastify) {
  const { pg } = fastify

  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['fullName', 'email'],
        properties: {
          fullName: { type: 'string', minLength: 1, maxLength: 255 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 50 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { fullName, email, phone } = request.body
    try {
      const { rows } = await pg.query(
        'INSERT INTO customers (full_name, email, phone) VALUES ($1, $2, $3) RETURNING *',
        [fullName, email, phone ?? null]
      )
      reply.code(201)
      return rows[0]
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ error: 'Conflict', message: 'A customer with that email already exists.' })
      }
      throw err
    }
  })

  fastify.get('/:id', async (request, reply) => {
    const { rows } = await pg.query('SELECT * FROM customers WHERE id = $1', [request.params.id])
    if (!rows.length) {
      return reply.code(404).send({ error: 'Not Found', message: 'Customer not found.' })
    }
    return rows[0]
  })

  fastify.patch('/:id', {
    schema: {
      body: {
        type: 'object',
        minProperties: 1,
        properties: {
          fullName: { type: 'string', minLength: 1, maxLength: 255 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 50 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const fieldMap = { fullName: 'full_name', email: 'email', phone: 'phone' }
    const sets = []
    const values = []
    for (const [key, column] of Object.entries(fieldMap)) {
      if (request.body[key] !== undefined) {
        values.push(request.body[key])
        sets.push(`${column} = $${values.length}`)
      }
    }
    if (!sets.length) {
      return reply.code(400).send({ error: 'Bad Request', message: 'No updatable fields provided.' })
    }
    values.push(request.params.id)

    try {
      const { rows } = await pg.query(
        `UPDATE customers SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      )
      if (!rows.length) {
        return reply.code(404).send({ error: 'Not Found', message: 'Customer not found.' })
      }
      return rows[0]
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ error: 'Conflict', message: 'A customer with that email already exists.' })
      }
      throw err
    }
  })

  fastify.get('/:id/bookings', async (request) => {
    const { rows } = await pg.query(
      `SELECT b.*, t.name AS tour_name, t.meeting_point
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC`,
      [request.params.id]
    )
    return rows
  })
}

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = await ctx.auth.authenticate()

    if (!user.is_admin) {
      return ctx.response.unauthorized({
        error: 'You must have admin access to access this resource',
      })
    }

    /**
     * Call next method in the pipeline and return its output
     */
    return await next()
  }
}

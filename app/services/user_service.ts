import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'

export default class UserService {
  async getById({ request }: HttpContext) {
    const { email } = request.all()
    if (!email) {
      throw new Error('No email provided')
    }
    const user = await User.findBy('email', email)

    if (user) {
      return user
    }

    throw new Error(`Cannot find user with email ${email}`)
  }
}

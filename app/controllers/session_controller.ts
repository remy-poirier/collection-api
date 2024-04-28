import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { credentialsValidator } from '#validators/session'

export default class SessionController {
  async signin({ request, auth, response }: HttpContext) {
    // Get credentials
    const { email, password } = request.only(['email', 'password'])
    // Verify credentials
    const user = await User.verifyCredentials(email, password)
    // Login user
    await auth.use('web').login(user)
    return response.json(user)
  }

  async signup({ request, auth, response }: HttpContext) {
    // Get user data
    const data = request.all()
    const payload = await credentialsValidator.validate(data)

    // Create user
    const createdUser = await User.create(payload)
    // Verify credentials
    const user = await User.verifyCredentials(createdUser.email, payload.password)
    // Login user
    await auth.use('web').login(user)
    return response.json(user)
  }
}

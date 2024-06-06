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

  getLastKnownTotalValue(user: User): number {
    /**
     * Total values are stored with
     */
    const totalValues = user.totalValue
    const dates = Object.keys(totalValues)

    const sortedDates = dates.sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('/'))
      const dateB = new Date(b.split('/').reverse().join('/'))
      return dateB.getTime() - dateA.getTime()
    })

    const mostRecentDate = sortedDates[0]

    return totalValues[mostRecentDate] || 0
  }
}

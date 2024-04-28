import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'

const getLastKnowTotalValue = (
  totalValue: Record<string, number>
): {
  date: string
  amount: number
} => {
  const dates = Object.keys(totalValue)

  if (dates.length === 0) {
    return { date: new Date().toISOString(), amount: 0 }
  }

  const sortedDates = dates.sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('/'))
    const dateB = new Date(b.split('/').reverse().join('/'))
    return dateB.getTime() - dateA.getTime()
  })

  return { date: sortedDates[0], amount: totalValue[sortedDates[0]] }
}

export default class StatisticsService {
  async get({ auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`No userId found`)
    }

    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }

    await user.preload('items')
    const sortedByHighestPrice = user.items.sort((a, b) => b.highest_price - a.highest_price)
    const mostValuableItems = sortedByHighestPrice.slice(0, 3)

    return {
      nbItems: user.items.length,
      totalValue: getLastKnowTotalValue(user.total_value),
      mostValuableItems,
    }
  }
}

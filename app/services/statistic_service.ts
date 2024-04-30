import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import ItemService from '#services/item_service'
import { inject } from '@adonisjs/core'

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

@inject()
export default class StatisticsService {
  constructor(protected itemService: ItemService) {}

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
    const userItemsWithCount = await this.itemService.itemsWithCount(user)
    const sortedByHighestPrice = userItemsWithCount.sort((a, b) => b.highestPrice - a.highestPrice)
    const onlyUniqueItems = [...new Set(sortedByHighestPrice.map((item) => item.id))].map(
      (itemId) => sortedByHighestPrice.find((item) => item.id === itemId)
    )

    const mostValuableItems = onlyUniqueItems.slice(0, 3)

    return {
      nbItems: user.items.length,
      totalValue: getLastKnowTotalValue(user.totalValue),
      mostValuableItems,
    }
  }
}

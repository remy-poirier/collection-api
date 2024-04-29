import Item from '#models/item'
import User from '#models/user'
import {
  itemCreationValidator,
  itemUpdateCountValidator,
  itemUpdatePriceValidator,
} from '#validators/item'
import { HttpContext } from '@adonisjs/core/http'

type ItemWithCount = Item & { count: number }

export default class ItemService {
  getFormattedDate(): string {
    const currentDate = new Date()
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    return dateFormatter.format(currentDate)
  }

  async itemsWithCount(user: User): Promise<ItemWithCount[]> {
    const distinctItemsWithCount = await user
      .related('items')
      .query()
      .select('items.*')
      .count('items.id as count')
      .groupBy('items.id')

    return distinctItemsWithCount.map((item: Item): ItemWithCount => {
      return {
        ...item.serialize(),
        count: item.$extras.count,
      } as ItemWithCount
    })
  }

  async itemWithCount(user: User, itemId: string): Promise<ItemWithCount> {
    const item = await user
      .related('items')
      .query()
      .where('items.id', itemId)
      .select('items.*')
      .count('items.id as count')
      .groupBy('items.id')
      .first()

    if (!item) {
      throw new Error(`Item with id ${itemId} not found`)
    }

    return {
      ...item.serialize(),
      count: item.$extras.count,
    } as ItemWithCount
  }

  async itemTotalValue(user: User, itemId: string): Promise<number> {
    const item = await user
      .related('items')
      .query()
      .where('items.id', itemId)
      .select('items.*')
      .count('items.id as count')
      .groupBy('items.id')
      .first()

    if (!item) {
      throw new Error(`Item with id ${itemId} not found`)
    }

    const count = item.$extras.count
    return item.last_price * count
  }

  async computeTotalValueOfItems(user: User): Promise<number> {
    const itemsWithCount = await this.itemsWithCount(user)
    return itemsWithCount.reduce((acc, item) => {
      return acc + item.last_price * item.count
    }, 0)
  }

  async all({ auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`User with id ${userId} not found`)
    }

    const user = await User.find(userId)

    if (!user) {
      throw new Error('User not found')
    }

    return this.itemsWithCount(user)
  }

  // This function will create a new item and attach it to current user
  async create({ request, auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`No userId found`)
    }

    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }
    const data = request.all()
    const payload = await itemCreationValidator.validate(data)

    const formattedDate = this.getFormattedDate()
    const prices = { [formattedDate]: payload.price }
    const newItem = await Item.create({
      name: payload.name,
      image: payload.image,
      prices: prices,
      highest_price: payload.price,
      last_price: payload.price,
      url: payload.url,
    })

    if (user.total_value[formattedDate]) {
      user.total_value[formattedDate] += payload.price * payload.count
    } else {
      user.total_value[formattedDate] = payload.price * payload.count
    }

    await user.related('items').attach(Array(payload.count).fill(newItem.id))
    await user.save()

    return newItem
  }

  async index() {
    return Item.all()
  }

  /**
   * Deleting an item is a not so easy operation.
   * Things to do here are:
   * - Detach the item from all users
   * - Update the total_value field for all users having this item
   * - Delete the item
   */
  async delete(id: string, { auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`User with id ${userId} not found`)
    }

    const user = await User.find(userId)

    if (!user) {
      throw new Error('User not found')
    }

    const item = await Item.findOrFail(id)
    const lastPrice = item.last_price
    const formattedDate = this.getFormattedDate()
    const usersWithItem = await item.related('users').query()
    for (const u of usersWithItem) {
      const itemWithCount = await this.itemWithCount(u, item.id)
      const itemTotalValue = itemWithCount.count * lastPrice
      const totalValueOfItemsForUser = await this.computeTotalValueOfItems(u)

      if (!u.total_value[formattedDate]) {
        // If we don't have a total value for this day, then the value will be totalValueOfItems - itemTotalValue
        u.total_value[formattedDate] = totalValueOfItemsForUser - itemTotalValue
      } else {
        // If we already have a value for this day, then I subtract the amount of the deleted item
        u.total_value[formattedDate] -= itemTotalValue
      }
      await u.save()
    }

    await item.related('users').detach()
    await item.delete()

    return user
  }

  async byId(id: string, { auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`User with id ${userId} not found`)
    }

    const user = await User.find(userId)
    const item = await Item.query().where('id', id).preload('users').first()

    if (!user || !item) {
      throw new Error('User or product not found')
    }

    item.serialize({
      relations: {
        users: {
          fields: ['id', 'email'],
        },
      },
    })

    return item.serialize({
      relations: {
        users: {
          fields: ['id', 'email'],
        },
      },
    })
  }

  /**
   * As this action is related to a single user, so we don't need a multi update user as in updatePrice
   */
  async updateCount({ request, auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`No userId found`)
    }

    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }
    const data = request.all()
    const payload = await itemUpdateCountValidator.validate(data)

    const item = await Item.findOrFail(payload.item_id)

    const currentCountItem = await user
      .related('items')
      .query()
      .where('item_id', item.id)
      .count('* as total')
      .first()

    if (currentCountItem) {
      let totalValue = user.total_value[this.getFormattedDate()] || 0
      const currentCount = currentCountItem.$extras.total

      // Detach all items and subtracting their amount
      await user.related('items').detach([item.id])
      totalValue -= item.last_price * currentCount

      // Attaching new count and adding their amount
      await user.related('items').attach(Array(payload.count).fill(item.id))
      totalValue += item.last_price * Math.abs(payload.count)

      user.total_value[this.getFormattedDate()] = totalValue

      await user.save()
      return item
    }
  }

  /**
   * The price update will have some effects on the item:
   * - Add entry to prices object containing the new price
   * - Update last_price
   * - Update highest_price if the new price is higher
   *
   * It will also have an effect on the user:
   * - Update total_value for the current day: careful, we need to take care of the count of the item
   */
  async updatePrice({ request, auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`No userId found`)
    }

    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }
    const data = request.all()
    const payload = await itemUpdatePriceValidator.validate(data)

    const item = await Item.findOrFail(payload.item_id)
    const oldItemPrice = item.last_price
    const formattedDate = this.getFormattedDate()

    item.prices[formattedDate] = payload.price
    item.last_price = payload.price
    if (item.highest_price < payload.price) {
      item.highest_price = payload.price
    }

    await item.save()

    // Now we should update total value of users having this item (user)
    const usersWithItem = await item.related('users').query()

    // update all users with new amount
    for (const u of usersWithItem) {
      const newItemTotalValue = await this.itemTotalValue(u, item.id)
      const itemWithCount = await this.itemWithCount(u, item.id)
      const oldItemTotalValue = itemWithCount.count * oldItemPrice

      if (!u.total_value[formattedDate]) {
        u.total_value[formattedDate] = newItemTotalValue
      } else {
        u.total_value[formattedDate] += newItemTotalValue - oldItemTotalValue
      }
      await u.save()
    }

    return item
  }
}

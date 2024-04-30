import Item from '#models/item'
import User from '#models/user'
import {
  itemAttachValidator,
  itemCreationValidator,
  itemDetachValidator,
  itemSearchValidator,
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
      .orderBy('items.created_at', 'desc')
      .count('items.id as count')
      .groupBy('items.id')

    return distinctItemsWithCount.map((item: Item): ItemWithCount => {
      return {
        ...item.serialize(),
        count: Number.parseInt(item.$extras.count),
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
    return item.lastPrice * count
  }

  async computeTotalValueOfItems(user: User): Promise<number> {
    const itemsWithCount = await this.itemsWithCount(user)
    return itemsWithCount.reduce((acc, item) => {
      return acc + item.lastPrice * item.count
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
      highestPrice: payload.price,
      lastPrice: payload.price,
      url: payload.url,
    })

    // If user is not admin, attach item to current user, by doing so, other users won't be able to see this item
    // We do this as a security measure to prevent users from adding dumb items
    if (!user.isAdmin) {
      newItem.userId = user.id
      // By default, set status as PENDING
      newItem.status = 'PENDING'
    }

    await newItem.save()

    if (user.totalValue[formattedDate]) {
      user.totalValue[formattedDate] += payload.price * payload.count
    } else {
      const totalValue = await this.computeTotalValueOfItems(user)
      user.totalValue[formattedDate] = totalValue + payload.price * payload.count
    }

    await user.related('items').attach(Array(payload.count).fill(newItem.id))
    await user.save()

    return newItem
  }

  async index() {
    return Item.query().orderBy('created_at', 'desc')
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
    const lastPrice = item.lastPrice
    const formattedDate = this.getFormattedDate()
    const usersWithItem = await item.related('users').query()
    for (const u of usersWithItem) {
      const itemWithCount = await this.itemWithCount(u, item.id)
      const itemTotalValue = itemWithCount.count * lastPrice
      const totalValueOfItemsForUser = await this.computeTotalValueOfItems(u)

      if (!u.totalValue[formattedDate]) {
        // If we don't have a total value for this day, then the value will be totalValueOfItems - itemTotalValue
        u.totalValue[formattedDate] = totalValueOfItemsForUser - itemTotalValue
      } else {
        // If we already have a value for this day, then I subtract the amount of the deleted item
        u.totalValue[formattedDate] -= itemTotalValue
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
      let totalValue = user.totalValue[this.getFormattedDate()] || 0
      const currentCount = currentCountItem.$extras.total

      // Detach all items and subtracting their amount
      await user.related('items').detach([item.id])
      totalValue -= item.lastPrice * currentCount

      // Attaching new count and adding their amount
      await user.related('items').attach(Array(payload.count).fill(item.id))
      totalValue += item.lastPrice * Math.abs(payload.count)

      user.totalValue[this.getFormattedDate()] = totalValue

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
    const oldItemPrice = item.lastPrice
    const formattedDate = this.getFormattedDate()

    item.prices[formattedDate] = payload.price
    item.lastPrice = payload.price
    if (item.highestPrice < payload.price) {
      item.highestPrice = payload.price
    }

    await item.save()

    // Now we should update total value of users having this item (user)
    const usersWithItem = await item.related('users').query()

    // update all users with new amount
    for (const u of usersWithItem) {
      const newItemTotalValue = await this.itemTotalValue(u, item.id)
      const itemWithCount = await this.itemWithCount(u, item.id)
      const oldItemTotalValue = itemWithCount.count * oldItemPrice

      if (!u.totalValue[formattedDate]) {
        u.totalValue[formattedDate] = newItemTotalValue
      } else {
        u.totalValue[formattedDate] += newItemTotalValue - oldItemTotalValue
      }
      await u.save()
    }

    return item
  }

  async getAutocompleteItems({ request, auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`No userId found`)
    }

    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }
    const data = request.all()
    const payload = await itemSearchValidator.validate(data)

    // We need to exclude items that are already in user's items
    const userItems = await user.related('items').query().select('id')
    const userItemsIds = userItems.map((item) => item.id)

    // We don't need to also fetch items with current user id as user_id, so we just get items with null user_id
    // We don't need it because in theory, user cannot have the item he wants to add in DB as he's adding it
    let query = Item.query()
      .whereNotIn('id', userItemsIds)
      .where('name', 'ilike', `%${payload.search}%`)
      .whereNull('user_id')
      .orderBy('created_at', 'desc')

    return query.limit(5)
  }

  async attach({ request, auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`No userId found`)
    }

    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const data = request.all()
    const payload = await itemAttachValidator.validate(data)

    const item = await Item.findOrFail(payload.item_id)

    // We only need to attach item number of count times
    await user.related('items').attach(Array(payload.count).fill(payload.item_id))

    // Now we need to update user total value
    const date = this.getFormattedDate()
    if (user.totalValue[date]) {
      user.totalValue[date] += item.lastPrice * payload.count
    } else {
      user.totalValue[date] = item.lastPrice * payload.count
    }

    await user.save()

    return item
  }

  /**
   * Detach item from a user.
   * Things to do here are:
   * - Update user total Value for today date
   * - Detach item for user
   */
  async detach({ request, auth }: HttpContext) {
    const userId = auth.user?.id
    if (!userId) {
      throw new Error(`No userId found`)
    }

    const user = await User.find(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const data = request.all()
    const payload = await itemDetachValidator.validate(data)

    const item = await Item.findOrFail(payload.item_id)
    const lastPrice = item.lastPrice
    const formattedDate = this.getFormattedDate()

    const itemWithCount = await this.itemWithCount(user, item.id)
    const itemTotalValue = itemWithCount.count * lastPrice
    const totalValueOfItemsForUser = await this.computeTotalValueOfItems(user)

    if (!user.totalValue[formattedDate]) {
      // If we don't have a total value for this day, then the value will be totalValueOfItems - itemTotalValue
      user.totalValue[formattedDate] = totalValueOfItemsForUser - itemTotalValue
    } else {
      // If we already have a value for this day, then I subtract the amount of the deleted item
      user.totalValue[formattedDate] -= itemTotalValue
    }

    await user.save()
    await user.related('items').detach([item.id])

    if (!user.isAdmin && item.userId === user.id) {
      await item.delete()
      return user
    } else {
      return item
    }
  }
}

import Item from '#models/item'
import User from '#models/user'
import { itemCreationValidator } from '#validators/item'
import { HttpContext } from '@adonisjs/core/http'

export default class ItemService {
  getFormattedDate(): string {
    const currentDate = new Date()
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    // Formater la date
    return dateFormatter.format(currentDate)
  }

  computeTotalValueOfItems(user: User): number {
    // Fonction helper calculant le montant de tous mes items, grâce à son last_price
    return user.items.reduce((acc, item) => {
      return acc + item.last_price
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

    await user.preload('items')

    console.log('ok user => ', user.items)

    return user.items || []
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

    // also update user totalValues field
    const formattedDate = this.getFormattedDate()

    const prices = { [formattedDate]: payload.price }
    // const pricesJson = JSON.stringify(prices)
    const newItem = await Item.create({
      name: payload.name,
      image: payload.image,
      prices: prices,
      highest_price: payload.price,
      last_price: payload.price,
      url: payload.url,
    })

    if (user.total_value[formattedDate]) {
      user.total_value[formattedDate] += payload.price
    } else {
      user.total_value[formattedDate] = payload.price
    }

    await user.related('items').attach([newItem.id])
    await user.save()

    return newItem
  }

  async index() {
    return Item.all()
  }

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

    await item.related('users').detach()
    await item.delete()

    /**
     * Une fois qu'on a supprimé l'item, on doit recalculer le champ total_value pour retirer la valeur de l'objet supprimé
     * Le CRUD sur un item a TOUJOURS pour effet de mettre à jour ce champ sur le user
     * Pour le delete, ça se passe de la manière suivante:
     * - Si on a déjà une valeur pour la date du jour, alors on soustrait le last_price de l'item
     * - Si non, alors on ajoute une entrée pour la date du jour, avec en montant computeTotalValueOfItems - last_price
     */
    const formattedDate = this.getFormattedDate()

    if (user.total_value[formattedDate]) {
      user.total_value[formattedDate] -= lastPrice
    } else {
      user.total_value[formattedDate] = this.computeTotalValueOfItems(user) - lastPrice
    }
    await user.save()

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
}

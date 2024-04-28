import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import User from './user.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Item extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column({
    serialize: (value: string | null) => value ?? {},
  })
  declare prices: Record<string, number>

  @column()
  declare highest_price: number

  @column()
  declare image: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @manyToMany(() => User)
  declare users: ManyToMany<typeof User>

  @column()
  declare url: string

  @column()
  declare last_price: number
}

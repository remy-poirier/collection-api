import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'item_user'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))

      table.uuid('user_id').unsigned().references('users.id').onDelete('CASCADE')
      table.uuid('item_id').unsigned().references('items.id').onDelete('CASCADE')

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

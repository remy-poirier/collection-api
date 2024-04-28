import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'items'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('last_update')
      table.float('last_price').notNullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('last_update')
    })
  }
}

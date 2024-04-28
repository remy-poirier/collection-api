import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'items'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('url').notNullable().defaultTo('INVALID_URL')
    })
  }

  async down() {}
}

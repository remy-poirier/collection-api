import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_admin').notNullable().defaultTo(false)
      table.string('avatar_url')
      table.jsonb('total_value').defaultTo('{}')
    })
  }

  async down() {}
}

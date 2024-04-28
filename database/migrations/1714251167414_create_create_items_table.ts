import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'create_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').defaultTo(this.raw('uuid_generate_v4()')).primary()
      table.string('name').notNullable()
      table.jsonb('prices').defaultTo('{}')
      table.date('last_update')
      table.string('image')
      table.float('highest_price')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

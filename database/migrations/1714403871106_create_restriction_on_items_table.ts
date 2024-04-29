import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'items'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      /**
       * This relation is there only to attach the item to a user. The thing is that items
       * should be available for everyone and not owned by a user. But as I cannot add every item existing, so
       * this lets users add their own items.
       * We also add a status to the table to know if the item has been validated or not.
       */
      table.uuid('user_id').references('id').inTable('users')
      table.text('status')
    })
  }

  async down() {}
}

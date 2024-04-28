import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.renameTable('create_items', 'items')
  }

  async down() {
    this.schema.renameTable('items', 'create_items')
  }
}

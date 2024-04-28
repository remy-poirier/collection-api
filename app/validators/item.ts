import vine from '@vinejs/vine'

/**
 * Validates item creation
 */

export const itemCreationValidator = vine.compile(
  vine.object({
    name: vine.string(),
    image: vine.string(),
    price: vine.number().min(1),
    url: vine.string(),
    count: vine.number(),
  })
)

export const itemUpdateCountValidator = vine.compile(
  vine.object({
    count: vine.number(),
    item_id: vine.string(),
  })
)

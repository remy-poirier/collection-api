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

export const itemUpdatePriceValidator = vine.compile(
  vine.object({
    price: vine.number().min(1),
    item_id: vine.string(),
  })
)

export const itemSearchValidator = vine.compile(
  vine.object({
    search: vine.string(),
  })
)

export const itemAttachValidator = vine.compile(
  vine.object({
    item_id: vine.string(),
    count: vine.number(),
  })
)

export const itemDetachValidator = vine.compile(
  vine.object({
    item_id: vine.string(),
  })
)

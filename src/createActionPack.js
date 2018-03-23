import isFunction from 'lodash/isFunction'

function createActionPack(type, promiseCreator, metaCreator = {}) {

  const typeString = type.toString()

  const actionCreator = (...args) => ({
    type,
    promise: isFunction(promiseCreator) ? promiseCreator(...args) : promiseCreator,
    meta: isFunction(metaCreator) ? metaCreator(...args) : metaCreator,
  })

  actionCreator.toString = () => typeString

  return actionCreator

}

module.exports = createActionPack

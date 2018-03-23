import { KEY, LIFECYCLE } from './constants';
import middleware from './middleware';
import handle from './handle';
import createActionPack from './createActionPack';

module.exports = {
  middleware,
  handle,
  KEY,
  LIFECYCLE,
  createActionPack,
};

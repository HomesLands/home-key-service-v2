import 'reflect-metadata';

import { ProductModel } from './product';

export default (connection: any) => {
  return {
    product: ProductModel(connection),
  };
};

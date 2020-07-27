import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists', 400);
    }

    const findedProducts = await this.productsRepository.findAllById(
      products.map(product => ({ id: product.id })),
    );

    if (!findedProducts.length || !products.length) {
      throw new AppError('Products does not exists', 400);
    }

    if (findedProducts.length !== products.length) {
      throw new AppError('Product not Found', 404);
    }

    products.forEach(product => {
      const quantityProduct =
        findedProducts.find(({ id }) => product.id === id)?.quantity || 0;
      if (quantityProduct < product.quantity) {
        throw new AppError('Quantity invalid');
      }
    });

    const order = await this.ordersRepository.create({
      products: findedProducts.map(({ id, price, quantity }) => ({
        product_id: id,
        price,
        quantity,
      })),
      customer,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;

import { Filter, FindOptions } from "mongodb";

import { config } from "../../Config";
import { collection, SadoOffer, SadoOrder } from "./Collection";

export async function addOrder(order: SadoOrder) {
  await collection.updateOne({ cid: order.cid }, { $set: order }, { upsert: true });
}

export async function addOffer(cid: string, offer: SadoOffer) {
  await collection.updateOne({ cid }, { $push: { offers: offer } });
}

export async function getOrdersByAddress(address: string): Promise<SadoOrder[]> {
  return getOrders({ $or: [{ "orderbooks.address": address }, { maker: address }] });
}

export async function getOrders(filter: Filter<SadoOrder>, options?: FindOptions<SadoOrder>) {
  return collection.find(filter, options).toArray();
}

export async function getOrder(
  filter: Filter<SadoOrder>,
  options?: FindOptions<SadoOrder>
): Promise<SadoOrder | undefined> {
  const order = await collection.findOne(filter, options);
  if (order === null) {
    return undefined;
  }
  return order;
}

export async function getHeighestBlock(): Promise<number> {
  const order = await collection.findOne({}, { sort: { "block.height": -1 } });
  if (order === null) {
    return config.sado.startBlock;
  }
  return order.block.height;
}

export async function deleteSadoOrdersAfterHeight(height: number) {
  await collection.deleteMany({ "block.height": { $gt: height } });
}

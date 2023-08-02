import { config } from "../../Config";
import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, SadoOffer, SadoOrder } from "./Collection";

export async function addOrders(orders: SadoOrder[], chunkSize = 1000) {
  const promises = [];
  for (let i = 0; i < orders.length; i += chunkSize) {
    const chunk = orders.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);
}

export async function addOrder(order: SadoOrder) {
  await collection.insertOne(order).catch(ignoreDuplicateErrors);
}

export async function addOffer(cid: string, offer: SadoOffer) {
  await collection.updateOne({ cid }, { $push: { offers: offer } });
}

export async function getOrder(cid: string): Promise<SadoOrder | undefined> {
  const order = await collection.findOne({ cid });
  if (order === null) {
    return undefined;
  }
  return order;
}

export async function getOrdersByAddress(address: string): Promise<SadoOrder[]> {
  return collection.find({ $or: [{ "orderbooks.address": address }, { maker: address }] }).toArray();
}

export async function getHeighestBlock(): Promise<number> {
  const order = await collection.findOne({}, { sort: { "block.height": -1 } });
  if (order === null) {
    return config.sado.startBlock;
  }
  return order.block.height;
}

import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, SadoDocument } from "./Collection";

export async function addOrders(orders: SadoDocument[], chunkSize = 1000) {
  const promises = [];
  for (let i = 0; i < orders.length; i += chunkSize) {
    const chunk = orders.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);
}

export async function addOffer(location: string, offer: SadoDocument["offers"][number]) {
  await collection.updateOne({ location }, { $push: { offers: offer } });
}

export async function getHeighestBlock(): Promise<number> {
  const order = await collection.findOne({}, { sort: { "block.height": -1 } });
  if (order === null) {
    return 0;
  }
  return order.block.height;
}

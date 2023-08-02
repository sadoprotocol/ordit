import { rpc } from "../../../Services/Bitcoin";
import { ipfs } from "../../../Services/IPFS";
import { getOutput } from "../../Output";
import { OrderInvalidMaker, OrderTransactionNotFound, OrderVoutNotFound } from "../Exceptions/OrderException";
import { addOrder } from "../Methods";
import { validateSignature } from "../Validators/ValidateSignature";
import { parseLocation } from "./ParseLocation";

export async function parseOrder(cid: string, block: Block) {
  const order = await ipfs.getOrder(cid);
  if ("error" in order) {
    return;
  }

  const [txid, n] = parseLocation(order.location);

  const output = await getOutput({ "vout.txid": txid, "vout.n": n });
  if (output === undefined || output.vin !== undefined) {
    return; // skip if output is not found or has been spent
  }

  // ### Validate Order

  try {
    await validateLocation(order.location, order.maker);
    await validateSignature(order);
    await addOrder({
      cid,
      type: order.type,
      status: "pending",
      location: order.location,
      cardinals: order.cardinals,
      maker: order.maker,
      offers: [],
      orderbooks: order.orderbooks?.map(getOrderbook) ?? [],
      instant: order.instant,
      expiry: order.expiry,
      meta: order.meta,
      block,
    });
  } catch (error) {
    return console.log(error);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getOrderbook(value: string) {
  const [address, price] = value.split(":");
  if (address === undefined) {
    throw new Error("Invalid orderbook listing");
  }
  return { address, value: price === undefined ? 600 : parseInt(price) };
}

/*
 |--------------------------------------------------------------------------------
 | Validators
 |--------------------------------------------------------------------------------
 */

/**
 * Check if the ordinal transaction is owned by the maker of the order.
 *
 * @param location - Location of the ordinal transaction.
 * @param maker    - Address of the maker of the order.
 */
async function validateLocation(location: string, maker: string): Promise<void> {
  const [txid, n] = parseLocation(location);

  const tx = await rpc.transactions.getRawTransaction(txid, true);
  if (tx === undefined) {
    throw new OrderTransactionNotFound(location);
  }

  const vout = tx.vout[n];
  if (vout === undefined) {
    throw new OrderVoutNotFound(location);
  }

  if (vout.scriptPubKey.address !== maker) {
    throw new OrderInvalidMaker(location);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Validators
 |--------------------------------------------------------------------------------
 */

type Block = {
  hash: string;
  height: number;
  time: number;
  txid: string;
};
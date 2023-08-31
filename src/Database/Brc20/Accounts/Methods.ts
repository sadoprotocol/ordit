import { collection } from "./Collection";

export const accounts = {
  collection,
  getAccount,
  getTokenBalance,
  addAvailableBalance,
  addTransferableBalance,
  sendTransferableBalance,
};

export async function getAccount(address: string) {
  const account = await collection.findOne({ address });
  if (account === null) {
    return { address, tokens: {} };
  }
  return account;
}

/**
 * Get token balance under a given address.
 *
 * Token balance represents the accumulation of all mints that have been
 * made for the account address minus all transfers created for the same
 * address.
 *
 * @param address - Address of the account.
 * @param token   - Tick of the token to get the balance of.
 */
async function getTokenBalance(address: string, token: string) {
  const account = await collection.findOne({ address });
  if (account === null) {
    return { balance: 0, available: 0, transferable: 0 };
  }
  return account.tokens[token] ?? 0;
}

/**
 * Add available balance to the account address for the given token and amount.
 *
 * @param address - Account address to add available balance to.
 * @param token   - Token to add available balance for.
 * @param amount  - Amount to add to the available balance.
 */
async function addAvailableBalance(address: string, token: string, amount: number) {
  return collection.updateOne(
    {
      address,
    },
    {
      $inc: {
        [`tokens.${token}.balance`]: amount,
        [`tokens.${token}.available`]: amount,
      },
      $setOnInsert: {
        address,
        [`tokens.${token}.transferable`]: 0,
      },
    },
    {
      upsert: true,
    }
  );
}

/**
 * Add transferable balance to the account address with the given token and amount.
 *
 * Transferable balance occurs when a transfer inscription event occurs on chain where
 * the genesis txid matches the outpoint of said inscription.
 *
 * Transferable balance reduces the available balance by the transfer amount but retains
 * the overall balance until the transferable balance has been sent to another address.
 *
 * @param address - Account address to add transferable balance to.
 * @param token   - Token to add transferable balance for.
 * @param amount  - Amount to add to the transferable balance.
 */
async function addTransferableBalance(address: string, token: string, amount: number) {
  return collection.updateOne(
    {
      address,
    },
    {
      $inc: {
        [`tokens.${token}.available`]: -amount,
        [`tokens.${token}.transferable`]: amount,
      },
    }
  );
}

/**
 * Sends transferable balance from the sender to receiver address with the given token
 * and amount.
 *
 * Send occurs when a transfer inscription event occurs on chain where the genesis txid
 * no longer matches the outpoint of said inscription.
 *
 * Send event of transferable balance decreases both the overall balance of the sender and
 * increases the overall and available balance of the receiver. If the sender and receiver
 * is the same the transferable balance is gets moved back into the available balance.
 *
 * @param sender   - Account address to send transferable balance from.
 * @param receiver - Account address to send transferable balance to.
 * @param token    - Token to send transferable balance for.
 * @param amount   - Amount to transfer between the parties.
 */
async function sendTransferableBalance(from: string, to: string, token: string, amount: number) {
  if (from === to) {
    return collection.updateOne(
      {
        address: from,
      },
      {
        $inc: {
          [`tokens.${token}.available`]: amount,
          [`tokens.${token}.transferable`]: -amount,
        },
      }
    );
  }
  await collection.updateOne(
    {
      address: from,
    },
    {
      $inc: {
        [`tokens.${token}.balance`]: -amount,
        [`tokens.${token}.transferable`]: -amount,
      },
    }
  );
  await collection.updateOne(
    {
      address: to,
    },
    {
      $inc: {
        [`tokens.${token}.balance`]: amount,
        [`tokens.${token}.available`]: amount,
      },
      $setOnInsert: {
        address: to,
        [`tokens.${token}.transferable`]: 0,
      },
    },
    {
      upsert: true,
    }
  );
}

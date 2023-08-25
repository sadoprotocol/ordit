import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { rpc } from "../../../Services/Bitcoin";
import { addBlock } from "../../../Workers/Sado/AddBlock";
import { parse } from "../../../Workers/Sado/Parse";

export default method({
  params: Schema({
    height: number,
  }),
  handler: async ({ height }) => {
    const block = await rpc.blockchain.getBlock(height, 2);
    await addBlock(block);
    await parse();
  },
});

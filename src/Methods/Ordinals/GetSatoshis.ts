import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

export default method({
  params: Schema({
    location: string,
  }),
  handler: async ({ location }) => {
    return []; // ord.list(location);
  },
});

import { config } from "../../Config";
import { ORD_DATA } from "../../Paths";
import { bitcoinArgs } from "../../Services/Ord";

console.log([config.ord.bin, ...bitcoinArgs, `--data-dir=${ORD_DATA}`].join(" "));

import fs from "fs";
import { isInteger, parse } from "lossless-json";
import pLimit from "p-limit";
import path from "path";
import { exit } from "process";
import { RuneUtxoBalance } from "runestone-lib";

import { config } from "~Config";
import { db } from "~Database";

async function main() {
  console.time("Execution time");
  try {
    const ORD_URI = config.ord.uri;
    const discrepancies: Array<{
      dbTxid: string;
      dbVout: number;
      runeTicker: string;
      dbAmount: string;
      ordAmount: string;
    }> = [];

    const BATCH_SIZE = 100;
    const CONCURRENT_REQUESTS = 50;
    let notFoundCount = 0;
    let batchCount = 0;

    const logFilePath = path.join(__dirname, "data_validation.log");
    fs.writeFileSync(logFilePath, ""); // empty file

    console.log("-----------------------------");
    console.log("BATCH_SIZE:", BATCH_SIZE);
    console.log("CONCURRENT_REQUESTS:", CONCURRENT_REQUESTS);
    console.log("-----------------------------\n");

    const limit = pLimit(CONCURRENT_REQUESTS);

    const cursor = db.runes.collectionOutputs.find({
      spentTxid: { $exists: false },
    });

    const totalDocuments = await db.runes.collectionOutputs.countDocuments({
      spentTxid: { $exists: false },
    });
    const totalBatches = Math.ceil(totalDocuments / BATCH_SIZE);

    while (await cursor.hasNext()) {
      batchCount++;
      const batch: RuneUtxoBalance[] = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        if (await cursor.hasNext()) {
          const doc = await cursor.next();
          if (doc) {
            batch.push(doc as RuneUtxoBalance);
          }
        } else {
          break;
        }
      }

      if (batch.length === 0) {
        break;
      }

      const progress = ((batchCount / totalBatches) * 100).toFixed(2);
      process.stdout.write(`\rProcessing... ${progress}%`);

      const tasks = batch.map((doc) =>
        limit(async () => {
          const txid = doc.txid;
          const vout = doc.vout;
          const outputUrl = `${ORD_URI}/output/${txid}:${vout}`;

          try {
            const response = await fetch(outputUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (!response.ok) {
              notFoundCount++;
              fs.appendFileSync(logFilePath, `${txid}:${vout}[${doc.runeTicker}]: not found in ord\n`, "utf-8");
              return;
            }

            const ordData: any = parse(await response.text(), null, (value) => {
              if (isInteger(value)) return BigInt(value);
            });

            const processedRunes: any = {};
            for (const [key, value] of Object.entries(ordData.runes)) {
              const cleanedKey = key.replace(/•/g, "");
              processedRunes[cleanedKey] = value;
            }

            const ordRune = processedRunes[doc.runeTicker];
            if (!ordRune) {
              notFoundCount++;
              fs.appendFileSync(logFilePath, `${txid}:${vout}[${doc.runeTicker}]: not found in ord\n`, "utf-8");
              return;
            }

            const ordAmount = ordRune.amount;

            if (BigInt(doc.amount) !== ordAmount) {
              discrepancies.push({
                dbTxid: txid,
                dbVout: vout,
                runeTicker: doc.runeTicker,
                dbAmount: doc.amount.toString(),
                ordAmount: ordAmount.toString(),
              });
            }
          } catch (error) {
            console.error(`Error fetching from ord server:`, error);
          }
        }),
      );

      await Promise.all(tasks);
    }

    process.stdout.write("\rProcessing... 100% - Completed.\n\n");

    if (discrepancies.length > 0) {
      console.log("Discrepancies found ❗");
      discrepancies.forEach((discrepancy, index) => {
        const diff = Math.abs(Number(discrepancy.dbAmount) - Number(discrepancy.ordAmount));
        console.log(`${index + 1}. Txid: ${discrepancy.dbTxid}, Vout: ${discrepancy.dbVout}`);
        console.log(`   RuneTicker: ${discrepancy.runeTicker}`);
        console.log(`   DB Amount: ${discrepancy.dbAmount}`);
        console.log(`   ORD Amount: ${discrepancy.ordAmount}`);
        console.log(`   Diff: ${diff}`);
      });
    } else {
      console.log("No discrepancies found ✅");
    }

    if (notFoundCount === 0) console.log(`All UTXOs present in ord ✅`);
    else {
      console.log(`UTXOs not present in ord: ${notFoundCount} ❗`);
      console.log(`\nDetailed utxo log at: ${logFilePath} ℹ️`);
    }
  } catch (error) {
    console.error("An error occurred in the main function:", error);
  } finally {
    console.timeEnd("Execution time");
    exit(1);
  }
}

main();

import { collection, IPFSDocument } from "./Collection";

export async function setIPFS(document: IPFSDocument): Promise<void> {
  await collection.updateOne({ cid: document.cid }, { $set: document }, { upsert: true });
}

export async function getIPFS(cid: string): Promise<IPFSDocument | undefined> {
  const document = await collection.findOne({ cid });
  if (document === null) {
    return undefined;
  }
  delete (document as any)._id;
  return document;
}

import { FastifyRequest } from "fastify";

import { rpc } from "~Services/Bitcoin";
import { ord } from "~Services/Ord";

import { db } from "../Database";
import { fastify } from "../Fastify";

type BlockHeightRequest = FastifyRequest<{
  Params: {
    height: number;
  };
}>;

type BlockInfoRequest = FastifyRequest<{
  Params: {
    query: string;
  };
}>;

type InscriptionIdRequest = FastifyRequest<{
  Params: {
    inscriptionId: string;
  };
}>;

type InscriptionIdPageRequest = FastifyRequest<{
  Params: {
    inscriptionId: string;
    page: number;
  };
}>;

type SatNumberRequest = FastifyRequest<{
  Params: {
    satNumber: number;
  };
}>;

type SatPageRequest = FastifyRequest<{
  Params: {
    satNumber: number;
    page: number;
  };
}>;

type SatIndexRequest = FastifyRequest<{
  Params: {
    satNumber: number;
    index: number;
  };
}>;

fastify.get(
  "/r/blockhash/:blockheight",
  {
    schema: {
      params: {
        height: { type: "number" },
      },
    },
  },
  async (request: BlockHeightRequest, reply) => {
    const blockhash = await rpc.blockchain.getBlockHash(request.params.height);
    reply.send({ blockhash });
  },
);

fastify.get("/r/blockhash", async () => {
  return rpc.blockchain.getLatestBlock().then((block) => block.hash);
});

fastify.get("/r/blockheight", async () => {
  return rpc.blockchain.getBlockCount();
});

fastify.get(
  "/r/blockinfo/:query",
  {
    schema: {
      params: {
        query: { type: "string" },
      },
    },
  },
  async (request: BlockInfoRequest) => {
    return rpc.blockchain.getBlock(request.params.query, 2);
  },
);

fastify.get("/r/blocktime", async () => {
  return rpc.blockchain.getLatestBlock().then((block) => block.time);
});

fastify.get(
  "/r/children/:inscriptionId",
  {
    schema: {
      params: {
        inscriptionId: { type: "string" },
      },
    },
  },
  async (request: InscriptionIdRequest) => {
    const inscription = await db.inscriptions.getInscriptionById(request.params.inscriptionId);
    if (inscription === undefined) {
      throw new Error("Inscription not found");
    }
    return inscription.children ? inscription.children.slice(0, 100) : [];
  },
);

fastify.get(
  "/r/children/:inscriptionId/:page",
  {
    schema: {
      params: {
        inscriptionId: { type: "string" },
        page: { type: "number" },
      },
    },
  },
  async (request: InscriptionIdPageRequest) => {
    const inscription = await db.inscriptions.getInscriptionById(request.params.inscriptionId);
    const pageIndex = request.params.page - 1;
    if (inscription === undefined) {
      throw new Error("Inscription not found");
    }
    return inscription.children ? inscription.children.slice(pageIndex * 100, (pageIndex + 1) * 100) : [];
  },
);

fastify.get(
  "/r/inscription/:inscriptionId",
  {
    schema: {
      params: {
        inscriptionId: { type: "string" },
      },
    },
  },
  async (request: InscriptionIdRequest) => {
    return db.inscriptions.getInscriptionById(request.params.inscriptionId);
  },
);

fastify.get(
  "/r/metadata/:inscriptionId",
  {
    schema: {
      params: {
        inscriptionId: { type: "string" },
      },
    },
  },
  async (request: InscriptionIdRequest) => {
    const inscription = await db.inscriptions.getInscriptionById(request.params.inscriptionId);
    if (inscription === undefined) {
      throw new Error("Inscription not found");
    }
    return inscription.meta;
  },
);

fastify.get(
  "/r/parents/:inscriptionId",
  {
    schema: {
      params: {
        inscriptionId: { type: "string" },
      },
    },
  },
  async (request: InscriptionIdRequest) => {
    try {
      const inscription = await db.inscriptions.getInscriptionById(request.params.inscriptionId);
      if (inscription === undefined) {
        throw new Error("Inscription not found");
      }
      let parents = inscription.parents;
      if (!parents || parents.length === 0) {
        const ordData = await ord.getInscription(inscription.id);

        if (ordData) {
          if (ordData.parents) {
            parents = ordData.parents;
            await db.inscriptions.updateOne(
              { _id: inscription._id },
              {
                $set: {
                  parents: ordData.parents,
                },
              },
            );
          }
        }
      }
      return parents?.slice(0, 100);
    } catch (e) {
      return [];
    }
  },
);

fastify.get(
  "/r/parents/:inscriptionId/:page",
  {
    schema: {
      params: {
        inscriptionId: { type: "string" },
        page: { type: "number" },
      },
    },
  },
  async (request: InscriptionIdPageRequest) => {
    const inscription = await db.inscriptions.getInscriptionById(request.params.inscriptionId);
    const pageIndex = request.params.page - 1;
    if (inscription === undefined) {
      throw new Error("Inscription not found");
    }
    return inscription.parents ? inscription.parents.slice(pageIndex * 100, (pageIndex + 1) * 100) : [];
  },
);

fastify.get(
  "/r/sat/:satNumber",
  {
    schema: {
      params: {
        satNumber: { type: "number" },
      },
    },
  },
  async (request: SatNumberRequest) => {
    const inscriptions = await db.inscriptions.find(
      { sat: request.params.satNumber },
      { sort: { number: 1 }, limit: 100 },
    );
    return inscriptions.map((inscription) => inscription.id);
  },
);

fastify.get(
  "/r/sat/:satNumber/:page",
  {
    schema: {
      params: {
        satNumber: { type: "number" },
        page: { type: "number" },
      },
    },
  },
  async (request: SatPageRequest) => {
    const pageIndex = request.params.page - 1 || 0;
    const inscriptions = await db.inscriptions.find(
      { sat: request.params.satNumber },
      { sort: { number: 1 }, skip: pageIndex * 100, limit: 100 },
    );
    return inscriptions.map((inscription) => inscription.id);
  },
);

fastify.get(
  "/r/sat/:satNumber/at/:index",
  {
    schema: {
      params: {
        satNumber: { type: "number" },
        index: { type: "number" },
      },
    },
  },
  async (request: SatIndexRequest) => {
    const isNegative = request.params.index < 0;
    const inscriptions = await db.inscriptions.find(
      { sat: request.params.satNumber },
      { sort: { number: isNegative ? -1 : 1 } },
    );
    const inscription = inscriptions[isNegative ? Math.abs(request.params.index) - 1 : request.params.index];
    return inscription.id;
  },
);

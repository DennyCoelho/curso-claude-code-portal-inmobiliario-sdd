import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

import { GET as listProperties } from "../src/app/api/properties/route";
import { GET as getProperty } from "../src/app/api/properties/[id]/route";
import { Prisma } from "../src/generated/prisma/client";
import type {
  PublicPropertyRecord,
  PublicPropertyRepository,
} from "../src/repositories/public-property-repository";
import {
  createPublicPropertyService,
  publicPropertyService,
} from "../src/services/public-property-service";

const propertyId = "00000000-0000-4000-8000-000000000001";
const property: PublicPropertyRecord = {
  id: propertyId,
  title: "Apartamento no Centro",
  description: "Aluguel mensal de um imóvel no Brasil.",
  operation: "RENT",
  type: "APARTMENT",
  price: new Prisma.Decimal("2500"),
  usableArea: new Prisma.Decimal("72.50"),
  totalArea: new Prisma.Decimal("95.75"),
  bedrooms: 2,
  bathrooms: 1,
  parkingSpaces: 0,
  age: 5,
  address: "Praça da Sé",
  addressNumber: "s/n",
  addressComplement: null,
  neighborhood: "Sé",
  city: "São Paulo",
  state: "SP",
  postalCode: "01001000",
  country: "BR",
  isFeatured: true,
  createdAt: new Date("2026-10-01T12:00:00.000Z"),
  updatedAt: new Date("2026-10-02T12:00:00.000Z"),
  images: [{
    id: "imagem",
    url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    position: 0,
    isMain: true,
  }],
  features: [{ id: "caracteristica", name: "Elevador" }],
};

function repositoryWith(
  record: PublicPropertyRecord | null = property,
): PublicPropertyRepository {
  return {
    async findPublished() {
      return record ? [record] : [];
    },
    async findPublishedById() {
      return record;
    },
  };
}

function detailRequest(id: string) {
  return getProperty(new Request(`http://localhost/api/properties/${id}`), {
    params: Promise.resolve({ id }),
  });
}

function listRequest(query = "") {
  return listProperties(new Request(`http://localhost/api/properties${query}`));
}

afterEach(() => mock.restoreAll());

test("o serviço serializa BRL e áreas com precisão e datas em UTC sem alterar os registros", async () => {
  const service = createPublicPropertyService(repositoryWith());
  const [listed] = await service.list();
  assert.deepEqual(await service.findById(propertyId), listed);
  assert.equal(listed.price, "2500.00");
  assert.equal(listed.usableArea, "72.50");
  assert.equal(listed.totalArea, "95.75");
  assert.equal(listed.createdAt, "2026-10-01T12:00:00.000Z");
  assert.equal(listed.updatedAt, "2026-10-02T12:00:00.000Z");
  assert.equal(listed.postalCode, "01001000");
  assert.equal(listed.operation, "RENT");
  assert.equal(listed.country, "BR");
  assert.deepEqual(listed.images, property.images);
  assert.deepEqual(listed.features, property.features);
  assert.ok(property.price instanceof Prisma.Decimal);
  assert.ok(property.createdAt instanceof Date);
});

test("o serviço preserva decimais grandes, campos nulos e relações vazias", async () => {
  const service = createPublicPropertyService(repositoryWith({
    ...property,
    operation: "SALE",
    type: "LAND",
    price: new Prisma.Decimal("999999999999.99"),
    usableArea: null,
    totalArea: null,
    bedrooms: null,
    bathrooms: null,
    parkingSpaces: null,
    age: null,
    images: [],
    features: [],
  }));
  const result = (await service.findById(propertyId))!;
  assert.equal(result.price, "999999999999.99");
  for (const field of [
    "usableArea", "totalArea", "bedrooms", "bathrooms", "parkingSpaces", "age",
  ] as const) {
    assert.equal(result[field], null);
  }
  assert.deepEqual(result.images, []);
  assert.deepEqual(result.features, []);
});

test("o serviço representa ausência de imóveis e propaga falhas de persistência", async () => {
  const emptyService = createPublicPropertyService(repositoryWith(null));
  assert.deepEqual(await emptyService.list(), []);
  assert.equal(await emptyService.findById(propertyId), null);

  const failure = new Error("Falha de persistência");
  const failingService = createPublicPropertyService({
    async findPublished() {
      throw failure;
    },
    async findPublishedById() {
      throw failure;
    },
  });
  await assert.rejects(failingService.list(), failure);
  await assert.rejects(failingService.findById(propertyId), failure);
});

test("GET da listagem retorna JSON 200 sem cache, incluindo uma lista vazia", async () => {
  const expected = await createPublicPropertyService(repositoryWith()).list();
  const listMock = mock.method(publicPropertyService, "list", async () => expected);
  const response = await listRequest();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("Content-Type")!, /application\/json/);
  assert.deepEqual(await response.json(), expected);

  listMock.mock.mockImplementation(async () => []);
  const emptyResponse = await listRequest();
  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(await emptyResponse.json(), []);
});

test("GET de detalhes aceita UUID em maiúsculas e retorna o contrato público", async () => {
  const expected = await createPublicPropertyService(repositoryWith())
    .findById(propertyId);
  const findMock = mock.method(
    publicPropertyService, "findById", async () => expected,
  );
  const uppercaseId = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";
  const response = await detailRequest(uppercaseId);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), expected);
  assert.equal(findMock.mock.calls[0].arguments[0], uppercaseId.toLowerCase());
});

test("GET rejeita IDs malformados com 400 antes de consultar a persistência", async () => {
  const findMock = mock.method(publicPropertyService, "findById");
  for (const id of ["invalido", "123", `${propertyId}x`, "' OR 1=1--"]) {
    const response = await detailRequest(id);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), {
      message: "Identificador de imóvel inválido.",
      status: 400,
    });
  }
  assert.equal(findMock.mock.callCount(), 0);
});

test("GET retorna 404 uniforme para imóvel inexistente ou não publicado", async () => {
  mock.method(publicPropertyService, "findById", async () => null);
  const response = await detailRequest(propertyId);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    message: "Imóvel não encontrado.",
    status: 404,
  });
});

test("as duas rotas retornam 500 em português sem expor detalhes internos", async () => {
  const failure = new Error("postgresql://usuario:segredo@servidor/banco");
  mock.method(publicPropertyService, "list", async () => {
    throw failure;
  });
  mock.method(publicPropertyService, "findById", async () => {
    throw failure;
  });
  const logMock = mock.method(console, "error", () => {});

  for (const response of [await listRequest(), await detailRequest(propertyId)]) {
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), {
      message: "Não foi possível consultar os imóveis.",
      status: 500,
    });
  }
  assert.equal(logMock.mock.callCount(), 2);
});

test("a listagem normaliza search e encaminha o termo ao serviço sem misturar parâmetros futuros", async () => {
  const listMock = mock.method(publicPropertyService, "list", async () => []);
  for (const search of ["", "   ", " São Paulo & jardim? ", "a".repeat(200), "%_\\", "' OR 1=1--"]) {
    const query = new URLSearchParams({ search, isPublished: "false", operation: "RENT" });
    const response = await listRequest(`?${query}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    assert.equal(listMock.mock.calls.at(-1)!.arguments[0], search.trim());
  }
});

test("a API rejeita busca longa ou repetida antes de consultar o serviço", async () => {
  const listMock = mock.method(publicPropertyService, "list", async () => []);
  for (const [query, message] of [
    [`?search=${"a".repeat(201)}`, "Use até 200 caracteres na busca."],
    ["?search=SP&search=PR", "Informe apenas um termo de busca."],
    ["?search=&search=", "Informe apenas um termo de busca."],
  ]) {
    const response = await listRequest(query);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { message, status: 400 });
  }
  assert.equal(listMock.mock.callCount(), 0);
});

test("o serviço encaminha a busca ao repositório e mantém a serialização pública", async () => {
  const repository = repositoryWith();
  const findMock = mock.method(repository, "findPublished");
  const service = createPublicPropertyService(repository);
  const [result] = await service.list("São Paulo");
  assert.equal(findMock.mock.calls[0].arguments[0], "São Paulo");
  assert.equal(result.price, "2500.00");
  assert.equal(result.createdAt, "2026-10-01T12:00:00.000Z");
});

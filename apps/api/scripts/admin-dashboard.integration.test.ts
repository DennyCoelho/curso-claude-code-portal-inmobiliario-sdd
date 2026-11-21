import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { createDatabaseClient } from "../src/lib/db/client";
import { createAdminDashboardRepository } from "../src/repositories/admin-dashboard-repository";
import { createAdminDashboardService } from "../src/services/admin-dashboard-service";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(() => database.$disconnect());
class RollbackTest extends Error {}

test("PostgreSQL conta rascunhos, operações, contas inativas e consultas de visitante/conta e reflete alterações", async () => {
  try {
    await database.$transaction(async (client) => {
      const service = createAdminDashboardService(createAdminDashboardRepository(client));
      const initial = await service.getCounts();
      const users = await Promise.all([true, false].map((isActive) => client.user.create({ data: {
        name: "Indicadores Teste", email: `${randomUUID()}@exemplo.test`, passwordHash: "teste", isActive, role: isActive ? "ADMIN" : "USER",
      } })));
      const properties = [];
      for (const operation of ["SALE", "RENT"] as const) {
        for (const isPublished of [true, false]) {
          properties.push(await client.property.create({ data: {
            title: "Imóvel para validar indicadores", description: "Cadastro temporário em transação revertida.",
            operation, isPublished, type: "HOUSE", price: "100000.00", address: "Rua de Teste", addressNumber: "10",
            neighborhood: "Centro", city: "São Paulo", state: "SP", postalCode: "01000000",
          } }));
        }
      }
      for (const userId of [null, users[0].id]) {
        await client.inquiry.create({ data: { propertyId: properties[0].id, userId, name: "João Silva",
          email: "consulta@exemplo.test", phone: "+5511912345678", message: "Consulta temporária dos indicadores." } });
      }
      const expected = { totalProperties: initial.totalProperties + 4, publishedProperties: initial.publishedProperties + 2,
        saleProperties: initial.saleProperties + 2, rentProperties: initial.rentProperties + 2,
        totalUsers: initial.totalUsers + 2, totalInquiries: initial.totalInquiries + 2 };
      assert.deepEqual(await service.getCounts(), expected);
      await client.property.update({ where: { id: properties[0].id }, data: { isPublished: false, operation: "RENT" } });
      assert.deepEqual(await service.getCounts(), { ...expected, publishedProperties: expected.publishedProperties - 1,
        saleProperties: expected.saleProperties - 1, rentProperties: expected.rentProperties + 1 });
      throw new RollbackTest();
    }, { timeout: 30_000, maxWait: 10_000, isolationLevel: "RepeatableRead" });
  } catch (error) { if (!(error instanceof RollbackTest)) throw error; }
});

import "server-only";
import { cache } from "react";
import { db } from "./db";
import { money } from "../lib/utils";
export const currency = cache(async (organizationId: string) => {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { currencyDisplay: true },
  });
  return (ore: number) =>
    money(ore, org.currencyDisplay === "code" ? "code" : "symbol");
});

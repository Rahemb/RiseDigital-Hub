import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { calendarEvents, reportData } from "../src/server/analytics";
import { updateProfile, updateAgency } from "../src/server/settings-service";
import { hashPassword, verifyPassword } from "../src/server/password";
import {
  saveBusiness,
  recordPayment,
  generatePayments,
  changeStatus,
  addComment,
} from "../src/server/business-service";
import {
  businessDate,
  dateKey,
  moneyInput,
  paymentSummary,
  progress,
} from "../src/lib/business";
import {
  saveUpload,
  readDocument,
  manageDocument,
  validateFile,
  storedPath,
} from "../src/server/document-service";
test("money uses exact minor units and validates boundaries", () => {
  assert.equal(moneyInput.parse("123,45"), 12345);
  assert.equal(moneyInput.parse("0.01"), 1);
  for (const amount of ["-1", "1.001", "0", "21474836.48", "NaN"])
    assert.equal(moneyInput.safeParse(amount).success, false);
});
test("connected work, payments, recurrence, files and tenant isolation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "rise-business-"));
  const filename = path.join(directory, "test.db");
  const sqlite = new DatabaseSync(filename);
  for (const m of (await readdir("prisma/migrations"))
    .filter((m) => m !== "migration_lock.toml")
    .sort())
    sqlite.exec(
      await readFile(
        path.join("prisma/migrations", m, "migration.sql"),
        "utf8",
      ),
    );
  sqlite.close();
  const db = new PrismaClient({
    datasourceUrl: `file:${filename.replaceAll("\\", "/")}`,
  });
  try {
    const org = await db.organization.create({ data: { name: "Test agency" } });
    const foreign = await db.organization.create({
      data: { name: "Other agency" },
    });
    const user = await db.user.create({
      data: {
        organizationId: org.id,
        name: "Owner",
        email: "business@example.com",
        passwordHash: "unused",
      },
    });
    const client = await db.client.create({
      data: {
        organizationId: org.id,
        companyName: "Client",
        contactPerson: "Contact",
        email: "client@example.com",
      },
    });
    const other = await db.client.create({
      data: {
        organizationId: foreign.id,
        companyName: "Other",
        contactPerson: "Other",
        email: "other@example.com",
      },
    });
    const projectInput = {
      name: "Site rebuild",
      clientId: client.id,
      type: "Website",
      status: "IN_PROGRESS",
      priority: "HIGH",
      startDate: "2026-01-01",
      deadline: "2026-02-01",
      archived: false,
    };
    const project = await saveBusiness(db, org.id, "projects", projectInput);
    await saveBusiness(
      db,
      org.id,
      "projects",
      { ...projectInput, name: "Updated site" },
      project.id,
    );
    const taskInput = {
      title: "Launch",
      clientId: client.id,
      projectId: project.id,
      status: "TODO",
      priority: "HIGH",
      dueDate: "2026-01-30",
    };
    const task = await saveBusiness(db, org.id, "tasks", taskInput);
    await changeStatus(db, org.id, "tasks", task.id, "COMPLETED");
    let persisted = await db.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.ok(persisted.completedAt);
    assert.equal(progress([persisted]), 100);
    await changeStatus(db, org.id, "tasks", task.id, "TODO");
    persisted = await db.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(persisted.completedAt, null);
    await addComment(db, org.id, user.id, "tasks", task.id, "Launch checklist");
    await addComment(
      db,
      org.id,
      user.id,
      "projects",
      project.id,
      "Project note",
    );
    await assert.rejects(
      saveBusiness(db, org.id, "tasks", { ...taskInput, clientId: other.id }),
    );
    await assert.rejects(
      saveBusiness(db, foreign.id, "projects", projectInput, project.id),
    );
    const service = await saveBusiness(db, org.id, "services", {
      name: "Maintenance",
      category: "Website",
      billingType: "MONTHLY",
      defaultPriceOre: "1000.00",
      active: true,
    });
    const agreementInput = {
      clientId: client.id,
      serviceId: service.id,
      priceOre: "1000.00",
      intervalMonths: "1",
      intervalDays: "",
      startDate: "2026-01-31",
      endDate: "2026-03-31",
      nextPaymentDate: "2026-01-31",
      active: true,
    };
    const agreement = await saveBusiness(
      db,
      org.id,
      "agreements",
      agreementInput,
    );
    assert.equal(await generatePayments(db, org.id, "2026-03-31"), 3);
    assert.equal(await generatePayments(db, org.id, "2026-03-31"), 0);
    const obligations = await db.paymentObligation.findMany({
      where: { agreementId: agreement.id },
      orderBy: { dueDate: "asc" },
    });
    assert.deepEqual(
      obligations.map((p) => dateKey(p.dueDate)),
      ["2026-01-31", "2026-02-28", "2026-03-31"],
    );
    const payment = obligations[0];
    await recordPayment(db, org.id, payment.id, {
      amountOre: "250.50",
      paidAt: "2026-02-01",
      method: "VIPPS",
    });
    let obligation = await db.paymentObligation.findUniqueOrThrow({
      where: { id: payment.id },
      include: { transactions: true },
    });
    assert.equal(paymentSummary(obligation).outstanding, 74950);
    assert.equal(
      paymentSummary(obligation, businessDate("2026-02-02")).status,
      "OVERDUE",
    );
    await assert.rejects(
      recordPayment(db, org.id, payment.id, {
        amountOre: "750",
        paidAt: "2026-02-01",
        method: "CASH",
      }),
    );
    await recordPayment(db, org.id, payment.id, {
      amountOre: "749.50",
      paidAt: "2026-02-01",
      method: "BANK_TRANSFER",
    });
    obligation = await db.paymentObligation.findUniqueOrThrow({
      where: { id: payment.id },
      include: { transactions: true },
    });
    assert.equal(paymentSummary(obligation).status, "PAID");
    await assert.rejects(
      recordPayment(db, foreign.id, payment.id, {
        amountOre: "1",
        paidAt: "2026-02-01",
        method: "OTHER",
      }),
    );
    const ticket = await saveBusiness(db, org.id, "support", {
      title: "Fix contact form",
      clientId: client.id,
      projectId: project.id,
      category: "Website",
      status: "OPEN",
      priority: "URGENT",
      dueDate: "2026-02-01",
    });
    await addComment(
      db,
      org.id,
      user.id,
      "support",
      ticket.id,
      "Investigating",
    );
    await saveBusiness(db, org.id, "reminders", {
      title: "Quarterly call",
      clientId: client.id,
      dueDate: "2026-02-01",
      completed: false,
    });
    const root = path.join(directory, "uploads");
    const doc = await saveUpload(
      db,
      org.id,
      { clientId: client.id, projectId: project.id, ticketId: ticket.id },
      { name: "../../contract.txt", bytes: Buffer.from("Private contract") },
      root,
    );
    assert.equal(doc.originalName, "contract.txt");
    assert.equal(
      (await readDocument(db, org.id, doc.id, root)).bytes.toString(),
      "Private contract",
    );
    await assert.rejects(readDocument(db, foreign.id, doc.id, root));
    await assert.rejects(storedPath("../outside", root));
    assert.throws(() => validateFile("fake.png", Buffer.from("not png")));
    assert.throws(() => validateFile("script.html", Buffer.from("<script>")));
    await manageDocument(db, org.id, doc.id, "trash");
    await assert.rejects(readDocument(db, org.id, doc.id, root));
    await manageDocument(db, org.id, doc.id, "restore");
    assert.equal(
      (await readDocument(db, org.id, doc.id, root)).bytes.length,
      16,
    );
    const events = await calendarEvents(db, org.id, "2026-01-01", "2026-03-31");
    for (const type of [
      "Tasks",
      "Projects",
      "Payments",
      "Follow-ups",
      "Support",
    ])
      assert.ok(
        events.some((e) => e.type === type),
        `Calendar missing ${type}`,
      );
    assert.equal(
      (await calendarEvents(db, foreign.id, "2026-01-01", "2026-03-31")).length,
      0,
    );
    const reports = await reportData(db, org.id, "2026-01-01", "2026-03-31");
    assert.equal(reports.expected, 300000);
    assert.equal(reports.received, 100000);
    assert.equal(reports.outstanding, 200000);
    assert.equal(reports.byClient[0].ore, 100000);
    assert.equal(reports.byService[0].name, "Maintenance");
    assert.equal(
      (await reportData(db, org.id, "2026-03-01", "2026-03-31")).received,
      0,
    );
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword("Original test password!") },
    });
    await db.session.create({
      data: {
        id: "test-session",
        userId: user.id,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const profile = {
      name: "Updated owner",
      email: "updated@example.com",
      currentPassword: "Original test password!",
      newPassword: "Updated test password!",
      confirmPassword: "Updated test password!",
      theme: "dark",
    };
    await assert.rejects(
      updateProfile(db, user.id, { ...profile, currentPassword: "wrong" }),
    );
    assert.equal(await updateProfile(db, user.id, profile), true);
    const changedUser = await db.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    assert.equal(changedUser.email, "updated@example.com");
    assert.ok(
      verifyPassword("Updated test password!", changedUser.passwordHash),
    );
    assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
    await updateAgency(db, org.id, {
      name: "Updated agency",
      email: "agency@example.com",
      phone: "",
      address: "",
      website: "https://example.com",
      organizationNumber: "",
      currencyDisplay: "code",
      weekStartsOn: 0,
      focusDays: 14,
    });
    assert.equal(
      (await db.organization.findUniqueOrThrow({ where: { id: org.id } }))
        .focusDays,
      14,
    );
    await db.$disconnect();
    assert.equal(
      (await db.project.findUniqueOrThrow({ where: { id: project.id } })).name,
      "Updated site",
    );
    assert.equal(
      await db.paymentTransaction.count({ where: { organizationId: org.id } }),
      2,
    );
    assert.equal(
      await db.ticketComment.count({ where: { ticketId: ticket.id } }),
      1,
    );
  } finally {
    await db.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});

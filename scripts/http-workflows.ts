import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { dateKey } from "../src/lib/business";
type Manifest = { node: Record<string, { exportedName: string }> };
export async function verifyWorkflows(
  db: PrismaClient,
  base: string,
  cookie: string,
  manifest: Manifest,
  clientId: string,
) {
  const headers = { Origin: base, Cookie: cookie };
  async function action(
    name: string,
    args: unknown[],
    fields: Record<string, string>,
    url: string,
  ) {
    const id = Object.entries(manifest.node).find(
      ([, e]) => e.exportedName === name,
    )?.[0];
    assert.ok(id, `Missing action ${name}`);
    const form = new FormData();
    form.set("$ACTION_REF_qa", "");
    form.set("$ACTION_qa:0", JSON.stringify({ id, bound: "$@1" }));
    form.set("$ACTION_qa:1", JSON.stringify(args));
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    const response = await fetch(base + url, {
      method: "POST",
      body: form,
      headers,
      redirect: "manual",
    });
    assert.ok(
      response.status === 200 || response.status === 303,
      `${name} HTTP ${response.status}`,
    );
    return response;
  }
  const clientInput = {
    companyName: "HTTP new client",
    contactPerson: "Contact",
    email: "http@example.com",
    phone: "",
    website: "",
    organizationNumber: "",
    address: "",
    status: "ACTIVE",
    tags: "HTTP",
    summary: "Created through a server action",
  };
  await action("saveClientAction", [clientInput, null], {}, "/clients/new");
  const created = await db.client.findFirstOrThrow({
    where: { companyName: "HTTP new client" },
  });
  await action(
    "saveClientAction",
    [{ ...clientInput, companyName: "HTTP edited client" }, created.id],
    {},
    `/clients/${created.id}/edit`,
  );
  assert.equal(
    (await db.client.findUniqueOrThrow({ where: { id: created.id } }))
      .companyName,
    "HTTP edited client",
  );
  const projectFields = {
    name: "HTTP project",
    clientId,
    type: "Website",
    status: "IN_PROGRESS",
    priority: "HIGH",
    startDate: dateKey(),
    deadline: dateKey(),
    archived: "false",
  };
  await action(
    "saveRecordAction",
    ["projects", null],
    projectFields,
    "/projects/new",
  );
  const project = await db.project.findFirstOrThrow({
    where: { name: "HTTP project" },
  });
  await action(
    "saveRecordAction",
    ["projects", project.id],
    { ...projectFields, name: "HTTP project edited" },
    `/projects/${project.id}/edit`,
  );
  const taskFields = {
    title: "HTTP task",
    clientId,
    projectId: project.id,
    status: "TODO",
    priority: "HIGH",
    dueDate: dateKey(),
    archived: "false",
  };
  await action("saveRecordAction", ["tasks", null], taskFields, "/tasks/new");
  const task = await db.task.findFirstOrThrow({
    where: { title: "HTTP task" },
  });
  await action(
    "statusAction",
    ["tasks", task.id, "COMPLETED"],
    {},
    `/tasks/${task.id}`,
  );
  assert.ok(
    (await db.task.findUniqueOrThrow({ where: { id: task.id } })).completedAt,
  );
  await action(
    "commentAction",
    ["tasks", task.id, {}],
    { body: "HTTP task comment" },
    `/tasks/${task.id}`,
  );
  assert.equal(await db.taskComment.count({ where: { taskId: task.id } }), 1);
  await action(
    "saveRecordAction",
    ["services", null],
    {
      name: "HTTP maintenance",
      category: "Web",
      billingType: "MONTHLY",
      defaultPriceOre: "200",
      active: "true",
    },
    "/services/new",
  );
  const service = await db.service.findFirstOrThrow({
    where: { name: "HTTP maintenance" },
  });
  await action(
    "saveRecordAction",
    ["agreements", null],
    {
      clientId,
      serviceId: service.id,
      priceOre: "200",
      intervalMonths: "1",
      intervalDays: "",
      startDate: dateKey(),
      nextPaymentDate: dateKey(),
      active: "true",
    },
    "/agreements/new",
  );
  const agreement = await db.clientService.findFirstOrThrow({
    where: { serviceId: service.id },
  });
  await action("generateAction", [{}], { through: dateKey() }, "/payments");
  await action("generateAction", [{}], { through: dateKey() }, "/payments");
  assert.equal(
    await db.paymentObligation.count({ where: { agreementId: agreement.id } }),
    1,
  );
  const obligation = await db.paymentObligation.findFirstOrThrow({
    where: { agreementId: agreement.id },
  });
  await action(
    "transactionAction",
    [obligation.id, {}],
    {
      amountOre: "75.25",
      paidAt: dateKey(),
      method: "VIPPS",
      reference: "HTTP partial",
    },
    `/payments/${obligation.id}`,
  );
  const total = await db.paymentTransaction.aggregate({
    where: { obligationId: obligation.id },
    _sum: { amountOre: true },
  });
  assert.equal(total._sum.amountOre, 7525);
  await action(
    "saveRecordAction",
    ["support", null],
    {
      title: "HTTP support",
      clientId,
      projectId: project.id,
      category: "Web",
      status: "OPEN",
      priority: "URGENT",
      dueDate: dateKey(),
    },
    "/support/new",
  );
  const ticket = await db.supportTicket.findFirstOrThrow({
    where: { title: "HTTP support" },
  });
  await action(
    "commentAction",
    ["support", ticket.id, {}],
    { body: "HTTP support comment" },
    `/support/${ticket.id}`,
  );
  assert.equal(
    await db.ticketComment.count({ where: { ticketId: ticket.id } }),
    1,
  );
  await action(
    "saveRecordAction",
    ["reminders", null],
    {
      title: "HTTP follow-up",
      clientId,
      dueDate: dateKey(),
      completed: "false",
    },
    "/reminders/new",
  );
  const upload = new FormData();
  upload.set("clientId", clientId);
  upload.set("projectId", project.id);
  upload.set("ticketId", ticket.id);
  upload.set(
    "file",
    new Blob(["HTTP private document"], { type: "text/plain" }),
    "private.txt",
  );
  const uploaded = await fetch(base + "/api/documents", {
    method: "POST",
    body: upload,
    headers,
  });
  assert.equal(uploaded.status, 201);
  const document = (await uploaded.json()) as { id: string };
  const download = await fetch(base + `/api/documents/${document.id}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), "HTTP private document");
  assert.match(download.headers.get("content-disposition") ?? "", /attachment/);
  assert.equal(
    (
      await fetch(base + `/api/documents/${document.id}`, {
        redirect: "manual",
      })
    ).status,
    307,
  );
  await action("documentAction", [document.id, "trash"], {}, "/documents");
  assert.equal(
    (
      await fetch(base + `/api/documents/${document.id}`, {
        headers: { Cookie: cookie },
      })
    ).status,
    404,
  );
  await action("documentAction", [document.id, "restore"], {}, "/documents");
  assert.equal(
    (
      await fetch(base + `/api/documents/${document.id}`, {
        headers: { Cookie: cookie },
      })
    ).status,
    200,
  );
  const rejectedUpload = await fetch(base + "/api/documents", {
    method: "POST",
    body: upload,
    headers: { ...headers, Origin: "https://untrusted.example" },
  });
  assert.equal(rejectedUpload.status, 403);
  await action(
    "settingsAction",
    ["profile", {}],
    {
      name: "HTTP updated owner",
      email: "qa@example.com",
      theme: "dark",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    "/settings",
  );
  assert.equal((await db.user.findFirstOrThrow()).name, "HTTP updated owner");
  await action(
    "settingsAction",
    ["agency", {}],
    {
      name: "HTTP updated agency",
      email: "agency@example.com",
      phone: "",
      address: "",
      website: "",
      organizationNumber: "",
      currencyDisplay: "code",
      weekStartsOn: "0",
      focusDays: "14",
    },
    "/settings",
  );
  assert.equal((await db.organization.findFirstOrThrow()).focusDays, 14);
  const urls = [
    "/",
    "/clients",
    "/projects",
    "/projects?view=board",
    "/tasks?view=board",
    "/services",
    "/agreements",
    "/payments",
    "/calendar",
    "/calendar?view=week",
    "/support",
    "/documents",
    "/reports",
    "/settings",
    `/projects/${project.id}`,
    `/tasks/${task.id}`,
    `/services/${service.id}`,
    `/agreements/${agreement.id}`,
    `/payments/${obligation.id}`,
    `/support/${ticket.id}`,
    ...[
      "Overview",
      "Projects",
      "Services",
      "Tasks",
      "Payments",
      "Documents",
      "Notes",
      "Activity",
      "Support",
      "Follow-ups",
    ].map((tab) => `/clients/${clientId}?tab=${tab}`),
  ];
  for (const url of urls) {
    const response = await fetch(base + url, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200, `${url} failed`);
    const html = await response.text();
    assert.doesNotMatch(
      html,
      /coming in a later phase|SOON|not implemented in the current phase/,
    );
  }
  const calendar = await (
    await fetch(base + "/calendar", { headers: { Cookie: cookie } })
  ).text();
  assert.match(calendar, /HTTP follow-up/);
  assert.match(calendar, /HTTP support/);
  const reports = await (
    await fetch(base + "/reports", { headers: { Cookie: cookie } })
  ).text();
  assert.match(reports, /HTTP maintenance/);
  const foreignOrg = await db.organization.create({
    data: { name: "Foreign HTTP organization" },
  });
  const foreignClient = await db.client.create({
    data: {
      organizationId: foreignOrg.id,
      companyName: "Foreign client",
      contactPerson: "Other",
      email: "foreign@example.com",
    },
  });
  const before = await db.task.count();
  await action(
    "saveRecordAction",
    ["tasks", null],
    { ...taskFields, clientId: foreignClient.id },
    "/tasks/new",
  );
  assert.equal(await db.task.count(), before);
  // App Router may have started a streamed 200 response before notFound().
  // Assert the denial UI and absence of the foreign data, not only the status.
  const foreignPage = await (
    await fetch(base + `/clients/${foreignClient.id}`, {
      headers: { Cookie: cookie },
    })
  ).text();
  assert.match(foreignPage, /Record not found/);
  assert.doesNotMatch(foreignPage, /foreign@example.com|Foreign client/);
  console.log(
    "PASS: HTTP client/project/task/service/agreement/payment/support/follow-up mutations; partial payments, recurring deduplication, all pages and client tabs, calendar/reports, uploads/downloads/trash/restore, settings and tenant isolation.",
  );
}

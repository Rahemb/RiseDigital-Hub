import {
  projectStatuses,
  taskStatuses,
  ticketStatuses,
  priorities,
  type Kind,
  label,
  dateKey,
} from "./business";
export type Option = {
  value: string;
  label: string;
  clientId?: string;
  projectId?: string | null;
};
export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "select";
  required?: boolean;
  options?: Option[];
  source?: "clients" | "projects" | "services" | "agreements" | "users";
  hint?: string;
};
const options = (values: readonly string[]) =>
  values.map((value) => ({ value, label: label(value) }));
const client: Field = {
  name: "clientId",
  label: "Client",
  type: "select",
  source: "clients",
  required: true,
};
const project: Field = {
  name: "projectId",
  label: "Project (optional)",
  type: "select",
  source: "projects",
};
const description: Field = {
  name: "description",
  label: "Description",
  type: "textarea",
};
const priority: Field = {
  name: "priority",
  label: "Priority",
  type: "select",
  options: options(priorities),
};
const active: Field = {
  name: "active",
  label: "Agreement / service status",
  type: "select",
  options: [
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
  ],
};
const archive: Field = {
  name: "archived",
  label: "Visibility",
  type: "select",
  options: [
    { value: "false", label: "Current" },
    { value: "true", label: "Archived" },
  ],
};
export const config: Record<
  Kind,
  {
    title: string;
    singular: string;
    description: string;
    fields: Field[];
    defaults: Record<string, string>;
    statuses?: readonly string[];
  }
> = {
  projects: {
    title: "Projects",
    singular: "project",
    description: "Keep every delivery connected to the bigger picture.",
    statuses: projectStatuses,
    defaults: {
      type: "Website",
      status: "PLANNED",
      priority: "MEDIUM",
      archived: "false",
    },
    fields: [
      { name: "name", label: "Project name", required: true },
      client,
      { name: "type", label: "Project type", required: true },
      priority,
      {
        name: "status",
        label: "Status",
        type: "select",
        options: options(projectStatuses),
      },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "deadline", label: "Deadline", type: "date" },
      archive,
      description,
    ],
  },
  tasks: {
    title: "Tasks",
    singular: "task",
    description: "Clear priorities. Steady progress. Work that moves forward.",
    statuses: taskStatuses,
    defaults: { status: "TODO", priority: "MEDIUM", archived: "false" },
    fields: [
      { name: "title", label: "Task title", required: true },
      client,
      project,
      {
        name: "assigneeId",
        label: "Assigned to",
        type: "select",
        source: "users",
      },
      priority,
      {
        name: "status",
        label: "Status",
        type: "select",
        options: options(taskStatuses),
      },
      { name: "dueDate", label: "Due date", type: "date" },
      archive,
      description,
    ],
  },
  services: {
    title: "Service catalog",
    singular: "service",
    description: "Define what your agency offers. Negotiate prices per client.",
    defaults: {
      category: "Digital services",
      billingType: "MONTHLY",
      active: "true",
    },
    fields: [
      { name: "name", label: "Service name", required: true },
      { name: "category", label: "Category", required: true },
      {
        name: "defaultPriceOre",
        label: "Default price (NOK)",
        type: "text",
        hint: "Optional. Use up to two decimal places.",
      },
      {
        name: "billingType",
        label: "Billing type",
        type: "select",
        options: options(["ONE_TIME", "MONTHLY", "CUSTOM"]),
      },
      active,
      description,
    ],
  },
  agreements: {
    title: "Client agreements",
    singular: "agreement",
    description: "A clear scope and a negotiated price for every relationship.",
    defaults: { active: "true", intervalMonths: "1", startDate: dateKey() },
    fields: [
      client,
      {
        name: "serviceId",
        label: "Service",
        type: "select",
        source: "services",
        required: true,
      },
      {
        name: "priceOre",
        label: "Agreed price per period (NOK)",
        required: true,
      },
      {
        name: "intervalMonths",
        label: "Billing interval in months",
        type: "number",
        hint: "1 = monthly. Leave both intervals empty for one-time.",
      },
      {
        name: "intervalDays",
        label: "Or custom interval in days",
        type: "number",
      },
      {
        name: "startDate",
        label: "Agreement start date",
        type: "date",
        required: true,
      },
      { name: "endDate", label: "Agreement end date", type: "date" },
      {
        name: "nextPaymentDate",
        label: "First / next expected payment",
        type: "date",
        hint: "Defaults to agreement start. Existing generated records are preserved.",
      },
      active,
      { name: "notes", label: "Agreement notes", type: "textarea" },
    ],
  },
  payments: {
    title: "Payments",
    singular: "payment obligation",
    description:
      "Expected and received, clearly separated. Always manually recorded.",
    statuses: ["PENDING", "PARTIALLY_PAID", "OVERDUE", "PAID", "CANCELLED"],
    defaults: { cancelled: "false", dueDate: dateKey() },
    fields: [
      client,
      {
        name: "agreementId",
        label: "Service agreement (optional)",
        type: "select",
        source: "agreements",
      },
      { name: "amountOre", label: "Amount due (NOK)", required: true },
      { name: "dueDate", label: "Due date", type: "date", required: true },
      { name: "reference", label: "Reference" },
      {
        name: "cancelled",
        label: "Obligation status",
        type: "select",
        options: [
          { value: "false", label: "Open / automatically calculated" },
          { value: "true", label: "Cancelled" },
        ],
      },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  support: {
    title: "Support",
    singular: "ticket",
    description: "Give every client request a clear next step.",
    statuses: ticketStatuses,
    defaults: {
      status: "OPEN",
      priority: "MEDIUM",
      category: "Technical support",
    },
    fields: [
      { name: "title", label: "Ticket title", required: true },
      client,
      project,
      { name: "category", label: "Category", required: true },
      priority,
      {
        name: "status",
        label: "Status",
        type: "select",
        options: options(ticketStatuses),
      },
      { name: "dueDate", label: "Due date", type: "date" },
      description,
      { name: "internalNotes", label: "Internal context", type: "textarea" },
    ],
  },
  reminders: {
    title: "Follow-ups",
    singular: "follow-up",
    description: "Stay close to the clients who need your attention.",
    statuses: ["PENDING", "COMPLETED"],
    defaults: { completed: "false", dueDate: dateKey() },
    fields: [
      { name: "title", label: "Follow-up title", required: true },
      client,
      {
        name: "dueDate",
        label: "Follow-up date",
        type: "date",
        required: true,
      },
      {
        name: "completed",
        label: "Status",
        type: "select",
        options: [
          { value: "false", label: "Pending" },
          { value: "true", label: "Completed" },
        ],
      },
    ],
  },
};

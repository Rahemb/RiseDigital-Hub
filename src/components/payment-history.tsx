import Link from "next/link";
import { db } from "@/server/db";
import { currency } from "@/server/currency";
import { dateLabel } from "@/lib/utils";
import { label } from "@/lib/business";
export async function PaymentHistory({
  organizationId,
  clientId,
}: {
  organizationId: string;
  clientId: string;
}) {
  const money = await currency(organizationId);
  const transactions = await db.paymentTransaction.findMany({
    where: { organizationId, obligation: { clientId, organizationId } },
    include: {
      obligation: { include: { agreement: { include: { service: true } } } },
    },
    orderBy: { paidAt: "desc" },
  });
  return (
    <section className="panel overflow-x-auto mt-6">
      <h2 className="font-semibold p-5">Received payment history</h2>
      {transactions.length ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Received</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference / service</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{dateLabel(t.paidAt)}</td>
                <td>{money(t.amountOre)}</td>
                <td>{label(t.method)}</td>
                <td>
                  <Link
                    href={`/payments/${t.obligationId}`}
                    className="text-blue-500"
                  >
                    {t.reference ||
                      t.obligation.reference ||
                      t.obligation.agreement?.service.name ||
                      "Payment"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty">No payments received from this client yet.</p>
      )}
    </section>
  );
}

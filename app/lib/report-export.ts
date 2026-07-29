import type { Order } from "../types";
import { toCsv } from "../../lib/csv";

const headers = [
  "Invoice",
  "Date",
  "Customer",
  "Phone",
  "Method",
  "Status",
  "Subtotal",
  "VAT",
  "Total",
  "Paid",
  "Balance",
] as const;

function rows(orders: Order[]) {
  return orders.map((order) => [
    order.invoiceNumber,
    order.orderDate,
    order.customerName,
    order.customerPhone,
    order.paymentMethod,
    order.paymentStatus,
    Number(order.subtotal).toFixed(2),
    Number(order.vatAmount).toFixed(2),
    Number(order.totalAmount).toFixed(2),
    Number(order.amountPaid).toFixed(2),
    Number(order.balance).toFixed(2),
  ]);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportOrdersCsv(orders: Order[], filename: string) {
  download(
    new Blob(["\uFEFF", toCsv(headers, rows(orders))], {
      type: "text/csv;charset=utf-8",
    }),
    `${filename}.csv`,
  );
}

export async function exportOrdersExcel(orders: Order[], filename: string) {
  const escapeXml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const allRows = [[...headers], ...rows(orders)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DDEBE8" ss:Pattern="Solid"/></Style></Styles>
 <Worksheet ss:Name="Orders"><Table>
 ${allRows
   .map(
     (row, index) =>
       `<Row>${row
         .map(
           (cell) =>
             `<Cell${index === 0 ? ' ss:StyleID="Header"' : ""}><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`,
         )
         .join("")}</Row>`,
   )
   .join("")}
 </Table></Worksheet>
</Workbook>`;
  download(
    new Blob(["\uFEFF", xml], {
      type: "application/vnd.ms-excel;charset=utf-8",
    }),
    `${filename}.xml`,
  );
}

export async function exportOrdersPdf(
  orders: Order[],
  filename: string,
  dateRange: string,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  document.setFontSize(16);
  document.text("Laundry order report", 14, 16);
  document.setFontSize(9);
  document.text(dateRange, 14, 22);
  autoTable(document, {
    startY: 27,
    head: [[
      "Invoice",
      "Date",
      "Customer",
      "Method",
      "Status",
      "VAT",
      "Total",
      "Paid",
      "Balance",
    ]],
    body: orders.map((order) => [
      order.invoiceNumber,
      order.orderDate,
      order.customerName,
      order.paymentMethod,
      order.paymentStatus,
      Number(order.vatAmount).toFixed(2),
      Number(order.totalAmount).toFixed(2),
      Number(order.amountPaid).toFixed(2),
      Number(order.balance).toFixed(2),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 105, 92] },
  });
  document.save(`${filename}.pdf`);
}

import { Download, FileText } from 'lucide-react';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

export const POStatementModal = ({
  statementOpen,
  statementData,
  handleDownloadExcel,
  handleDownloadPDF,
  setStatementOpen,
}) => {

  return (
    <>
      {statementOpen && statementData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">

          <div className="bg-white rounded-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">

              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  PO Statement
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {statementData.purchase_order?.client_po_number
                    ? statementData.purchase_order.client_po_number
                    : `Reference ${statementData.purchase_order?.po_number || ""}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStatementOpen(false)}
                >
                  ✕
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-5 pb-4">

                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Total PO Quantity
                    </p>

                    <p className="text-3xl font-bold text-blue-600">
                      {Number(
                        statementData.purchase_order?.total_quantity_mt || 0
                      ).toFixed(2)}

                      <span className="text-sm ml-1">MT</span>
                    </p>

                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-5 pb-4">

                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Dispatched
                    </p>

                    <p className="text-3xl font-bold text-green-600">
                      {Number(
                        statementData.total_dispatched || 0
                      ).toFixed(2)}

                      <span className="text-sm ml-1">MT</span>
                    </p>

                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-5 pb-4">

                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Remaining
                    </p>

                    <p className="text-3xl font-bold text-orange-600">
                      {Number(
                        statementData.remaining || 0
                      ).toFixed(2)}

                      <span className="text-sm ml-1">MT</span>
                    </p>

                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-5 pb-4">

                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Status
                    </p>

                    <div className="mt-2">

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${statementData.purchase_order?.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                          }`}
                      >
                        {statementData.purchase_order?.status}
                      </span>

                    </div>

                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-5">

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">

                    <div>
                      <p className="text-gray-500 text-xs mb-1">
                        Client
                      </p>

                      <p className="font-medium text-slate-800">
                        {statementData.purchase_order?.to_company_name || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs mb-1">
                        Depot
                      </p>

                      <p className="font-medium text-slate-800">
                        {statementData.purchase_order?.depot_name || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs mb-1">
                        Product
                      </p>

                      <p className="font-medium text-slate-800">
                        {statementData.purchase_order?.product_name || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs mb-1">
                        PO Date
                      </p>

                      <p className="font-medium text-slate-800">
                        {statementData.purchase_order?.client_po_date
                          ? new Date(statementData.purchase_order.client_po_date).toLocaleDateString("en-IN")
                          : statementData.purchase_order?.po_date
                            ? new Date(statementData.purchase_order.po_date).toLocaleDateString("en-IN")
                            : "-"}
                      </p>
                    </div>

                  </div>

                </CardContent>
              </Card>

              <Card>

                <CardContent className="p-0">

                  <div className="px-5 py-4 border-b bg-slate-900 text-white rounded-t-lg">

                    <h3 className="font-semibold text-lg">
                      Transaction Statement
                    </h3>

                    <p className="text-xs text-slate-300 mt-1">
                      Dispatch history for this purchase order
                    </p>

                  </div>

                  <div className="overflow-x-auto">

                    <table className="w-full text-sm">

                      <thead>

                        <tr className="bg-slate-100 border-b">

                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Date
                          </th>

                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Type
                          </th>

                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Reference
                          </th>

                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Vehicle
                          </th>

                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Company
                          </th>

                          <th className="px-4 py-3 text-right font-medium text-slate-600">
                            Qty (MT)
                          </th>

                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Status
                          </th>

                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Verified By
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {statementData.transactions?.length ? (

                          statementData.transactions.map((txn, idx) => (

                            <tr
                              key={idx}
                              className="border-b hover:bg-slate-50 transition"
                            >

                              <td className="px-4 py-3 whitespace-nowrap text-gray-600">

                                {txn.date
                                  ? new Date(txn.date).toLocaleString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    }
                                  )
                                  : "-"}

                              </td>

                              <td className="px-4 py-3">

                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${txn.type === "Pickup"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                    }`}
                                >
                                  {txn.type === 'Pickup' ? 'Dispatch' : 'Pickup'}
                                </span>

                              </td>


                              <td className="px-4 py-3">

                                <span className="font-mono text-blue-600">
                                  {statementData.purchase_order?.client_po_number
                                    ? statementData.purchase_order.client_po_number
                                    : txn.reference_no
                                      ? `Reference ${txn.reference_no}`
                                      : "-"}
                                </span>

                              </td>

                              <td className="px-4 py-3">

                                <span className="font-mono">
                                  {txn.vehicle || "-"}
                                </span>

                              </td>

                              <td className="px-4 py-3">
                                {txn.company || "-"}
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-green-600">

                                {Number(
                                  txn.quantity || 0
                                ).toFixed(2)}

                              </td>

                              <td className="px-4 py-3">

                                <span
                                  className={`px-2 py-1 rounded text-xs ${txn.status === "verified" ||
                                    txn.status === "Verified"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                    }`}
                                >
                                  {txn.status || "-"}
                                </span>

                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {txn.verified_by || "-"}
                              </td>

                            </tr>

                          ))

                        ) : (

                          <tr>

                            <td
                              colSpan="8"
                              className="text-center py-10 text-gray-500"
                            >
                              No transactions found
                            </td>

                          </tr>

                        )}

                      </tbody>


                      <tfoot>

                        <tr className="bg-slate-100 font-semibold border-t">

                          <td
                            colSpan="5"
                            className="px-4 py-3 text-right"
                          >
                            Total Dispatched:
                          </td>

                          <td className="px-4 py-3 text-right text-green-700">

                            {Number(
                              statementData.total_dispatched || 0
                            ).toFixed(2)}{" "}
                            MT

                          </td>

                          <td colSpan="2"></td>

                        </tr>

                      </tfoot>

                    </table>

                  </div>

                </CardContent>

              </Card>

            </div>

          </div>

        </div>
      )}
    </>
  );
};
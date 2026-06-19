import { Package } from 'lucide-react';

export const CompanyReportsDataTable = ({
  productsList,
  isExpanded,
  totalPO
}) => {



  return (
    <>
      {isExpanded && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Product-wise Breakdown
          </h4>

          <div className="space-y-4">
            {productsList.map((product, pIdx) => {
              const fromDepotsList = Object.values(product.fromDepots);

              return (
                <div key={pIdx} className="border rounded-lg overflow-hidden">
                  <div className="p-4 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          {product.productCode && (
                            <p className="text-xs text-gray-500 mono">{product.productCode}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-right">
                        <div>
                          <p className="text-sky-600">PO Qty</p>
                          <p className="font-bold text-sky-700">{(totalPO).toFixed(2)} MT</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Quantity</p>
                          <p className="font-bold text-blue-600">{product.quantity.toFixed(2)} MT</p>
                        </div>
                        <div>
                          <p className="text-green-600">Verified</p>
                          <p className="font-medium text-green-700">{product.verified.toFixed(2)} MT</p>
                        </div>
                        <div>
                          <p className="text-yellow-600">Pending</p>
                          <p className="font-medium text-yellow-700">{product.pending.toFixed(2)} MT</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Source Depots */}
                  <div className="p-4 bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 mb-2">Source Depots:</p>
                    <div className="flex flex-wrap gap-2">
                      {fromDepotsList.map((depot, dIdx) => (
                        <span key={dIdx} className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded-full text-xs">
                          <span className="font-medium">{depot.name}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-blue-600">{depot.quantity.toFixed(2)} MT</span>
                          <span className="text-gray-400">({depot.liftings} trips)</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recent Liftings */}
                  <div className="p-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Recent Liftings ({product.liftings.length}):</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left px-2 py-1">Lifting No</th>
                            <th className="text-left px-2 py-1">Date</th>
                            <th className="text-left px-2 py-1">Vehicle</th>
                            <th className="text-left px-2 py-1">Driver</th>
                            <th className="text-left px-2 py-1">From Depot</th>
                            <th className="text-right px-2 py-1">Quantity</th>
                            <th className="text-center px-2 py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.liftings.slice(0, 5).map((lifting, lIdx) => (
                            <tr key={lIdx} className="border-b">
                              <td className="px-2 py-1 mono">{lifting.lifting_no}</td>
                              <td className="px-2 py-1">{lifting.date_of_loading ? new Date(lifting.date_of_loading).toLocaleDateString('en-IN') : '-'}</td>
                              <td className="px-2 py-1 mono">{lifting.vehicle_number || '-'}</td>
                              <td className="px-2 py-1">{lifting.driver_name || '-'}</td>
                              <td className="px-2 py-1">{lifting.loading_point_name || '-'}</td>
                              <td className="px-2 py-1 text-right font-medium">{lifting.quantity_mt} MT</td>
                              <td className="px-2 py-1 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${lifting.unloading_status === 'Verified'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {lifting.unloading_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {product.liftings.length > 5 && (
                        <p className="text-xs text-gray-400 text-center mt-2">
                          And {product.liftings.length - 5} more liftings...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      )}
    </>
  );
};

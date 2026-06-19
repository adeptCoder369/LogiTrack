import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { liftingsApi, getFileUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { usePermissions } from '../lib/permissions';
import { CheckCircle, Clock, Truck, Package, Calendar, MapPin, User, Phone, Weight, FileText } from 'lucide-react';

export default function Verification() {
  const { user } = useAuth();
  const [liftings, setLiftings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [verifyData, setVerifyData] = useState({
    date_of_unloading: new Date().toISOString().split('T')[0],
    time_of_unloading: new Date().toTimeString().slice(0, 5),
  });
  const [rejectReasons, setRejectReasons] = useState({});
  const { hasPermission } = usePermissions();
  const canVerifyUnloading = hasPermission('Verification (Unloading)');

  useEffect(() => {
    fetchPendingLiftings();
  }, []);

  const fetchPendingLiftings = async () => {
    try {
      const response = await liftingsApi.getAll({ unloading_status: 'Pending' });
      setLiftings(response.data);
    } catch (error) {
      toast.error('Failed to load pending liftings');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (liftingId) => {
    if (!canVerifyUnloading) {
		toast.error('You do not have permission to verify unloading');
		return;
    }
    if (!verifyData.date_of_unloading || !verifyData.time_of_unloading) {
      toast.error('Please enter date and time of unloading');
      return;
    }
    setVerifying(liftingId);
    try {
      await liftingsApi.verify(liftingId, verifyData);
      toast.success('Lifting verified successfully! Inventory updated.');
      fetchPendingLiftings();
    } catch (error) {
      toast.error('Failed to verify lifting');
    } finally {
      setVerifying(null);
    }
  };
  
    const handleReject = async (liftingId) => {
	  if (!canVerifyUnloading) {
		toast.error('You do not have permission to reject unloading');
		return;
	  }

            const reason = rejectReasons[liftingId] || '';

            if (!reason.trim()) {
              toast.error('Please enter a rejection reason');
              return;
            }

	  setVerifying(liftingId);
	  try {
		await liftingsApi.reject(liftingId, {
		  reason: reason,
		});
		toast.success('Lifting verification rejected');
		setRejectReasons(prev => ({
                    ...prev,
                    [liftingId]: ''
                }));
		fetchPendingLiftings();
	  } catch (error) {
		toast.error(error.response?.data?.detail || 'Failed to reject verification');
	  } finally {
		setVerifying(null);
	  }
	};
        

  if (loading) {
    return (
      <PageLayout title="Verification" subtitle="Verify unloading at depot">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </PageLayout>
    );
  }
  
	if (!canVerifyUnloading) {
	  return (
		<PageLayout title="Unloading Verification" subtitle="Verify incoming deliveries at your depot">
		  <div className="p-8 text-center text-gray-500">
			You do not have permission to verify unloading.
		  </div>
		</PageLayout>
	  );
	}


  return (
    <PageLayout 
      title="Unloading Verification" 
      subtitle="Verify incoming deliveries at your depot"
    >
      {/* Summary - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="border-t-4 border-yellow-500">
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Pending Verification</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{liftings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Liftings - Mobile Optimized */}
      {liftings.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900">All Caught Up!</h3>
            <p className="text-sm text-gray-500">No pending verifications at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {liftings.map((lifting) => (
            <Card 
              key={lifting.id} 
              className="hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Header - Always Visible */}
              <CardHeader 
                className="p-3 sm:pb-2 border-b bg-gray-50 cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === lifting.id ? null : lifting.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <CardTitle className="text-base sm:text-lg mono truncate">{lifting.lifting_no}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full whitespace-nowrap">
                      Pending
                    </span>
                    <span className="text-xs text-gray-400 lg:hidden">
                      {expandedCard === lifting.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
                
                {/* Quick Info - Always Visible on Mobile */}
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {lifting.product_name}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="font-medium">{lifting.quantity_mt} MT</span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1 mono">
                    <Truck className="w-3 h-3" />
                    {lifting.vehicle_number}
                  </span>
                </div>
              </CardHeader>

              {/* Expandable Content - Mobile */}
              <CardContent 
                className={`p-3 sm:pt-4 space-y-3 sm:space-y-4 transition-all duration-200 ${
                  expandedCard === lifting.id || window.innerWidth >= 1024 ? '' : 'hidden lg:block'
                }`}
              >
                {/* Product & Vehicle Info - Stacked on Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {/* Product Info */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{lifting.product_name}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{lifting.quantity_mt} MT</p>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium mono text-sm sm:text-base truncate">{lifting.vehicle_number}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {lifting.driver_name || 'N/A'} {lifting.driver_mobile ? `• ${lifting.driver_mobile}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Route & Time Info */}
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-gray-500">From:</span>
                      <span className="ml-1 font-medium truncate block sm:inline">{lifting.loading_point_name}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-gray-500">To:</span>
                      <span className="ml-1 font-medium truncate block sm:inline">{lifting.unloading_point_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-gray-500">Loaded:</span>
                    <span className="font-medium">{lifting.date_of_loading} {lifting.time_of_loading}</span>
                  </div>
                </div>

                {/* Weight Info - if available */}
                {(lifting.net_weight_mt || lifting.gross_weight_mt) && (
                  <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
                    {lifting.gross_weight_mt && (
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                        <Weight className="w-3 h-3" />
                        Gross: {lifting.gross_weight_mt} MT
                      </span>
                    )}
                    {lifting.tare_weight_mt && (
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                        Tare: {lifting.tare_weight_mt} MT
                      </span>
                    )}
                    {lifting.net_weight_mt && (
                      <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                        Net: {lifting.net_weight_mt} MT
                      </span>
                    )}
                  </div>
                )}
        
                {/* Uploads */}
                {lifting.weight_slip && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <FileText className="w-4 h-4" />
                      Uploads
                    </div>

                    {lifting.weight_slip.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <a
                        href={getFileUrl(lifting.weight_slip)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                      <img
                        src={getFileUrl(lifting.weight_slip)}
                        alt="Weight Slip"
                        className="max-h-48 rounded border"
                      />
                      </a>
                    ) : (
                      <a
                        href={getFileUrl(lifting.weight_slip)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View / Download Weight Slip
                      </a>
                    )}
                  </div>
                )}
        
                {!lifting.weight_slip && (
                    <p className="text-xs text-gray-400">No uploads available</p>
                  )}

                {/* Verification Form - Mobile Optimized */}
                <div className="border-t pt-3 sm:pt-4 space-y-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-700">Verify Unloading</p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <Label htmlFor={`date-${lifting.id}`} className="text-xs">Date</Label>
                      <Input
                        id={`date-${lifting.id}`}
                        type="date"
                        value={verifyData.date_of_unloading}
                        onChange={(e) => setVerifyData({ ...verifyData, date_of_unloading: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`time-${lifting.id}`} className="text-xs">Time</Label>
                      <Input
                        id={`time-${lifting.id}`}
                        type="time"
                        value={verifyData.time_of_unloading}
                        onChange={(e) => setVerifyData({ ...verifyData, time_of_unloading: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleVerify(lifting.id)}
                    disabled={verifying === lifting.id || !canVerifyUnloading}
                    className="w-full bg-green-600 hover:bg-green-700 h-10 sm:h-11 text-sm sm:text-base"
                    data-testid={`verify-btn-${lifting.id}`}
                  >
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {verifying === lifting.id ? 'Verifying...' : 'Verify Unloading'}
                  </Button>
				  <div className="space-y-2">
					  <Label className="text-xs">Rejection Reason</Label>
					  <Input
                                                value={rejectReasons[lifting.id] || ''}
                                                onChange={(e) =>
                                                  setRejectReasons(prev => ({
                                                    ...prev,
                                                    [lifting.id]: e.target.value
                                                  }))
                                                }
                                                placeholder="Reason for rejection"
                                            />
					</div>

					<Button
					  variant="outline"
					  onClick={() => handleReject(lifting.id)}
					  disabled={verifying === lifting.id || !canVerifyUnloading}
					  className="w-full border-red-300 text-red-600 hover:bg-red-50 h-10 sm:h-11 text-sm sm:text-base"
					  data-testid={`reject-btn-${lifting.id}`}
					>
					  Reject Verification
					</Button>

                </div>
              </CardContent>

              {/* Mobile: Show verification form toggle */}
              {expandedCard !== lifting.id && (
                <div className="p-3 pt-0 lg:hidden">
                  <Button 
                    variant="outline"
                    onClick={() => setExpandedCard(lifting.id)}
                    className="w-full h-9 text-sm"
                  >
                    Tap to Verify
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}

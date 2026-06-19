import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
// Import missing icons
import {
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Factory,
  ArrowDownToLine,
  Package,
  Building2,
  Users,
  Truck,
  Container,
  Warehouse,
  ClipboardList,
  ArrowRight,
  PackageCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoaderDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="mb-8">
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Open Orders</p>
                    <p className="text-3xl font-bold">{analytics?.orders_by_status?.open || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Ready for liftings</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => navigate('/delivery-orders')}
                >
                  View Orders <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">My Liftings</p>
                    <p className="text-3xl font-bold">{analytics?.counts?.liftings || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Total created</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                    <PackageCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button
                  className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
                  onClick={() => navigate('/liftings')}
                >
                  Create Lifting <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Available Trucks</p>
                    <p className="text-3xl font-bold">{analytics?.counts?.trucks || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-600 rounded-xl flex items-center justify-center">
                    <Container className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => navigate('/trucks')}
                >
                  View Trucks <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                    className="cursor-pointer border-l-4 border-l-cyan-500 hover:shadow-lg transition-all duration-200"
                    onClick={() => navigate('/liftings')}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Stock In</p>
                                <p className="text-3xl font-bold">Liftings</p>
                                <p className="text-xs text-gray-400 mt-1">Create or review stock in records</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <Button
                            className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600"
                            onClick={(e) => { e.stopPropagation(); navigate('/liftings'); }}
                        >
                            Go to Stock In <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer border-l-4 border-l-teal-500 hover:shadow-lg transition-all duration-200"
                    onClick={() => navigate('/pickup')}
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Dispatch Info</p>
                                <p className="text-3xl font-bold">Pickup</p>
                                <p className="text-xs text-gray-400 mt-1">View dispatch planning and pickup details</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Truck className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <Button
                            className="w-full mt-4 bg-teal-500 hover:bg-teal-600"
                            onClick={(e) => { e.stopPropagation(); navigate('/pickup'); }}
                        >
                            Go to Dispatch Info <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
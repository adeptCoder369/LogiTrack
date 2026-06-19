import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
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
import ProductMetricsSection from './ProductMetricsSection';
import { AnalyticsStats } from './AnalyticsStats';
export const ManagementDashboard = ({ analytics, rows }) => {
  const metricsRows = rows || [];
  // console.log('ManagementDashboard metricsRows:', metricsRows);
  const totals = {
    remaining_do_qty: metricsRows.reduce((sum, row) => sum + (row.remaining_do_qty || 0), 0),
    available_stock_qty: metricsRows.reduce((sum, row) => sum + (row.available_stock_qty || 0), 0),
    remaining_po_qty: metricsRows.reduce((sum, row) => sum + (row.remaining_po_qty || 0), 0),
    dispatch_today_qty: metricsRows.reduce((sum, row) => sum + (row.dispatch_today_qty || 0), 0),
    dispatch_yesterday_qty: metricsRows.reduce((sum, row) => sum + (row.dispatch_yesterday_qty || 0), 0),
    dispatch_day_before_yesterday_qty: metricsRows.reduce((sum, row) => sum + (row.dispatch_day_before_yesterday_qty || 0), 0)
  };

  return (
    <>

      <AnalyticsStats analytics={analytics} rows={rows} />

      <ProductMetricsSection metricsRows={metricsRows} />


    </>
  );
}
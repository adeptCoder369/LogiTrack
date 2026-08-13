import { useState, useEffect, useMemo } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { liftingsApi, companiesApi, productsApi, exportApi, pickupApi, } from '../lib/api';
import { toast } from 'sonner';
import {
  Building2, Package, Truck, TrendingUp, TrendingDown, Download,
  ChevronDown, ChevronUp, BarChart3, Calendar, Filter, Search, User, MapPin, X
} from 'lucide-react';
import { CompanyReportsDataTable } from '@/components/companyReports/DataTable';

export default function CompanyReports() {
  const [companies, setCompanies] = useState([]);
  const [liftings, setLiftings] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Advanced search filters
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [pickups, setPickups] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData_ = async () => {
    try {
      const [
        liftingsRes,
        pickupsRes,
        companiesRes,
        productsRes,
        purchaseOrdersRes // Add here
      ] = await Promise.all([
        liftingsApi.getAll({ lifting_type: 'Secondary' }),
        pickupApi.getAll({ status: 'verified,weightment_done,final_verified' }),
        companiesApi.getAll(),
        productsApi.getAll(),
        // companiesApi.getPurchaseOrders() // Ensure you have a general getter or use your preferred route
      ]);
      setLiftings(liftingsRes.data);
      setCompanies(companiesRes.data);
      setProducts(productsRes.data);
      setPickups(pickupsRes.data || []);
      // setPurchaseOrders(purchaseOrdersRes.data || []); // Save to state
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  const fetchData = async () => {
    try {
      const [
        liftingsRes,
        pickupsRes,
        companiesRes,
        productsRes
      ] = await Promise.all([
        liftingsApi.getAll({ lifting_type: 'Secondary' }),
        pickupApi.getAll({ status: 'verified,weightment_done,final_verified' }),
        companiesApi.getAll(),
        productsApi.getAll()
      ]);

      const fetchedCompanies = companiesRes.data || [];

      // Loop through each company and fetch its specific Purchase Orders
      const poPromises = fetchedCompanies.map(async (company) => {
        try {
          const res = await companiesApi.getPurchaseOrders(company.id);
          return { companyId: company.id, pos: res.data || [] };
        } catch (err) {
          console.error(`Failed to load POs for company ${company.id}:`, err);
          return { companyId: company.id, pos: [] };
        }
      });

      const poResults = await Promise.all(poPromises);

      // Flatten all company purchase orders into a single reference array
      const allPOs = poResults.reduce((acc, curr) => {
        const posWithCompanyRef = curr.pos.map(po => ({
          ...po,
          belongs_to_company_id: curr.companyId
        }));
        return [...acc, ...posWithCompanyRef];
      }, []);

      setLiftings(liftingsRes.data);
      setCompanies(fetchedCompanies);
      setProducts(productsRes.data);
      setPickups(pickupsRes.data || []);
      setPurchaseOrders(allPOs); // Save to component state
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  // Build searchable company options with user info
  const searchableCompanyOptions = useMemo(() => {
    const options = [];

    companies.forEach(company => {
      // Add main company entry
      options.push({
        id: company.id,
        companyId: company.id,
        companyName: company.name,
        displayText: company.name,
        searchText: [
          company.name,
          company.trade_name,
          company.city,
          company.district,
          company.state,
          company.country,
          company.gst_number,
          company.contact_person_name,
          company.contact_person_mobile,
          company.primary_email,
          company.whatsapp_number,
          company.telephone
        ].filter(Boolean).join(' ').toLowerCase(),
        city: company.city || '',
        state: company.state || '',
        type: 'company'
      });

      // Add entries for each user in the company
      if (company.users && company.users.length > 0) {
        company.users.forEach(user => {
          options.push({
            id: `${company.id}-${user.id || user.name}`,
            companyId: company.id,
            companyName: company.name,
            userName: user.name,
            userTitle: user.title || user.designation || '',
            displayText: `${user.name}${user.title ? ', ' + user.title : ''} - ${company.name}${company.city ? ', ' + company.city : ''}`,
            searchText: [
              user.name,
              user.title,
              user.designation,
              user.mobile_number,
              user.email,
              user.whatsapp_number,
              company.name,
              company.city,
              company.district,
              company.state
            ].filter(Boolean).join(' ').toLowerCase(),
            city: company.city || '',
            state: company.state || '',
            type: 'user'
          });
        });
      }
    });

    return options;
  }, [companies]);

  // Get unique cities and states for filters
  const uniqueCities = useMemo(() => {
    const cities = [...new Set(companies.map(c => c.city).filter(Boolean))];
    return cities.sort();
  }, [companies]);

  const uniqueStates = useMemo(() => {
    const states = [...new Set(companies.map(c => c.state).filter(Boolean))];
    return states.sort();
  }, [companies]);

  // Filter searchable options based on search query and filters
  const filteredSearchOptions = useMemo(() => {
    let filtered = searchableCompanyOptions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(opt => opt.searchText.includes(query));
    }

    if (cityFilter !== 'all') {
      filtered = filtered.filter(opt => opt.city === cityFilter);
    }

    if (stateFilter !== 'all') {
      filtered = filtered.filter(opt => opt.state === stateFilter);
    }

    // Remove duplicates by companyId (keep first match)
    const uniqueCompanies = {};
    filtered.forEach(opt => {
      if (!uniqueCompanies[opt.companyId]) {
        uniqueCompanies[opt.companyId] = opt;
      }
    });

    return Object.values(uniqueCompanies);
  }, [searchableCompanyOptions, searchQuery, cityFilter, stateFilter]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || cityFilter !== 'all' || stateFilter !== 'all' || selectedCompany !== 'all' || dateRange.from || dateRange.to;

  const clearAllFilters = () => {
    setSearchQuery('');
    setCityFilter('all');
    setStateFilter('all');
    setSelectedCompany('all');
    setDateRange({ from: '', to: '' });
  };

  const getCompanyReports = () => {
    const reports = {};
    const liftingPickupIds = new Set(
        liftings
            .map(l => l.pickup_id)
            .filter(Boolean)
    );

    const companyNameToId = {};
    companies.forEach(c => {
      if (c.name) companyNameToId[c.name.toLowerCase()] = c.id;
    });

    // Filter liftings based on selected company and date range
    let filteredLiftings = [...liftings];
    let filteredPickups = [...pickups];

    // Get list of company IDs that match the search/filter criteria
    const matchingCompanyIds = filteredSearchOptions.map(opt => opt.companyId);
    const matchingCompanyNames = filteredSearchOptions.map(opt => opt.companyName);

    // Apply company filter (from dropdown or search results)
    if (selectedCompany !== 'all') {

      // Liftings
      filteredLiftings = filteredLiftings.filter(l =>
        l.unloading_point_name === selectedCompany ||
        l.unloading_point_id === selectedCompany
      );

      // Pickups
      filteredPickups = filteredPickups.filter(p =>
        p.purchase_order_company_name === selectedCompany ||
        p.purchase_order_company_id === selectedCompany ||
        p.company_name === selectedCompany
      );

    } else if (
      searchQuery ||
      cityFilter !== 'all' ||
      stateFilter !== 'all'
    ) {

      // Liftings
      filteredLiftings = filteredLiftings.filter(l =>
        matchingCompanyIds.includes(l.unloading_point_id) ||
        matchingCompanyNames.includes(l.unloading_point_name)
      );

      // Pickups
      filteredPickups = filteredPickups.filter(p =>
        matchingCompanyIds.includes(
          p.purchase_order_company_id
        ) ||

        matchingCompanyNames.includes(
          p.purchase_order_company_name
        ) ||

        matchingCompanyNames.includes(
          p.company_name
        )
      );
    }

    if (dateRange.from) {

      filteredLiftings = filteredLiftings.filter(
        l => l.date_of_loading >= dateRange.from
      );

      filteredPickups = filteredPickups.filter(
        p => (
          p.verified_at || p.date || ''
        ) >= dateRange.from
      );
    }

    if (dateRange.to) {

      filteredLiftings = filteredLiftings.filter(
        l => l.date_of_loading <= dateRange.to
      );

      filteredPickups = filteredPickups.filter(
        p => (
          p.verified_at || p.date || ''
        ) <= dateRange.to
      );
    }



    // Group by company (unloading point for secondary liftings)
    filteredLiftings.forEach(lifting => {

        if (!["Verified", "Pending"].includes(lifting.unloading_status)) {
          return;
        }
      const companyName = lifting.unloading_point_name || 'Unknown Company';
      const rawCompanyId = lifting.unloading_point_id || companyName;
      const normalizedCompanyId = companyNameToId[companyName.toLowerCase()] || rawCompanyId;
      const productName = lifting.product_name || 'Unknown Product';
      const productId = lifting.product_id || productName;

      if (!reports[normalizedCompanyId]) {
        reports[normalizedCompanyId] = {
          companyId: normalizedCompanyId,
          companyName,
          totalQuantity: 0,
          totalVerified: 0,
          totalPending: 0,
          totalLiftings: 0,
          products: {},
          liftings: []
        };
      }

      // Update company totals
      const qty = Number(
            lifting.net_weight_mt ??
            lifting.quantity_mt ??
            0
        );
        reports[normalizedCompanyId].totalQuantity += qty;
        reports[normalizedCompanyId].totalLiftings += 1;
        reports[normalizedCompanyId].liftings.push(lifting);

        if (lifting.unloading_status === 'Verified') {
          reports[normalizedCompanyId].totalVerified += qty;
        } else {
          reports[normalizedCompanyId].totalPending += qty;
        }

        // Group by product within company
        if (!reports[normalizedCompanyId].products[productId]) {
          reports[normalizedCompanyId].products[productId] = {
            productId,
            productName,
            productCode: lifting.product_code || '',
            quantity: 0,
            totalPOQuantity: 0,
            verified: 0,
            pending: 0,
            liftings: [],
            fromDepots: {}
          };
        }

        const productQty = lifting.quantity_mt || 0;
        reports[normalizedCompanyId].products[productId].quantity += productQty;
        reports[normalizedCompanyId].products[productId].liftings.push(lifting);

        if (lifting.unloading_status === 'Verified') {
          reports[normalizedCompanyId].products[productId].verified += qty;
        } else {
          reports[normalizedCompanyId].products[productId].pending += qty;
        }

        // Track source depots for this product
        const fromDepot = lifting.loading_point_name || 'Unknown Depot';
        if (!reports[normalizedCompanyId].products[productId].fromDepots[fromDepot]) {
          reports[normalizedCompanyId].products[productId].fromDepots[fromDepot] = {
            name: fromDepot,
            quantity: 0,
            liftings: 0
          };
        }
        reports[normalizedCompanyId].products[productId].fromDepots[fromDepot].quantity += qty;
        reports[normalizedCompanyId].products[productId].fromDepots[fromDepot].liftings += 1;
    });

    // ================================
    // VERIFIED PICKUPS (exclude final_verified — they have corresponding liftings)
    // ================================
    filteredPickups.forEach((pickup) => {

      if (liftingPickupIds.has(pickup.id))
        return;
      if (!['verified', 'weightment_done'].includes(pickup.status)) return;

      const companyName =
        pickup.purchase_order_company_name ||
        pickup.company_name ||
        'Unknown Company';

      const rawCompanyId =
        pickup.purchase_order_company_id ||
        companyName;
      const normalizedCompanyId = companyNameToId[companyName.toLowerCase()] || rawCompanyId;

      const productName =
        pickup.product_name ||
        'Unknown Product';

      const productId =
        pickup.product_id ||
        productName;

      const qty = Number(
        pickup.weight_mt || 0
      );

      if (!reports[normalizedCompanyId]) {
        reports[normalizedCompanyId] = {
          companyId: normalizedCompanyId,
          companyName,
          totalQuantity: 0,
          totalPOQuantity: 0,
          totalVerified: 0,
          totalPending: 0,
          totalLiftings: 0,
          products: {},
          liftings: []
        };
      }

      // totals
      reports[normalizedCompanyId].totalQuantity += qty;
      reports[normalizedCompanyId].totalVerified += qty;
      reports[normalizedCompanyId].totalLiftings += 1;

      reports[normalizedCompanyId].liftings.push({
        lifting_no:
          pickup.purchase_order_no,

        vehicle_number:
          pickup.truck_number,

        driver_name:
          pickup.driver_phone,

        loading_point_name:
          pickup.depot_name,

        quantity_mt:
          qty,

        unloading_status:
          "Verified",

        date_of_loading:
          pickup.verified_at
      });

      // products
      if (!reports[normalizedCompanyId].products[productId]) {

        reports[normalizedCompanyId].products[productId] = {
          productId,
          productName,

          productCode:
            pickup.product_code || '',

          quantity: 0,
          totalPOQuantity: 0,
          verified: 0,
          pending: 0,
          liftings: [],
          fromDepots: {}
        };
      }

      reports[normalizedCompanyId].products[productId].quantity += qty;

      reports[normalizedCompanyId].products[productId].verified += qty;

      reports[normalizedCompanyId].products[productId].liftings.push({
        lifting_no:
          pickup.purchase_order_no,

        vehicle_number:
          pickup.truck_number,

        driver_name:
          pickup.driver_name || pickup.driver_phone || '',

        loading_point_name:
          pickup.depot_name || pickup.source_name || 'Unknown Depot',

        quantity_mt:
          qty,

        unloading_status:
          "Verified",

        date_of_loading:
          pickup.verified_at
      });

      // depot tracking
      const fromDepot =
        pickup.depot_name || pickup.source_name || 'Unknown Depot';

      if (
        !reports[normalizedCompanyId]
          .products[productId]
          .fromDepots[fromDepot]
      ) {

        reports[normalizedCompanyId]
          .products[productId]
          .fromDepots[fromDepot] = {
          name: fromDepot,
          quantity: 0,
          liftings: 0
        };
      }

      reports[normalizedCompanyId]
        .products[productId]
        .fromDepots[fromDepot]
        .quantity += qty;

      reports[normalizedCompanyId]
        .products[productId]
        .fromDepots[fromDepot]
        .liftings += 1;

    });
    // Calculate PO metrics per company and per product
    purchaseOrders.forEach(po => {
      const rawCompanyId = po.belongs_to_company_id || '';
      const quantity = parseFloat(po?.total_quantity_mt) || 0;
      const poProductId = po.product_id || '';

      let targetCompanyId = rawCompanyId;
      if (rawCompanyId && reports[rawCompanyId]) {
        targetCompanyId = rawCompanyId;
      } else {
        const companyName = po.company_name || po.to_company_name || '';
        if (companyName) {
          const normalizedName = companyName.toLowerCase();
          if (companyNameToId[normalizedName]) {
            targetCompanyId = companyNameToId[normalizedName];
          } else {
            targetCompanyId = companyName;
          }
        }
      }

      if (targetCompanyId && reports[targetCompanyId]) {
        reports[targetCompanyId].totalPOCount = (reports[targetCompanyId].totalPOCount || 0) + 1;
        reports[targetCompanyId].totalPOQuantity = (reports[targetCompanyId].totalPOQuantity || 0) + quantity;

        if (poProductId && reports[targetCompanyId].products[poProductId]) {
          reports[targetCompanyId].products[poProductId].totalPOQuantity =
            (reports[targetCompanyId].products[poProductId].totalPOQuantity || 0) + quantity;
        }
      }
    });

    return Object.values(reports);
  };
  const toggleCompanyExpand = (companyId) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  // Calculate overall totals
  const companyReports = getCompanyReports();
  const totalStats = companyReports.reduce((acc, company) => ({
    totalQuantity: acc.totalQuantity + company.totalQuantity,
    totalPOQuantity: acc.totalPOQuantity + (company.totalPOQuantity || 0),
    totalVerified: acc.totalVerified + company.totalVerified,
    totalPending: acc.totalPending + company.totalPending,
    totalLiftings: acc.totalLiftings + company.totalLiftings
  }), { totalQuantity: 0, totalPOQuantity: 0, totalVerified: 0, totalPending: 0, totalLiftings: 0 });




  if (loading) {
    return (
      <PageLayout title="Company Reports" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </PageLayout>
    );
  }



  console.log('purchaseOrders : ', companyReports);

  return (
    <PageLayout
      title="Company Reports"
      subtitle="Product-wise secondary lifting reports by company"
      actions={
        <Button variant="outline" onClick={() => window.open(exportApi.liftings({ lifting_type: 'Secondary' }), '_blank')}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          {/* Main Search Bar */}
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="flex-1 min-w-[300px]">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Search className="w-3 h-3" />
                Search Companies / Contacts
              </label>
              <Input
                placeholder="Search by name, GST, city, mobile, person name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Search by: Company Name, GST, City, District, State, Contact Person, Mobile, User Name
              </p>
            </div>
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="h-10"
            >
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearAllFilters} className="text-red-600 h-10">
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t pt-4 mt-2">
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[180px]">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Select Company
                  </label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {filteredSearchOptions.map(opt => (
                        <SelectItem key={opt.companyId} value={opt.companyName}>
                          {opt.type === 'user' ? (
                            <span className="flex items-center gap-2">
                              <User className="w-3 h-3 text-blue-500" />
                              {opt.displayText}
                            </span>
                          ) : (
                            opt.companyName
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[150px]">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    City
                  </label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[150px]">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    State
                  </label>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {uniqueStates.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[140px]">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    From Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md text-sm h-10"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  />
                </div>

                <div className="min-w-[140px]">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    To Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md text-sm h-10"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Search Results Info */}
          {(searchQuery || cityFilter !== 'all' || stateFilter !== 'all') && (
            <div className={`mt-3 p-2 rounded-md ${companyReports.length === 0 && filteredSearchOptions.length > 0 ? 'bg-amber-50' : 'bg-blue-50'}`}>
              <p className={`text-xs ${companyReports.length === 0 && filteredSearchOptions.length > 0 ? 'text-amber-700' : 'text-blue-700'}`}>
                {companyReports.length === 0 && filteredSearchOptions.length > 0 ? (
                  <>
                    <span className="font-medium">{filteredSearchOptions.length}</span> {filteredSearchOptions.length === 1 ? 'company' : 'companies'} found
                    {searchQuery && <span> for "{searchQuery}"</span>}
                    <span className="mx-1">—</span>
                    <span className="text-amber-600">No transactions recorded yet</span>
                    <span className="block mt-1 text-amber-800">
                      <span className="font-medium">Found: </span>
                      {filteredSearchOptions.slice(0, 5).map((opt, idx) => (
                        <span key={opt.companyId}>
                          {opt.companyName}{idx < Math.min(filteredSearchOptions.length, 5) - 1 ? ', ' : ''}
                        </span>
                      ))}
                      {filteredSearchOptions.length > 5 && <span> +{filteredSearchOptions.length - 5} more</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{filteredSearchOptions.length}</span> {filteredSearchOptions.length === 1 ? 'company matches' : 'companies match'} your search
                    {searchQuery && <span className="ml-2">• Search: "{searchQuery}"</span>}
                    {cityFilter !== 'all' && <span className="ml-2">• City: {cityFilter}</span>}
                    {stateFilter !== 'all' && <span className="ml-2">• State: {stateFilter}</span>}
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-t-4 border-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Companies</p>
                <p className="text-2xl font-bold">{companyReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Liftings</p>
                <p className="text-2xl font-bold">{totalStats.totalLiftings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Total Dispatched</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalStats.totalQuantity.toFixed(2)} MT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Pending Verification</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {totalStats.totalPending.toFixed(2)} MT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Reports */}
      {companyReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Secondary Liftings Found</h3>
            <p className="text-gray-500">No secondary liftings to companies have been recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {companyReports.map((company) => {
            const isExpanded = expandedCompanies[company.companyId];
            const productsList = Object.values(company.products);

            return (
              <Card key={company.companyId}>
                <CardHeader
                  className="border-b bg-gradient-to-r from-purple-50 to-pink-50 cursor-pointer"
                  onClick={() => toggleCompanyExpand(company.companyId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Building2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{company.companyName}</CardTitle>
                        <p className="text-sm text-gray-500">
                          {productsList.length} Product(s) • {company.totalLiftings} Lifting(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Received</p>
                        <p className="font-bold text-lg text-purple-600">{company.totalQuantity.toFixed(2)} MT</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* Company Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-sky-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Total PO</p>
                      <p className="text-xl font-bold text-sky-700">{company.totalPOCount || 0}</p>
                    </div>
                    <div className="p-4 bg-sky-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Qty</p>
                      <p className="text-xl font-bold text-sky-700">{company.totalPOQuantity.toFixed(2)} MT</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Dispatched</p>
                      <p className="text-xl font-bold text-purple-600">{company.totalQuantity.toFixed(2)} MT</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Verified</p>
                      <p className="text-xl font-bold text-green-600">{company.totalVerified.toFixed(2)} MT</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Pending</p>
                      <p className="text-xl font-bold text-yellow-600">{company.totalPending.toFixed(2)} MT</p>
                    </div>
                  </div>

                  {/* Product-wise Breakdown */}

                  <CompanyReportsDataTable
                    isExpanded={isExpanded}
                    productsList={productsList}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}

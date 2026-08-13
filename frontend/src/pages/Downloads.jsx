import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { trucksApi, downloadsApi, transportersApi } from '../lib/api';
import { User, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Downloads() {
  const [transporters, setTransporters] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [selectedTransporterId, setSelectedTransporterId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const transportersRes = await transportersApi.getAll();
      setTransporters(transportersRes.data);
      const trucksRes = await trucksApi.getAll();
      setTrucks(trucksRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrucks = selectedTransporterId
    ? trucks.filter(t => t.transporter_id === selectedTransporterId)
    : [];

  const selectedTruck = trucks.find(t => t.id === selectedTruckId);

  const handleDownloadDriverGatepass = () => {
    if (!selectedTruckId) {
      toast.error('Please select a truck first');
      return;
    }
    window.open(downloadsApi.getDriverGatepass(selectedTruckId), '_blank');
  };

  const handleDownloadHelperGatepass = () => {
    if (!selectedTruckId) {
      toast.error('Please select a truck first');
      return;
    }
    window.open(downloadsApi.getHelperGatepass(selectedTruckId), '_blank');
  };

  return (
    <PageLayout
      title="Downloads"
      subtitle="Download gatepass templates for drivers and helpers"
    >
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Select Truck</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="mb-4">
                <Select value={selectedTransporterId} onValueChange={(value) => {
                  setSelectedTransporterId(value);
                  setSelectedTruckId('');
                }}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a transporter" />
                  </SelectTrigger>
                  <SelectContent>
                    {transporters.map((transporter) => (
                      <SelectItem key={transporter.id} value={transporter.id}>
                        {transporter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mb-4">
                <Select value={selectedTruckId} onValueChange={setSelectedTruckId}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a truck to download gatepass" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTrucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        {truck.vehicle_number} {truck.transporter_name && `(${truck.transporter_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedTruck && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Selected Truck Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Vehicle No:</span> <strong>{selectedTruck.vehicle_number}</strong></div>
                    <div><span className="text-gray-500">Driver:</span> <strong>{selectedTruck.driver_name || 'N/A'}</strong></div>
                    <div><span className="text-gray-500">Driver Mobile:</span> <strong>{selectedTruck.driver_mobile || 'N/A'}</strong></div>
                    <div><span className="text-gray-500">Helper:</span> <strong>{selectedTruck.helper1_name || 'N/A'}</strong></div>
                    <div><span className="text-gray-500">Helper Mobile:</span> <strong>{selectedTruck.helper1_mobile || 'N/A'}</strong></div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleDownloadDriverGatepass}
                    className="flex items-center gap-2"
                    disabled={!selectedTruckId}
                  >
                    <User className="w-4 h-4" />
                    Download Driver Gatepass
                  </Button>
                  <Button
                    onClick={handleDownloadHelperGatepass}
                    className="flex items-center gap-2"
                    disabled={!selectedTruckId}
                  >
                    <Users className="w-4 h-4" />
                    Download Helper Gatepass
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { PackageCheck, ArrowRight } from 'lucide-react';

export const WeightmentDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Verify Pickup Card */}
        <Card
          className="cursor-pointer border-l-4 border-l-cyan-500 hover:shadow-lg transition-all duration-200"
          onClick={() => navigate('/verify-pickup')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Stock Out</p>
                <p className="text-3xl font-bold">Weightment Slip</p>
                <p className="text-xs text-gray-400 mt-1">
                  Review and verify weightment logs for outgoing stock
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <PackageCheck className="w-6 h-6 text-white" />
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={(e) => {
                e.stopPropagation(); // Prevents double navigation trigger from the card click
                navigate('/verify-pickup');
              }}
            >
              Go to Weightment Slip <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};
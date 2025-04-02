import React, { useState, useEffect } from 'react';
import workService from '../services/workService';
import { vehicleService } from '../services/vehicleService';
import { Work, CreateWorkData, VehicleSearchParams } from '../types/work';
import { Vehicle } from '../types/models';
import { useAuth } from '../context/AuthContext';

const WorkManagement: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useState<VehicleSearchParams>({});
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Omit<Vehicle, 'id'>>({
    vin: '',
    make: '',
    model: '',
    plate_number: '',
    owner_phone: '',
    mileage: 0,
    lastServiceDate: new Date().toISOString().split('T')[0],
    healthStatus: {
      engine: 100,
      oil: 100,
      tires: 100,
      brakes: 100
    }
  });
  const [newWork, setNewWork] = useState<CreateWorkData>({
    vehicleId: '',
    workType: '',
    description: '',
    partsUsed: '',
    cost: 0,
    status: 'completed'
  });

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const vehicle = await vehicleService.searchVehicle(searchParams);
      console.log(vehicle);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        const vehicleWorks = await workService.getVehicleWorks(vehicle.id);
        setWorks(vehicleWorks);
      } else {
        setShowNewVehicleForm(true);
        setNewVehicle(prev => ({
          ...prev,
          vin: searchParams.vin || '',
          owner_phone: searchParams.ownerPhone || ''
        }));
      }
    } catch (err) {
      setError('Failed to search vehicle');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const vehicle = await vehicleService.createVehicle(newVehicle);
      setSelectedVehicle(vehicle);
      setShowNewVehicleForm(false);
      setNewVehicle({
        vin: '',
        make: '',
        model: '',
        plate_number: '',
        owner_phone: '',
        mileage: 0,
        lastServiceDate: new Date().toISOString().split('T')[0],
        healthStatus: {
          engine: 100,
          oil: 100,
          tires: 100,
          brakes: 100
        }
      });
    } catch (err) {
      setError('Failed to create vehicle');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      setError('Please select a vehicle first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const workData = {
        ...newWork,
        vehicleId: selectedVehicle.id
      };
      await workService.createWork(workData);
      const updatedWorks = await workService.getVehicleWorks(selectedVehicle.id);
      setWorks(updatedWorks);
      setNewWork({
        vehicleId: '',
        workType: '',
        description: '',
        partsUsed: '',
        cost: 0,
        status: 'completed'
      });
    } catch (err) {
      setError('Failed to create work');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (workId: number, newStatus: Work['status']) => {
    if (!selectedVehicle) return;
    
    try {
      setLoading(true);
      setError(null);
      await workService.updateWorkStatus(workId.toString(), newStatus);
      const updatedWorks = await workService.getVehicleWorks(selectedVehicle.id);
      setWorks(updatedWorks);
    } catch (err) {
      setError('Failed to update work status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Work Management</h1>

      {/* Vehicle Search */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Search Vehicle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">VIN</label>
            <input
              type="text"
              value={searchParams.vin || ''}
              onChange={(e) => setSearchParams({ ...searchParams, vin: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner Phone</label>
            <input
              type="text"
              value={searchParams.ownerPhone || ''}
              onChange={(e) => setSearchParams({ ...searchParams, ownerPhone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* New Vehicle Form */}
      {showNewVehicleForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Vehicle</h2>
          <form onSubmit={handleCreateVehicle} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">VIN</label>
                <input
                  type="text"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Make</label>
                <input
                  type="text"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <input
                  type="text"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plate Number</label>
                <input
                  type="text"
                  value={newVehicle.plate_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Owner Phone</label>
                <input
                  type="text"
                  value={newVehicle.owner_phone}
                  onChange={(e) => setNewVehicle({ ...newVehicle, owner_phone: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mileage</label>
                <input
                  type="number"
                  value={newVehicle.mileage}
                  onChange={(e) => setNewVehicle({ ...newVehicle, mileage: parseInt(e.target.value) })}
                  required
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewVehicleForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selected Vehicle Info */}
      {selectedVehicle && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Selected Vehicle</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Make</p>
              <p className="font-medium">{selectedVehicle.make}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Model</p>
              <p className="font-medium">{selectedVehicle.model}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Plate Number</p>
              <p className="font-medium">{selectedVehicle.plate_number}</p>
            </div>
          </div>
        </div>
      )}

      {/* New Work Form */}
      {selectedVehicle && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Work</h2>
          <form onSubmit={handleCreateWork} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Work Type</label>
              <input
                type="text"
                value={newWork.workType}
                onChange={(e) => setNewWork({ ...newWork, workType: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newWork.description}
                onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Parts Used</label>
              <textarea
                value={newWork.partsUsed}
                onChange={(e) => setNewWork({ ...newWork, partsUsed: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cost</label>
              <input
                type="number"
                value={newWork.cost}
                onChange={(e) => setNewWork({ ...newWork, cost: parseFloat(e.target.value) })}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Work'}
            </button>
          </form>
        </div>
      )}

      {/* Works List */}
      {selectedVehicle && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Works History</h2>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <div className="space-y-4">
            {works.map((work) => (
              <div key={work.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{work.work_type}</h3>
                    <p className="text-sm text-gray-600">{work.description}</p>
                    <p className="text-sm text-gray-600">Parts: {work.parts_used}</p>
                    <p className="text-sm text-gray-600">Cost: ${work.cost}</p>
                    <p className="text-sm text-gray-600">
                      Date: {new Date(work.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      work.status === 'completed' ? 'bg-green-100 text-green-800' :
                      work.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {work.status.replace('_', ' ')}
                    </span>
                    {work.technician_id === user?.id && (
                      <button
                        onClick={() => handleStatusUpdate(work.id, 'completed')}
                        disabled={work.status === 'completed' || loading}
                        className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded hover:bg-indigo-200 disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkManagement; 
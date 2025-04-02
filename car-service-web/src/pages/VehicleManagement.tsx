import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types/models';
import { vehicleService } from '../services/vehicleService';
import { toast } from 'react-hot-toast';

const VehicleManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchVin, setSearchVin] = useState('');
  const [searchOwnerPhone, setSearchOwnerPhone] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await vehicleService.getAllVehicles();
      setVehicles(data);
    } catch (error) {
      toast.error('Ошибка при загрузке списка автомобилей');
    }
  };

  const handleSearch = async () => {
    try {
      const vehicle = await vehicleService.searchVehicle({
        vin: searchVin,
        ownerPhone: searchOwnerPhone
      });
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setIsEditing(true);
        
        // Безопасная обработка даты
        let lastServiceDate;
        if (vehicle?.last_service_date) {
          try {
            const date = new Date(vehicle.last_service_date);
            if (!isNaN(date.getTime())) {
              lastServiceDate = date?.toISOString().split('T')[0];
            } else {
              lastServiceDate = new Date().toISOString().split('T')[0];
            }
          } catch (error) {
            lastServiceDate = new Date().toISOString().split('T')[0];
          }
        } else {
          lastServiceDate = new Date().toISOString().split('T')[0];
        }

        setFormData({
          vin: vehicle.vin,
          make: vehicle.make,
          model: vehicle.model,
          plate_number: vehicle.plate_number,
          owner_phone: vehicle.owner_phone,
          mileage: vehicle.mileage,
          lastServiceDate: lastServiceDate,
          healthStatus: vehicle.healthStatus || {
            engine: 100,
            oil: 100,
            tires: 100,
            brakes: 100
          }
        });
      } else {
        toast.error('Автомобиль не найден');
      }
    } catch (error) {
      toast.error('Ошибка при поиске автомобиля');
    }
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedVehicle(null);
    setFormData({
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isAdding) {
        await vehicleService.createVehicle(formData);
        toast.success('Автомобиль успешно добавлен');
      } else if (selectedVehicle) {
        await vehicleService.updateVehicle(selectedVehicle.id, formData);
        toast.success('Данные автомобиля обновлены');
      }
      setIsAdding(false);
      setIsEditing(false);
      setSelectedVehicle(null);
      loadVehicles();
    } catch (error) {
      toast.error('Ошибка при сохранении данных');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Управление автомобилями</h1>
        <button
          onClick={handleAddNew}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Добавить новый автомобиль
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Поиск автомобиля</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">VIN</label>
            <input
              type="text"
              value={searchVin}
              onChange={(e) => setSearchVin(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Телефон владельца</label>
            <input
              type="text"
              value={searchOwnerPhone}
              onChange={(e) => setSearchOwnerPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Найти
        </button>
      </div>

      {(isAdding || isEditing) && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {isAdding ? 'Добавление нового автомобиля' : 'Редактирование автомобиля'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">VIN</label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Марка</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Модель</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Номерной знак</label>
                <input
                  type="text"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Телефон владельца</label>
                <input
                  type="text"
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Пробег</label>
                <input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Дата последнего обслуживания</label>
                <input
                  type="date"
                  value={formData.lastServiceDate}
                  onChange={(e) => setFormData({ ...formData, lastServiceDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                  setSelectedVehicle(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold p-6 border-b">Список автомобилей</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Марка</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Модель</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Номерной знак</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Телефон владельца</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пробег</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Последнее обслуживание</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.vin}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.make}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.plate_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.owner_phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.mileage}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(vehicle.lastServiceDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setIsEditing(true);
                        setFormData({
                          vin: vehicle.vin,
                          make: vehicle.make,
                          model: vehicle.model,
                          plate_number: vehicle.plate_number,
                          owner_phone: vehicle.owner_phone,
                          mileage: vehicle.mileage,
                          lastServiceDate: new Date(vehicle.lastServiceDate).toISOString().split('T')[0],
                          healthStatus: vehicle.healthStatus
                        });
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Редактировать
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VehicleManagement; 
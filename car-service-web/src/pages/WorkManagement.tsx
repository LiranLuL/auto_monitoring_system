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
  
  // Состояние для списка всех автомобилей
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  
  // Состояние для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Состояние для фильтрации
  const [filterVin, setFilterVin] = useState('');
  const [filterOwnerPhone, setFilterOwnerPhone] = useState('');
  
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

  // Загрузка списка автомобилей при монтировании компонента
  useEffect(() => {
    loadVehicles();
  }, []);

  // Применение фильтрации и обновление пагинации при изменении фильтров
  useEffect(() => {
    filterVehicles();
  }, [filterVin, filterOwnerPhone, vehicles]);

  // Обновление отображаемых элементов при изменении страницы
  useEffect(() => {
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
    setTotalPages(totalPages > 0 ? totalPages : 1);
    
    // Если текущая страница выходит за пределы общего числа страниц
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredVehicles, itemsPerPage, currentPage]);

  // Загрузка всех автомобилей
  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getAllVehicles();
      setVehicles(data);
      setFilteredVehicles(data);
      setLoading(false);
    } catch (error) {
      setError('Ошибка при загрузке списка автомобилей');
      setLoading(false);
    }
  };

  // Функция фильтрации автомобилей
  const filterVehicles = () => {
    let filtered = [...vehicles];

    if (filterVin) {
      filtered = filtered.filter(vehicle => 
        vehicle.vin.toLowerCase().includes(filterVin.toLowerCase())
      );
    }

    if (filterOwnerPhone) {
      filtered = filtered.filter(vehicle => 
        vehicle.owner_phone.includes(filterOwnerPhone)
      );
    }

    setFilteredVehicles(filtered);
    setCurrentPage(1); // Сбрасываем на первую страницу при фильтрации
  };

  // Функция обработки изменения фильтров
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'filterVin') {
      setFilterVin(value);
    } else if (name === 'filterOwnerPhone') {
      setFilterOwnerPhone(value);
    }
  };

  // Функция очистки всех фильтров
  const clearFilters = () => {
    setFilterVin('');
    setFilterOwnerPhone('');
    setSearchParams({});
  };

  // Получение текущих элементов для отображения на странице
  const getCurrentItems = (): Vehicle[] => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredVehicles.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Обработчик для изменения страницы
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Обработчик для изменения количества элементов на странице
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении количества элементов
  };

  // Выбор автомобиля из списка
  const selectVehicle = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    try {
      setLoading(true);
      const vehicleWorks = await workService.getVehicleWorks(vehicle.id);
      setWorks(vehicleWorks);
      setLoading(false);
    } catch (err) {
      setError('Не удалось загрузить работы для автомобиля');
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    // Устанавливаем значения фильтров из полей поиска
    setFilterVin(searchParams.vin || '');
    setFilterOwnerPhone(searchParams.ownerPhone || '');
    
    // Очищаем поля поиска
    setSearchParams({});
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
      setError('Не удалось создать автомобиль');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      setError('Пожалуйста, сначала выберите автомобиль');
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
      setError('Не удалось создать работу');
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
      setError('Не удалось обновить статус работы');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Рендеринг пагинации
  const renderPagination = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center rounded-md border ${
              currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
            } px-4 py-2 text-sm font-medium`}
          >
            Назад
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative ml-3 inline-flex items-center rounded-md border ${
              currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
            } px-4 py-2 text-sm font-medium`}
          >
            Вперед
          </button>
        </div>

        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Показаны <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
              {' - '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, filteredVehicles.length)}
              </span>
              {' из '}
              <span className="font-medium">{filteredVehicles.length}</span> автомобилей
            </p>
          </div>
          <div className="flex items-center">
            <label htmlFor="itemsPerPage" className="mr-2 text-sm text-gray-700">На странице:</label>
            <select
              id="itemsPerPage"
              className="rounded border-gray-300 text-sm"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm ml-4" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                  currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
                } focus:z-20`}
              >
                <span className="sr-only">В начало</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 ${
                  currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
                } focus:z-20`}
              >
                <span className="sr-only">Назад</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" transform="scale(-1, 1) translate(-20, 0)" />
                </svg>
              </button>
              
              {pageNumbers.map(number => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === number
                      ? 'bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                      : 'bg-white text-gray-900 hover:bg-gray-50 focus:z-20'
                  }`}
                >
                  {number}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 ${
                  currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
                } focus:z-20`}
              >
                <span className="sr-only">Вперед</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                  currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
                } focus:z-20`}
              >
                <span className="sr-only">В конец</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Управление работами</h1>

      {/* Vehicle Search */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Поиск и фильтрация автомобилей</h2>
          <button
            onClick={clearFilters}
            className="text-gray-600 text-sm hover:text-indigo-600"
          >
            Очистить фильтры
          </button>
        </div>
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
            <label className="block text-sm font-medium text-gray-700">Телефон владельца</label>
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
          {loading ? 'Поиск...' : 'Применить фильтр'}
        </button>
      </div>

      {/* Vehicle List */}
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold">Список автомобилей</h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                name="filterVin"
                value={filterVin}
                onChange={handleFilterChange}
                placeholder="Фильтр по VIN"
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <input
                type="text"
                name="filterOwnerPhone"
                value={filterOwnerPhone}
                onChange={handleFilterChange}
                placeholder="Фильтр по телефону"
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center">
                    Загрузка...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center">
                    Автомобили не найдены
                  </td>
                </tr>
              ) : (
                getCurrentItems().map((vehicle) => (
                  <tr key={vehicle.id} className={selectedVehicle?.id === vehicle.id ? 'bg-indigo-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">{vehicle.vin}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{vehicle.make}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{vehicle.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{vehicle.plate_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{vehicle.owner_phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{vehicle.mileage}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => selectVehicle(vehicle)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {selectedVehicle?.id === vehicle.id ? 'Выбрано' : 'Выбрать'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>

      {/* New Vehicle Form */}
      {showNewVehicleForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Добавить новый автомобиль</h2>
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
                <label className="block text-sm font-medium text-gray-700">Марка</label>
                <input
                  type="text"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Модель</label>
                <input
                  type="text"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Гос. номер</label>
                <input
                  type="text"
                  value={newVehicle.plate_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Телефон владельца</label>
                <input
                  type="text"
                  value={newVehicle.owner_phone}
                  onChange={(e) => setNewVehicle({ ...newVehicle, owner_phone: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Пробег</label>
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
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Добавление...' : 'Добавить автомобиль'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selected Vehicle Info */}
      {selectedVehicle && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Выбранный автомобиль</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Марка</p>
              <p className="font-medium">{selectedVehicle.make}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Модель</p>
              <p className="font-medium">{selectedVehicle.model}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Гос. номер</p>
              <p className="font-medium">{selectedVehicle.plate_number}</p>
            </div>
          </div>
        </div>
      )}

      {/* New Work Form */}
      {selectedVehicle && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Добавить новую работу</h2>
          <form onSubmit={handleCreateWork} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Тип работы</label>
              <input
                type="text"
                value={newWork.workType}
                onChange={(e) => setNewWork({ ...newWork, workType: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Описание</label>
              <textarea
                value={newWork.description}
                onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Использованные запчасти</label>
              <textarea
                value={newWork.partsUsed}
                onChange={(e) => setNewWork({ ...newWork, partsUsed: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Стоимость</label>
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
              {loading ? 'Добавление...' : 'Добавить работу'}
            </button>
          </form>
        </div>
      )}

      {/* Works List */}
      {selectedVehicle && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">История работ</h2>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <div className="space-y-4">
            {works.map((work) => (
              <div key={work.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{work.work_type}</h3>
                    <p className="text-sm text-gray-600">{work.description}</p>
                    <p className="text-sm text-gray-600">Запчасти: {work.parts_used}</p>
                    <p className="text-sm text-gray-600">Стоимость: ₽{work.cost}</p>
                    <p className="text-sm text-gray-600">
                      Дата: {new Date(work.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      work.status === 'completed' ? 'bg-green-100 text-green-800' :
                      work.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {work.status === 'completed' ? 'Завершено' : 
                       work.status === 'in_progress' ? 'В процессе' : 
                       'Запланировано'}
                    </span>
                    {work.technician_id === user?.id && (
                      <button
                        onClick={() => handleStatusUpdate(work.id, 'completed')}
                        disabled={work.status === 'completed' || loading}
                        className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded hover:bg-indigo-200 disabled:opacity-50"
                      >
                        Завершить
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
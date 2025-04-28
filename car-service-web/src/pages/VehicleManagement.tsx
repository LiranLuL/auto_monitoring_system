import React, { useState, useEffect, useCallback } from 'react';
import { Vehicle } from '../types/models';
import { vehicleService } from '../services/vehicleService';
import { toast } from 'react-hot-toast';
import cars from '../data/cars.json';

const VehicleManagement: React.FC = () => {
  // Состояние для списка автомобилей
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);

  // Состояние для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Состояние для фильтрации
  const [filterVin, setFilterVin] = useState('');
  const [filterOwnerPhone, setFilterOwnerPhone] = useState('');

  // Состояние для поиска автомобиля
  const [searchVin, setSearchVin] = useState('');
  const [searchOwnerPhone, setSearchOwnerPhone] = useState('');

  // Остальные состояния
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

  const [carMakes, setCarMakes] = useState<{ id: string; name: string }[]>([]);
  const [carModels, setCarModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');

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

  // Загрузка списка марок авто при монтировании компонента
  useEffect(() => {
    const makes = cars.map(car => ({ id: car.id, name: car.name }));
    setCarMakes(makes);
  }, []);

  // При выборе марки обновляем список моделей
  useEffect(() => {
    if (selectedMake) {
      const selectedCarMake = cars.find(car => car.id === selectedMake);
      if (selectedCarMake) {
        const models = selectedCarMake.models.map(model => ({ id: model.id, name: model.name }));
        setCarModels(models);
      } else {
        setCarModels([]);
      }
    } else {
      setCarModels([]);
    }
  }, [selectedMake]);

  const loadVehicles = async () => {
    try {
      const data = await vehicleService.getAllVehicles();
      setVehicles(data);
      setFilteredVehicles(data);
    } catch (error) {
      toast.error('Ошибка при загрузке списка автомобилей');
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

  const handleSearch = async () => {
    // Устанавливаем значения фильтров из полей поиска
    setFilterVin(searchVin);
    setFilterOwnerPhone(searchOwnerPhone);

    // Очищаем поля поиска
    setSearchVin('');
    setSearchOwnerPhone('');
  };

  // При выборе автомобиля для редактирования
  const handleSelectVehicleForEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditing(true);

    // Находим марку авто по имени
    const makeObj = cars.find(car => car.name.toLowerCase() === vehicle.make.toLowerCase());
    const makeId = makeObj ? makeObj.id : '';
    setSelectedMake(makeId);

    setFormData({
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      plate_number: vehicle.plate_number,
      owner_phone: vehicle.owner_phone,
      mileage: vehicle.mileage,
      lastServiceDate: vehicle.lastServiceDate ? new Date(vehicle.lastServiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      healthStatus: vehicle.healthStatus
    });
  };

  // При добавлении нового авто
  const handleAddNew = () => {
    setSelectedVehicle(null);
    setIsAdding(true);
    setIsEditing(false);
    setSelectedMake('');
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

  // При изменении выбранной марки
  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const makeId = e.target.value;
    setSelectedMake(makeId);

    // Если выбрана марка, устанавливаем её имя в formData
    if (makeId) {
      const selectedMakeObj = cars.find(car => car.id === makeId);
      if (selectedMakeObj) {
        setFormData(prev => ({ ...prev, make: selectedMakeObj.name, model: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, make: '', model: '' }));
    }
  };

  // При изменении выбранной модели
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;

    if (modelId && selectedMake) {
      const selectedMakeObj = cars.find(car => car.id === selectedMake);
      if (selectedMakeObj) {
        const selectedModelObj = selectedMakeObj.models.find(model => model.id === modelId);
        if (selectedModelObj) {
          setFormData(prev => ({ ...prev, model: selectedModelObj.name }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, model: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdding) {
      const vin = formData.vin.trim();
      if (vin.length !== 17) {
        toast.error('VIN должен состоять ровно из 17 символов.');
        return;
      }
    }


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

  // Функция очистки всех фильтров
  const clearFilters = () => {
    setFilterVin('');
    setFilterOwnerPhone('');
    setSearchVin('');
    setSearchOwnerPhone('');
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
            className={`relative inline-flex items-center rounded-md border ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
              } px-4 py-2 text-sm font-medium`}
          >
            Назад
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative ml-3 inline-flex items-center rounded-md border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
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
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
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
                className={`relative inline-flex items-center px-2 py-2 ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
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
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === number
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
                className={`relative inline-flex items-center px-2 py-2 ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
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
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Управление автомобилями</h1>
        <button
          onClick={handleAddNew}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Добавить новый автомобиль
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
                <select
                  value={selectedMake}
                  onChange={handleMakeChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите марку</option>
                  {carMakes.map(make => (
                    <option key={make.id} value={make.id}>{make.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Модель</label>
                <select
                  value={carModels.find(model => model.name === formData.model)?.id || ''}
                  onChange={handleModelChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={!selectedMake}
                >
                  <option value="">Выберите модель</option>
                  {carModels.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
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
              {getCurrentItems().map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.vin}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.make}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.plate_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.owner_phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.mileage}</td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleSelectVehicleForEdit(vehicle)}
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
        {renderPagination()}
      </div>
    </div>
  );
};

export default VehicleManagement; 
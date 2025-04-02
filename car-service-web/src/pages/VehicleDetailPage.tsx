import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  Typography, 
  CircularProgress, 
  Alert, 
  Box, 
  Grid,
  Paper,
  Stack,
  LinearProgress
} from '@mui/material';
import API from '../api/client';
import { Vehicle } from '../types/models';
import { HealthStatusPanel } from '../components/HealthStatusPanel';

export const VehicleDetailPage = () => {
  const { vin } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await API.get<Vehicle>(`/vehicles/${vin}`);
        setVehicle(response.data);
      } catch (err) {
        setError('Ошибка загрузки данных');
        console.error('Error fetching vehicle data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vin]);

  if (loading) return <CircularProgress />;
  
  if (error) return <Alert severity="error">{error}</Alert>;
  
  if (!vehicle) return <Alert severity="warning">Транспортное средство не найдено</Alert>;
  
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        {vehicle.model} ({vehicle.vin})
      </Typography>
      
      <Grid container spacing={3}>
        {/* Основная информация */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Основные параметры
            </Typography>
            <Stack spacing={2}>
              <div>
                <Typography>Пробег: {vehicle.mileage} км</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(vehicle.mileage || 0)/150000*100} 
                  sx={{ height: 8, mt: 1 }}
                />
              </div>
              
              <div>
                <Typography>Последнее ТО: {vehicle.lastServiceDate}</Typography>
              </div>
            </Stack>
          </Paper>
        </Grid>

        {/* Состояние узлов */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Состояние узлов
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>Двигатель:</Typography>
                <LinearProgress
                  variant="determinate" 
                  value={vehicle.healthStatus.engine} 
                  color={getStatusColor(vehicle.healthStatus.engine)} 
                  sx={{ height: 8 }}
                />
                <Typography variant="body2">
                  {vehicle.healthStatus.engine}%
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography>Масло:</Typography>
                <LinearProgress
                  variant="determinate"
                  value={vehicle.healthStatus.oil}
                  color={getStatusColor(vehicle.healthStatus.oil)}
                  sx={{ height: 8 }}
                />
                <Typography variant="body2">
                  {vehicle.healthStatus.oil}%
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography>Шины:</Typography>
                <LinearProgress
                  variant="determinate"
                  value={vehicle.healthStatus.tires}
                  color={getStatusColor(vehicle.healthStatus.tires)}
                  sx={{ height: 8 }}
                />
                <Typography variant="body2">
                  {vehicle.healthStatus.tires}%
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography>Тормоза:</Typography>
                <LinearProgress
                  variant="determinate"
                  value={vehicle.healthStatus.brakes}
                  color={getStatusColor(vehicle.healthStatus.brakes)}
                  sx={{ height: 8 }}
                />
                <Typography variant="body2">
                  {vehicle.healthStatus.brakes}%
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* График состояния */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Визуализация состояния
            </Typography>
            <HealthStatusPanel data={vehicle.healthStatus} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Вспомогательная функция для цвета индикатора
const getStatusColor = (value: number) => {
  if (value > 75) return 'success';
  if (value > 40) return 'warning';
  return 'error';
};
import { useState } from "react";
import { Button, TextField, Stack, Alert,Snackbar  } from "@mui/material";
import API from "../api/client";

export const MaintenanceForm = () => {
  const [formData, setFormData] = useState({
    vehicleId: "",
    type: "",
    cost: "",
    date: new Date().toISOString().split("T")[0]
  });

   // Состояния для уведомлений
   const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const handleSubmit = async () => {
    try {
      await API.post("/maintenance", {
        ...formData,
        cost: Number(formData.cost)
      });
      
      setNotification({
        open: true,
        message: "Запись добавлена!",
        severity: "success"
      });
      
      // Очистка формы
      setFormData({
        vehicleId: "",
        type: "",
        cost: "",
        date: new Date().toISOString().split("T")[0]
      });
      
    } catch (error) {
      setNotification({
        open: true,
        message: "Ошибка при сохранении",
        severity: "error"
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="VIN автомобиля"
        value={formData.vehicleId}
        onChange={e => setFormData({...formData, vehicleId: e.target.value})}
      />
      
      <TextField
        label="Вид работ"
        value={formData.type}
        onChange={e => setFormData({...formData, type: e.target.value})}
      />
      
      <TextField
        label="Стоимость"
        type="number"
        value={formData.cost}
        onChange={e => setFormData({...formData, cost: e.target.value})}
      />
      
      <TextField
        label="Дата"
        type="date"
        value={formData.date}
        onChange={e => setFormData({...formData, date: e.target.value})}
      />
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
        </Snackbar>
      <Button 
        variant="contained" 
        color="primary"
        onClick={handleSubmit}
      >
        Добавить ТО
      </Button>
    </Stack>
  );
};
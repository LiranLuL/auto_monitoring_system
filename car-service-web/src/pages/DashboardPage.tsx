import { Grid, Typography } from "@mui/material";
import { HealthStatusPanel, VehicleTable, MaintenanceForm } from "../components";

export const DashboardPage = () => {
  return (
    <div className="dashboard">
      <Typography variant="h4" gutterBottom>
        Панель управления автосервиса
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <HealthStatusPanel />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <MaintenanceForm />
        </Grid>
        
        <Grid item xs={12}>
          <VehicleTable />
        </Grid>
      </Grid>
    </div>
  );
};
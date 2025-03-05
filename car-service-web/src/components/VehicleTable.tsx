import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { useFetchVehicles } from "../hooks/useFetchVehicles";

export const VehicleTable = () => {
    const { data, loading, error } = useFetchVehicles();

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>VIN</TableCell>
            <TableCell>Модель</TableCell>
            <TableCell align="right">Пробег</TableCell>
            <TableCell align="right">Состояние</TableCell>
          </TableRow>
        </TableHead>
        
        <TableBody>
          {data?.map(vehicle => (
            <TableRow key={vehicle.id}>
              <TableCell>{vehicle.vin}</TableCell>
              <TableCell>{vehicle.model}</TableCell>
              <TableCell align="right">{vehicle.mileage} км</TableCell>
              <TableCell align="right">
                <div className="health-badge">
                  {Math.round(vehicle.healthStatus.engine)}%
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
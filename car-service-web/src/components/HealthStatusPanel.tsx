import { Bar } from "react-chartjs-2";
import { Vehicle } from "../types/models";
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip
} from 'chart.js';

// Регистрация необходимых компонентов Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip
);

interface Props {
  data?: Vehicle["healthStatus"];
}

export const HealthStatusPanel = ({ data }: Props) => {
  const chartData = {
    labels: ["Двигатель", "Масло", "Шины"],
    datasets: [{
      label: 'Состояние (%)',
      data: [data?.engine || 0, data?.oil || 0, data?.tires || 0],
      backgroundColor: ["#ff6384", "#36a2eb", "#4bc0c0"]
    }]
  };

  const options = {
    responsive: true,
    scales: {
      x: {
        type: 'category' as const,
      },
      y: {
        type: 'linear' as const,
        min: 0,
        max: 100
      }
    }
  };

  return <Bar data={chartData} options={options} />;
};
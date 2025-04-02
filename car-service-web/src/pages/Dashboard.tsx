import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Welcome, {user?.username}!</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/work"
              className="block text-indigo-600 hover:text-indigo-800"
            >
              Manage Works
            </Link>
            <Link
              to="/vehicles"
              className="block text-indigo-600 hover:text-indigo-800"
            >
              View Vehicles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
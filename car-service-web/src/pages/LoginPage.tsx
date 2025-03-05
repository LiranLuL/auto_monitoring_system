import { useState } from 'react';
import { Button, TextField, Container, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';

export const LoginPage = () => {
  const [credentials, setCredentials] = useState({ login: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await API.post('/auth/login', credentials);
      navigate('/dashboard');
    } catch (error) {
      alert('Ошибка авторизации');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Вход в систему
        </Typography>
        
        <TextField
          label="Логин"
          fullWidth
          margin="normal"
          value={credentials.login}
          onChange={e => setCredentials({...credentials, login: e.target.value})}
        />
        
        <TextField
          label="Пароль"
          type="password"
          fullWidth
          margin="normal"
          value={credentials.password}
          onChange={e => setCredentials({...credentials, password: e.target.value})}
        />
        
        <Button
          variant="contained"
          size="large"
          fullWidth
          sx={{ mt: 3 }}
          onClick={handleLogin}
        >
          Войти
        </Button>
      </Box>
    </Container>
  );
};
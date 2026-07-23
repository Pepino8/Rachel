import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Content from './Content.jsx'
import Header from './Header.jsx'
import Login from '../components/Login.jsx'
import Settings from '../components/Settings.jsx'
import axios from 'axios'

// Configure global Axios request interceptor to pass user session tokens
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('rachel_token');
    if (token) {
        config.headers.Authorization = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentTab, setCurrentTab] = useState('dashboard');

    useEffect(() => {
        const token = localStorage.getItem('rachel_token');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
        setCurrentTab('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('rachel_token');
        localStorage.removeItem('rachel_user');
        setIsAuthenticated(false);
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <>
            <Header onLogout={handleLogout} currentTab={currentTab} setCurrentTab={setCurrentTab} />
            {currentTab === 'dashboard' ? <Content /> : <Settings />}
        </>
    );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

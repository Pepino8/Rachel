import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000', // URL del backend local por ahora / Va a tocar cambiarlo al momento de hostearlo con vercel?
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;

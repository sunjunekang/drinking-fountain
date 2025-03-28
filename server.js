require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

app.get('/api/water-fountains', async (req, res) => {
    try {
        const apiKey = process.env.SEOUL_API_KEY;
        const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/TbViewGisArisu/1/1000/`;
        
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: '데이터 로딩 중 오류 발생' });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
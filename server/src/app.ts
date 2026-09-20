import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RentAny API',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', routes);

app.use(errorHandler);

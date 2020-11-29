import fastify from 'fastify';
import { GoogleSheetsFeatureToggles } from './GoogleSheetsFeatureToggles.mjs';

const PORT = process.env.PORT || 8080;
const app = fastify();

app.get('/', async (request, reply) => {
  const googleSheetsFeatureToggles = new GoogleSheetsFeatureToggles(request.query);
  const toggles = await googleSheetsFeatureToggles.getToggles();
  const { statusCode, response } = toggles;
  reply.code(statusCode).header('Content-Type', 'application/json').send(JSON.stringify(response));
});

const start = async () => {
  try {
    await app.listen(PORT, '0.0.0.0'); // We are going to add the last localhost section to make sure this is correctly exposed to Docker
    app.log.info(`server listening on ${app.server.address().port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();

import next from 'next';
import { createServer } from 'http';
import { parse } from 'url';
import { BackgroundServices } from './background-services';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function startServer() {
  try {
    console.log('Preparing Next.js application...');
    await app.prepare();

    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    // Initialize background services (WebSocket + Job Monitor)
    const backgroundServices = BackgroundServices.getInstance();
    backgroundServices.initialize(server);

    // Start listening
    server.listen(port, hostname, () => {
      console.log(`> Server ready on http://${hostname}:${port}`);
      console.log(`> WebSocket ready on ws://${hostname}:${port}/ws`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('Shutting down server...');
      backgroundServices.shutdown();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer();
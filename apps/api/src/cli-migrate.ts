import { closePools } from './db.js';
import { migrate } from './migrate.js';

migrate()
  .then(() => closePools())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await closePools();
    process.exit(1);
  });
